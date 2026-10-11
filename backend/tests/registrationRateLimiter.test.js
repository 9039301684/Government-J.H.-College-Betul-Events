const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const studentRoutes = require("../routes/studentRoutes");

test("student registration route allows 5 attempts and blocks the 6th", async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/students", studentRoutes);

    const responses = [];
    for (let i = 0; i < 6; i += 1) {
        responses.push(await request(app)
            .post("/api/students/register")
            .send({}));
    }

    for (let i = 0; i < 5; i += 1) {
        assert.equal(responses[i].status, 400);
    }

    assert.equal(responses[5].status, 429);
    assert.equal(responses[5].body.success, false);
    assert.match(responses[5].body.message, /too many registration attempts/i);
});
