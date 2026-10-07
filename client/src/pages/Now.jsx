import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { startActiveAction } from "../services/activeAction";
import ToolsMenu from "../components/ToolsMenu";
import SlideToConfirm from "../components/SlideToConfirm";
import FlipText from "../components/FlipText";
import { useIsMobile } from "../hooks/useIsMobile";

// The check-in + recommendation survive a tab switch. On desktop the router
// unmounts Now the moment you visit another tab, which otherwise dropped a
// fetched recommendation ("the Let's Go screen") as soon as you glanced
// elsewhere. Module-scoped so it outlives the component; intentionally lost on
// a full reload (a fresh reload starts a clean check-in) and cleared once a
// task is started, so finishing one returns you to a fresh check-in — a
// deliberate, controlled reset rather than an accidental unmount.
const flowCache = {
    category: "",
    time: "",
    sessionId: "",
    recommendation: null,
    emptyReason: null
};

function resetFlowCache() {
    flowCache.category = "";
    flowCache.time = "";
    flowCache.sessionId = "";
    flowCache.recommendation = null;
    flowCache.emptyReason = null;
}

function Now({ active = true }) {
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [category, setCategory] = useState(flowCache.category);
    const [time, setTime] = useState(flowCache.time);

    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    const [sessionId, setSessionId] = useState(flowCache.sessionId);
    const [recommendation, setRecommendation] = useState(
        flowCache.recommendation
    );

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    // null | "empty" (no active tasks) | "no-fit" (tasks exist, none fit time)
    const [emptyReason, setEmptyReason] = useState(flowCache.emptyReason);

    // Fetch existing categories from the user's active task pool
    // Re-fetch whenever this tab becomes active so changes from Tasks page reflect immediately.
    useEffect(() => {
        let mounted = true;

        async function fetchUserCategories() {
            if (!active) return;
            try {
                const response = await apiFetch("/tasks");
                if (!response.ok) return;
                const tasks = await response.json();
                if (mounted && Array.isArray(tasks)) {
                    const activeTasks = tasks.filter((t) => t.status !== "deleted");
                    if (activeTasks.length === 0) {
                        navigate("/tasks", { replace: true });
                        return;
                    }

                    const activeCategories = [
                        ...new Set(
                            tasks
                                .filter((t) => t.status === "active")
                                .map((t) => t.category?.trim())
                                .filter(Boolean)
                        )
                    ].sort((a, b) => a.localeCompare(b));
                    setCategories(activeCategories);
                }
            } catch (err) {
                console.error("Failed to load categories for Now:", err);
            } finally {
                if (mounted) setCategoriesLoading(false);
            }
        }

        fetchUserCategories();

        return () => {
            mounted = false;
        };
    }, [active]);

    // Mirror the flow into the module cache so it's there when Now remounts.
    useEffect(() => {
        flowCache.category = category;
        flowCache.time = time;
        flowCache.sessionId = sessionId;
        flowCache.recommendation = recommendation;
        flowCache.emptyReason = emptyReason;
    }, [category, time, sessionId, recommendation, emptyReason]);

    const handleSubmit = async () => {
        if (!category || !time) {
            setMessage("Pick what you want to do and how much time you have.");
            return;
        }

        setLoading(true);
        setEmptyReason(null);

        try {
            // Surprise Me sends null as category, triggering general recommendation
            const selectedCategory =
                category === "Surprise Me" ? null : category;

            const sessionResponse = await apiFetch("/sessions", {
                method: "POST",
                body: JSON.stringify({
                    category: selectedCategory,
                    availableTime: time
                })
            });

            const sessionData = await sessionResponse.json();

            if (!sessionResponse.ok) {
                throw new Error(sessionData.error);
            }

            setSessionId(sessionData._id);

            const recommendationResponse = await apiFetch(
                "/recommendation",
                {
                    method: "POST",
                    body: JSON.stringify({
                        sessionId: sessionData._id
                    })
                }
            );

            const recommendationData =
                await recommendationResponse.json();

            if (!recommendationResponse.ok) {
                // 404 = nothing to hand back. Two different dead-ends: an empty
                // pool ("add a task") vs. a pool where nothing fits the chosen
                // window. We never silently stretch the window, so say which.
                if (recommendationResponse.status === 404) {
                    setEmptyReason(
                        recommendationData.reason === "no-fit"
                            ? "no-fit"
                            : "empty"
                    );
                    setMessage("");
                    return;
                }
                throw new Error(recommendationData.error);
            }

            setRecommendation(recommendationData.task);
            setMessage("");
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Ditch the current recommendation and go back to a clean check-in. Without
    // this the recommendation card is a dead end (no way back to change your
    // category/time) and the cached pick lingers across tab switches.
    const startOver = () => {
        resetFlowCache();
        setCategory("");
        setTime("");
        setSessionId("");
        setRecommendation(null);
        setEmptyReason(null);
        setMessage("");
    };

    // Start the task, then hand off to the app-level focus lock. Persisting
    // the action here is what freezes the whole app to complete/skip only —
    // and keeps it frozen across reloads. See FocusLock + App.jsx. Clear the
    // flow cache first so returning after the task shows a fresh check-in.
    const startAction = async () => {
        try {
            const response = await apiFetch("/actions", {
                method: "POST",
                body: JSON.stringify({
                    sessionId,
                    taskId: recommendation._id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error);
            }

            resetFlowCache();
            startActiveAction({
                actionId: data._id,
                task: recommendation,
                startedAt: data.startedAt
            });
        } catch (error) {
            console.error(error);
            setMessage(error.message);
        }
    };

    // Options include all unique active categories plus "Surprise Me"
    const categoryOptions = [...categories, "Surprise Me"];

    return (
        <div className="now-page">

            {!recommendation && (
                <section className="checkin-card">

                    <div className="hero">
                        <p className="eyebrow">MOMENTUM ON DEMAND</p>

                        <h1>
                            <FlipText text="One move. That's all it takes." />
                        </h1>

                        <p className="subtitle">
                            Pick what you want to do and how much time you have.
                            We'll hand you the single thing worth doing right now.
                        </p>
                    </div>

                    <div className="checkin-section">
                        <h2>What do you want to do?</h2>

                        <div className="option-grid">
                            {categoryOptions.map((item) => (
                                <button
                                    key={item}
                                    className={`option-button ${
                                        category === item
                                            ? "selected"
                                            : ""
                                    } ${
                                        item === "Surprise Me"
                                            ? "surprise-button"
                                            : ""
                                    }`}
                                    onClick={() => setCategory(item)}
                                >
                                    {item === "Surprise Me"
                                        ? "✦ Surprise Me"
                                        : item}
                                </button>
                            ))}
                        </div>

                        {!categoriesLoading && categories.length === 0 && (
                            <p className="category-hint">
                                No task categories found yet. Pick{" "}
                                <strong>Surprise Me</strong> or add tasks in{" "}
                                <button
                                    type="button"
                                    className="link-inline-btn"
                                    onClick={() => navigate("/tasks")}
                                >
                                    Tasks
                                </button>{" "}
                                to populate your categories.
                            </p>
                        )}
                    </div>

                    <div className="checkin-section">
                        <h2>Got a minute? Or a few?</h2>

                        <div className="option-grid four">
                            {[5, 15, 30, 60].map((item) => (
                                <button
                                    key={item}
                                    className={`option-button ${
                                        time === item
                                            ? "selected"
                                            : ""
                                    }`}
                                    onClick={() => setTime(item)}
                                >
                                    {item === 60
                                        ? "1 hour+"
                                        : `${item} min`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {message && (
                        <p className="message">{message}</p>
                    )}

                    {emptyReason === "no-fit" && (
                        <div className="empty-state">
                            <p className="message">
                                {category && category !== "Surprise Me"
                                    ? `Nothing in "${category}" fits ${
                                          time === 60
                                              ? "an hour"
                                              : `${time} min`
                                      } right now. Pick a longer window, or add a shorter task.`
                                    : `Nothing in your pool fits ${
                                          time === 60
                                              ? "an hour"
                                              : `${time} min`
                                      } right now. Pick a longer window, or add a shorter task.`}
                            </p>
                            <button
                                className="secondary-button"
                                onClick={() => navigate("/tasks")}
                            >
                                GO TO TASKS →
                            </button>
                        </div>
                    )}

                    {emptyReason === "empty" && (
                        <div className="empty-state">
                            <p className="message">
                                {category && category !== "Surprise Me"
                                    ? `No active tasks found in "${category}". Add a task to this category first.`
                                    : "Your pool's empty — add a task and SHIFT has something to hand you."}
                            </p>
                            <button
                                className="secondary-button"
                                onClick={() => navigate("/tasks")}
                            >
                                GO TO TASKS →
                            </button>
                        </div>
                    )}

                    <button
                        className="shift-button"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "FINDING YOUR MOVE..." : "SHIFT →"}
                    </button>

                </section>
            )}

            {recommendation && (
                <section className="recommendation-card">

                    <p className="eyebrow">✦ YOUR NEXT MOVE</p>

                    <h1>{recommendation.title}</h1>

                    <p className="task-meta">
                        {recommendation.category} •{" "}
                        {recommendation.estimatedTime} min •{" "}
                        {recommendation.effort || "medium"} effort •{" "}
                        {recommendation.priority} priority
                    </p>

                    {recommendation.whyThis && (
                        <div className="recommendation-why">
                            <span className="why-label">Why this:</span> {recommendation.whyThis}
                        </div>
                    )}

                    <SlideToConfirm
                        label="Slide to start ⚡"
                        confirmedLabel="Let's go ⚡"
                        onConfirm={startAction}
                    />

                    <button
                        className="secondary-button"
                        onClick={startOver}
                    >
                        ← START OVER
                    </button>

                </section>
            )}

            {isMobile && <ToolsMenu active={active} />}
        </div>
    );
}

export default Now;