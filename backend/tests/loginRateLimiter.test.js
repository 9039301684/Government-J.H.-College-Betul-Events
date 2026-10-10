const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const loginRateLimiter = require("../middleware/loginRateLimiter");

test("allows 10 requests and blocks the 11th request", async () => {
    const app = express();

    app.use(loginRateLimiter);

    app.get("/test-login", (req, res) => {
        res.json({ success: true });
    });

    const responses = [];

    for (let i = 0; i < 11; i++) {
        responses.push(await request(app).get("/test-login"));
    }

    for (let i = 0; i < 10; i++) {
        assert.equal(
            responses[i].status,
            200,
            `Request ${i + 1} should succeed`
        );
    }

    const blockedResponse = responses[10];

    assert.equal(blockedResponse.status, 429);
    assert.equal(blockedResponse.body.success, false);
    assert.equal(
        blockedResponse.body.message,
        "Too many login attempts. Please try again after 15 minutes."
    );
});
