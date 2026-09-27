const express = require("express");
const Activity = require("../models/Activity");

const router = express.Router();

const KINDS = new Set(["read", "vocab"]);

// Downtime totals, derived from the Activity records themselves — the same
// source of truth the History calendar reads, so the two can never disagree.
async function counts(userId) {
    const [readCount, vocabCount] = await Promise.all([
        Activity.countDocuments({ user: userId, type: "read" }),
        Activity.countDocuments({ user: userId, type: "vocab" })
    ]);
    return { readCount, vocabCount };
}

// Current downtime counts (Insights' "Downtime" card reads this).
router.get("/", async (req, res) => {
    try {
        res.json(await counts(req.userId));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dated downtime history (the History calendar reads this and merges it with
// task actions). Newest first; capped so a huge history can't blow up the
// response.
router.get("/history", async (req, res) => {
    try {
        const items = await Activity.find({ user: req.userId })
            .sort({ completedAt: -1 })
            .limit(1000)
            .select("type title completedAt");
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log one finished downtime session — Deep Read or Word Forge "Done".
router.post("/log", async (req, res) => {
    try {
        const { kind, title } = req.body;
        if (!KINDS.has(kind)) {
            return res.status(400).json({ error: "Unknown activity kind" });
        }

        await Activity.create({
            user: req.userId,
            type: kind,
            title: typeof title === "string" ? title.slice(0, 200) : ""
        });

        res.status(201).json(await counts(req.userId));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
