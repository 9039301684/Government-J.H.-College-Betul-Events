const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "automated-test-only-secret";

const {
    authenticateToken,
    allowRoles
} = require("../middleware/authMiddleware");

function createResponse() {
    return {
        statusCode: 200,
        body: null,

        status(code) {
            this.statusCode = code;
            return this;
        },

        json(data) {
            this.body = data;
            return this;
        }
    };
}

test("rejects requests without a Bearer token", () => {
    const req = { headers: {} };
    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("rejects an invalid JWT", () => {
    const req = {
        headers: {
            authorization: "Bearer invalid.token.value"
        }
    };

    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("accepts a valid JWT and sets the user identity", () => {
    const token = jwt.sign(
        { id: 42, role: "student" },
        process.env.JWT_SECRET
    );

    const req = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };

    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.user, { id: 42, role: "student" });
    assert.deepEqual(req.student, { id: 42, role: "student" });
});

test("blocks a role that is not allowed", () => {
    const req = {
        user: { id: 42, role: "student" }
    };

    const res = createResponse();
    let nextCalled = false;

    allowRoles("admin")(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test("allows an authorized role", () => {
    const req = {
        user: { id: 7, role: "admin" }
    };

    const res = createResponse();
    let nextCalled = false;

    allowRoles("admin")(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
});

test("rejects an expired JWT", () => {
    const token = jwt.sign(
        { id: 42, role: "student" },
        process.env.JWT_SECRET,
        { expiresIn: -1 }
    );

    const req = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };

    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("rejects a JWT with an invalid user ID", () => {
    const token = jwt.sign(
        { id: "not-a-number", role: "student" },
        process.env.JWT_SECRET
    );

    const req = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };

    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("rejects a JWT with an unsupported role", () => {
    const token = jwt.sign(
        { id: 42, role: "superadmin" },
        process.env.JWT_SECRET
    );

    const req = {
        headers: {
            authorization: `Bearer ${token}`
        }
    };

    const res = createResponse();
    let nextCalled = false;

    authenticateToken(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test("rejects requests when authentication is missing", () => {
    const req = {};

    const res = createResponse();
    let nextCalled = false;

    allowRoles("admin")(req, res, () => {
        nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.equal(res.body.success, false);
});
