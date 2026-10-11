const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../db");
const userRoutes = require("../routes/userRoutes");

process.env.JWT_SECRET = "user-route-test-secret";

const originalQuery = pool.query;

function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/users", userRoutes);
    return app;
}

function tokenFor(role) {
    return jwt.sign({ id: 7, role }, process.env.JWT_SECRET);
}

test.after(() => {
    pool.query = originalQuery;
});

test("unauthenticated and student callers cannot list staff accounts", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        return { rows: [] };
    };

    const app = createApp();
    const unauthenticated = await request(app).get("/api/users");
    const student = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${tokenFor("student")}`);

    assert.equal(unauthenticated.status, 401);
    assert.equal(student.status, 403);
    assert.equal(queries, 0);
});

test("a principal cannot create another principal account", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        throw new Error("Unexpected SQL");
    };

    const response = await request(createApp())
        .post("/api/users")
        .set("Authorization", `Bearer ${tokenFor("principal")}`)
        .send({
            full_name: "Another Principal",
            email: "principal@example.edu",
            password: "valid-password",
            role: "principal"
        });

    assert.equal(response.status, 403);
    assert.equal(queries, 0);
});

test("authorized account creation hashes password and limits roles to staff types", async () => {
    let insertedValues;
    pool.query = async (sql, values) => {
        assert.match(sql, /INSERT INTO users/i);
        insertedValues = values;
        return {
            rows: [{
                id: 12,
                full_name: values[0],
                email: values[1],
                role: values[3],
                created_at: new Date()
            }]
        };
    };

    const response = await request(createApp())
        .post("/api/users")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({
            full_name: "Test Teacher",
            email: "teacher@example.edu",
            password: "valid-password",
            role: "teacher"
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.role, "teacher");
    assert.equal(await bcrypt.compare("valid-password", insertedValues[2]), true);
});

test("a staff account cannot self-assign the admin role", async () => {
    let queries = 0;
    pool.query = async () => {
        queries += 1;
        throw new Error("Unexpected SQL");
    };

    const response = await request(createApp())
        .post("/api/users")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({
            full_name: "Escalation",
            email: "escalation@example.edu",
            password: "valid-password",
            role: "admin"
        });

    assert.equal(response.status, 400);
    assert.equal(queries, 0);
});
