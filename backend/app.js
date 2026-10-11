
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const userRoutes = require("./routes/userRoutes");
const pool = require("./db");

const app = express();

const trustProxyHopsValue = process.env.TRUST_PROXY_HOPS || "0";
if (!/^\d+$/.test(trustProxyHopsValue)) {
    throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 10.");
}
const trustProxyHops = Number(trustProxyHopsValue);
if (!Number.isSafeInteger(trustProxyHops) || trustProxyHops > 10) {
    throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 10.");
}
if (trustProxyHops > 0) {
    app.set("trust proxy", trustProxyHops);
}

const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = process.env.API_ORIGIN;
const connectSources = ["'self'"];
if (!isProduction) {
    connectSources.push("http://localhost:5000", "http://127.0.0.1:5000");
}
if (apiOrigin) {
    try {
        const parsedApiOrigin = new URL(apiOrigin);
        if (!["http:", "https:"].includes(parsedApiOrigin.protocol)) {
            throw new Error("Unsupported API_ORIGIN protocol.");
        }
        connectSources.push(parsedApiOrigin.origin);
    } catch (error) {
        throw new Error("API_ORIGIN must be a valid absolute URL.");
    }
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            connectSrc: connectSources,
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            imgSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
        }
    }
}));

const defaultOrigins = isProduction
    ? ""
    : "http://127.0.0.1:5500,http://localhost:5500,http://localhost:3000,http://localhost:5173";
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        const isLocalOrigin = !isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin || "");
        if (!origin || allowedOrigins.includes(origin) || isLocalOrigin) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use((req, res, next) => {
    if (!["POST", "PUT", "PATCH"].includes(req.method)) {
        return next();
    }

    if (
        req.body === undefined ||
        req.body === null ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {
        return res.status(400).json({
            success: false,
            message: "Request body must be an object."
        });
    }

    return next();
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/users", userRoutes);

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.json({
            success: true,
            message: "JH College API is running"
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Service temporarily unavailable."
        });
    }
});

const frontendRoot = path.resolve(__dirname, "..");
app.get("/", (req, res) => res.sendFile(path.join(frontendRoot, "index.html")));
app.get("/script.js", (req, res) => res.sendFile(path.join(frontendRoot, "script.js")));
app.get("/style.css", (req, res) => res.sendFile(path.join(frontendRoot, "style.css")));

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body exceeds the allowed size."
        });
    }

    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Request body contains invalid JSON."
        });
    }

    console.error("Unhandled request error:", error.message);
    return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

module.exports = app;
