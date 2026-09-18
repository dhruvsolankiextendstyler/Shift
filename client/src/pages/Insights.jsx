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

    const total = actions.length;

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

    const completionRate =
        total > 0
            ? Math.round((completed / total) * 100)
            : 0;

    const categoryCounts = {};

    actions.forEach((action) => {
        const category = action.taskId?.category;

        if (category) {
            categoryCounts[category] =
                (categoryCounts[category] || 0) + 1;
        }
    });

    const categories = Object.entries(categoryCounts).sort(
        (a, b) => b[1] - a[1]
    );

    const mostUsedCategory =
        categories.length > 0
            ? categories[0][0]
            : "No data";

    return (
        <div className="insights-page">

            <div className="page-heading">
                <div>
                    <p className="eyebrow">YOUR PATTERNS</p>
                    <h1>Insights</h1>
                    <p className="page-description">
                        See how your actions have been shifting over time.
                    </p>
                </div>
            </div>

            {total === 0 ? (
                <div className="empty-state">
                    <h2>No insights yet.</h2>
                    <p>
                        Use SHIFT a few times and your patterns will
                        appear here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">

                        <div className="stat-card">
                            <span>Total actions</span>
                            <strong>{total}</strong>
                        </div>

                        <div className="stat-card">
                            <span>Completed</span>
                            <strong>{completed}</strong>
                        </div>

                        <div className="stat-card">
                            <span>Skipped</span>
                            <strong>{skipped}</strong>
                        </div>

                        <div className="stat-card">
                            <span>Completion rate</span>
                            <strong>{completionRate}%</strong>
                        </div>

                    </div>

                    <div className="insights-grid">

                        <section className="insight-card">
                            <p className="eyebrow">STATE SHIFT</p>

                            <h2>How actions affected you</h2>

                            <div className="feedback-stat">
                                <span>Better</span>
                                <strong>{better}</strong>
                            </div>

                            <div className="feedback-stat">
                                <span>Same</span>
                                <strong>{same}</strong>
                            </div>

                            <div className="feedback-stat">
                                <span>Worse</span>
                                <strong>{worse}</strong>
                            </div>
                        </section>

                        <section className="insight-card">
                            <p className="eyebrow">CATEGORY</p>

                            <h2>Most used</h2>

                            <div className="big-insight">
                                {mostUsedCategory}
                            </div>

                            <div className="category-list">
                                {categories.map(
                                    ([category, count]) => (
                                        <div
                                            className="category-row"
                                            key={category}
                                        >
                                            <span>{category}</span>
                                            <strong>{count}</strong>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>

                    </div>
                </>
            )}
        </div>
    );
}

export default Insights;