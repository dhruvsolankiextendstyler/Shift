import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { reflectCompletionOnTask } from "../services/resolve";
import ErrorState from "../components/ErrorState";

function History() {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const [busyId, setBusyId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteDraft, setNoteDraft] = useState("");

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

    // Resolve a move that was started but never finished (e.g. the app was
    // closed mid-task). Mirrors the focus lock's complete/skip.
    const resolveAction = async (action, status) => {
        setBusyId(action._id);
        try {
            const res = await apiFetch(`/actions/${action._id}`, {
                method: "PUT",
                body: JSON.stringify(
                    status === "completed"
                        ? { status, completedAt: new Date() }
                        : { status }
                )
            });
            if (!res.ok) throw new Error();
            if (status === "completed" && action.taskId) {
                await reflectCompletionOnTask(action.taskId);
            }
            await fetchHistory();
        } catch {
            setError(true);
        } finally {
            setBusyId(null);
        }
    };

    const startEditingNote = (action) => {
        setEditingNoteId(action._id);
        setNoteDraft(action.note || "");
    };

    const saveNote = async (action) => {
        setBusyId(action._id);
        try {
            const res = await apiFetch(`/actions/${action._id}`, {
                method: "PUT",
                body: JSON.stringify({ note: noteDraft.trim() })
            });
            if (!res.ok) throw new Error();
            setEditingNoteId(null);
            setNoteDraft("");
            await fetchHistory();
        } catch {
            setError(true);
        } finally {
            setBusyId(null);
        }
    };

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
                            <div className="history-body">
                                <div className="history-main">
                                    <div className="history-top">
                                        <h3>
                                            {action.taskId?.title ||
                                                "Unknown Task"}
                                        </h3>

                                        <span
                                            className={`status-badge ${action.status}`}
                                        >
                                            {action.status === "started"
                                                ? "in progress"
                                                : action.status}
                                        </span>
                                    </div>

                                    <p className="history-meta">
                                        {action.taskId?.category ||
                                            "Unknown"}{" "}
                                        •{" "}
                                        {action.taskId?.estimatedTime || 0}{" "}
                                        min
                                    </p>

                                    <p className="history-state">
                                        {action.sessionId?.mood}{" "}
                                        •{" "}
                                        {action.sessionId?.energy} energy{" "}
                                        •{" "}
                                        {action.sessionId?.availableTime}{" "}
                                        min available
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

                            {/* Finish a move left hanging in "in progress". */}
                            {action.status === "started" && (
                                <div className="history-resolve">
                                    <button
                                        className="small-button"
                                        disabled={busyId === action._id}
                                        onClick={() =>
                                            resolveAction(
                                                action,
                                                "completed"
                                            )
                                        }
                                    >
                                        Mark done ✓
                                    </button>
                                    <button
                                        className="small-button"
                                        disabled={busyId === action._id}
                                        onClick={() =>
                                            resolveAction(action, "skipped")
                                        }
                                    >
                                        Skip
                                    </button>
                                </div>
                            )}

                            {/* Your own note — jotted now or added later. */}
                            {editingNoteId === action._id ? (
                                <div className="history-note editing">
                                    <textarea
                                        className="note-input"
                                        placeholder="How'd it feel? Just for you."
                                        value={noteDraft}
                                        maxLength={1000}
                                        autoFocus
                                        onChange={(e) =>
                                            setNoteDraft(e.target.value)
                                        }
                                    />
                                    <div className="note-actions">
                                        <button
                                            className="small-button"
                                            disabled={busyId === action._id}
                                            onClick={() => saveNote(action)}
                                        >
                                            Save note
                                        </button>
                                        <button
                                            className="text-button"
                                            onClick={() => {
                                                setEditingNoteId(null);
                                                setNoteDraft("");
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : action.note ? (
                                <div className="history-note">
                                    <p className="note-text">
                                        {action.note}
                                    </p>
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            startEditingNote(action)
                                        }
                                    >
                                        Edit note
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="text-button add-note"
                                    onClick={() => startEditingNote(action)}
                                >
                                    ＋ Add a note
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default History;
