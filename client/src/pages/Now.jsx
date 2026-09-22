import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { startActiveAction } from "../services/activeAction";
import ReadAnything from "../components/ReadAnything";

function Now({ active = true }) {
    const navigate = useNavigate();

    const [mood, setMood] = useState("");
    const [energy, setEnergy] = useState("");
    const [time, setTime] = useState("");

    const [sessionId, setSessionId] = useState("");
    const [recommendation, setRecommendation] = useState(null);

    const [message, setMessage] = useState("");
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

    // Start the task, then hand off to the app-level focus lock. Persisting
    // the action here is what freezes the whole app to complete/skip only —
    // and keeps it frozen across reloads. See FocusLock + App.jsx.
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

            startActiveAction({
                actionId: data._id,
                task: recommendation
            });
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        }
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

            {recommendation && (
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

            <ReadAnything active={active} />
        </div>
    );
}

export default Now;