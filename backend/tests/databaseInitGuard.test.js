const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const initializerPath = path.join(__dirname, "..", "scripts", "initializeDatabase.js");

function runInitializer(overrides) {
    return spawnSync(process.execPath, [initializerPath], {
        encoding: "utf8",
        env: {
            ...process.env,
            DB_HOST: "127.0.0.1",
            DB_PORT: "1",
            DB_NAME: "jhcollege_events_test",
            NODE_ENV: "development",
            DB_INIT_CONFIRM: "",
            ...overrides
        }
    });
}

function runScript(scriptName, overrides) {
    const scriptPath = path.join(__dirname, "..", "scripts", scriptName);
    return spawnSync(process.execPath, [scriptPath], {
        encoding: "utf8",
        env: {
            ...process.env,
            DB_HOST: "database.example.invalid",
            DB_PORT: "1",
            DB_NAME: "college_database",
            NODE_ENV: "development",
            DB_INIT_CONFIRM: "college_database",
            DB_ADMIN_SETUP_CONFIRM: "college_database",
            ...overrides
        }
    });
}

test("database initializer refuses to run without explicit test database confirmation", () => {
    const result = runInitializer({});

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restricted to a confirmed, non-production local/i);
});

test("account setup and credential check scripts refuse remote or non-test database targets", () => {
    for (const scriptName of ["createFirstAdmin.js", "resetAdminPassword.js", "checkAdminLogin.js"]) {
        const result = runScript(scriptName, {});

        assert.equal(result.status, 1, `${scriptName} should refuse the target`);
        assert.match(result.stderr, /restricted to a confirmed, non-production local/i);
    }
});

test("database initializer refuses production mode even with matching confirmation", () => {
    const result = runInitializer({
        NODE_ENV: "production",
        DB_INIT_CONFIRM: "jhcollege_events_test"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restricted to a confirmed, non-production local/i);
});

test("database initializer refuses any database name except the dedicated test database", () => {
    const result = runInitializer({
        DB_NAME: "college_database",
        DB_INIT_CONFIRM: "college_database"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restricted to a confirmed, non-production local/i);
});

test("database initializer refuses remote database hosts", () => {
    const result = runInitializer({
        DB_HOST: "database.example.invalid",
        DB_INIT_CONFIRM: "jhcollege_events_test"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /restricted to a confirmed, non-production local/i);
});
