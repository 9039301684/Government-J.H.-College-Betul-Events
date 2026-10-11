function assertLocalTestDatabase(confirmationVariable) {
    const databaseName = process.env.DB_NAME;
    const databaseHost = (process.env.DB_HOST || "localhost").trim().toLowerCase();
    const isLocalDatabase = ["localhost", "127.0.0.1", "::1"].includes(databaseHost);

    if (
        process.env.NODE_ENV === "production" ||
        databaseName !== "jhcollege_events_test" ||
        !isLocalDatabase ||
        process.env[confirmationVariable] !== databaseName
    ) {
        throw new Error(
            `Operation is restricted to a confirmed, non-production local jhcollege_events_test database (${confirmationVariable}).`
        );
    }
}

module.exports = assertLocalTestDatabase;
