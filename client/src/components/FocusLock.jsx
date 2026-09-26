import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../services/api";
import {
    clearActiveAction,
    suspendSync,
    resumeSync,
    dismissActiveAction
} from "../services/activeAction";
import { reflectCompletionOnTask } from "../services/resolve";
import { computeStreak, dayKey } from "../pages/Insights";

// A completed move earns a little payoff: a synthesized chime (no audio asset)
// and a haptic buzz. Both no-op where unsupported. Callers skip this under
// reduced motion.
function celebratePayoff() {
    try {
        navigator.vibrate?.([0, 35, 45, 35]);
    } catch {
        /* no vibration API */
    }
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const start = ctx.currentTime;
        // rising major triad C5–E5–G5, each note a short plucked sine
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = start + i * 0.09;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.34);
        });
        setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch {
        /* audio not available */
    }
}

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Countdown ring for the task's own time window. Anchored to when the action
// actually STARTED (server startedAt, passed through) so it stays honest across
// a reload or a second device instead of resetting to full on every mount. Past
// zero it flips to counting overtime rather than nagging — finishing is always
// a tap, never the clock's call.
function FocusTimer({ minutes, startedAt }) {
    const total = Math.max((minutes || 0) * 60, 1);
    const anchor = useRef(
        startedAt ? new Date(startedAt).getTime() : Date.now()
    );
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const elapsed = Math.max((now - anchor.current) / 1000, 0);
    const remaining = total - elapsed;
    const over = remaining < 0;
    const progress = Math.min(elapsed / total, 1);

    const R = 78;
    const C = 2 * Math.PI * R;

    const secs = Math.round(Math.abs(remaining));
    const label = `${over ? "+" : ""}${Math.floor(secs / 60)}:${String(
        secs % 60
    ).padStart(2, "0")}`;

    return (
        <div className={`focus-timer ${over ? "over" : ""}`}>
            <svg
                viewBox="0 0 180 180"
                className="focus-ring"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="focus-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" />
                        <stop offset="100%" stopColor="var(--viz-blue)" />
                    </linearGradient>
                </defs>
                <circle className="focus-ring-track" cx="90" cy="90" r={R} />
                <circle
                    className="focus-ring-fill"
                    cx="90"
                    cy="90"
                    r={R}
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - progress)}
                    transform="rotate(-90 90 90)"
                />
            </svg>
            <div className="focus-time">
                <span
                    className="focus-time-value"
                    role="timer"
                    aria-label={`${label} ${over ? "overtime" : "remaining"}`}
                >
                    {label}
                </span>
                <span className="focus-time-sub">
                    {over ? "overtime" : "left"}
                </span>
            </div>
        </div>
    );
}

// One-shot confetti burst for a completed move. Pure CSS/SVG, no library, and
// nothing at all under reduced motion. Purely decorative → aria-hidden.
const CONFETTI_COLORS = [
    "var(--accent)",
    "var(--viz-good)",
    "var(--viz-blue)",
    "#f5c451",
    "var(--viz-worse)"
];

function Celebration() {
    if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        return null;
    }

    return (
        <div className="celebrate" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => {
                const angle = (360 / 18) * i + (i % 3) * 9;
                const dist = 96 + (i % 5) * 24;
                const rad = (angle * Math.PI) / 180;
                return (
                    <span
                        key={i}
                        className="confetti"
                        style={{
                            "--cx": `${Math.cos(rad) * dist}px`,
                            "--cy": `${Math.sin(rad) * dist}px`,
                            "--rot": `${((i % 3) + 1) * 240}deg`,
                            "--delay": `${(i % 6) * 35}ms`,
                            background:
                                CONFETTI_COLORS[i % CONFETTI_COLORS.length]
                        }}
                    />
                );
            })}
        </div>
    );
}

// The frozen screen. While a task is STARTED this is the ONLY thing the app
// renders — no nav, no other page. Two moves out: complete or skip. Survives
// reload because the active task lives in localStorage, not React state.
function FocusLock({ actionId, task, startedAt }) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [note, setNote] = useState("");
    const [message, setMessage] = useState("");
    const [streak, setStreak] = useState(null);

    // 404 = the action is gone server-side; releasing avoids a permanent trap.
    const putAction = async (body) => {
        const res = await apiFetch(`/actions/${actionId}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
        if (res.status === 404) {
            clearActiveAction();
            return null;
        }
        return res;
    };

    // Only send the note when there's something in it — an empty box
    // shouldn't wipe a note added earlier.
    const notePatch = () => (note.trim() ? { note: note.trim() } : {});

    // The day-streak after this move, for the celebration chip. Reuses the same
    // computation as Insights so the number always agrees with that page.
    const loadStreak = async () => {
        try {
            const res = await apiFetch("/actions");
            if (!res.ok) return;
            const actions = await res.json();
            const days = new Set(
                actions
                    .filter((a) => a.status === "completed" && a.createdAt)
                    .map((a) => dayKey(a.createdAt))
            );
            days.add(dayKey(new Date())); // today's move just landed
            setStreak(computeStreak(days).current);
        } catch {
            /* streak is a flourish — skip silently on failure */
        }
    };

    const completeAction = async () => {
        // Freeze the cross-device poll so it can't clear us mid-gut-check.
        suspendSync();
        try {
            const res = await putAction({
                status: "completed",
                completedAt: new Date(),
                ...notePatch()
            });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to complete action.");

            await reflectCompletionOnTask(task);

            setShowFeedback(true);
            setMessage("");

            if (!prefersReducedMotion()) celebratePayoff();
            loadStreak();
        } catch (error) {
            console.error(error);
            // Unfreeze the poll — the resolve didn't land, so this lock is live.
            resumeSync();
            setMessage("Failed to complete action.");
        }
    };

    const skipAction = async () => {
        suspendSync();
        try {
            const res = await putAction({
                status: "skipped",
                ...notePatch()
            });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to skip action.");
            clearActiveAction();
        } catch (error) {
            console.error(error);
            resumeSync();
            setMessage("Couldn't skip that one. Give it another go.");
        }
    };

    const submitFeedback = async (feedback) => {
        try {
            const res = await putAction({ feedback });
            if (!res) return;
            if (!res.ok) throw new Error("Failed to save feedback");
            clearActiveAction();
        } catch (error) {
            console.error(error);
            setMessage("Failed to save feedback.");
        }
    };

    return (
        <div className="app">
            <div className="now-page">
                {!showFeedback ? (
                    <section className="recommendation-card focus-active">
                        <p className="eyebrow">⏱ IN MOTION</p>

                        <FocusTimer
                            minutes={task.estimatedTime}
                            startedAt={startedAt}
                        />

                        <h1>{task.title}</h1>

                        <div className="action-buttons">
                            <button
                                className="complete-button"
                                onClick={completeAction}
                            >
                                NAILED IT ✓
                            </button>

                            <button
                                className="skip-button"
                                onClick={skipAction}
                            >
                                NOT THIS
                            </button>
                        </div>

                        <textarea
                            className="note-input"
                            placeholder="How'd it feel? Jot it down — just for you (optional)"
                            value={note}
                            maxLength={1000}
                            onChange={(e) => setNote(e.target.value)}
                        />

                        <button
                            className="text-button focus-release"
                            onClick={() => dismissActiveAction(actionId)}
                        >
                            Not now — I'll finish later
                        </button>

                        {message && <p className="message">{message}</p>}
                    </section>
                ) : (
                    <section className="recommendation-card celebrate-card">
                        <Celebration />

                        <div className="celebrate-badge" aria-hidden="true">
                            <svg
                                viewBox="0 0 52 52"
                                className="celebrate-check"
                            >
                                <circle
                                    className="cc-ring"
                                    cx="26"
                                    cy="26"
                                    r="24"
                                />
                                <path
                                    className="cc-tick"
                                    d="M15 27l7 7 15-15"
                                />
                            </svg>
                        </div>

                        <p className="eyebrow">✧ QUICK GUT CHECK</p>

                        <h1>Did that shift something?</h1>

                        {streak != null && (
                            <p className="streak-bump">
                                <span className="streak-flame">🔥</span>
                                {streak} day{streak === 1 ? "" : "s"} in a
                                row
                            </p>
                        )}

                        <div className="feedback-buttons">
                            <button
                                className="fb-better"
                                onClick={() => submitFeedback("better")}
                            >
                                Better
                            </button>

                            <button onClick={() => submitFeedback("same")}>
                                Same
                            </button>

                            <button
                                className="fb-worse"
                                onClick={() => submitFeedback("worse")}
                            >
                                Worse
                            </button>
                        </div>

                        {message && <p className="message">{message}</p>}
                    </section>
                )}
            </div>
        </div>
    );
}

export default FocusLock;
