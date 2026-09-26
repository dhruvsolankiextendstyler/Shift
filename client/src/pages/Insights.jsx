import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/api";
import ErrorState from "../components/ErrorState";

/* ---------- tiny chart primitives (hand-rolled, theme-matched) ---------- */

// Donut: segments = [{ label, value, color }]. Center shows headline.
function Donut({ segments, centerValue, centerLabel, size = 168 }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const r = 62;
    const circumference = 2 * Math.PI * r;
    const gap = total > 0 ? 3 : 0; // 3px surface gap between slices
    let offset = 0;

    return (
        <svg
            className="donut"
            viewBox={`0 0 ${size} ${size}`}
            width={size}
            height={size}
            role="img"
        >
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="var(--viz-track)"
                    strokeWidth="16"
                />
                {total > 0 &&
                    segments
                        .filter((s) => s.value > 0)
                        .map((s) => {
                            const len =
                                (s.value / total) * circumference;
                            const dash = Math.max(len - gap, 0.5);
                            const el = (
                                <circle
                                    key={s.label}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={r}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth="16"
                                    strokeLinecap="round"
                                    strokeDasharray={`${dash} ${circumference - dash}`}
                                    strokeDashoffset={-offset}
                                >
                                    <title>
                                        {s.label}: {s.value} (
                                        {Math.round(
                                            (s.value / total) * 100
                                        )}
                                        %)
                                    </title>
                                </circle>
                            );
                            offset += len;
                            return el;
                        })}
            </g>

            <text
                className="donut-value"
                x="50%"
                y="47%"
                textAnchor="middle"
            >
                {centerValue}
            </text>
            <text
                className="donut-label"
                x="50%"
                y="60%"
                textAnchor="middle"
            >
                {centerLabel}
            </text>
        </svg>
    );
}

function Legend({ segments }) {
    return (
        <ul className="legend">
            {segments.map((s) => (
                <li key={s.label}>
                    <span
                        className="legend-dot"
                        style={{ background: s.color }}
                    />
                    <span className="legend-name">{s.label}</span>
                    <strong>{s.value}</strong>
                </li>
            ))}
        </ul>
    );
}

// Horizontal magnitude bars (sequential blue). items = [{ label, value }]
// `scaleMax` fixes the 100% width reference (e.g. 100 for rates).
function BarList({ items, unit = "", scaleMax }) {
    const max = scaleMax ?? Math.max(...items.map((i) => i.value), 1);

    return (
        <div className="bar-list">
            {items.map((item) => (
                <div className="bar-row" key={item.label}>
                    <span className="bar-label">{item.label}</span>
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{
                                width: `${(item.value / max) * 100}%`
                            }}
                        >
                            <title>
                                {item.label}: {item.value}
                                {unit}
                            </title>
                        </div>
                    </div>
                    <strong className="bar-value">
                        {item.value}
                        {unit}
                    </strong>
                </div>
            ))}
        </div>
    );
}

// Calendar heatmap: trailing `weeks` weeks of daily action counts.
function Heatmap({ counts, weeks = 17 }) {
    const days = weeks * 7;
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const key = dayKey(d);
        cells.push({ key, count: counts[key] || 0 });
    }

    const level = (c) => {
        if (c === 0) return 0;
        if (c === 1) return 1;
        if (c === 2) return 2;
        if (c <= 4) return 3;
        return 4;
    };

    return (
        <div className="heatmap-wrap">
            <div className="heatmap">
                {cells.map((cell) => (
                    <div
                        key={cell.key}
                        className={`heat-cell heat-${level(cell.count)}`}
                        title={`${cell.key}: ${cell.count} move${cell.count === 1 ? "" : "s"}`}
                    />
                ))}
            </div>
            <div className="heat-scale">
                <span>Less</span>
                <span className="heat-cell heat-0" />
                <span className="heat-cell heat-1" />
                <span className="heat-cell heat-2" />
                <span className="heat-cell heat-3" />
                <span className="heat-cell heat-4" />
                <span>More</span>
            </div>
        </div>
    );
}

// Line chart: points = [{ label, value }] where value is 0..100 (rate).
function LineChart({ points }) {
    const w = 620;
    const h = 220;
    const padX = 34;
    const padY = 24;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const n = points.length;
    const x = (i) => (n === 1 ? padX + innerW / 2 : padX + (i / (n - 1)) * innerW);
    const y = (v) => padY + innerH - (v / 100) * innerH;

    const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
    const area = `${padX},${padY + innerH} ${line} ${x(n - 1)},${padY + innerH}`;

    return (
        <svg
            className="linechart"
            viewBox={`0 0 ${w} ${h}`}
            width="100%"
            role="img"
            preserveAspectRatio="xMidYMid meet"
        >
            {/* gridlines at 0/50/100% */}
            {[0, 50, 100].map((g) => (
                <g key={g}>
                    <line
                        className="grid-line"
                        x1={padX}
                        x2={w - padX}
                        y1={y(g)}
                        y2={y(g)}
                    />
                    <text className="grid-tick" x={4} y={y(g) + 4}>
                        {g}
                    </text>
                </g>
            ))}

            {n > 1 && (
                <polygon className="line-area" points={area} />
            )}
            <polyline className="line-path" points={line} />

            {points.map((p, i) => (
                <circle
                    key={p.label}
                    className="line-dot"
                    cx={x(i)}
                    cy={y(p.value)}
                    r="4"
                >
                    <title>
                        {p.label}: {p.value}% completed
                    </title>
                </circle>
            ))}

            {points.map((p, i) => (
                <text
                    key={`lbl-${p.label}`}
                    className="line-xlabel"
                    x={x(i)}
                    y={h - 4}
                    textAnchor="middle"
                >
                    {p.label}
                </text>
            ))}
        </svg>
    );
}

/* ------------------------------ helpers ------------------------------ */

export const dayKey = (d) => {
    const x = new Date(d);
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return `${x.getFullYear()}-${m}-${day}`;
};

// Consecutive-day streak from a Set of YYYY-MM-DD strings.
// Current streak counts back from today (grace: yesterday still counts).
export function computeStreak(dateSet) {
    if (dateSet.size === 0) return { current: 0, longest: 0 };

    const dates = [...dateSet].sort();

    // longest run
    let longest = 1;
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const cur = new Date(dates[i]);
        const diff = (cur - prev) / 86400000;
        run = diff === 1 ? run + 1 : 1;
        longest = Math.max(longest, run);
    }

    // current run ending today or yesterday
    let current = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!dateSet.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1); // grace day
    }
    while (dateSet.has(dayKey(cursor))) {
        current++;
        cursor.setDate(cursor.getDate() - 1);
    }

    return { current, longest };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_BUCKETS = [
    { label: "Morning", test: (h) => h >= 5 && h < 12 },
    { label: "Afternoon", test: (h) => h >= 12 && h < 17 },
    { label: "Evening", test: (h) => h >= 17 && h < 21 },
    { label: "Night", test: (h) => h >= 21 || h < 5 }
];
const MOOD_ORDER = ["low", "okay", "good", "great", "angry", "overwhelmed"];

/* ------------------------------ data hook ------------------------------ */

export const INSIGHTS_TABS = [
    { id: "overview", label: "Overview" },
    { id: "rhythm", label: "Rhythm" },
    { id: "streaks", label: "Streaks" },
    { id: "trends", label: "Trends" }
];

// Fetches actions + tasks once and returns the derived analytics.
// Shared by the desktop page and the mobile swipe pager.
export function useInsightsData() {
    const [actions, setActions] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [activity, setActivity] = useState({ readCount: 0, vocabCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            const [actionsRes, tasksRes, activityRes] = await Promise.all([
                apiFetch("/actions"),
                apiFetch("/tasks"),
                apiFetch("/activity")
            ]);
            if (!actionsRes.ok || !tasksRes.ok) {
                throw new Error("Request failed");
            }
            setActions(await actionsRes.json());
            setTasks(await tasksRes.json());
            // Downtime counts are a nice-to-have — don't fail insights if the
            // endpoint hiccups.
            if (activityRes.ok) {
                setActivity(await activityRes.json());
            }
        } catch (err) {
            console.error("Failed to load insights:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const d = useMemo(() => {
        const total = actions.length;
        const completed = actions.filter((a) => a.status === "completed").length;
        const skipped = actions.filter((a) => a.status === "skipped").length;
        const started = actions.filter((a) => a.status === "started").length;

        const better = actions.filter((a) => a.feedback === "better").length;
        const same = actions.filter((a) => a.feedback === "same").length;
        const worse = actions.filter((a) => a.feedback === "worse").length;

        const completionRate =
            total > 0 ? Math.round((completed / total) * 100) : 0;

        // Category magnitude
        const categoryCounts = {};
        actions.forEach((a) => {
            const c = a.taskId?.category;
            if (c) categoryCounts[c] = (categoryCounts[c] || 0) + 1;
        });
        const categories = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label, value }));

        // Daily counts (heatmap + overall streak)
        const dayCounts = {};   
        const activeDays = new Set();
        actions.forEach((a) => {
            if (a.createdAt) {
                const key = dayKey(a.createdAt);
                dayCounts[key] = (dayCounts[key] || 0) + 1;
                if (a.status === "completed") activeDays.add(key);
            }
        });

        // Permanent tasks
        const permanentTasks = tasks
            .filter((t) => t.type === "permanent")
            .sort(
                (a, b) => (b.completionCount || 0) - (a.completionCount || 0)
            )
            .map((t) => ({ label: t.title, value: t.completionCount || 0 }));
        const permanentLogged = permanentTasks.reduce(
            (s, t) => s + t.value,
            0
        );

        // Untouched
        const touched = new Set(
            actions.map((a) => a.taskId?._id).filter(Boolean)
        );
        const untouched = tasks.filter(
            (t) => t.status === "active" && !touched.has(t._id)
        ).length;

        // Rhythm — weekday + time-of-day (completed moves)
        const weekdayCounts = Array(7).fill(0);
        const bucketCounts = TIME_BUCKETS.map(() => 0);
        actions.forEach((a) => {
            if (a.status !== "completed" || !a.createdAt) return;
            const d = new Date(a.createdAt);
            weekdayCounts[d.getDay()]++;
            const h = d.getHours();
            const bi = TIME_BUCKETS.findIndex((b) => b.test(h));
            if (bi >= 0) bucketCounts[bi]++;
        });
        const weekdayItems = WEEKDAYS.map((label, i) => ({
            label,
            value: weekdayCounts[i]
        }));
        const timeItems = TIME_BUCKETS.map((b, i) => ({
            label: b.label,
            value: bucketCounts[i]
        }));

        // Mood -> completion rate
        const moodTotals = {};
        actions.forEach((a) => {
            const m = a.sessionId?.mood;
            if (!m) return;
            if (!moodTotals[m]) moodTotals[m] = { total: 0, done: 0 };
            moodTotals[m].total++;
            if (a.status === "completed") moodTotals[m].done++;
        });
        const moodItems = MOOD_ORDER.filter((m) => moodTotals[m]).map((m) => ({
            label: m,
            value: Math.round(
                (moodTotals[m].done / moodTotals[m].total) * 100
            )
        }));

        // Category-wise streaks (completed actions only)
        const catDays = {};
        actions.forEach((a) => {
            if (a.status !== "completed" || !a.createdAt) return;
            const c = a.taskId?.category;
            if (!c) return;
            (catDays[c] ||= new Set()).add(dayKey(a.createdAt));
        });
        const categoryStreaks = Object.entries(catDays)
            .map(([label, set]) => ({ label, ...computeStreak(set) }))
            .sort((a, b) => b.current - a.current || b.longest - a.longest);
        const overallStreak = computeStreak(activeDays);

        // Completion trend — last 8 weeks, rate per week
        const weekMap = {}; // weekStart(ISO date) -> { total, done, order }
        actions.forEach((a) => {
            if (!a.createdAt) return;
            const d = new Date(a.createdAt);
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() - d.getDay()); // back to Sunday
            const key = dayKey(d);
            if (!weekMap[key]) weekMap[key] = { total: 0, done: 0 };
            weekMap[key].total++;
            if (a.status === "completed") weekMap[key].done++;
        });
        const trendPoints = Object.keys(weekMap)
            .sort()
            .slice(-8)
            .map((key) => {
                const d = new Date(key);
                return {
                    label: `${d.getMonth() + 1}/${d.getDate()}`,
                    value: Math.round(
                        (weekMap[key].done / weekMap[key].total) * 100
                    )
                };
            });

        return {
            total,
            completed,
            skipped,
            started,
            better,
            same,
            worse,
            completionRate,
            categories,
            dayCounts,
            permanentTasks,
            permanentLogged,
            untouched,
            weekdayItems,
            timeItems,
            moodItems,
            categoryStreaks,
            overallStreak,
            trendPoints,
            readCount: activity.readCount || 0,
            vocabCount: activity.vocabCount || 0
        };
    }, [actions, tasks, activity]);

    const isEmpty =
        d.total === 0 &&
        d.permanentLogged === 0 &&
        d.readCount === 0 &&
        d.vocabCount === 0;

    return { loading, error, reload: load, d, isEmpty };
}

/* ---------- per-tab content (pure — no fetch, no tab bar) ---------- */

export function InsightsTabContent({ d, tab }) {
    const outcomeSegments = [
        { label: "Completed", value: d.completed, color: "var(--viz-good)" },
        { label: "Skipped", value: d.skipped, color: "var(--viz-muted)" },
        { label: "In progress", value: d.started, color: "var(--viz-blue)" }
    ];
    const feedbackSegments = [
        { label: "Better", value: d.better, color: "var(--viz-good)" },
        { label: "Same", value: d.same, color: "var(--viz-muted)" },
        { label: "Worse", value: d.worse, color: "var(--viz-worse)" }
    ];
    const hasFeedback = d.better + d.same + d.worse > 0;

    if (tab === "overview") {
        return (
            <>
                <div className="stats-grid">
                    <div className="stat-card">
                        <span>Total actions</span>
                        <strong>{d.total}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Completion rate</span>
                        <strong>{d.completionRate}%</strong>
                    </div>
                    <div className="stat-card">
                        <span>Permanent logged</span>
                        <strong>{d.permanentLogged}</strong>
                    </div>
                    <div className="stat-card">
                        <span>Untouched tasks</span>
                        <strong>{d.untouched}</strong>
                    </div>
                </div>

                <div className="insights-grid">
                    <section className="insight-card">
                        <p className="eyebrow">OUTCOMES</p>
                        <h2>How your moves land</h2>
                        <div className="chart-with-legend">
                            <Donut
                                segments={outcomeSegments}
                                centerValue={`${d.completionRate}%`}
                                centerLabel="completed"
                            />
                            <Legend segments={outcomeSegments} />
                        </div>
                    </section>

                    <section className="insight-card">
                        <p className="eyebrow">STATE SHIFT</p>
                        <h2>Did they move the needle?</h2>
                        {hasFeedback ? (
                            <div className="chart-with-legend">
                                <Donut
                                    segments={feedbackSegments}
                                    centerValue={d.better}
                                    centerLabel="felt better"
                                />
                                <Legend segments={feedbackSegments} />
                            </div>
                        ) : (
                            <p className="chart-empty">
                                No feedback logged yet — finish a move
                                and tell us how it felt.
                            </p>
                        )}
                    </section>
                </div>

                {d.categories.length > 0 && (
                    <section className="insight-card wide">
                        <p className="eyebrow">CATEGORY</p>
                        <h2>Where you spend it</h2>
                        <BarList items={d.categories} />
                    </section>
                )}

                <section className="insight-card wide">
                    <p className="eyebrow">☕ DOWNTIME</p>
                    <h2>Between the moves</h2>
                    <p className="chart-sub">
                        Reading and vocab sessions you finished — every
                        time you hit Done in Deep Read or Word Forge.
                    </p>
                    {d.readCount + d.vocabCount > 0 ? (
                        <BarList
                            items={[
                                { label: "Deep Read", value: d.readCount },
                                { label: "Word Forge", value: d.vocabCount }
                            ]}
                            unit="×"
                        />
                    ) : (
                        <p className="chart-empty">
                            No downtime sessions yet — open the tools
                            button and hit Done to log one.
                        </p>
                    )}
                </section>

                <section className="insight-card wide">
                    <p className="eyebrow">MOMENTUM</p>
                    <h2>Your activity calendar</h2>
                    <p className="chart-sub">
                        Every day you made a move over the last few
                        months.
                    </p>
                    <Heatmap counts={d.dayCounts} />
                </section>

                {d.permanentTasks.length > 0 && (
                    <section className="insight-card wide">
                        <p className="eyebrow">∞ PERMANENT</p>
                        <h2>Your recurring streaks</h2>
                        <p className="chart-sub">
                            Habits that stay in the pool — ranked by how
                            often you've logged them.
                        </p>
                        <BarList items={d.permanentTasks} unit="×" />
                    </section>
                )}
            </>
        );
    }

    if (tab === "rhythm") {
        return (
            <>
                <div className="insights-grid">
                    <section className="insight-card">
                        <p className="eyebrow">BY WEEKDAY</p>
                        <h2>When you show up</h2>
                        <p className="chart-sub">
                            Completed moves, grouped by day of the week.
                        </p>
                        <BarList items={d.weekdayItems} />
                    </section>

                    <section className="insight-card">
                        <p className="eyebrow">TIME OF DAY</p>
                        <h2>Your peak window</h2>
                        <p className="chart-sub">
                            When your completed moves actually happen.
                        </p>
                        <BarList items={d.timeItems} />
                    </section>
                </div>

                <section className="insight-card wide">
                    <p className="eyebrow">MOOD → OUTCOME</p>
                    <h2>Does your headspace decide it?</h2>
                    <p className="chart-sub">
                        Completion rate by the mood you checked in with.
                    </p>
                    {d.moodItems.length > 0 ? (
                        <BarList
                            items={d.moodItems}
                            unit="%"
                            scaleMax={100}
                        />
                    ) : (
                        <p className="chart-empty">
                            Not enough check-ins yet.
                        </p>
                    )}
                </section>
            </>
        );
    }

    if (tab === "streaks") {
        return (
            <>
                <div className="stats-grid two">
                    <div className="stat-card">
                        <span>Current streak</span>
                        <strong>
                            {d.overallStreak.current}
                            <span className="unit">
                                {" "}
                                day
                                {d.overallStreak.current === 1 ? "" : "s"}
                            </span>
                        </strong>
                    </div>
                    <div className="stat-card">
                        <span>Longest streak</span>
                        <strong>
                            {d.overallStreak.longest}
                            <span className="unit">
                                {" "}
                                day
                                {d.overallStreak.longest === 1 ? "" : "s"}
                            </span>
                        </strong>
                    </div>
                </div>

                <section className="insight-card wide">
                    <p className="eyebrow">🔥 BY CATEGORY</p>
                    <h2>Keep the chain alive</h2>
                    <p className="chart-sub">
                        Consecutive days you completed a move in each
                        category.
                    </p>
                    {d.categoryStreaks.length > 0 ? (
                        <div className="streak-list">
                            {d.categoryStreaks.map((s) => (
                                <div className="streak-row" key={s.label}>
                                    <span className="streak-cat">
                                        {s.label}
                                    </span>
                                    <span className="streak-current">
                                        🔥 {s.current} day
                                        {s.current === 1 ? "" : "s"}
                                    </span>
                                    <span className="streak-best">
                                        best {s.longest}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="chart-empty">
                            Complete a move to start a streak.
                        </p>
                    )}
                </section>
            </>
        );
    }

    // trends
    return (
        <section className="insight-card wide">
            <p className="eyebrow">COMPLETION TREND</p>
            <h2>Are you getting sharper?</h2>
            <p className="chart-sub">
                Weekly completion rate over your last 8 active weeks.
            </p>
            {d.trendPoints.length > 1 ? (
                <LineChart points={d.trendPoints} />
            ) : (
                <p className="chart-empty">
                    Need at least two active weeks to plot a trend. Keep
                    moving.
                </p>
            )}
        </section>
    );
}

/* ---------- empty state (shared by desktop + mobile) ---------- */

export function InsightsEmpty() {
    return (
        <div className="empty-state">
            <h2>Nothing to show yet.</h2>
            <p>
                Make a few moves and your patterns start to surface
                here.
            </p>
        </div>
    );
}

/* ------------------------------ desktop page ------------------------------ */

function Insights() {
    const { loading, error, reload, d, isEmpty } = useInsightsData();
    const [tab, setTab] = useState("overview");

    if (loading) {
        return <p className="message">Crunching your patterns...</p>;
    }

    if (error) {
        return <ErrorState onRetry={reload} />;
    }

    return (
        <div className="insights-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">◈ THE BIGGER PICTURE</p>
                    <h1>Insights</h1>
                    <p className="page-description">
                        The story your moves tell over time.
                    </p>
                </div>
            </div>

            {isEmpty ? (
                <InsightsEmpty />
            ) : (
                <>
                    <div className="insights-tabs" role="tablist">
                        {INSIGHTS_TABS.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                className={`insights-tab ${tab === t.id ? "active" : ""}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <InsightsTabContent d={d} tab={tab} />
                </>
            )}
        </div>
    );
}

export default Insights;
