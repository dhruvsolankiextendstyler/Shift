import { useState } from "react";
import { apiFetch } from "../services/api";
import { clearActiveAction, suspendSync } from "../services/activeAction";
import { reflectCompletionOnTask } from "../services/resolve";

// The frozen screen. While a task is STARTED this is the ONLY thing the app
// renders — no nav, no other page. Two moves out: complete or skip. Survives
// reload because the active task lives in localStorage, not React state.
function FocusLock({ actionId, task }) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [note, setNote] = useState("");
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

    // Only send the note when there's something in it — an empty box
    // shouldn't wipe a note added earlier.
    const notePatch = () => (note.trim() ? { note: note.trim() } : {});

    const completeAction = async () => {
        // Freeze the cross-device poll so it can't clear us mid-gut-check.
        suspendSync();
        try {
            const res = await putAction({
                status: "completed",
                completedAt: new Date(),
                ...notePatch()
            });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to complete action.");

            await reflectCompletionOnTask(task);

            setShowFeedback(true);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage("Failed to complete action.");
        }
    };

    const skipAction = async () => {
        suspendSync();
        try {
            const res = await putAction({
                status: "skipped",
                ...notePatch()
            });
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

                        <textarea
                            className="note-input"
                            placeholder="How'd it feel? Jot it down — just for you (optional)"
                            value={note}
                            maxLength={1000}
                            onChange={(e) => setNote(e.target.value)}
                        />

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
