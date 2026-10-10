
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const studentRoutes = require("./routes/studentRoutes");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const userRoutes = require("./routes/userRoutes");
const pool = require("./db");

const app = express();

app.use(helmet());

const allowedOrigins = ["http://127.0.0.1:5500"];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "100kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/events", eventRoutes);
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

module.exports = app;
