import { useState } from "react";
import API_URL from "../services/api";

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
        setLoading(true);
        if (!mood || !energy || !time) {
            setMessage("Complete your check-in first.");
            return;
        }

        try {
            const sessionResponse = await fetch(
                `${API_URL}/sessions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mood,
                        energy,
                        availableTime: time
                    })
                }
            );

            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok) {
                throw new Error(sessionData.error);
            }

            setSessionId(sessionData._id);

            const recommendationResponse = await fetch(
                `${API_URL}/recommendation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
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
            setLoading(false);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(error.message);
            setLoading(false);
        }
    };

    const startAction = async () => {
        try {
            const response = await fetch(
                `${API_URL}/actions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        sessionId,
                        taskId: recommendation._id
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            setActionId(data._id);
            setMessage("Action started ⚡");
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        }
    };

    const completeAction = async () => {
        try {
            await fetch(
                `http://localhost:5000/api/actions/${actionId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "completed",
                        completedAt: new Date()
                    })
                }
            );

            await fetch(
                `http://localhost:5000/api/tasks/${recommendation._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "completed"
                    })
                }
            );

            setShowFeedback(true);
            setMessage("Completed. Did that shift your state?");
        } catch (error) {
            console.error(error);
            setMessage("Failed to complete action.");
        }
    };

    const skipAction = async () => {
        try {
            const response = await fetch(
                `http://localhost:5000/api/actions/${actionId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        status: "skipped"
                    })
                }
            );

            if (!response.ok) {
                throw new Error("Failed to skip action");
            }

            setMessage("Skipped.");
        } catch (error) {
            console.error(error);
            setMessage("Failed to skip action.");
        }
    };

    const submitFeedback = async (feedback) => {
        try {
            const response = await fetch(
                `http://localhost:5000/api/actions/${actionId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
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
        <div>
            <h1>SHIFT ⚡</h1>
            <p>Your state changes. Your next move shifts.</p>

            {!recommendation && (
                <>
                    <h2>How are you feeling?</h2>

                    <div>
                        {["low", "okay", "good", "great", "angry", "overwhelmed"].map(
                            (item) => (
                                <button
                                    key={item}
                                    onClick={() => setMood(item)}
                                >
                                    {item}
                                </button>
                            )
                        )}
                    </div>

                    <h2>Energy</h2>

                    <div>
                        {["low", "medium", "high"].map((item) => (
                            <button
                                key={item}
                                onClick={() => setEnergy(item)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <h2>Available time</h2>

                    <div>
                        {[5, 15, 30, 60].map((item) => (
                            <button
                                key={item}
                                onClick={() => setTime(item)}
                            >
                                {item === 60 ? "1 hour+" : `${item} min`}
                            </button>
                        ))}
                    </div>

                    <br />

                    <button onClick={handleSubmit} disabled={loading}>
                        {loading ? "SHIFTING..." : "SHIFT →"}
                    </button>
                </>
            )}

            {message && <p>{message}</p>}

            {recommendation && !actionId && (
                <div>
                    <hr />

                    <h2>Your Next Move</h2>

                    <h3>{recommendation.title}</h3>

                    <p>
                        {recommendation.category} •{" "}
                        {recommendation.estimatedTime} min
                    </p>

                    <button onClick={startAction}>
                        START ⚡
                    </button>
                </div>
            )}

            {recommendation && actionId && !showFeedback && (
                <div>
                    <hr />

                    <h2>Action in Progress</h2>

                    <h3>{recommendation.title}</h3>

                    <button onClick={completeAction}>
                        COMPLETE ✓
                    </button>

                    <button onClick={skipAction}>
                        SKIP
                    </button>
                </div>
            )}

            {showFeedback && (
                <div>
                    <hr />

                    <h2>Did that shift your state?</h2>

                    <button onClick={() => submitFeedback("better")}>
                        Better
                    </button>

                    <button onClick={() => submitFeedback("same")}>
                        Same
                    </button>

                    <button onClick={() => submitFeedback("worse")}>
                        Worse
                    </button>

                    <br />
                    <br />

                    <button onClick={resetShift}>
                        SHIFT AGAIN →
                    </button>
                </div>
            )}
        </div>
    );
}

export default Now;