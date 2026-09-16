const express = require("express");
const Session = require("../models/Session");

const router = express.Router();

// CREATE SESSION
router.post("/", async (req, res) => {
    try {
        const session = await Session.create(req.body);

        res.status(201).json(session);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
});

// GET ALL SESSIONS
router.get("/", async (req, res) => {
    try {
        const sessions = await Session.find().sort({ createdAt: -1 });

        res.json(sessions);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;