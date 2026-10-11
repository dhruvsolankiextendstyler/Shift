const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session"
            // Not required — manually-logged completed tasks have no session.
        },

        // Where the action originated: "shift" = recommended by the engine,
        // "manual" = user logged it themselves from History.
        source: {
            type: String,
            enum: ["shift", "manual"],
            default: "shift"
        },

        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true
        },

        status: {
            type: String,
            enum: ["started", "completed", "skipped"],
            default: "started"
        },

        feedback: {
            type: String,
            enum: ["better", "same", "worse", null],
            default: null
        },

        // Free-text note the user jots about how the move felt. Never used
        // for analysis/recommendation — just theirs to read back later.
        note: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        startedAt: {
            type: Date,
            default: Date.now
        },

        completedAt: {
            type: Date
        },

        // Actual focused time (minutes) the user spent actively working — the
        // task timer's accumulated active seconds at completion, EXCLUDING
        // paused and break time (see client timerBreak.calculateActiveWorkSeconds).
        // This, not the task's estimatedTime, is the source of truth for every
        // "time spent" statistic. null = unknown: historical records predating
        // this field, or a task resolved without a trustworthy timer reading
        // (e.g. marked done from History). Never derived from estimatedTime.
        actualMinutes: {
            type: Number,
            default: null,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Action", actionSchema);