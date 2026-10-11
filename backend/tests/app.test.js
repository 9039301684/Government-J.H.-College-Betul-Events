const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const pool = require("../db");
const app = require("../app");

const originalQuery = pool.query;

test.after(() => {
    pool.query = originalQuery;
});

test("serves the existing frontend from the Express application", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.match(response.text, /Government J\.H\. College|JH College/i);
    assert.equal((await request(app).get("/script.js")).status, 200);
    assert.equal((await request(app).get("/style.css")).status, 200);
});

test("sets restrictive security headers on frontend responses", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.match(response.headers["content-security-policy"], /object-src 'none'/i);
    assert.match(response.headers["content-security-policy"], /frame-ancestors 'none'/i);
    assert.doesNotMatch(response.headers["content-security-policy"], /unsafe-eval/i);
    assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("malformed JSON returns a safe JSON 400 response", async () => {
    const response = await request(app)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send("{");

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /invalid json/i);
    assert.doesNotMatch(response.text, /SyntaxError|node_modules/i);
});

test("write requests with non-object JSON bodies return 400", async () => {
    for (const body of ["null", "[]", '"text"']) {
        const response = await request(app)
            .post("/api/auth/login")
            .set("Content-Type", "application/json")
            .send(body);

        assert.equal(response.status, 400);
        assert.equal(response.body.success, false);
        assert.match(response.body.message, /body must be an object|invalid JSON/i);
    }
});

test("health endpoint reports database connectivity without leaking driver errors", async () => {
    pool.query = async (sql) => {
        assert.equal(sql, "SELECT 1");
        throw new Error("private connection diagnostic");
    };

    const response = await request(app).get("/api/health");

    assert.equal(response.status, 500);
    assert.equal(response.body.success, false);
    assert.doesNotMatch(response.text, /private connection diagnostic/i);
});
