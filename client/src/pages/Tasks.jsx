import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import { useToast } from "../context/ToastContext";
import ErrorState from "../components/ErrorState";
import Modal from "../components/Modal";
import Select from "../components/Select";

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
];

// Effort = how much energy the task DEMANDS. SHIFT matches this against the
// energy you report at check-in. Priority (above) is importance, not energy.
const EFFORT_OPTIONS = [
    { value: "low", label: "Low — light lift" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High — heavy lift" }
];

const TYPE_OPTIONS = [
    { value: "oneoff", label: "One-time — clears once done" },
    { value: "permanent", label: "Permanent — stays, counts every time" }
];

function Tasks() {
    const { toast } = useToast();

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [priority, setPriority] = useState("medium");
    const [effort, setEffort] = useState("medium");
    const [type, setType] = useState("permanent");

    const [filter, setFilter] = useState("active");
    const [editingId, setEditingId] = useState(null);
    const [deletingTask, setDeletingTask] = useState(null);

    const fetchTasks = async () => {
        setLoading(true);
        setError(false);
        try {
            const response = await apiFetch("/tasks");
            if (!response.ok) throw new Error("Request failed");
            setTasks(await response.json());
        } catch (err) {
            console.error("Fetch tasks error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const resetForm = () => {
        setTitle("");
        setCategory("");
        setEstimatedTime("");
        setPriority("medium");
        setEffort("medium");
        setType("permanent");
        setEditingId(null);
    };

    const saveTask = async () => {
        if (!title || !category || !estimatedTime) {
            toast(
                "Fill in every field first — SHIFT needs the details.",
                "error"
            );
            return;
        }

        const taskData = {
            title,
            category,
            estimatedTime: Number(estimatedTime),
            priority,
            effort,
            type
        };

        const wasEditing = Boolean(editingId);
        setSaving(true);

        try {
            const response = wasEditing
                ? await apiFetch(`/tasks/${editingId}`, {
                      method: "PUT",
                      body: JSON.stringify(taskData)
                  })
                : await apiFetch("/tasks", {
                      method: "POST",
                      body: JSON.stringify(taskData)
                  });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save task");
            }

            resetForm();
            await fetchTasks();
            toast(
                wasEditing ? "Task updated." : "Task added to the pool.",
                "success"
            );
        } catch (error) {
            console.error(error);
            toast(error.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const editTask = (task) => {
        setEditingId(task._id);
        setTitle(task.title);
        setCategory(task.category);
        setEstimatedTime(task.estimatedTime);
        setPriority(task.priority);
        setEffort(task.effort || "medium");
        setType(task.type || "oneoff");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // Completing tasks happens through the Now flow (it logs an Action that
    // History/Insights read). The Tasks page only edits and deletes.

    // Soft-delete with an undo window (the API keeps deleted tasks).
    const deleteTask = async (task) => {
        try {
            const res = await apiFetch(`/tasks/${task._id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error();
            await fetchTasks();

            toast("Task deleted.", "success", {
                label: "Undo",
                onClick: async () => {
                    await apiFetch(`/tasks/${task._id}`, {
                        method: "PUT",
                        body: JSON.stringify({ status: "active" })
                    });
                    fetchTasks();
                    toast("Task restored.", "info");
                }
            });
        } catch {
            toast("Couldn't delete that task.", "error");
        }
    };

    const filteredTasks = tasks.filter((task) => {
        if (filter === "active") {
            return task.status === "active";
        }

        if (filter === "completed") {
            return task.status === "completed";
        }

        return true;
    });

    // Suggest categories you've already used so "CS"/"cs" don't fragment
    // your Insights.
    const categoryOptions = [
        ...new Set(tasks.map((t) => t.category).filter(Boolean))
    ].sort((a, b) => a.localeCompare(b));

    if (loading) {
        return <p className="message">Loading your pool...</p>;
    }

    if (error) {
        return <ErrorState onRetry={fetchTasks} />;
    }

    return (
        <div className="tasks-page">

            <div className="page-heading">
                <div>
                    <p className="eyebrow">◆ YOUR ACTION POOL</p>
                    <h1>Tasks</h1>
                    <p className="page-description">
                        Stock the pool. SHIFT reaches in here the
                        moment it's time to move.
                    </p>
                </div>

                <div className="task-count">
                    {tasks.filter(
                        (task) => task.status === "active"
                    ).length}
                    <span> active</span>
                </div>
            </div>

            {/* ADD / EDIT TASK */}

            <section className="task-form-card">

                <div className="form-heading">
                    <h2>
                        {editingId
                            ? "Tweak this one"
                            : "Drop in a task"}
                    </h2>

                    {editingId && (
                        <button
                            className="text-button"
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div className="task-form">

                    <div className="input-group">
                        <label>Task</label>

                        <input
                            placeholder="e.g. Practice React"
                            value={title}
                            onChange={(e) =>
                                setTitle(e.target.value)
                            }
                        />
                    </div>

                    <div className="form-row">

                        <div className="input-group">
                            <label>Category</label>

                            <input
                                placeholder="e.g. CS"
                                list="category-options"
                                value={category}
                                onChange={(e) =>
                                    setCategory(e.target.value)
                                }
                            />

                            <datalist id="category-options">
                                {categoryOptions.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </div>

                        <div className="input-group">
                            <label>Time</label>

                            <input
                                type="number"
                                min="1"
                                placeholder="Minutes"
                                value={estimatedTime}
                                onChange={(e) =>
                                    setEstimatedTime(e.target.value)
                                }
                            />
                        </div>

                        <div className="input-group">
                            <label>Priority</label>

                            <Select
                                value={priority}
                                onChange={setPriority}
                                options={PRIORITY_OPTIONS}
                            />
                        </div>

                        <div className="input-group">
                            <label>Effort</label>

                            <Select
                                value={effort}
                                onChange={setEffort}
                                options={EFFORT_OPTIONS}
                            />
                        </div>

                    </div>

                    <div className="input-group">
                        <label>Type</label>

                        <Select
                            value={type}
                            onChange={setType}
                            options={TYPE_OPTIONS}
                        />
                    </div>

                    <button
                        className="primary-button"
                        onClick={saveTask}
                        disabled={saving}
                    >
                        {saving ? (
                            <span className="btn-spinner" />
                        ) : editingId ? (
                            "Save changes"
                        ) : (
                            "Add to the pool"
                        )}
                    </button>

                </div>
            </section>

            {/* FILTERS */}

            <div className="task-toolbar">

                <div>
                    <button
                        className={
                            filter === "active"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() => setFilter("active")}
                    >
                        Active
                    </button>

                    <button
                        className={
                            filter === "completed"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() => setFilter("completed")}
                    >
                        Completed
                    </button>

                    <button
                        className={
                            filter === "all"
                                ? "filter-button active"
                                : "filter-button"
                        }
                        onClick={() => setFilter("all")}
                    >
                        All
                    </button>
                </div>

                <span className="result-count">
                    {filteredTasks.length} tasks
                </span>

            </div>

            {/* TASK LIST */}

            <div className="task-list">

                {filteredTasks.length === 0 ? (
                    <div className="empty-state">
                        <h2>The pool's empty.</h2>
                        <p>
                            Add your first task up top and give SHIFT
                            something to work with.
                        </p>
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            className="task-card"
                            key={task._id}
                        >

                            <div className="task-info">

                                <div className="task-title-row">
                                    <h3>{task.title}</h3>

                                    <span
                                        className={`priority-badge ${task.priority}`}
                                    >
                                        {task.priority}
                                    </span>

                                    {task.type === "permanent" && (
                                        <span className="type-badge">
                                            ∞ permanent
                                        </span>
                                    )}
                                </div>

                                <div className="task-meta">
                                    <span>
                                        {task.category}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {task.estimatedTime} min
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {task.effort || "medium"} effort
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {task.type === "permanent"
                                            ? `done ${task.completionCount || 0}×`
                                            : task.status}
                                    </span>
                                </div>

                            </div>

                            <div className="task-actions">

                                {task.status === "active" && (
                                    <button
                                        className="small-button"
                                        onClick={() => editTask(task)}
                                    >
                                        Edit
                                    </button>
                                )}

                                <button
                                    className="small-button delete"
                                    onClick={() => setDeletingTask(task)}
                                >
                                    Delete
                                </button>

                            </div>

                        </div>
                    ))
                )}

            </div>

            <Modal
                open={Boolean(deletingTask)}
                onClose={() => setDeletingTask(null)}
                labelledBy="delete-title"
            >
                <h2 id="delete-title" className="modal-title">
                    Delete this task?
                </h2>
                <p className="modal-text">
                    "{deletingTask?.title}" leaves your pool. You can undo
                    right after.
                </p>
                <div className="modal-actions">
                    <button
                        className="secondary-button"
                        onClick={() => setDeletingTask(null)}
                    >
                        Keep it
                    </button>
                    <button
                        className="danger-button"
                        onClick={() => {
                            const task = deletingTask;
                            setDeletingTask(null);
                            deleteTask(task);
                        }}
                    >
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}

export default Tasks;