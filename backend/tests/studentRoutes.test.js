const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../db");
const studentRoutes = require("../routes/studentRoutes");
const registrationRateLimiter = require("../middleware/registrationRateLimiter");

process.env.JWT_SECRET = "student-route-test-secret";

const originalQuery = pool.query;

function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/students", studentRoutes);
    return app;
}

function tokenFor(role, id = 24) {
    return jwt.sign({ id, role }, process.env.JWT_SECRET);
}

test.beforeEach(() => {
    registrationRateLimiter.resetKey("::ffff:127.0.0.1");
    registrationRateLimiter.resetKey("127.0.0.1");
});

test.after(() => {
    pool.query = originalQuery;
});

test("student registration rejects invalid required fields before SQL", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        throw new Error("Unexpected SQL");
    };

    const invalidBodies = [
        { full_name: "", email: "test@example.edu", password: "password1", gender: "Other", roll_number: "R1", semester: 1 },
        { full_name: "Test", email: "invalid-email", password: "password1", gender: "Other", roll_number: "R1", semester: 1 },
        { full_name: "Test", email: "test@example.edu", password: "short", gender: "Other", roll_number: "R1", semester: 1 },
        { full_name: "Test", email: "test@example.edu", password: "password1", gender: "Other", roll_number: "R1", semester: 5 },
        { full_name: "Test", email: "test@example.edu", password: "password1", semester: 1 }
    ];

    for (const body of invalidBodies) {
        const response = await request(createApp())
            .post("/api/students/register")
            .send(body);
        assert.equal(response.status, 400);
        assert.equal(response.body.success, false);
    }

    assert.equal(queries, 0);
});

test("student registration handles a duplicate email without exposing database details", async () => {
    pool.query = async () => {
        const error = new Error("unique constraint detail");
        error.code = "23505";
        throw error;
    };

    const response = await request(createApp())
        .post("/api/students/register")
        .send({
            full_name: "Test Student",
            email: "test@example.edu",
            password: "valid-password",
            gender: "Other",
            semester: 1,
            roll_number: "R1"
        });

    assert.equal(response.status, 409);
    assert.doesNotMatch(response.text, /unique constraint detail/i);
});

test("student registration ignores a supplied role and hashes its password", async () => {
    let insertedValues;
    pool.query = async (sql, values) => {
        assert.match(sql, /INSERT INTO students/i);
        insertedValues = values;
        return {
            rows: [{
                id: 3,
                full_name: values[0],
                email: values[1],
                gender: values[2],
                semester: values[3],
                roll_number: values[4],
                created_at: new Date()
            }]
        };
    };

    const response = await request(createApp())
        .post("/api/students/register")
        .send({
            full_name: "Test Student",
            email: "TEST@example.edu",
            password: "valid-password",
            gender: "Other",
            semester: 1,
            roll_number: "R1",
            role: "admin"
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.student.role, undefined);
    assert.equal(insertedValues[1], "test@example.edu");
    assert.equal(await bcrypt.compare("valid-password", insertedValues[5]), true);
});

test("students cannot access the staff-only student list", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        return { rows: [] };
    };

    const response = await request(createApp())
        .get("/api/students")
        .set("Authorization", `Bearer ${tokenFor("student")}`);

    assert.equal(response.status, 403);
    assert.equal(queries, 0);
});

test("staff cannot access the student-only profile endpoint", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        return { rows: [] };
    };

    const response = await request(createApp())
        .get("/api/students/me")
        .set("Authorization", `Bearer ${tokenFor("teacher")}`);

    assert.equal(response.status, 403);
    assert.equal(queries, 0);
});

test("public student directory selects only the intended public fields", async () => {
    let selectedSql;
    pool.query = async (sql) => {
        selectedSql = sql;
        return { rows: [{ full_name: "Test Student", semester: 2 }] };
    };

    const response = await request(createApp()).get("/api/students/directory");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.students, [{ full_name: "Test Student", semester: 2 }]);
    assert.match(selectedSql, /SELECT\s+full_name,\s*semester/i);
    assert.doesNotMatch(selectedSql, /email|gender|roll_number|password_hash|id,/i);
});

test("student login and profile responses identify the student role", async () => {
    const passwordHash = await bcrypt.hash("valid-password", 4);
    pool.query = async (sql) => {
        if (/FROM students\s+WHERE email/i.test(sql)) {
            return {
                rows: [{
                    id: 24,
                    full_name: "Test Student",
                    email: "test@example.edu",
                    gender: "Unknown",
                    semester: 2,
                    roll_number: "T-24",
                    password_hash: passwordHash
                }]
            };
        }

        if (/FROM students WHERE id/i.test(sql)) {
            return {
                rows: [{
                    id: 24,
                    full_name: "Test Student",
                    email: "test@example.edu",
                    gender: "Unknown",
                    semester: 2,
                    roll_number: "T-24",
                    created_at: new Date()
                }]
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    };

    const app = createApp();
    const login = await request(app)
        .post("/api/students/login")
        .send({ email: "test@example.edu", password: "valid-password" });

    assert.equal(login.status, 200);
    assert.equal(login.body.student.role, "student");

    const profile = await request(app)
        .get("/api/students/me")
        .set("Authorization", `Bearer ${login.body.token}`);

    assert.equal(profile.status, 200);
    assert.equal(profile.body.student.role, "student");
});
