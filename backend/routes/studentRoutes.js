const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const jwt = require("jsonwebtoken");
const loginRateLimiter = require("../middleware/loginRateLimiter");
const authenticateStudent = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// 1. REGISTER STUDENT
router.post( "/register", authenticateStudent, allowRoles("admin", "principal"), async (req, res) => {
  try {
    const { full_name, email, password, gender, semester, roll_number } = req.body;

    if (
      typeof full_name !== "string" || !full_name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password (minimum 8 characters) are required.",
      });
    }

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanSemester = Number(semester);

    // Email à¤”à¤° Semester à¤µà¥ˆà¤²à¤¿à¤¡à¥‡à¤¶à¤¨
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      !Number.isInteger(cleanSemester) ||
      cleanSemester < 1 ||
      cleanSemester > 4
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email and semester (1-4) are required.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO students (full_name, email, gender, semester, roll_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, gender, semester, roll_number, created_at`,
      [
        cleanName,
        cleanEmail,
        typeof gender === "string" ? gender.trim() || null : null,
        cleanSemester,
        typeof roll_number === "string" ? roll_number.trim() || null : null,
        passwordHash,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Student registered successfully.",
      student: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }
    console.error("Student registration error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Registration failed due to a server error.",
    });
  }
});

// 2. GET ALL STUDENTS
router.get("/", authenticateStudent, allowRoles("admin", "principal", "teacher"), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, full_name, gender, semester, roll_number
      FROM students
      ORDER BY semester ASC, full_name ASC
    `);
    return res.json({
      success: true,
      count: result.rows.length,
      students: result.rows
    });
  } catch (error) {
    console.error("Get students error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load students." });
  }
});

// PUBLIC STUDENT DIRECTORY
router.get("/directory", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        semester
      FROM students
      ORDER BY semester ASC, full_name ASC
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      students: result.rows
    });
  } catch (error) {
    console.error("Public student directory error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load student directory."
    });
  }
});

// 3. STUDENT LOGIN
router.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from .env");
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT id, full_name, email, gender, semester, roll_number, password_hash FROM students WHERE email = $1`,
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const student = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, student.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { id: student.id, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      success: true,
      message: "Student login successful.",
      token,
      student: {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        gender: student.gender,
        semester: student.semester,
        roll_number: student.roll_number,
      },
    });
  } catch (error) {
    console.error("Student login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error.",
    });
  }
});

// 4. GET CURRENT STUDENT (à¤‡à¤¸à¥‡ à¤Šà¤ªà¤° à¤¶à¤¿à¤«à¥à¤Ÿ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¤à¤¾à¤•à¤¿ à¤¯à¤¹ à¤¸à¤¹à¥€ à¤¸à¥‡ à¤à¤•à¥à¤¸à¤ªà¥‹à¤°à¥à¤Ÿ à¤¹à¥‹ à¤¸à¤•à¥‡)

router.get("/me", authenticateStudent, allowRoles("student"), async (req, res) => {


  try {
    const result = await pool.query(
      `SELECT id, full_name, email, gender, semester, roll_number, created_at FROM students WHERE id = $1`,
      [req.student.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Student account not found." });
    }

    return res.json({ success: true, student: result.rows[0] });
  } catch (error) {
    console.error("Get current student error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load student profile." });
  }
});

// à¤«à¤¼à¤¾à¤‡à¤² à¤•à¥‡ à¤…à¤‚à¤¤ à¤®à¥‡à¤‚ à¤¸à¤¾à¤°à¥‡ à¤°à¥‚à¤Ÿà¥à¤¸ à¤•à¥‹ à¤à¤•à¥à¤¸à¤ªà¥‹à¤°à¥à¤Ÿ à¤•à¤°à¥‡à¤‚
module.exports = router;
