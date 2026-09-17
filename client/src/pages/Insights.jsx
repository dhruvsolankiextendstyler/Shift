import { useEffect, useState } from "react";
import API_URL from "../services/api";

function Insights() {
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActions = async () => {
            try {
                const response = await fetch(`${API_URL}/actions`);
                const data = await response.json();

                setActions(data);
            } catch (error) {
                console.error("Failed to load insights:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchActions();
    }, []);

    if (loading) {
        return <p>Loading insights...</p>;
    }

    const totalActions = actions.length;

    const completed = actions.filter(
        (action) => action.status === "completed"
    ).length;

    const skipped = actions.filter(
        (action) => action.status === "skipped"
    ).length;

    const better = actions.filter(
        (action) => action.feedback === "better"
    ).length;

    const same = actions.filter(
        (action) => action.feedback === "same"
    ).length;

    const worse = actions.filter(
        (action) => action.feedback === "worse"
    ).length;

    // Count categories
    const categoryCounts = {};

    actions.forEach((action) => {
        const category = action.taskId?.category;

        if (category) {
            categoryCounts[category] =
                (categoryCounts[category] || 0) + 1;
        }
    });

    const categoryEntries = Object.entries(categoryCounts);

    categoryEntries.sort((a, b) => b[1] - a[1]);

    const mostUsedCategory =
        categoryEntries.length > 0
            ? categoryEntries[0][0]
            : "No data yet";

    return (
        <div>
            <h1>Insights</h1>

            <p>
                See what you've been doing and how your actions have
                affected your state.
            </p>

            <hr />

            <h2>Activity</h2>

            <p>Total actions: {totalActions}</p>

            <p>Completed: {completed}</p>

            <p>Skipped: {skipped}</p>

            <hr />

            <h2>Feedback</h2>

            <p>Better: {better}</p>

            <p>Same: {same}</p>

            <p>Worse: {worse}</p>

            <hr />

            <h2>Most Used Category</h2>

            <p>{mostUsedCategory}</p>

            <hr />

            <h2>Category Breakdown</h2>

            {categoryEntries.length === 0 ? (
                <p>No category data yet.</p>
            ) : (
                categoryEntries.map(([category, count]) => (
                    <p key={category}>
                        {category}: {count}
                    </p>
                ))
            )}

            <hr />

            <h2>Recent Activity</h2>

            {actions.length === 0 ? (
                <p>No activity yet.</p>
            ) : (
                actions.slice(0, 10).map((action) => (
                    <div key={action._id}>
                        <h3>
                            {action.taskId?.title || "Unknown Task"}
                        </h3>

                        <p>
                            {action.taskId?.category || "Unknown"}{" "}
                            •{" "}
                            {action.taskId?.estimatedTime || 0} min
                        </p>

                        <p>
                            {action.status}
                            {action.feedback
                                ? ` • ${action.feedback}`
                                : ""}
                        </p>

                        <hr />
                    </div>
                ))
            )}
        </div>
    );
}

export default Insights;