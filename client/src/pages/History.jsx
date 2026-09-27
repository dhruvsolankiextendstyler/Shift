import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import { reflectCompletionOnTask } from "../services/resolve";
import { dayKey } from "./Insights";
import ErrorState from "../components/ErrorState";

// History is a calendar of everything the user has done — task actions (from
// /actions) merged with downtime sessions (from /activity/history), the SAME
// records Insights reads — grouped by LOCAL day so an 11pm session lands on the
// right date. dayKey (local YYYY-MM-DD) is shared with Insights/FocusLock.

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const KIND_META = {
    task: { label: "Task", mark: "✓" },
    read: { label: "Deep Read", mark: "✦" },
    vocab: { label: "Word Forge", mark: "✦" }
};

// Fold task actions + downtime activities into one dated, local-time list.
function mergeEntries(actions, activities) {
    const fromActions = actions.map((a) => ({
        id: a._id,
        kind: "task",
        title: a.taskId?.title || "Task",
        category: a.taskId?.category || null,
        minutes: a.taskId?.estimatedTime ?? null,
        status: a.status,
        note: a.note || "",
        date: new Date(a.completedAt || a.createdAt),
        action: a
    }));
    const fromActivities = activities.map((v) => ({
        id: v._id,
        kind: v.type, // "read" | "vocab"
        title: v.title || KIND_META[v.type]?.label || "Session",
        category: null,
        minutes: null,
        status: "completed",
        note: "",
        date: new Date(v.completedAt)
    }));
    return [...fromActions, ...fromActivities]
        .filter((e) => !Number.isNaN(e.date.getTime()))
        .sort((a, b) => b.date - a.date);
}

// One fetch of the merged history; distinguishes loading / error / data so the
// UI renders each state separately (an error is never masked as "empty").
function useActivityHistory() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
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
            setEntries(mergeEntries(actions, activities));
        } catch (err) {
            console.error("Failed to load history:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
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

    const selectedEntries = byDay[selectedKey] || [];
    const selectedLabel = new Date(
        selectedKey + "T00:00:00"
    ).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    });

    const heading = (
        <div className="page-heading">
            <div>
                <p className="eyebrow">↺ THE TRAIL YOU'VE LEFT</p>
                <h1>History</h1>
                <p className="page-description">
                    Every move you've made, mapped across your days.
                </p>
            </div>
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
                        and it lights up here — day by day.
                    </p>
                </div>
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
        </div>
    );
}

export default History;
