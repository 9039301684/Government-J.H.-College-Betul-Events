const pool = require("./db");

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS event_settings (
            id INTEGER PRIMARY KEY,
            party_date DATE,
            party_time TIME,
            venue VARCHAR(200),
            announcement TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        INSERT INTO event_settings (id, party_date, party_time, venue, announcement, updated_at)
        VALUES (1, NULL, NULL, NULL, NULL, NOW())
        ON CONFLICT (id) DO NOTHING
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(150) NOT NULL,
            description TEXT,
            event_date DATE NOT NULL,
            start_time TIME,
            venue VARCHAR(200),
            category VARCHAR(80) DEFAULT 'General',
            cover_image TEXT,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS annual_party_albums (
            id SERIAL PRIMARY KEY,
            year INTEGER NOT NULL,
            title VARCHAR(150) NOT NULL,
            description TEXT,
            event_date DATE,
            photographer VARCHAR(120),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS annual_party_photos (
            id SERIAL PRIMARY KEY,
            album_id INTEGER NOT NULL REFERENCES annual_party_albums(id) ON DELETE CASCADE,
            image_data TEXT NOT NULL,
            caption VARCHAR(200),
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

module.exports = initializeDatabase;
