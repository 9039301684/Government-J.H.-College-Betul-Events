const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET EVENT SETTINGS
router.get("/", async (req, res) => {
try {
const result = await pool.query(`             SELECT
                id,
                party_date,
                party_time,
                venue,
                announcement,
                updated_at
            FROM event_settings
            WHERE id = 1
            LIMIT 1
        `);


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

module.exports = router;
