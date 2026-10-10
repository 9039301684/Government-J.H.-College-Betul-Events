const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication token is required."
        });
    }

    const token = authHeader.slice(7);

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing from .env");

        return res.status(500).json({
            success: false,
            message: "Server configuration error."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const validRoles = ["student", "teacher", "principal", "admin"];

        if (
            !Number.isInteger(decoded.id) ||
            !validRoles.includes(decoded.role)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        // Backward compatibility with existing Student routes.
        if (decoded.role === "student") {
            req.student = {
                id: decoded.id,
                role: decoded.role
            };
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

function allowRoles(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication is required."
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource."
            });
        }

        next();
    };
}

module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.allowRoles = allowRoles;
