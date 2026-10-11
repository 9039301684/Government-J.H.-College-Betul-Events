const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const pool = require("../db");
const eventRoutes = require("../routes/eventRoutes");
const galleryRoutes = require("../routes/galleryRoutes");

process.env.JWT_SECRET = "route-regression-test-secret";

const originalQuery = pool.query;
let queries;

function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/events", eventRoutes);
    app.use("/api/gallery", galleryRoutes);
    return app;
}

function tokenFor(role) {
    return jwt.sign({ id: 42, role }, process.env.JWT_SECRET);
}

function mockQuery(resolver) {
    pool.query = async (sql, values) => {
        queries.push({ sql, values });
        return resolver(sql, values);
    };
}

test.beforeEach(() => {
    queries = [];
    mockQuery(() => {
        throw new Error("Unexpected database query in route regression test");
    });
});

test.after(() => {
    pool.query = originalQuery;
});

test("public event listing always filters out unpublished events", async () => {
    mockQuery((sql) => {
        assert.match(sql, /WHERE is_published = TRUE/i);
        return {
            rows: [{ id: 1, title: "Published event", is_published: true }]
        };
    });

    const response = await request(createApp()).get("/api/events?published=false");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.events.map((event) => event.is_published), [true]);
    assert.equal(queries.length, 1);
});

test("authorized staff can retrieve unpublished event drafts", async () => {
    mockQuery((sql) => {
        assert.doesNotMatch(sql, /WHERE\s+is_published/i);
        return {
            rows: [
                { id: 1, title: "Published event", is_published: true },
                { id: 2, title: "Draft event", is_published: false }
            ]
        };
    });

    const response = await request(createApp())
        .get("/api/events/admin")
        .set("Authorization", `Bearer ${tokenFor("admin")}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.events.some((event) => event.is_published === false), true);
    assert.equal(queries.length, 1);
});

test("public users cannot retrieve the admin event list", async () => {
    const response = await request(createApp()).get("/api/events/admin");

    assert.equal(response.status, 401);
    assert.equal(queries.length, 0);
});

test("public event detail lookup cannot retrieve an unpublished draft", async () => {
    mockQuery((sql) => {
        assert.match(sql, /WHERE id = \$1 AND is_published = TRUE/i);
        return { rows: [] };
    });

    const response = await request(createApp()).get("/api/events/2");

    assert.equal(response.status, 404);
    assert.equal(queries.length, 1);
});

test("authorized staff can retrieve an unpublished event by ID", async () => {
    mockQuery((sql) => {
        assert.match(sql, /WHERE id = \$1/i);
        assert.doesNotMatch(sql, /is_published\s*=\s*TRUE/i);
        return { rows: [{ id: 2, title: "Draft event", is_published: false }] };
    });

    const response = await request(createApp())
        .get("/api/events/admin/2")
        .set("Authorization", `Bearer ${tokenFor("admin")}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.event.is_published, false);
    assert.equal(queries.length, 1);
});

test("invalid event PATCH dates are rejected before any database query", async () => {
    const response = await request(createApp())
        .patch("/api/events/7")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ event_date: "2026-02-30" });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("invalid event creation dates are rejected before any database query", async () => {
    const response = await request(createApp())
        .post("/api/events")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ title: "Test event", event_date: "not-a-date", venue: "Test venue" });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("invalid event fields are rejected before database updates", async () => {
    for (const body of [
        { is_published: "false" },
        { start_time: "25:70" },
        { title: "" },
        { venue: 12 }
    ]) {
        const response = await request(createApp())
            .patch("/api/events/7")
            .set("Authorization", `Bearer ${tokenFor("admin")}`)
            .send(body);

        assert.equal(response.status, 400);
        assert.equal(queries.length, 0);
    }
});

test("empty optional event times are stored as null", async () => {
    mockQuery((sql, values) => {
        if (/^SELECT id FROM events/i.test(sql)) {
            return { rows: [{ id: 7 }] };
        }

        assert.match(sql, /UPDATE events/i);
        assert.equal(values[0], null);
        return { rows: [{ id: 7, start_time: null }] };
    });

    const response = await request(createApp())
        .patch("/api/events/7")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ start_time: "" });

    assert.equal(response.status, 200);
    assert.equal(response.body.event.start_time, null);
});

test("invalid album event dates are rejected before insertion", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ year: 2026, title: "Test album", event_date: "2026-02-30" });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("overlong album title and photographer are rejected before insertion", async () => {
    const response = await request(createApp())
        .post("/api/gallery/albums")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({
            year: 2026,
            title: "A".repeat(151),
            photographer: "Photographer"
        });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("invalid album event dates are rejected before update", async () => {
    const response = await request(createApp())
        .patch("/api/gallery/albums/3")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ event_date: "not-a-date" });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("non-admin roles cannot edit photo captions", async () => {
    const response = await request(createApp())
        .patch("/api/gallery/albums/3/photos/8")
        .set("Authorization", `Bearer ${tokenFor("teacher")}`)
        .send({ caption: "Updated caption" });

    assert.equal(response.status, 403);
    assert.equal(queries.length, 0);
});

test("overlong photo captions are rejected before update", async () => {
    const response = await request(createApp())
        .patch("/api/gallery/albums/3/photos/8")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ caption: "x".repeat(201) });

    assert.equal(response.status, 400);
    assert.equal(queries.length, 0);
});

test("valid photo caption edits use parameterized SQL", async () => {
    mockQuery((sql, values) => {
        assert.match(sql, /UPDATE annual_party_photos/i);
        assert.match(sql, /SET caption = \$1/i);
        assert.match(sql, /WHERE id = \$2 AND album_id = \$3/i);
        assert.deepEqual(values, ["Updated caption", "8", "3"]);
        return {
            rows: [{ id: 8, album_id: 3, caption: "Updated caption" }]
        };
    });

    const response = await request(createApp())
        .patch("/api/gallery/albums/3/photos/8")
        .set("Authorization", `Bearer ${tokenFor("admin")}`)
        .send({ caption: " Updated caption " });

    assert.equal(response.status, 200);
    assert.equal(response.body.photo.caption, "Updated caption");
    assert.equal(queries.length, 1);
});
