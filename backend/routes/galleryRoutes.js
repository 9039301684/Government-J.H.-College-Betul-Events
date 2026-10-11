const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

function isValidImageData(imageData) {
    if (typeof imageData !== "string") {
        return false;
    }

    const match = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(imageData.trim());
    if (!match) {
        return false;
    }

    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.toString("base64") !== match[2]) {
        return false;
    }

    switch (match[1].toLowerCase()) {
        case "image/jpeg":
            return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        case "image/png":
            return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        case "image/gif":
            return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6));
        case "image/webp":
            return bytes.length >= 12 &&
                bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP";
        default:
            return false;
    }
}

function isValidDate(dateString) {
    if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const [year, month, day] = dateString.split("-").map(Number);
    if (year < 1) {
        return false;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;
}

function normalizeAlbumPayload(body) {
    const year = Number(body.year);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const eventDate = typeof body.event_date === "string" ? body.event_date : null;
    const photographer = typeof body.photographer === "string" ? body.photographer.trim() : "";

    return {
        year: Number.isInteger(year) ? year : null,
        title,
        description,
        eventDate,
        photographer
    };
}

async function attachAlbumPhotos(album) {
    const result = await pool.query(
        `SELECT id, album_id, image_data, caption, sort_order, created_at
         FROM annual_party_photos
         WHERE album_id = $1
         ORDER BY sort_order ASC, created_at ASC, id ASC`,
        [album.id]
    );

    return {
        ...album,
        photos: result.rows
    };
}

router.get("/albums", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, year, title, description, event_date, photographer, created_at, updated_at
            FROM annual_party_albums
            ORDER BY year DESC, created_at DESC
        `);

        const albums = await Promise.all(result.rows.map(attachAlbumPhotos));

        return res.json({
            success: true,
            count: albums.length,
            albums
        });
    } catch (error) {
        console.error("List annual gallery albums error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load annual party galleries."
        });
    }
});

router.get("/albums/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, year, title, description, event_date, photographer, created_at, updated_at
             FROM annual_party_albums
             WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Album not found."
            });
        }

        const album = await attachAlbumPhotos(result.rows[0]);

        return res.json({
            success: true,
            album
        });
    } catch (error) {
        console.error("Get gallery album error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load album details."
        });
    }
});

router.post("/albums", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const { year, title, description, eventDate, photographer } = normalizeAlbumPayload(req.body);

        if (
            req.body.event_date !== undefined &&
            req.body.event_date !== null &&
            req.body.event_date !== "" &&
            !isValidDate(req.body.event_date)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid album event date in YYYY-MM-DD format."
            });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: "A valid year for the annual party album is required."
            });
        }

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Album title is required."
            });
        }
        if (title.length > 150 || photographer.length > 120) {
            return res.status(400).json({
                success: false,
                message: "Album title must be 150 characters or fewer and photographer must be 120 characters or fewer."
            });
        }

        const result = await pool.query(
            `INSERT INTO annual_party_albums (year, title, description, event_date, photographer)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, year, title, description, event_date, photographer, created_at, updated_at`,
            [year, title, description || null, eventDate || null, photographer || null]
        );

        return res.status(201).json({
            success: true,
            message: "Annual party album created successfully.",
            album: {
                ...result.rows[0],
                photos: []
            }
        });
    } catch (error) {
        console.error("Create annual album error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to create the annual party album."
        });
    }
});

router.patch("/albums/:id", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const { year, title, description, eventDate, photographer } = normalizeAlbumPayload(req.body);

        if (
            req.body.event_date !== undefined &&
            req.body.event_date !== null &&
            req.body.event_date !== "" &&
            !isValidDate(req.body.event_date)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid album event date in YYYY-MM-DD format."
            });
        }

        if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid year."
            });
        }

        const existing = await pool.query(
            `SELECT id FROM annual_party_albums WHERE id = $1`,
            [req.params.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Album not found."
            });
        }

        const updateParts = [];
        const values = [];
        let index = 1;

        if (year !== null) {
            updateParts.push(`year = $${index++}`);
            values.push(year);
        }

        if ("title" in req.body && (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.trim().length > 150)) {
            return res.status(400).json({
                success: false,
                message: "Album title must be 1 to 150 characters."
            });
        }

        if ("photographer" in req.body && req.body.photographer !== null &&
            (typeof req.body.photographer !== "string" || req.body.photographer.trim().length > 120)) {
            return res.status(400).json({
                success: false,
                message: "Photographer must be 120 characters or fewer."
            });
        }

        if (typeof req.body.title === "string") {
            updateParts.push(`title = $${index++}`);
            values.push(req.body.title.trim());
        }

        if (typeof req.body.description === "string") {
            updateParts.push(`description = $${index++}`);
            values.push(req.body.description.trim() || null);
        }

        if (typeof req.body.event_date === "string" || req.body.event_date === null) {
            updateParts.push(`event_date = $${index++}`);
            values.push(req.body.event_date || null);
        }

        if (typeof req.body.photographer === "string" || req.body.photographer === null) {
            updateParts.push(`photographer = $${index++}`);
            values.push(req.body.photographer && req.body.photographer.trim() ? req.body.photographer.trim() : null);
        }

        if (updateParts.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid updates were supplied."
            });
        }

        updateParts.push(`updated_at = NOW()`);
        values.push(req.params.id);

        const result = await pool.query(
            `UPDATE annual_party_albums
             SET ${updateParts.join(", ")}
             WHERE id = $${index}
             RETURNING id, year, title, description, event_date, photographer, created_at, updated_at`,
            values
        );

        const album = await attachAlbumPhotos(result.rows[0]);

        return res.json({
            success: true,
            message: "Album updated successfully.",
            album
        });
    } catch (error) {
        console.error("Update annual album error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update the annual party album."
        });
    }
});

router.delete("/albums/:id", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM annual_party_albums WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Album not found."
            });
        }

        return res.json({
            success: true,
            message: "Album deleted successfully."
        });
    } catch (error) {
        console.error("Delete annual album error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to delete the annual party album."
        });
    }
});

router.post("/albums/:id/photos", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const albumCheck = await pool.query(
            `SELECT id FROM annual_party_albums WHERE id = $1`,
            [req.params.id]
        );

        if (albumCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Album not found."
            });
        }

        const photos = Array.isArray(req.body.photos) ? req.body.photos : [req.body];

        if (!photos.length) {
            return res.status(400).json({
                success: false,
                message: "At least one photo is required."
            });
        }

        const normalizedPhotos = photos.map((photo) => {
            if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
                return null;
            }

            const imageData = typeof photo.imageData === "string" ? photo.imageData.trim() : "";
            const caption = typeof photo.caption === "string" ? photo.caption.trim() : "";
            if (!isValidImageData(imageData) || caption.length > 200) {
                return null;
            }

            return { imageData, caption };
        });

        if (normalizedPhotos.some((photo) => photo === null)) {
            return res.status(400).json({
                success: false,
                message: "Each photo must be a valid JPEG, PNG, GIF or WebP image with a caption of 200 characters or fewer."
            });
        }

        const client = await pool.connect();
        const inserted = [];
        try {
            await client.query("BEGIN");
            for (let index = 0; index < normalizedPhotos.length; index += 1) {
                const { imageData, caption } = normalizedPhotos[index];
                const result = await client.query(
                    `INSERT INTO annual_party_photos (album_id, image_data, caption, sort_order)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id, album_id, image_data, caption, sort_order, created_at`,
                    [req.params.id, imageData, caption || null, index]
                );

                inserted.push(result.rows[0]);
            }
            await client.query("COMMIT");
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Gallery photo upload rollback failed:", rollbackError.message);
            }
            throw error;
        } finally {
            client.release();
        }

        if (!inserted.length) {
            return res.status(400).json({
                success: false,
                message: "No valid photo data was provided."
            });
        }

        return res.status(201).json({
            success: true,
            message: `${inserted.length} photo(s) added successfully.`,
            photos: inserted
        });
    } catch (error) {
        console.error("Add gallery photos error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to upload the selected photos."
        });
    }
});

router.delete("/albums/:id/photos/:photoId", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM annual_party_photos WHERE id = $1 AND album_id = $2 RETURNING id`,
            [req.params.photoId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Photo not found in the selected album."
            });
        }

        return res.json({
            success: true,
            message: "Photo removed successfully."
        });
    } catch (error) {
        console.error("Delete gallery photo error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to delete the selected photo."
        });
    }
});

router.patch("/albums/:id/photos/:photoId", authenticateToken, allowRoles("admin"), async (req, res) => {
    try {
        if (typeof req.body.caption !== "string" || req.body.caption.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Photo caption must be 200 characters or fewer."
            });
        }

        const caption = req.body.caption.trim();
        const result = await pool.query(
            `UPDATE annual_party_photos
             SET caption = $1
             WHERE id = $2 AND album_id = $3
             RETURNING id, album_id, caption`,
            [caption || null, req.params.photoId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Photo not found in the selected album."
            });
        }

        return res.json({
            success: true,
            message: "Photo caption updated successfully.",
            photo: result.rows[0]
        });
    } catch (error) {
        console.error("Update gallery photo caption error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update the photo caption."
        });
    }
});

module.exports = router;
