import { useState } from "react";
import { apiFetch } from "../services/api";
import { clearActiveAction } from "../services/activeAction";

// The frozen screen. While a task is STARTED this is the ONLY thing the app
// renders — no nav, no other page. Two moves out: complete or skip. Survives
// reload because the active task lives in localStorage, not React state.
function FocusLock({ actionId, task }) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [message, setMessage] = useState("");

    // 404 = the action is gone server-side; releasing avoids a permanent trap.
    const putAction = async (body) => {
        const res = await apiFetch(`/actions/${actionId}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
        if (res.status === 404) {
            clearActiveAction();
            return null;
        }
        return res;
    };

    const completeAction = async () => {
        try {
            const res = await putAction({
                status: "completed",
                completedAt: new Date()
            });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to complete action.");

            // Permanent tasks stay in the pool; completing one just bumps the tally.
            await apiFetch(`/tasks/${task._id}`, {
                method: "PUT",
                body: JSON.stringify(
                    task.type === "permanent"
                        ? { incrementCompletion: true }
                        : { status: "completed" }
                )
            });

            setShowFeedback(true);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage("Failed to complete action.");
        }
    };

    const skipAction = async () => {
        try {
            const res = await putAction({ status: "skipped" });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to skip action.");
            clearActiveAction();
        } catch (error) {
            console.error(error);
            setMessage("Couldn't skip that one. Give it another go.");
        }
    };

    const submitFeedback = async (feedback) => {
        try {
            const res = await putAction({ feedback });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to save feedback");
            clearActiveAction();
        } catch (error) {
            console.error(error);
            setMessage("Failed to save feedback.");
        }
    };

    return (
        <div className="app">
            <div className="now-page">
                {!showFeedback ? (
                    <section className="recommendation-card">
                        <p className="eyebrow">⏱ IN MOTION</p>

                        <h1>{task.title}</h1>

                        <div className="action-buttons">
                            <button
                                className="complete-button"
                                onClick={completeAction}
                            >
                                NAILED IT ✓
                            </button>

                            <button
                                className="skip-button"
                                onClick={skipAction}
                            >
                                NOT THIS
                            </button>
                        </div>

                        {message && <p className="message">{message}</p>}
                    </section>
                ) : (
                    <section className="recommendation-card">
                        <p className="eyebrow">✧ QUICK GUT CHECK</p>

                        <h1>Did that shift something?</h1>

                        <div className="feedback-buttons">
                            <button
                                className="fb-better"
                                onClick={() => submitFeedback("better")}
                            >
                                Better
                            </button>

                            <button onClick={() => submitFeedback("same")}>
                                Same
                            </button>

                            <button
                                className="fb-worse"
                                onClick={() => submitFeedback("worse")}
                            >
                                Worse
                            </button>
                        </div>

                        {message && <p className="message">{message}</p>}
                    </section>
                )}
            </div>
        </div>
    );
}

export default FocusLock;
