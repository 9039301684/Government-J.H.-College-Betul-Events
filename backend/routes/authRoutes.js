const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const loginRateLimiter = require("../middleware/loginRateLimiter");

const router = express.Router();

const VALID_ROLES = ["student", "teacher", "principal", "admin"];

router.post("/login", loginRateLimiter, async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password ||
            !VALID_ROLES.includes(role)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid email, password and role are required."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from .env");

            return res.status(500).json({
                success: false,
                message: "Server configuration error."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        let account;
        let actualRole = role;

        if (role === "student") {
            const result = await pool.query(
                `SELECT id, full_name, email, gender, semester,
                        roll_number, password_hash
                 FROM students
                 WHERE email = $1`,
                [cleanEmail]
            );

            account = result.rows[0];
        } else {
            const result = await pool.query(
                `SELECT id, full_name, email, password_hash, role
                 FROM users
                 WHERE email = $1`,
                [cleanEmail]
            );

            account = result.rows[0];

            if (account) {
                actualRole = account.role;
            }
        }

        if (
            !account ||
            actualRole !== role ||
            !(await bcrypt.compare(password, account.password_hash))
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or role."
            });
        }

        const token = jwt.sign(
            {
                id: account.id,
                role: actualRole
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        const user = {
            id: account.id,
            full_name: account.full_name,
            email: account.email,
            role: actualRole
        };

        if (actualRole === "student") {
            user.gender = account.gender;
            user.semester = account.semester;
            user.roll_number = account.roll_number;
        }

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            user
        });
    } catch (error) {
        console.error("Common login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed due to a server error."
        });
    }
});

module.exports = router;
