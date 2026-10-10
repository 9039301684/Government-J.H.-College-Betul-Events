// ============================================
// // JH COLLEGE EVENTS - API SERVER
// ============================================

// 1. LOAD ENVIRONMENT VARIABLES
require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

// 2. IMPORT PACKAGES
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");

// 3. IMPORT ROUTES
const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const userRoutes = require("./routes/userRoutes");

// 4. INITIALIZE EXPRESS
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Set HTTP security headers
app.use(helmet());

// CORS: Allow only the local frontend origin.
const allowedOrigins = [
    "http://127.0.0.1:5500"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests without an Origin header, such as PowerShell.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Limit incoming JSON request body size
app.use(express.json({ limit: "100kb" }));

// ============================================
// API ROUTES
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);

// ============================================
// HEALTH CHECK
// ============================================

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

// ============================================
// START SERVER
// ============================================

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
    console.log(`JH College API running at http://localhost:${PORT}`);
});

// ============================================
// SERVER ERROR HANDLING
// ============================================

server.on("error", (error) => {
    console.error("Server error:", error.message);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

async function shutdown() {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log("Shutting down JH College API...");

    server.close(async () => {
        try {
            await pool.end();
            console.log("PostgreSQL connection pool closed.");
            process.exit(0);
        } catch (error) {
            console.error("Shutdown error:", error.message);
            process.exit(1);
        }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
