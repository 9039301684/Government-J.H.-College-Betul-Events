
require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const pool = require("./db");
const app = require("./app");

const PORT = Number(process.env.PORT || 5000);

let server;

async function startServer() {
    if (process.env.NODE_ENV === "production") {
        if (
            !process.env.JWT_SECRET ||
            process.env.JWT_SECRET.startsWith("replace_with_") ||
            Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32
        ) {
            throw new Error("JWT_SECRET must contain at least 32 bytes in production.");
        }

        if (process.env.DB_SSL !== "true" || process.env.DB_SSL_REJECT_UNAUTHORIZED === "false") {
            throw new Error("Production PostgreSQL connections must use TLS with certificate verification.");
        }

        const configuredOrigins = (process.env.CORS_ORIGINS || "")
            .split(",")
            .map((origin) => origin.trim())
            .filter(Boolean);
        if (configuredOrigins.some((origin) => !origin.startsWith("https://"))) {
            throw new Error("Production CORS_ORIGINS must contain HTTPS origins only.");
        }

        if (!process.env.API_ORIGIN && process.env.FRONTEND_ORIGIN) {
            throw new Error("Configure API_ORIGIN or serve the frontend from this application.");
        }

        if (process.env.API_ORIGIN && !process.env.API_ORIGIN.startsWith("https://")) {
            throw new Error("Production API_ORIGIN must use HTTPS.");
        }
    }

    await pool.query("SELECT 1");

    server = app.listen(PORT, () => {
        console.log(`JH College Events listening on port ${PORT}`);
    });

    server.on("error", (error) => {
        console.error("Server error:", error.message);
    });
}

startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
});

let isShuttingDown = false;

async function shutdown() {
    if (isShuttingDown || !server) {
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
