import { useEffect, useState } from "react";
import API_URL from "../services/api";

function History() {
    const [actions, setActions] = useState([]);

    useEffect(() => {
        fetch(`${API_URL}/actions`)
            .then((response) => response.json())
            .then((data) => setActions(data))
            .catch((error) => console.error(error));
    }, []);

    return (
        <div>
            <h2>History</h2>

            {actions.length === 0 ? (
                <p>No history yet.</p>
            ) : (
                actions.map((action) => (
                    <div key={action._id}>
                        <h3>
                            {action.taskId?.title || "Unknown Task"}
                        </h3>

                        <p>
                            {action.taskId?.category} •{" "}
                            {action.taskId?.estimatedTime} min
                        </p>

                        <p>
                            State:{" "}
                            {action.sessionId?.mood} •{" "}
                            {action.sessionId?.energy} •{" "}
                            {action.sessionId?.availableTime} min
                        </p>

                        <p>Status: {action.status}</p>

                        <p>
                            Feedback:{" "}
                            {action.feedback || "No feedback"}
                        </p>

                        <hr />
                    </div>
                ))
            )}
        </div>
    );
}

export default History;