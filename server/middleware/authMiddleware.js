const jwt = require("jsonwebtoken");

// Verifies the Bearer token and attaches the authenticated user id to
// the request. The user is derived from the token here so that routes
// never trust a user id supplied by the client.
function authMiddleware(req, res, next) {
    const header = req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
        return res.status(401).json({
            error: "Authentication required"
        });
    }

    const token = header.slice(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
}

module.exports = authMiddleware;
