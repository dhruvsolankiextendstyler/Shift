import { useEffect, useState } from "react";
import API_URL from "../services/api";

function Tasks() {
    const [tasks, setTasks] = useState([]);

    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [priority, setPriority] = useState("medium");

    const [filter, setFilter] = useState("active");
    const [editingId, setEditingId] = useState(null);

    const fetchTasks = async () => {
        const response = await fetch(`${API_URL}/tasks`);
        const data = await response.json();
        setTasks(data);
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

        if (editingId) {
            await fetch(
                `http://localhost:5000/api/tasks/${editingId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(taskData)
                }
            );
        } else {
            await fetch(`${API_URL}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(taskData)
            });
        }

        resetForm();
        fetchTasks();
    };

    const editTask = (task) => {
        setEditingId(task._id);
        setTitle(task.title);
        setCategory(task.category);
        setEstimatedTime(task.estimatedTime);
        setPriority(task.priority);
    };

    const completeTask = async (id) => {
        await fetch(`http://localhost:5000/api/tasks/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: "completed"
            })
        });

        fetchTasks();
    };

    const deleteTask = async (id) => {
        await fetch(`http://localhost:5000/api/tasks/${id}`, {
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
        <div>
            <h2>{editingId ? "Edit Task" : "Add Task"}</h2>

            <input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />

            <input
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
            />

            <input
                type="number"
                placeholder="Time (minutes)"
                value={estimatedTime}
                onChange={(e) => setEstimatedTime(e.target.value)}
            />

            <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
            >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </select>

            <button onClick={saveTask}>
                {editingId ? "Update Task" : "Add Task"}
            </button>

            {editingId && (
                <button onClick={resetForm}>
                    Cancel
                </button>
            )}

            <hr />

            <h2>Your Tasks</h2>

            <button onClick={() => setFilter("active")}>
                Active
            </button>

            <button onClick={() => setFilter("completed")}>
                Completed
            </button>

            <button onClick={() => setFilter("all")}>
                All
            </button>

            <hr />

            {filteredTasks.length === 0 ? (
                <p>No tasks here.</p>
            ) : (
                filteredTasks.map((task) => (
                    <div key={task._id}>
                        <h3>{task.title}</h3>

                        <p>
                            {task.category} •{" "}
                            {task.estimatedTime} min •{" "}
                            {task.priority}
                        </p>

                        <p>Status: {task.status}</p>

                        {task.status === "active" && (
                            <>
                                <button
                                    onClick={() => editTask(task)}
                                >
                                    Edit
                                </button>

                                <button
                                    onClick={() =>
                                        completeTask(task._id)
                                    }
                                >
                                    Complete
                                </button>
                            </>
                        )}

                        <button
                            onClick={() => deleteTask(task._id)}
                        >
                            Delete
                        </button>

                        <hr />
                    </div>
                ))
            )}
        </div>
    );
}

export default Tasks;