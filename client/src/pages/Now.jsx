import { useState } from "react";
import { apiFetch } from "../services/api";

function Now() {
    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState("");
    const [time, setTime] = useState("");

    const [sessionId, setSessionId] = useState("");
    const [actionId, setActionId] = useState("");
    const [recommendation, setRecommendation] = useState(null);

    const [message, setMessage] = useState("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!mood || !energy || !time) {
            setMessage("Complete your check-in first.");
            return;
        }

        setLoading(true);

        try {
            const sessionResponse = await apiFetch("/sessions", {
                method: "POST",
                body: JSON.stringify({
                    mood,
                    energy,
                    availableTime: time
                })
            });

            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok) {
                throw new Error(sessionData.error);
            }

            setSessionId(sessionData._id);

            const recommendationResponse = await apiFetch(
                "/recommendation",
                {
                    method: "POST",
                    body: JSON.stringify({
                        sessionId: sessionData._id
                    })
                }
            );

            const recommendationData =
                await recommendationResponse.json();

            if (!recommendationResponse.ok) {
                throw new Error(recommendationData.error);
            }

            setRecommendation(recommendationData.task);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    const startAction = async () => {
        try {
            const response = await apiFetch("/actions", {
                method: "POST",
                body: JSON.stringify({
                    sessionId,
                    taskId: recommendation._id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            setActionId(data._id);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        }
    };

    const completeAction = async () => {
        try {
            const actionResponse = await apiFetch(
                `/actions/${actionId}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status: "completed",
                        completedAt: new Date()
                    })
                }
            );

            if (!actionResponse.ok) {
                throw new Error("Failed to complete action.");
            }

            await apiFetch(`/tasks/${recommendation._id}`, {
                method: "PUT",
                body: JSON.stringify({
                    status: "completed"
                })
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
            const response = await apiFetch(
                `/actions/${actionId}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        status: "skipped"
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to skip action.");
            }

            setMessage("Skipped.");
        } catch (error) {
            console.error(error);
            setMessage("Failed to skip action.");
        }
    };

    const submitFeedback = async (feedback) => {
        try {
            const response = await apiFetch(
                `/actions/${actionId}`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        feedback
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to save feedback");
            }

            setMessage("Feedback saved ⚡");
        } catch (error) {
            console.error(error);
            setMessage("Failed to save feedback.");
        }
    };

    const resetShift = () => {
        setMood("");
        setEnergy("");
        setTime("");
        setSessionId("");
        setActionId("");
        setRecommendation(null);
        setMessage("");
        setShowFeedback(false);
    };

    return (
        <div className="now-page">

            {!recommendation && (
                <section className="checkin-card">

                    <div className="hero">
                        <p className="eyebrow">SHIFT</p>

                        <h1>What should you do right now?</h1>

                        <p className="subtitle">
                            Tell us how you feel. We'll give you one
                            next move.
                        </p>
                    </div>

                    <div className="checkin-section">
                        <h2>How are you feeling?</h2>

                        <div className="option-grid">
                            {[
                                "low",
                                "okay",
                                "good",
                                "great",
                                "angry",
                                "overwhelmed"
                            ].map((item) => (
                                <button
                                    key={item}
                                    className={`option-button ${
                                        mood === item
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => setMood(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="checkin-section">
                        <h2>Energy</h2>

                        <div className="option-grid three">
                            {["low", "medium", "high"].map((item) => (
                                <button
                                    key={item}
                                    className={`option-button ${
                                        energy === item
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => setEnergy(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="checkin-section">
                        <h2>Available time</h2>

                        <div className="option-grid four">
                            {[5, 15, 30, 60].map((item) => (
                                <button
                                    key={item}
                                    className={`option-button ${
                                        time === item
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => setTime(item)}
                                >
                                    {item === 60
                                        ? "1 hour+"
                                        : `${item} min`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {message && (
                        <p className="message">{message}</p>
                    )}

                    <button
                        className="shift-button"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "SHIFTING..." : "SHIFT →"}
                    </button>

                </section>
            )}

            {recommendation && !actionId && (
                <section className="recommendation-card">

                    <p className="eyebrow">YOUR NEXT MOVE</p>

                    <h1>{recommendation.title}</h1>

                    <p className="task-meta">
                        {recommendation.category} •{" "}
                        {recommendation.estimatedTime} min •{" "}
                        {recommendation.priority} priority
                    </p>

                    <button
                        className="shift-button"
                        onClick={startAction}
                    >
                        START ⚡
                    </button>

                </section>
            )}

            {recommendation && actionId && !showFeedback && (
                <section className="recommendation-card">

                    <p className="eyebrow">ACTION IN PROGRESS</p>

                    <h1>{recommendation.title}</h1>

                    <div className="action-buttons">
                        <button
                            className="complete-button"
                            onClick={completeAction}
                        >
                            COMPLETE ✓
                        </button>

                        <button
                            className="skip-button"
                            onClick={skipAction}
                        >
                            SKIP
                        </button>
                    </div>

                    {message && (
                        <div>
                            <p className="message">{message}</p>

                            <button
                                className="secondary-button"
                                onClick={resetShift}
                            >
                                SHIFT AGAIN →
                            </button>
                        </div>
                    )}

                </section>
            )}

            {showFeedback && (
                <section className="recommendation-card">

                    <p className="eyebrow">ONE LAST THING</p>

                    <h1>Did that shift your state?</h1>

                    <div className="feedback-buttons">
                        <button
                            onClick={() =>
                                submitFeedback("better")
                            }
                        >
                            Better
                        </button>

                        <button
                            onClick={() =>
                                submitFeedback("same")
                            }
                        >
                            Same
                        </button>

                        <button
                            onClick={() =>
                                submitFeedback("worse")
                            }
                        >
                            Worse
                        </button>
                    </div>

                    {message && (
                        <p className="message">{message}</p>
                    )}

                    <button
                        className="secondary-button"
                        onClick={resetShift}
                    >
                        SHIFT AGAIN →
                    </button>

                </section>
            )}
        </div>
    );
}

export default Now;