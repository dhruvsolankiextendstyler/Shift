const mongoose = require("mongoose");

// A saved / bookmarked word (Word Forge) or article (Deep Read) belonging to a user.
// Stores the full content payload so it can be viewed offline or if third-party APIs
// are unavailable, and enforces uniqueness per user + type + itemId so rapid clicks
// cannot duplicate items.
const savedItemSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["word", "article"],
            required: true
        },

        // Unique identifier for the content item:
        // for words: lowercased word string
        // for articles: normalized article title or topic
        itemId: {
            type: String,
            required: true,
            trim: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300
        },

        // Full content snapshot:
        // For word: { word, meanings: [{ pos, definition, example }] }
        // For article: { title, topic, category, description, readingTime, blocks, takeaway, thumb, url }
        content: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index prevents any duplicate saves per user + type + itemId
savedItemSchema.index({ user: 1, type: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("SavedItem", savedItemSchema);
