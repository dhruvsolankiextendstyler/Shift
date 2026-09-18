import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

function Tasks() {
    const [tasks, setTasks] = useState([]);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [priority, setPriority] = useState("medium");

    const [filter, setFilter] = useState("active");
    const [editingId, setEditingId] = useState(null);

    const fetchTasks = async () => {
        try {
            const response = await apiFetch("/tasks");
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error("Fetch tasks error:", error);
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
        setEditingId(null);
    };

    const saveTask = async () => {
        if (!title || !category || !estimatedTime) {
            alert("Please fill all task details.");
            return;
        }

        const taskData = {
            title,
            category,
            estimatedTime: Number(estimatedTime),
            priority
        };

        try {
            let response;

            if (editingId) {
                response = await apiFetch(`/tasks/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(taskData)
                });
            } else {
                response = await apiFetch("/tasks", {
                    method: "POST",
                    body: JSON.stringify(taskData)
                });
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to save task");
            }

            resetForm();
            fetchTasks();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    const editTask = (task) => {
        setEditingId(task._id);
        setTitle(task.title);
        setCategory(task.category);
        setEstimatedTime(task.estimatedTime);
        setPriority(task.priority);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const completeTask = async (id) => {
        await apiFetch(`/tasks/${id}`, {
            method: "PUT",
            body: JSON.stringify({
                status: "completed"
            })
        });

        fetchTasks();
    };

    const deleteTask = async (id) => {
        await apiFetch(`/tasks/${id}`, {
            method: "DELETE"
        });

        fetchTasks();
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

    return (
        <div className="tasks-page">

            <div className="page-heading">
                <div>
                    <p className="eyebrow">YOUR ACTION POOL</p>
                    <h1>Tasks</h1>
                    <p className="page-description">
                        Add the things you might want SHIFT to recommend.
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
                            ? "Edit task"
                            : "Add a new task"}
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
                                value={category}
                                onChange={(e) =>
                                    setCategory(e.target.value)
                                }
                            />
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

                            <select
                                value={priority}
                                onChange={(e) =>
                                    setPriority(e.target.value)
                                }
                            >
                                <option value="low">Low</option>
                                <option value="medium">
                                    Medium
                                </option>
                                <option value="high">High</option>
                            </select>
                        </div>

                    </div>

                    <button
                        className="primary-button"
                        onClick={saveTask}
                    >
                        {editingId
                            ? "Update task"
                            : "Add task"}
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
                        <h2>No tasks here.</h2>
                        <p>
                            Add something to your action pool
                            above.
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
                                        {task.status}
                                    </span>
                                </div>

                            </div>

                            <div className="task-actions">

                                {task.status === "active" && (
                                    <>
                                        <button
                                            className="small-button"
                                            onClick={() =>
                                                editTask(task)
                                            }
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="small-button complete"
                                            onClick={() =>
                                                completeTask(
                                                    task._id
                                                )
                                            }
                                        >
                                            Complete
                                        </button>
                                    </>
                                )}

                                <button
                                    className="small-button delete"
                                    onClick={() =>
                                        deleteTask(task._id)
                                    }
                                >
                                    Delete
                                </button>

                            </div>

                        </div>
                    ))
                )}

            </div>
        </div>
    );
}

export default Tasks;