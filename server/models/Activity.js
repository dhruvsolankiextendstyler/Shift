const mongoose = require("mongoose");

// One finished downtime session — a Deep Read topic or a Word Forge word the
// user hit "Done" on. This is the per-activity, DATED record that the old
// User.readCount/vocabCount counters couldn't be: it carries a timestamp and
// the word/topic, so the same data feeds the Insights downtime totals AND the
// History calendar (grouped by local date). Mirrors the Action model's
// per-user shape; kept separate because an Action requires a task + session.
const activitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["read", "vocab"],
            required: true
        },

        // The topic (Deep Read) or word (Word Forge) — shown in the calendar's
        // day detail. Optional so a log never fails on a missing title.
        title: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200
        },

        completedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Activity", activitySchema);
