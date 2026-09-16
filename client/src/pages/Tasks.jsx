import { useEffect, useState } from "react";

function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [estimatedTime, setEstimatedTime] = useState("");
    const [priority, setPriority] = useState("medium");

    const fetchTasks = async () => {
        const response = await fetch("http://localhost:5000/api/tasks");
        const data = await response.json();
        setTasks(data);
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const addTask = async () => {
        if (!title || !category || !estimatedTime) {
            alert("Please fill all task details.");
            return;
        }

        await fetch("http://localhost:5000/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                category,
                estimatedTime: Number(estimatedTime),
                priority
            })
        });

        setTitle("");
        setCategory("");
        setEstimatedTime("");
        setPriority("medium");

        fetchTasks();
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

    return (
        <div>
            <h2>Add Task</h2>

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

            <button onClick={addTask}>Add Task</button>

            <hr />

            <h2>Your Tasks</h2>

            {tasks.map((task) => (
                <div key={task._id}>
                    <h3>{task.title}</h3>
                    <p>
                        {task.category} • {task.estimatedTime} min •{" "}
                        {task.priority}
                    </p>
                    <p>Status: {task.status}</p>

                    {task.status !== "completed" && (
                        <button onClick={() => completeTask(task._id)}>
                            Complete
                        </button>
                    )}

                    <button onClick={() => deleteTask(task._id)}>
                        Delete
                    </button>

                    <hr />
                </div>
            ))}
        </div>
    );
}

export default Tasks;