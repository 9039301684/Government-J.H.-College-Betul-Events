
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../app");

test("real login route blocks the 11th invalid login request", async () => {
    for (let i = 1; i <= 10; i++) {
        const response = await request(app)
            .post("/api/auth/login")
            .send({});

        assert.equal(
            response.status,
            400,
            `Request ${i} should return 400 for an invalid body`
        );
    }

    const response = await request(app)
        .post("/api/auth/login")
        .send({});

    assert.equal(response.status, 429);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /too many login attempts/i);
});
