const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        estimatedTime: {
            type: Number,
            required: true
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },

        // How much energy/focus the task DEMANDS — matched against the energy
        // you report at check-in. Deliberately separate from priority: a
        // high-priority task can be low-effort, and vice versa.
        effort: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },

        status: {
            type: String,
            enum: ["active", "completed", "deleted"],
            default: "active"
        },

        // "oneoff" tasks disappear once completed; "permanent" tasks
        // stay active forever and just tally how often they're done.
        type: {
            type: String,
            enum: ["oneoff", "permanent"],
            default: "oneoff"
        },

        completionCount: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Task", taskSchema);