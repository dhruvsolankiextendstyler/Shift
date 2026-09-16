const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        mood: {
            type: String,
            required: true,
            trim: true
        },

        energy: {
            type: String,
            required: true,
            trim: true
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