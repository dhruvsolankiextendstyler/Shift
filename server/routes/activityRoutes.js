const express = require("express");
const User = require("../models/User");

const router = express.Router();

// "Done" in Deep Read / Word Forge maps to a counter on the user.
const FIELD = { read: "readCount", vocab: "vocabCount" };

function counts(user) {
    return {
        readCount: user.readCount || 0,
        vocabCount: user.vocabCount || 0
    };
}

// Current downtime counts (Insights reads this).
router.get("/", async (req, res) => {
    try {
        const user = await User.findById(req.userId).select(
            "readCount vocabCount"
        );
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(counts(user));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log one finished downtime session — Deep Read or Word Forge "Done".
router.post("/log", async (req, res) => {
    try {
        const field = FIELD[req.body.kind];
        if (!field) {
            return res.status(400).json({ error: "Unknown activity kind" });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $inc: { [field]: 1 } },
            { new: true }
        ).select("readCount vocabCount");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(counts(user));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
