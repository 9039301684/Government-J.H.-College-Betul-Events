const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const serverPath = path.join(__dirname, "..", "server.js");
const appPath = path.join(__dirname, "..", "app.js");

test("proxy trust follows the configured exact hop count", () => {
    for (const [hops, expected] of [["0", "false"], ["1", "1"]]) {
        const result = spawnSync(process.execPath, ["-e", `process.stdout.write(String(require(${JSON.stringify(appPath)}).get("trust proxy")))`], {
            encoding: "utf8",
            env: {
                ...process.env,
                NODE_ENV: "test",
                TRUST_PROXY_HOPS: hops
            }
        });

        assert.equal(result.status, 0, result.stderr);
        assert.equal(result.stdout, expected);
    }
});

test("invalid proxy trust configuration is rejected", () => {
    const result = spawnSync(process.execPath, ["-e", `require(${JSON.stringify(appPath)})`], {
        encoding: "utf8",
        env: {
            ...process.env,
            NODE_ENV: "test",
            TRUST_PROXY_HOPS: "all"
        }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /TRUST_PROXY_HOPS must be an integer from 0 to 10/i);
});

test("production startup refuses database connections without verified TLS", () => {
    const result = spawnSync(process.execPath, [serverPath], {
        encoding: "utf8",
        env: {
            ...process.env,
            NODE_ENV: "production",
            DB_HOST: "127.0.0.1",
            DB_PORT: "1",
            DB_NAME: "isolated_startup_guard_test",
            DB_USER: "startup_test",
            DB_PASSWORD: "synthetic-only-password",
            DB_SSL: "false",
            DB_SSL_REJECT_UNAUTHORIZED: "true",
            JWT_SECRET: "synthetic-startup-test-secret-at-least-32-bytes"
        }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must use TLS with certificate verification/i);
    assert.doesNotMatch(result.stderr, /synthetic-only-password|127\.0\.0\.1|isolated_startup_guard_test/i);
});
