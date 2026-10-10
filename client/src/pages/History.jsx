import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, registerCacheClearHandler } from "../services/api";
import { reflectCompletionOnTask } from "../services/resolve";
import { dayKey } from "./Insights";
import ErrorState from "../components/ErrorState";
import Modal from "../components/Modal";
import TaskFormFields from "../components/TaskFormFields";
import { useIsMobile } from "../hooks/useIsMobile";
import Footer from "../components/Footer";
import { computeDailyReflection } from "../services/reflection";
import { toUnifiedActivities } from "../services/unifiedActivity";

// History is a calendar of everything the user has done — task actions (from
// /actions) merged with downtime sessions (from /activity/history), the SAME
// records Insights reads — grouped by LOCAL day so an 11pm session lands on the
// right date. dayKey (local YYYY-MM-DD) is shared with Insights/FocusLock.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_META = {
    task: { label: "Task", mark: "✓" },
    read: { label: "Deep Read", mark: "✦" },
    vocab: { label: "Word Forge", mark: "✦" },
    word: { label: "Word Forge", mark: "✦" },
    article: { label: "Deep Read", mark: "✦" }
};

let cachedHistoryEntries = null;
let lastHistoryFetch = 0;

export function clearHistoryCache() {
    cachedHistoryEntries = null;
    lastHistoryFetch = 0;
}
registerCacheClearHandler(clearHistoryCache);

// One fetch of the merged history; distinguishes loading / error / data so the
// UI renders each state separately (an error is never masked as "empty").
function useActivityHistory() {
    const hasCache = cachedHistoryEntries !== null;
    const [entries, setEntries] = useState(() => cachedHistoryEntries || []);
    const [loading, setLoading] = useState(!hasCache);
    const [error, setError] = useState(false);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent && cachedHistoryEntries === null) setLoading(true);
        setError(false);
        try {
            const [actionsRes, activityRes] = await Promise.all([
                apiFetch("/actions"),
                apiFetch("/activity/history")
            ]);
            if (!actionsRes.ok || !activityRes.ok) {
                throw new Error("Request failed");
            }
            const [actions, activities] = await Promise.all([
                actionsRes.json(),
                activityRes.json()
            ]);
            const unified = toUnifiedActivities(actions, activities);
            cachedHistoryEntries = unified;
            lastHistoryFetch = Date.now();
            setEntries(unified);
        } catch (err) {
            console.error("Failed to load history:", err);
            if (cachedHistoryEntries === null) setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (cachedHistoryEntries && Date.now() - lastHistoryFetch < 15000) {
            setEntries(cachedHistoryEntries);
            setLoading(false);
        } else {
            load({ silent: cachedHistoryEntries !== null });
        }
    }, [load]);

    return { entries, loading, error, reload: load };
}

// Monday-first grid of Date objects covering `month`. new Date(y, m, n)
// normalises out-of-range days, so trailing/leading days, month lengths and
// leap years all fall out for free — nothing is hardcoded.
function buildMonthCells(year, month) {
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((leading + daysInMonth) / 7) * 7;
    return Array.from(
        { length: total },
        (_, i) => new Date(year, month, 1 - leading + i)
    );
}

const level = (c) => (c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c <= 4 ? 3 : 4);

function History({ active = true }) {
    const isMobile = useIsMobile();
    const { entries, loading, error, reload } = useActivityHistory();
    const [busyId, setBusyId] = useState(null);

    const today = useMemo(() => new Date(), []);
    const todayKey = dayKey(today);

    const [view, setView] = useState(() => ({
        year: today.getFullYear(),
        month: today.getMonth()
    }));
    const [selectedKey, setSelectedKey] = useState(todayKey);
    const [dir, setDir] = useState(0);

    // ── Add Completed Task modal state ───────────────────────────────────────
    const [addingTask, setAddingTask]           = useState(false);
    const [addTitle, setAddTitle]               = useState("");
    const [addCategory, setAddCategory]         = useState("");
    const [addEstimatedTime, setAddEstimatedTime] = useState("");
    const [addPriority, setAddPriority]         = useState("medium");
    const [addEffort, setAddEffort]             = useState("medium");
    const [addType, setAddType]                 = useState("oneoff");
    const [addDate, setAddDate]                 = useState(todayKey);
    const [addSaving, setAddSaving]             = useState(false);
    const [addError, setAddError]               = useState("");

    // Derive category suggestions from existing history entries — no extra fetch needed.
    const existingCategories = useMemo(() => {
        const cats = new Set(entries.map((e) => e.category).filter(Boolean));
        return [...cats].sort((a, b) => a.localeCompare(b));
    }, [entries]);

    const openAddTask = () => {
        // Pre-select the calendar's currently selected date.
        setAddDate(selectedKey);
        setAddTitle("");
        setAddCategory("");
        setAddEstimatedTime("");
        setAddPriority("medium");
        setAddEffort("medium");
        setAddType("oneoff");
        setAddError("");
        setAddingTask(true);
    };

    const saveManualTask = async () => {
        if (!addTitle.trim() || !addCategory.trim() || !addEstimatedTime) {
            setAddError("Task name, category, and time are all required.");
            return;
        }
        if (Number(addEstimatedTime) < 1) {
            setAddError("Time must be at least 1 minute.");
            return;
        }

        setAddSaving(true);
        setAddError("");

        try {
            // Build an ISO timestamp at noon on the selected date so timezone
            // shifts don't accidentally push it to the wrong calendar day.
            const completedAt = new Date(`${addDate}T12:00:00`).toISOString();

            const res = await apiFetch("/actions/manual", {
                method: "POST",
                body: JSON.stringify({
                    title:         addTitle.trim(),
                    category:      addCategory.trim(),
                    estimatedTime: Number(addEstimatedTime),
                    priority:      addPriority,
                    effort:        addEffort,
                    type:          addType,
                    completedAt
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save — please try again.");
            }

            setAddingTask(false);
            await reload(); // refresh the calendar & detail panel
        } catch (err) {
            setAddError(err.message);
        } finally {
            setAddSaving(false);
        }
    };
    // ────────────────────────────────────────────────────────────────────────

    // Re-pull when the History tab is re-entered on mobile (the slide never
    // unmounts), so a just-finished activity shows without a manual reload.
    const wasActive = useRef(active);
    useEffect(() => {
        if (active && !wasActive.current) reload();
        wasActive.current = active;
    }, [active, reload]);

    // Group by local day; a day's intensity = completed activities that day.
    const { byDay, completedByDay } = useMemo(() => {
        const grouped = {};
        const completed = {};
        for (const e of entries) {
            const k = dayKey(e.date);
            (grouped[k] ||= []).push(e);
            if (e.status === "completed") {
                completed[k] = (completed[k] || 0) + 1;
            }
        }
        return { byDay: grouped, completedByDay: completed };
    }, [entries]);

    const cells = useMemo(
        () => buildMonthCells(view.year, view.month),
        [view]
    );
    const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
        undefined,
        { month: "long", year: "numeric" }
    );

    const changeMonth = (delta) => {
        setDir(delta);
        setView((v) => {
            const d = new Date(v.year, v.month + delta, 1);
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    const goToday = () => {
        const shown = view.year * 12 + view.month;
        const cur = today.getFullYear() * 12 + today.getMonth();
        setDir(shown > cur ? -1 : shown < cur ? 1 : 0);
        setView({ year: today.getFullYear(), month: today.getMonth() });
        setSelectedKey(todayKey);
    };

    // Selecting a trailing/leading day also slides to that day's month.
    const selectCell = (d) => {
        setSelectedKey(dayKey(d));
        if (d.getMonth() !== view.month || d.getFullYear() !== view.year) {
            setDir(d > new Date(view.year, view.month, 1) ? 1 : -1);
            setView({ year: d.getFullYear(), month: d.getMonth() });
        }
    };

    const resolveAction = async (entry, status) => {
        setBusyId(entry.id);
        try {
            const res = await apiFetch(`/actions/${entry.id}`, {
                method: "PUT",
                body: JSON.stringify(
                    status === "completed"
                        ? { status, completedAt: new Date() }
                        : { status }
                )
            });
            if (!res.ok) throw new Error();
            if (status === "completed" && entry.action?.taskId) {
                await reflectCompletionOnTask(entry.action.taskId);
            }
            await reload();
        } finally {
            setBusyId(null);
        }
    };

    const selectedEntries = useMemo(
        () => byDay[selectedKey] || [],
        [byDay, selectedKey]
    );
    const selectedLabel = new Date(
        selectedKey + "T00:00:00"
    ).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    const dailyReflection = useMemo(() => {
        const actions = selectedEntries
            .filter((e) => e.kind === "task" && e.action)
            .map((e) => e.action);
        const activities = selectedEntries
            .filter((e) => e.kind !== "task")
            .map((e) => ({
                type: e.kind,
                title: e.title,
                completedAt: e.date
            }));
        return computeDailyReflection(actions, activities, new Date(selectedKey + "T12:00:00"));
    }, [selectedEntries, selectedKey]);

    const heading = (
        <div className="page-heading">
            <div>
                <p className="eyebrow">↺ THE TRAIL YOU'VE LEFT</p>
                <h1>History</h1>
                <p className="page-description">
                    Every move you've made, mapped across your days.
                </p>
            </div>
            <button
                className="secondary-button history-add-btn"
                onClick={openAddTask}
                id="history-add-task-btn"
            >
                + Add Completed Task
            </button>
        </div>
    );

    if (loading) {
        return <p className="message">Pulling up your moves...</p>;
    }
    if (error) {
        return (
            <div className="history-page">
                {heading}
                <ErrorState onRetry={reload} />
            </div>
        );
    }
    if (entries.length === 0) {
        return (
            <div className="history-page">
                {heading}
                <div className="empty-state">
                    <h2>Your story starts with one move.</h2>
                    <p>
                        Finish a task, a Deep Read, or a Word Forge word
                        and it lights up here — day by day. Or add one you already
                        completed with the button above.
                    </p>
                </div>

                {/* Add Completed Task modal — available even from the empty state */}
                <AddTaskModal
                    open={addingTask}
                    onClose={() => setAddingTask(false)}
                    addTitle={addTitle}             setAddTitle={setAddTitle}
                    addCategory={addCategory}       setAddCategory={setAddCategory}
                    addEstimatedTime={addEstimatedTime} setAddEstimatedTime={setAddEstimatedTime}
                    addPriority={addPriority}       setAddPriority={setAddPriority}
                    addEffort={addEffort}           setAddEffort={setAddEffort}
                    addType={addType}               setAddType={setAddType}
                    addDate={addDate}               setAddDate={setAddDate}
                    addSaving={addSaving}
                    addError={addError}
                    onSave={saveManualTask}
                    categoryOptions={existingCategories}
                />
            </div>
        );
    }

    return (
        <div className="history-page">
            {heading}
            <div className="cal-layout">
                <section className="cal-card">
                    <header className="cal-head">
                        <div className="cal-title">
                            <h2>{monthLabel}</h2>
                            <button className="cal-today" onClick={goToday}>
                                Today
                            </button>
                        </div>
                        <div className="cal-nav">
                            <button
                                className="cal-arrow"
                                aria-label="Previous month"
                                onClick={() => changeMonth(-1)}
                            >
                                ←
                            </button>
                            <button
                                className="cal-arrow"
                                aria-label="Next month"
                                onClick={() => changeMonth(1)}
                            >
                                →
                            </button>
                        </div>
                    </header>

                    <div className="cal-weekdays" aria-hidden="true">
                        {WEEKDAYS.map((w) => (
                            <span key={w}>{w}</span>
                        ))}
                    </div>

                    <div
                        className="cal-grid"
                        key={`${view.year}-${view.month}`}
                        data-dir={dir}
                    >
                        {cells.map((d) => {
                            const k = dayKey(d);
                            const count = completedByDay[k] || 0;
                            const inMonth = d.getMonth() === view.month;
                            const isToday = k === todayKey;
                            const isSel = k === selectedKey;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    className={
                                        "cal-day" +
                                        (inMonth ? "" : " out") +
                                        (isToday ? " today" : "") +
                                        (isSel ? " sel" : "")
                                    }
                                    aria-pressed={isSel}
                                    aria-label={`${k}, ${count} completed`}
                                    onClick={() => selectCell(d)}
                                >
                                    <span className="cal-num">
                                        {d.getDate()}
                                    </span>
                                    {count > 0 && (
                                        <span
                                            className={`cal-dots lvl-${level(count)}`}
                                            aria-hidden="true"
                                        >
                                            {Array.from({
                                                length: Math.min(count, 3)
                                            }).map((_, i) => (
                                                <i key={i} />
                                            ))}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="cal-detail" key={selectedKey}>
                    <p className="eyebrow">{selectedLabel}</p>
                    <h2 className="cal-detail-count">
                        {selectedEntries.length > 0
                            ? `${selectedEntries.length} ${
                                  selectedEntries.length === 1
                                      ? "activity"
                                      : "activities"
                              }`
                            : "Nothing logged"}
                    </h2>

                    {dailyReflection.hasData && (
                        <div className="cal-reflection-banner">
                            <p className="cal-reflection-obs">{dailyReflection.observation}</p>
                            {dailyReflection.secondaryObservation && (
                                <p className="cal-reflection-sub">{dailyReflection.secondaryObservation}</p>
                            )}
                        </div>
                    )}

                    {selectedEntries.length === 0 ? (
                        <p className="cal-empty">
                            No activities on this day.
                        </p>
                    ) : (
                        <ul className="cal-list">
                            {selectedEntries.map((e, i) => (
                                <li
                                    key={e.id}
                                    className={`cal-item kind-${e.kind}`}
                                    style={{ "--i": i }}
                                >
                                    <span className="cal-item-mark">
                                        {KIND_META[e.kind].mark}
                                    </span>
                                    <div className="cal-item-body">
                                        <div className="cal-item-top">
                                            <span className="cal-item-kind">
                                                {KIND_META[e.kind].label}
                                            </span>
                                            {e.source === "manual" && (
                                                <span className="cal-item-manual-badge">
                                                    self-logged
                                                </span>
                                            )}
                                            {e.status &&
                                                e.status !== "completed" && (
                                                    <span
                                                        className={`status-badge ${e.status}`}
                                                    >
                                                        {e.status ===
                                                        "started"
                                                            ? "in progress"
                                                            : e.status}
                                                    </span>
                                                )}
                                        </div>
                                        <p className="cal-item-title">
                                            {e.title}
                                        </p>
                                        <p className="cal-item-meta">
                                            {[
                                                e.category,
                                                e.minutes != null
                                                    ? `${e.minutes} min`
                                                    : null,
                                                e.date.toLocaleTimeString(
                                                    undefined,
                                                    {
                                                        hour: "numeric",
                                                        minute: "2-digit"
                                                    }
                                                )
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </p>
                                        {e.note && (
                                            <p className="cal-item-note">
                                                {e.note}
                                            </p>
                                        )}
                                        {e.kind === "task" &&
                                            e.status === "started" && (
                                                <div className="cal-item-actions">
                                                    <button
                                                        className="small-button"
                                                        disabled={
                                                            busyId === e.id
                                                        }
                                                        onClick={() =>
                                                            resolveAction(
                                                                e,
                                                                "completed"
                                                            )
                                                        }
                                                    >
                                                        Mark done ✓
                                                    </button>
                                                    <button
                                                        className="small-button"
                                                        disabled={
                                                            busyId === e.id
                                                        }
                                                        onClick={() =>
                                                            resolveAction(
                                                                e,
                                                                "skipped"
                                                            )
                                                        }
                                                    >
                                                        Skip
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* Add Completed Task modal */}
            <AddTaskModal
                open={addingTask}
                onClose={() => setAddingTask(false)}
                addTitle={addTitle}             setAddTitle={setAddTitle}
                addCategory={addCategory}       setAddCategory={setAddCategory}
                addEstimatedTime={addEstimatedTime} setAddEstimatedTime={setAddEstimatedTime}
                addPriority={addPriority}       setAddPriority={setAddPriority}
                addEffort={addEffort}           setAddEffort={setAddEffort}
                addType={addType}               setAddType={setAddType}
                addDate={addDate}               setAddDate={setAddDate}
                addSaving={addSaving}
                addError={addError}
                onSave={saveManualTask}
                categoryOptions={existingCategories}
            />

            {isMobile && <Footer isMobile />}
        </div>
    );
}

// ── Extracted modal so the JSX tree doesn't grow too deep ───────────────────
function AddTaskModal({
    open, onClose,
    addTitle, setAddTitle,
    addCategory, setAddCategory,
    addEstimatedTime, setAddEstimatedTime,
    addPriority, setAddPriority,
    addEffort, setAddEffort,
    addType, setAddType,
    addDate, setAddDate,
    addSaving, addError,
    onSave,
    categoryOptions
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            labelledBy="add-task-title"
            variant="dialog"
        >
            <div className="add-task-modal">
                <div className="form-heading">
                    <h2 id="add-task-title" className="modal-title">
                        Log a completed task
                    </h2>
                    <button
                        type="button"
                        className="text-button"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <p className="add-task-modal-sub">
                    Record something you already finished — it'll appear in
                    History and count in Insights.
                </p>

                <div className="task-form">
                    <TaskFormFields
                        title={addTitle}             setTitle={setAddTitle}
                        category={addCategory}       setCategory={setAddCategory}
                        estimatedTime={addEstimatedTime} setEstimatedTime={setAddEstimatedTime}
                        priority={addPriority}       setPriority={setAddPriority}
                        effort={addEffort}           setEffort={setAddEffort}
                        type={addType}               setType={setAddType}
                        categoryOptions={categoryOptions}
                        datalistId="history-category-opts"
                    />

                    {/* Date selector — defaults to the calendar's selected day */}
                    <div className="input-group">
                        <label>Date completed</label>
                        <input
                            type="date"
                            value={addDate}
                            max={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setAddDate(e.target.value)}
                        />
                    </div>

                    {addError && (
                        <p className="add-task-error">{addError}</p>
                    )}

                    <button
                        className="primary-button"
                        onClick={onSave}
                        disabled={addSaving}
                        id="add-task-submit-btn"
                    >
                        {addSaving ? (
                            <span className="btn-spinner" />
                        ) : (
                            "Save completed task"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default History;
