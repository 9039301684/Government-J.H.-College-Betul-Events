const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");

const galleryRoutes = require("../routes/galleryRoutes");
const eventRoutes = require("../routes/eventRoutes");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-value";

test("gallery photo upload requires a valid bearer token", async () => {
    const app = express();
    app.use(express.json({ limit: "20mb" }));
    app.use("/api/gallery", galleryRoutes);

    const response = await request(app)
        .post("/api/gallery/albums/1/photos")
        .send({
            photos: [{ imageData: "data:image/png;base64,abc123", caption: "sample" }]
        });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /authentication token is required|authentication is required/i);
});

test("event settings reject invalid payloads for authorized staff", async () => {
    const app = express();
    app.use(express.json({ limit: "20mb" }));
    app.use("/api/events", eventRoutes);

    const token = jwt.sign(
        { id: 88, role: "teacher" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    const response = await request(app)
        .post("/api/events/settings")
        .set("Authorization", `Bearer ${token}`)
        .send({
            party_date: "",
            party_time: "",
            venue: "",
            announcement: ""
        });

    assert.equal(response.status, 400);
    assert.equal(response.body.success, false);
    assert.match(response.body.message, /date, time and venue are required/i);
});
