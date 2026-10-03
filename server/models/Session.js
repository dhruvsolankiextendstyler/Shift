const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        category: {
            type: String,
            trim: true,
            default: null
        },

        mood: {
            type: String,
            trim: true,
            default: null
        },

        energy: {
            type: String,
            trim: true,
            default: null
        },

        availableTime: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Session", sessionSchema);