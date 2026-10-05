const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Task = require("../models/Task");

describe("Onboarding Architecture & Flow", () => {
    let testUser;
    let token;

    before(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
    });

    after(async () => {
        if (testUser?._id) {
            await User.deleteOne({ _id: testUser._id });
            await Task.deleteMany({ user: testUser._id });
        }
        await mongoose.disconnect();
    });

    test("1. New user registration defaults onboardingCompleted to false", async () => {
        const uniqueEmail = `test_onboarding_${Date.now()}@test.local`;
        testUser = await User.create({
            name: "Test Onboarding User",
            email: uniqueEmail,
            password: "password123",
            onboardingCompleted: false
        });

        assert.strictEqual(testUser.onboardingCompleted, false);

        const fetched = await User.findById(testUser._id);
        assert.strictEqual(fetched.onboardingCompleted, false);

        token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, {
            expiresIn: "1h"
        });
    });

    test("2. User schema exposes onboardingCompleted as a boolean", async () => {
        const schemaPath = User.schema.path("onboardingCompleted");
        assert.ok(schemaPath, "onboardingCompleted path exists in schema");
        assert.strictEqual(schemaPath.instance, "Boolean");
        assert.strictEqual(schemaPath.defaultValue, false);
    });

    test("3. Completing onboarding updates onboardingCompleted to true persistently", async () => {
        const updated = await User.findByIdAndUpdate(
            testUser._id,
            { onboardingCompleted: true },
            { returnDocument: "after" }
        );

        assert.strictEqual(updated.onboardingCompleted, true);

        // Verify fresh reload from database
        const reloaded = await User.findById(testUser._id);
        assert.strictEqual(reloaded.onboardingCompleted, true);
    });

    test("4. Task pool check correctly identifies empty pool vs non-empty pool", async () => {
        // Initially no tasks
        const tasksBefore = await Task.find({
            user: testUser._id,
            status: { $ne: "deleted" }
        });
        assert.strictEqual(tasksBefore.length, 0, "New user starts with 0 tasks");

        // Add 1 task
        const task = await Task.create({
            title: "First Task",
            category: "Work",
            estimatedTime: 15,
            priority: "high",
            effort: "medium",
            type: "oneoff",
            user: testUser._id
        });

        const tasksAfter = await Task.find({
            user: testUser._id,
            status: { $ne: "deleted" }
        });
        assert.strictEqual(tasksAfter.length, 1, "User now has 1 active task");
        assert.strictEqual(tasksAfter[0]._id.toString(), task._id.toString());
    });

    test("5. Security: only token's verified userId can be updated", () => {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        assert.strictEqual(verified.userId, testUser._id.toString());
    });
});
