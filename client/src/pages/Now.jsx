import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import ReadAnything from "../components/ReadAnything";

function Now({ active = true }) {
    const navigate = useNavigate();

    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState("");
    const [time, setTime] = useState("");

    const [sessionId, setSessionId] = useState("");
    const [actionId, setActionId] = useState("");
    const [recommendation, setRecommendation] = useState(null);

    const [message, setMessage] = useState("");
    const [showFeedback, setShowFeedback] = useState(false);
    const [loading, setLoading] = useState(false);
    const [noTasks, setNoTasks] = useState(false);

    const handleSubmit = async () => {
        if (!mood || !energy || !time) {
            setMessage("Give us all three first — then we'll move.");
            return;
        }

        setLoading(true);
        setNoTasks(false);

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
                // No tasks in the pool yet — point them at Tasks.
                if (recommendationResponse.status === 404) {
                    setNoTasks(true);
                    setMessage("");
                    return;
                }
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

            // Permanent tasks stay in the pool; completing one just bumps the tally.
            await apiFetch(`/tasks/${recommendation._id}`, {
                method: "PUT",
                body: JSON.stringify(
                    recommendation.type === "permanent"
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

            setMessage("Skipped — no pressure. Try another move.");
        } catch (error) {
            console.error(error);
            setMessage("Couldn't skip that one. Give it another go.");
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

            setMessage("Locked in ⚡ See you at the next shift.");
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
        setNoTasks(false);
    };

    return (
        <div className="now-page">

            {!recommendation && (
                <section className="checkin-card">

                    <div className="hero">
                        <p className="eyebrow">SHIFT ⚡ MOMENTUM ON DEMAND</p>

                        <h1>One move. That's all it takes.</h1>

                        <p className="subtitle">
                            Tell us where your head's at. We'll hand
                            you the single thing worth doing right now.
                        </p>
                    </div>

                    <div className="checkin-section">
                        <h2>Where's your head at?</h2>

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
                        <h2>How's the tank?</h2>

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
                        <h2>Got a minute? Or a few?</h2>

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

                    {noTasks && (
                        <div className="empty-state">
                            <p className="message">
                                Your pool's empty — add a task and
                                SHIFT has something to hand you.
                            </p>
                            <button
                                className="secondary-button"
                                onClick={() => navigate("/tasks")}
                            >
                                GO TO TASKS →
                            </button>
                        </div>
                    )}

                    <button
                        className="shift-button"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "FINDING YOUR MOVE..." : "SHIFT →"}
                    </button>

                </section>
            )}

            {recommendation && !actionId && (
                <section className="recommendation-card">

                    <p className="eyebrow">✦ YOUR NEXT MOVE</p>

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
                        LET'S GO ⚡
                    </button>

                </section>
            )}

            {recommendation && actionId && !showFeedback && (
                <section className="recommendation-card">

                    <p className="eyebrow">⏱ IN MOTION</p>

                    <h1>{recommendation.title}</h1>

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

                    <p className="eyebrow">✧ QUICK GUT CHECK</p>

                    <h1>Did that shift something?</h1>

                    <div className="feedback-buttons">
                        <button
                            className="fb-better"
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
                            className="fb-worse"
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

            <ReadAnything active={active} />
        </div>
    );
}

export default Now;