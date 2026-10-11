const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../db");
const galleryRoutes = require("../routes/galleryRoutes");

process.env.JWT_SECRET = "gallery-upload-test-secret";

const originalQuery = pool.query;
const originalConnect = pool.connect;
let insertedPhotos;
let nextPhotoId;
let photoCountAtTransactionStart;

function createApp() {
    const app = express();
    app.use(express.json({ limit: "20mb" }));
    app.use("/api/gallery", galleryRoutes);
    app.use((error, req, res, next) => {
        if (error.type === "entity.too.large") {
            return res.status(413).json({ success: false, message: "Request body exceeds the allowed size." });
        }

        return next(error);
    });
    return app;
}

function adminToken() {
    return jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET);
}

function pngData() {
    return "data:image/png;base64,iVBORw0KGgo=";
}

test.beforeEach(() => {
    insertedPhotos = [];
    nextPhotoId = 1;
    photoCountAtTransactionStart = 0;
    pool.query = async (sql, values = []) => {
        if (sql === "BEGIN") {
            photoCountAtTransactionStart = insertedPhotos.length;
            return { rows: [] };
        }

        if (sql === "COMMIT") {
            return { rows: [] };
        }

        if (sql === "ROLLBACK") {
            insertedPhotos.length = photoCountAtTransactionStart;
            return { rows: [] };
        }

        if (sql.includes("SELECT id FROM annual_party_albums")) {
            return { rows: [{ id: Number(values[0]) }] };
        }

        if (sql.includes("INSERT INTO annual_party_photos")) {
            const photo = {
                id: nextPhotoId++,
                album_id: Number(values[0]),
                image_data: values[1],
                caption: values[2],
                sort_order: values[3]
            };
            insertedPhotos.push(photo);
            return { rows: [photo] };
        }

        throw new Error(`Unexpected query in gallery upload test: ${sql}`);
    };
    pool.connect = async () => ({
        query: (...args) => pool.query(...args),
        release() {}
    });
});

test.after(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
});

test("accepts multiple supported photos and preserves their captions", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums/1/photos")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({
            photos: [
                { imageData: pngData(), caption: "Opening ceremony" },
                { imageData: pngData(), caption: "Group photo" }
            ]
        });

    assert.equal(response.status, 201);
    assert.equal(response.body.photos.length, 2);
    assert.deepEqual(insertedPhotos.map((photo) => photo.caption), ["Opening ceremony", "Group photo"]);
});

test("rolls back a multiple-photo upload when a database insert fails", async () => {
    const mockQuery = pool.query;
    pool.query = async (sql, values) => {
        if (sql.includes("INSERT INTO annual_party_photos") && values[2] === "Trigger database error") {
            throw new Error("simulated insert failure");
        }

        return mockQuery(sql, values);
    };

    const response = await request(createApp())
        .post("/api/gallery/albums/1/photos")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({
            photos: [
                { imageData: pngData(), caption: "First valid image" },
                { imageData: pngData(), caption: "Trigger database error" }
            ]
        });

    assert.equal(response.status, 500);
    assert.equal(insertedPhotos.length, 0);
});

test("rejects unsupported and malformed image data without inserting photos", async () => {
    for (const imageData of [
        "data:image/svg+xml;base64,PHN2Zz4=",
        "data:image/png;base64,SGVsbG8="
    ]) {
        const response = await request(createApp())
            .post("/api/gallery/albums/1/photos")
            .set("Authorization", `Bearer ${adminToken()}`)
            .send({ photos: [{ imageData, caption: "Invalid" }] });

        assert.equal(response.status, 400);
        assert.equal(insertedPhotos.length, 0);
    }
});

test("rejects an invalid photo in a batch before inserting any photos", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums/1/photos")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({
            photos: [
                { imageData: pngData(), caption: "Valid" },
                { imageData: "not-an-image", caption: "Invalid" }
            ]
        });

    assert.equal(response.status, 400);
    assert.equal(insertedPhotos.length, 0);
});

test("rejects captions exceeding the database column limit", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums/1/photos")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ photos: [{ imageData: pngData(), caption: "a".repeat(201) }] });

    assert.equal(response.status, 400);
    assert.equal(insertedPhotos.length, 0);
});

test("rejects photo requests exceeding the configured JSON body limit", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums/1/photos")
        .set("Authorization", `Bearer ${adminToken()}`)
        .send({ photos: [{ imageData: "x".repeat(21 * 1024 * 1024) }] });

    assert.equal(response.status, 413);
    assert.equal(insertedPhotos.length, 0);
});
