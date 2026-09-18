import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

function History() {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await apiFetch("/actions");
                const data = await response.json();
                setActions(data);
            } catch (error) {
                console.error("Failed to load history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return <p>Loading history...</p>;
    }

    return (
        <div className="history-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">YOUR JOURNEY</p>
                    <h1>History</h1>
                    <p className="page-description">
                        A record of the moves you've made.
                    </p>
                </div>

                <div className="task-count">
                    {actions.length}
                    <span> actions</span>
                </div>
            </div>

            {actions.length === 0 ? (
                <div className="empty-state">
                    <h2>No history yet.</h2>
                    <p>Your completed and skipped actions will appear here.</p>
                </div>
            ) : (
                <div className="history-list">
                    {actions.map((action) => (
                        <div className="history-card" key={action._id}>
                            <div className="history-main">
                                <div className="history-top">
                                    <h3>
                                        {action.taskId?.title ||
                                            "Unknown Task"}
                                    </h3>

                                    <span
                                        className={`status-badge ${action.status}`}
                                    >
                                        {action.status}
                                    </span>
                                </div>

                                <p className="history-meta">
                                    {action.taskId?.category ||
                                        "Unknown"}{" "}
                                    •{" "}
                                    {action.taskId?.estimatedTime || 0} min
                                </p>

                                <p className="history-state">
                                    {action.sessionId?.mood}{" "}
                                    •{" "}
                                    {action.sessionId?.energy} energy{" "}
                                    •{" "}
                                    {action.sessionId?.availableTime} min
                                    available
                                </p>
                            </div>

                            <div className="history-feedback">
                                {action.feedback ? (
                                    <>
                                        <span className="feedback-label">
                                            STATE SHIFT
                                        </span>

                                        <span
                                            className={`feedback-value ${action.feedback}`}
                                        >
                                            {action.feedback}
                                        </span>
                                    </>
                                ) : (
                                    <span className="no-feedback">
                                        No feedback
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default History;