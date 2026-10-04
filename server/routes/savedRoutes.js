const express = require("express");
const SavedItem = require("../models/SavedItem");

const router = express.Router();

const VALID_TYPES = new Set(["word", "article"]);

// GET /api/saved — list all saved items for the authenticated user, newest first.
// Optional query param: ?type=word or ?type=article
router.get("/", async (req, res) => {
    try {
        const query = { user: req.userId };
        if (req.query.type && VALID_TYPES.has(req.query.type)) {
            query.type = req.query.type;
        }

        const items = await SavedItem.find(query)
            .sort({ createdAt: -1 })
            .limit(500);

        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/saved/ids — get map of saved itemIds for fast client-side bookmark state lookup
router.get("/ids", async (req, res) => {
    try {
        const items = await SavedItem.find({ user: req.userId }).select("type itemId");
        const wordIds = [];
        const articleIds = [];

        for (const item of items) {
            if (item.type === "word") {
                wordIds.push(item.itemId);
            } else if (item.type === "article") {
                articleIds.push(item.itemId);
            }
        }

        res.json({ wordIds, articleIds });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/saved — save / bookmark a word or article (idempotent, no duplicates)
router.post("/", async (req, res) => {
    try {
        const { type, itemId, title, content } = req.body;

        if (!type || !VALID_TYPES.has(type)) {
            return res.status(400).json({ error: "Invalid type. Must be 'word' or 'article'." });
        }
        if (!itemId || typeof itemId !== "string" || !itemId.trim()) {
            return res.status(400).json({ error: "itemId is required." });
        }
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ error: "title is required." });
        }
        if (!content || typeof content !== "object") {
            return res.status(400).json({ error: "content payload is required." });
        }

        const normalizedItemId = itemId.trim().toLowerCase();

        // Idempotent upsert so multiple rapid clicks never create duplicates
        const item = await SavedItem.findOneAndUpdate(
            {
                user: req.userId,
                type,
                itemId: normalizedItemId
            },
            {
                user: req.userId,
                type,
                itemId: normalizedItemId,
                title: title.trim(),
                content
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/saved/:id — remove saved item by ID
router.delete("/:id", async (req, res) => {
    try {
        const item = await SavedItem.findOneAndDelete({
            _id: req.params.id,
            user: req.userId
        });

        if (!item) {
            return res.status(404).json({ error: "Saved item not found." });
        }

        res.json({ success: true, removedId: req.params.id, itemId: item.itemId, type: item.type });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE /api/saved — remove saved item by type + itemId
router.delete("/", async (req, res) => {
    try {
        const type = req.query.type || req.body?.type;
        const itemId = req.query.itemId || req.body?.itemId;

        if (!type || !itemId) {
            return res.status(400).json({ error: "type and itemId are required to unsave." });
        }

        const normalizedItemId = itemId.trim().toLowerCase();
        const item = await SavedItem.findOneAndDelete({
            user: req.userId,
            type,
            itemId: normalizedItemId
        });

        if (!item) {
            return res.status(404).json({ error: "Saved item not found." });
        }

        res.json({ success: true, removedId: item._id, itemId: item.itemId, type: item.type });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
