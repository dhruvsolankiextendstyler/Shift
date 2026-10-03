const express = require("express");
const User = require("../models/User");

const router = express.Router();

// In-memory cache to avoid redundant database queries on rapid frontend re-renders
let cachedUserCount = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// GET /api/stats/public — returns aggregate registered user count only
router.get("/public", async (req, res) => {
    try {
        const now = Date.now();
        if (cachedUserCount !== null && (now - lastCacheTime) < CACHE_TTL_MS) {
            return res.json({ userCount: cachedUserCount });
        }

        const count = await User.countDocuments();
        cachedUserCount = count;
        lastCacheTime = now;

        res.json({ userCount: count });
    } catch (error) {
        console.error("Failed to count registered users:", error.message);
        res.status(500).json({ error: "Failed to fetch user count" });
    }
});

module.exports = router;
