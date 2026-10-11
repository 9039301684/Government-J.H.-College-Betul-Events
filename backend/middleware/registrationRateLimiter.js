const { rateLimit } = require("express-rate-limit");

const registrationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many registration attempts. Please try again after 15 minutes."
    }
});

module.exports = registrationRateLimiter;
