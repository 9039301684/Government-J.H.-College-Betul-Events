const express = require("express");
const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/authMiddleware");

const router = express.Router();

function validateDate(dateString) {
    if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return null;
    }

    const [year, month, day] = dateString.split("-").map(Number);
    if (year < 1) {
        return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return dateString;
}

function validateTime(timeString) {
    return typeof timeString === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(timeString);
}

function isOptionalText(value) {
    return value === undefined || value === null || typeof value === "string";
}

router.get("/settings", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, party_date, party_time, venue, announcement, updated_at
             FROM event_settings
             WHERE id = 1
             LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Event settings not found."
            });
        }

        return res.json({
            success: true,
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Get event settings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to load event settings."
        });
    }
});

router.post("/settings", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const { party_date, party_time, venue, announcement } = req.body;
        const eventDate = validateDate(party_date);

        if (!eventDate || !validateTime(party_time) || typeof venue !== "string" || !venue.trim() || venue.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "A valid event date, time and venue are required."
            });
        }

        const cleanVenue = venue.trim();
        const cleanAnnouncement = typeof announcement === "string" ? announcement.trim() : "";

        const result = await pool.query(
            `INSERT INTO event_settings (id, party_date, party_time, venue, announcement, updated_at)
             VALUES (1, $1, $2, $3, $4, NOW())
             ON CONFLICT (id)
             DO UPDATE SET party_date = EXCLUDED.party_date,
                           party_time = EXCLUDED.party_time,
                           venue = EXCLUDED.venue,
                           announcement = EXCLUDED.announcement,
                           updated_at = NOW()
             RETURNING id, party_date, party_time, venue, announcement, updated_at`,
            [eventDate, party_time, cleanVenue, cleanAnnouncement || null]
        );

        return res.json({
            success: true,
            message: "Event settings updated successfully.",
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Create event settings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update event settings."
        });
    }
});

router.put("/settings", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const { party_date, party_time, venue, announcement } = req.body;
        const eventDate = validateDate(party_date);

        if (!eventDate || !validateTime(party_time) || typeof venue !== "string" || !venue.trim() || venue.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "A valid event date, time and venue are required."
            });
        }

        const cleanVenue = venue.trim();
        const cleanAnnouncement = typeof announcement === "string" ? announcement.trim() : "";

        const result = await pool.query(
            `INSERT INTO event_settings (id, party_date, party_time, venue, announcement, updated_at)
             VALUES (1, $1, $2, $3, $4, NOW())
             ON CONFLICT (id)
             DO UPDATE SET party_date = EXCLUDED.party_date,
                           party_time = EXCLUDED.party_time,
                           venue = EXCLUDED.venue,
                           announcement = EXCLUDED.announcement,
                           updated_at = NOW()
             RETURNING id, party_date, party_time, venue, announcement, updated_at`,
            [eventDate, party_time, cleanVenue, cleanAnnouncement || null]
        );

        return res.json({
            success: true,
            message: "Event settings updated successfully.",
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Update event settings error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update event settings."
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, description, event_date, start_time, venue, category,
                   cover_image, is_published, created_at, updated_at
            FROM events
            WHERE is_published = TRUE
            ORDER BY event_date ASC, created_at DESC
        `);

        return res.json({
            success: true,
            count: result.rows.length,
            events: result.rows
        });
    } catch (error) {
        console.error("List events error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load events."
        });
    }
});

router.get("/admin", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, description, event_date, start_time, venue, category,
                   cover_image, is_published, created_at, updated_at
            FROM events
            ORDER BY event_date ASC, created_at DESC
        `);

        return res.json({
            success: true,
            count: result.rows.length,
            events: result.rows
        });
    } catch (error) {
        console.error("List admin events error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load events."
        });
    }
});

router.get("/admin/:id", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, description, event_date, start_time, venue, category,
                    cover_image, is_published, created_at, updated_at
             FROM events
             WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        return res.json({
            success: true,
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Get admin event by id error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load event details."
        });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, description, event_date, start_time, venue, category,
                    cover_image, is_published, created_at, updated_at
             FROM events
             WHERE id = $1 AND is_published = TRUE`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        return res.json({
            success: true,
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Get event by id error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to load event details."
        });
    }
});

router.post("/", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const {
            title,
            description,
            event_date,
            start_time,
            venue,
            category,
            cover_image,
            is_published
        } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            title.trim().length > 150 ||
            typeof event_date !== "string" ||
            !validateDate(event_date) ||
            typeof venue !== "string" ||
            !venue.trim() ||
            venue.trim().length > 200 ||
            (typeof category === "string" && category.trim().length > 80) ||
            (start_time !== undefined && start_time !== null && start_time !== "" && !validateTime(start_time)) ||
            !isOptionalText(description) ||
            !isOptionalText(category) ||
            !isOptionalText(cover_image) ||
            (is_published !== undefined && typeof is_published !== "boolean")
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide a title, valid event date, venue, and valid optional event fields."
            });
        }

        const cleanDate = validateDate(event_date);
        const cleanTitle = title.trim();
        const cleanDescription = typeof description === "string" ? description.trim() : "";
        const cleanVenue = venue.trim();
        const cleanCategory = typeof category === "string" && category.trim() ? category.trim() : "General";
        const cleanCoverImage = typeof cover_image === "string" ? cover_image.trim() : null;
        const published = is_published === false ? false : true;

        const result = await pool.query(
            `INSERT INTO events (title, description, event_date, start_time, venue, category, cover_image, is_published)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, title, description, event_date, start_time, venue, category, cover_image, is_published, created_at, updated_at`,
            [
                cleanTitle,
                cleanDescription || null,
                cleanDate,
                typeof start_time === "string" && start_time ? start_time : null,
                cleanVenue,
                cleanCategory,
                cleanCoverImage || null,
                published
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Event created successfully.",
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Create event error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to create the event."
        });
    }
});

router.patch("/:id", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const invalidField = Object.entries(req.body).some(([key, value]) => {
            if (key === "event_date") return !validateDate(value);
            if (key === "title") return typeof value !== "string" || !value.trim() || value.trim().length > 150;
            if (key === "venue") return typeof value !== "string" || !value.trim() || value.trim().length > 200;
            if (key === "description" || key === "cover_image") return !isOptionalText(value);
            if (key === "category") return !isOptionalText(value) || (typeof value === "string" && value.trim().length > 80);
            if (key === "start_time") {
                return value !== null && value !== "" && !validateTime(value);
            }
            if (key === "is_published") return typeof value !== "boolean";
            return false;
        });

        if (invalidField) {
            return res.status(400).json({
                success: false,
                message: "One or more event fields are invalid."
            });
        }

        const existing = await pool.query(
            `SELECT id FROM events WHERE id = $1`,
            [req.params.id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        const updates = [];
        const values = [];
        let index = 1;

        const fieldMap = {
            title: "title",
            description: "description",
            event_date: "event_date",
            start_time: "start_time",
            venue: "venue",
            category: "category",
            cover_image: "cover_image",
            is_published: "is_published"
        };

        Object.entries(fieldMap).forEach(([key, dbField]) => {
            if (key in req.body) {
                updates.push(`${dbField} = $${index}`);
                index += 1;
                let value = req.body[key];

                if (key === "event_date") {
                    value = validateDate(value);
                }

                if (key === "start_time" && value === "") {
                    value = null;
                }

                if (key === "title") {
                    value = typeof value === "string" ? value.trim() : value;
                }

                if (key === "venue") {
                    value = typeof value === "string" ? value.trim() : value;
                }

                if (key === "category") {
                    value = typeof value === "string" && value.trim() ? value.trim() : "General";
                }

                if (key === "description") {
                    value = typeof value === "string" ? value.trim() || null : value;
                }

                if (key === "cover_image") {
                    value = typeof value === "string" ? value.trim() || null : value;
                }

                if (key === "is_published") {
                    value = Boolean(value);
                }

                values.push(value);
            }
        });

        if (!updates.length) {
            return res.status(400).json({
                success: false,
                message: "No valid event updates were supplied."
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(req.params.id);

        const result = await pool.query(
            `UPDATE events
             SET ${updates.join(", ")}
             WHERE id = $${index}
             RETURNING id, title, description, event_date, start_time, venue, category, cover_image, is_published, created_at, updated_at`,
            values
        );

        return res.json({
            success: true,
            message: "Event updated successfully.",
            event: result.rows[0]
        });
    } catch (error) {
        console.error("Update event error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update the event."
        });
    }
});

router.delete("/:id", authenticateToken, allowRoles("admin", "principal", "teacher"), async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM events WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Event not found."
            });
        }

        return res.json({
            success: true,
            message: "Event deleted successfully."
        });
    } catch (error) {
        console.error("Delete event error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to delete the event."
        });
    }
});

module.exports = router;
