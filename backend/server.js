
require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const pool = require("./db");
const app = require("./app");

const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, () => {
    console.log(`JH College API running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
    console.error("Server error:", error.message);
});

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
