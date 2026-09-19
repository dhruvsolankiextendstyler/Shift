import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import ErrorState from "../components/ErrorState";

function History() {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchHistory = async () => {
        setLoading(true);
        setError(false);
        try {
            const response = await apiFetch("/actions");
            if (!response.ok) throw new Error("Request failed");
            setActions(await response.json());
        } catch (err) {
            console.error("Failed to load history:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    if (loading) {
        return <p className="message">Pulling up your moves...</p>;
    }

    if (error) {
        return <ErrorState onRetry={fetchHistory} />;
    }

    return (
        <div className="history-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">↺ THE TRAIL YOU'VE LEFT</p>
                    <h1>History</h1>
                    <p className="page-description">
                        Every move you've made, start to finish.
                    </p>
                </div>

                <div className="task-count">
                    {actions.length}
                    <span> actions</span>
                </div>
            </div>

            {actions.length === 0 ? (
                <div className="empty-state">
                    <h2>Nothing here yet.</h2>
                    <p>Make your first move and it'll show up right here.</p>
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