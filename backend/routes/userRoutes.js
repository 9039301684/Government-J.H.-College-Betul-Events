const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const authenticateToken = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE TEACHER OR PRINCIPAL ACCOUNT
router.post(
    "/",
    authenticateToken,
    allowRoles("admin", "principal"),
    async (req, res) => {
        try {
            const { full_name, email, password, role } = req.body;

            // Validate required fields
            if (
                typeof full_name !== "string" ||
                !full_name.trim() ||
                typeof email !== "string" ||
                !email.trim() ||
                typeof password !== "string" ||
                password.length < 8 ||
                !["teacher", "principal"].includes(role)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid name, email, password (minimum 8 characters), and role are required."
                });
            }

            // Principal can create teachers only.
            if (
                req.user.role === "principal" &&
                role !== "teacher"
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Principals can create teacher accounts only."
                });
            }

            const cleanName = full_name.trim();
            const cleanEmail = email.trim().toLowerCase();

            // Validate email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address."
                });
            }

            // Hash password before storing it
            const passwordHash = await bcrypt.hash(password, 12);

            const result = await pool.query(
                `INSERT INTO users
                    (full_name, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, full_name, email, role, created_at`,
                [
                    cleanName,
                    cleanEmail,
                    passwordHash,
                    role
                ]
            );

            return res.status(201).json({
                success: true,
                message: `${role} account created successfully.`,
                user: result.rows[0]
            });

        } catch (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email already exists."
                });
            }

            console.error(
                "Account creation error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create account."
            });
        }
    }
);

module.exports = router;