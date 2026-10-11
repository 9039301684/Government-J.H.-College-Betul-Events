require("dotenv").config({
    path: require("path").join(__dirname, "..", ".env")
});

const assertLocalTestDatabase = require("./assertLocalTestDatabase");
let targetConfirmed = true;

try {
    assertLocalTestDatabase("DB_INIT_CONFIRM");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    targetConfirmed = false;
}

if (targetConfirmed) {
    const pool = require("../db");
    const initializeDatabase = require("../initDb");

    initializeDatabase()
        .then(() => {
            console.log("Event and gallery database tables initialized.");
        })
        .catch((error) => {
            console.error("Database initialization failed:", error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await pool.end();
        });
}
