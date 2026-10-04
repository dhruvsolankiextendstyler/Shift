import { useEffect, useRef, useState, useCallback } from "react";
import { apiFetch } from "../services/api";
import {
    clearActiveAction,
    suspendSync,
    resumeSync,
    dismissActiveAction
} from "../services/activeAction";
import { reflectCompletionOnTask } from "../services/resolve";
import { computeStreak, dayKey } from "../pages/Insights";
import FlipText from "./FlipText";
import {
    getBreaksAllowed,
    loadTimerState,
    saveTimerState,
    clearTimerState,
    calculateActiveWorkSeconds,
    calculateRemainingBreakSeconds,
    checkBreakEligibility,
    notifyUser,
    BREAK_DURATION_SECONDS
} from "../services/timerBreak";

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

function playSoftChime() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 440; // A4 calm tone
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
        setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch {
        /* audio not available */
    }
}

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Countdown ring for the task's active work time window.
// Uses activeWorkSeconds (which pauses when paused or during breaks).
function FocusTimer({ minutes, activeWorkSeconds, isPaused, onTogglePause }) {
    const total = Math.max((minutes || 0) * 60, 1);
    const elapsed = Math.max(activeWorkSeconds, 0);
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
        <div className={`focus-timer ${over ? "over" : ""} ${isPaused ? "timer-paused" : ""}`}>
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
                    {isPaused ? "paused" : over ? "overtime" : "left"}
                </span>
                {onTogglePause && (
                    <button
                        type="button"
                        className="timer-pause-btn"
                        onClick={onTogglePause}
                        title={isPaused ? "Resume work timer" : "Pause timer"}
                    >
                        {isPaused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                )}
            </div>
        </div>
    );
}

// Dedicated 5-Minute Break Countdown Ring
function BreakTimer({ remainingSeconds }) {
    const total = BREAK_DURATION_SECONDS;
    const progress = Math.min(Math.max(1 - remainingSeconds / total, 0), 1);

    const R = 78;
    const C = 2 * Math.PI * R;

    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    return (
        <div className="focus-timer break-timer">
            <svg
                viewBox="0 0 180 180"
                className="focus-ring"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="break-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="var(--viz-blue)" />
                        <stop offset="100%" stopColor="var(--good-text, #3fc23f)" />
                    </linearGradient>
                </defs>
                <circle className="focus-ring-track" cx="90" cy="90" r={R} />
                <circle
                    className="focus-ring-fill break-ring-fill"
                    cx="90"
                    cy="90"
                    r={R}
                    stroke="url(#break-grad)"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - progress)}
                    transform="rotate(-90 90 90)"
                />
            </svg>
            <div className="focus-time">
                <span
                    className="focus-time-value"
                    role="timer"
                    aria-label={`${label} break remaining`}
                >
                    {label}
                </span>
                <span className="focus-time-sub">break</span>
            </div>
        </div>
    );
}

// One-shot confetti burst for a completed move.
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

// The frozen screen with 5-Minute Break System integration.
function FocusLock({ actionId, task, startedAt }) {
    const [showFeedback, setShowFeedback] = useState(false);
    const [note, setNote] = useState("");
    const [message, setMessage] = useState("");
    const [notificationBanner, setNotificationBanner] = useState("");
    const [streak, setStreak] = useState(null);

    // Break system state management
    const [timerState, setTimerState] = useState(() =>
        loadTimerState(actionId, startedAt)
    );
    const [nowMs, setNowMs] = useState(() => Date.now());

    const taskMinutes = task?.estimatedTime || 0;
    const breaksAllowed = getBreaksAllowed(taskMinutes);

    // Save timer state to localStorage whenever it changes
    useEffect(() => {
        if (timerState && actionId) {
            saveTimerState(actionId, timerState);
        }
    }, [timerState, actionId]);

    // Fast animation/interval loop for smooth second ticks and auto-break detection
    useEffect(() => {
        const id = setInterval(() => {
            const currentNow = Date.now();
            setNowMs(currentNow);

            setTimerState((prev) => {
                if (!prev) return prev;

                // 1. If currently in a BREAK: check if 5 minutes elapsed
                if (prev.status === "BREAK" && prev.breakStartTime) {
                    const remainingBreak = calculateRemainingBreakSeconds(prev, currentNow);
                    if (remainingBreak <= 0) {
                        // 5-minute break ended! Return automatically to work
                        playSoftChime();
                        notifyUser("Shift Focus", "Break over. Back to it.");
                        setNotificationBanner("Break over. Back to it.");

                        const updatedBreaksTaken = [...prev.breaksTaken];
                        if (prev.currentBreakNumber && !updatedBreaksTaken.includes(prev.currentBreakNumber)) {
                            updatedBreaksTaken.push(prev.currentBreakNumber);
                        }

                        return {
                            ...prev,
                            status: "WORKING",
                            lastActiveStart: currentNow,
                            breakStartTime: null,
                            breaksTaken: updatedBreaksTaken
                        };
                    }
                }

                // 2. If currently WORKING: check break eligibility and 26-min auto-trigger
                if (prev.status === "WORKING") {
                    const activeSecs = calculateActiveWorkSeconds(prev, currentNow);
                    const eligibility = checkBreakEligibility(
                        activeSecs,
                        breaksAllowed,
                        prev.breaksTaken,
                        prev.breaksSkipped
                    );

                    // Automatic break trigger at 26 minutes (1560s)
                    if (eligibility.isAutoTrigger) {
                        playSoftChime();
                        notifyUser("Shift Focus", "Time for a 5-minute break.");
                        setNotificationBanner("Time for a 5-minute break.");

                        return {
                            ...prev,
                            accumulatedActiveSeconds: activeSecs,
                            lastActiveStart: null,
                            status: "BREAK",
                            breakStartTime: currentNow,
                            currentBreakNumber: eligibility.breakNumber
                        };
                    }
                }

                return prev;
            });
        }, 500);

        return () => clearInterval(id);
    }, [breaksAllowed]);

    // Active work elapsed seconds (pauses when status !== "WORKING")
    const activeWorkSeconds = calculateActiveWorkSeconds(timerState, nowMs);
    const isPaused = timerState?.status === "PAUSED";
    const isInBreak = timerState?.status === "BREAK";
    const remainingBreakSeconds = calculateRemainingBreakSeconds(timerState, nowMs);

    // Check manual break availability (during 25:00 - 25:59 window)
    const eligibility = checkBreakEligibility(
        activeWorkSeconds,
        breaksAllowed,
        timerState?.breaksTaken || [],
        timerState?.breaksSkipped || []
    );
    const breakOfferAvailable =
        !isInBreak && !isPaused && eligibility.isEligible && !eligibility.isAutoTrigger;

    // Toggle Pause/Resume
    const handleTogglePause = useCallback(() => {
        setTimerState((prev) => {
            if (!prev) return prev;
            const currentNow = Date.now();
            if (prev.status === "WORKING") {
                const currentActive = calculateActiveWorkSeconds(prev, currentNow);
                return {
                    ...prev,
                    status: "PAUSED",
                    accumulatedActiveSeconds: currentActive,
                    lastActiveStart: null
                };
            } else if (prev.status === "PAUSED") {
                return {
                    ...prev,
                    status: "WORKING",
                    lastActiveStart: currentNow
                };
            }
            return prev;
        });
    }, []);

    // Take manual 5-minute break
    const handleTakeBreak = useCallback(() => {
        setTimerState((prev) => {
            if (!prev) return prev;
            const currentNow = Date.now();
            const currentActive = calculateActiveWorkSeconds(prev, currentNow);
            playSoftChime();
            notifyUser("Shift Focus", "5-minute break started.");
            setNotificationBanner("5-minute break started. Relax and reset.");

            return {
                ...prev,
                status: "BREAK",
                accumulatedActiveSeconds: currentActive,
                lastActiveStart: null,
                breakStartTime: currentNow,
                currentBreakNumber: eligibility.breakNumber || 1
            };
        });
    }, [eligibility.breakNumber]);

    // Skip the offered break
    const handleSkipBreakOffer = useCallback(() => {
        setTimerState((prev) => {
            if (!prev) return prev;
            const k = eligibility.breakNumber;
            const skipped = [...prev.breaksSkipped];
            if (k && !skipped.includes(k)) skipped.push(k);
            setNotificationBanner("Break skipped. Keeping the momentum going.");
            return {
                ...prev,
                breaksSkipped: skipped
            };
        });
    }, [eligibility.breakNumber]);

    // Skip an active break early & resume work
    const handleSkipActiveBreak = useCallback(() => {
        setTimerState((prev) => {
            if (!prev) return prev;
            const currentNow = Date.now();
            const updatedBreaksTaken = [...prev.breaksTaken];
            if (prev.currentBreakNumber && !updatedBreaksTaken.includes(prev.currentBreakNumber)) {
                updatedBreaksTaken.push(prev.currentBreakNumber);
            }
            setNotificationBanner("Resuming work.");

            return {
                ...prev,
                status: "WORKING",
                lastActiveStart: currentNow,
                breakStartTime: null,
                breaksTaken: updatedBreaksTaken
            };
        });
    }, []);

    // API Put Action
    const putAction = async (body) => {
        const res = await apiFetch(`/actions/${actionId}`, {
            method: "PUT",
            body: JSON.stringify(body)
        });
        if (res.status === 404) {
            clearTimerState(actionId);
            clearActiveAction();
            return null;
        }
        return res;
    };

    const notePatch = () => (note.trim() ? { note: note.trim() } : {});

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
            days.add(dayKey(new Date()));
            setStreak(computeStreak(days).current);
        } catch {
            /* streak is a flourish */
        }
    };

    const completeAction = async () => {
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
            clearTimerState(actionId);

            setShowFeedback(true);
            setMessage("");

            if (!prefersReducedMotion()) celebratePayoff();
            loadStreak();
        } catch (error) {
            console.error(error);
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
            clearTimerState(actionId);
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
            clearTimerState(actionId);
            clearActiveAction();
        } catch (error) {
            console.error(error);
            setMessage("Failed to save feedback.");
        }
    };

    return (
        <div className="app">
            <div className="now-page">
                {/* Floating In-App Break Notification Banner */}
                {notificationBanner && (
                    <div className="timer-notification-pill" role="status">
                        <span>{notificationBanner}</span>
                        <button
                            type="button"
                            className="timer-notification-dismiss"
                            onClick={() => setNotificationBanner("")}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {!showFeedback ? (
                    isInBreak ? (
                        /* BREAK STATE */
                        <section className="recommendation-card focus-active break-active">
                            <p className="eyebrow">☕ BREAK</p>

                            <BreakTimer remainingSeconds={remainingBreakSeconds} />

                            <h1>Take a moment.</h1>
                            <p className="subtitle">
                                We'll get you back on track in a few minutes.
                            </p>

                            <div className="action-buttons">
                                <button
                                    className="secondary-button break-skip-action"
                                    onClick={handleSkipActiveBreak}
                                >
                                    Skip Break & Resume
                                </button>
                            </div>
                        </section>
                    ) : (
                        /* WORK STATE */
                        <section className="recommendation-card focus-active">
                            <p className="eyebrow">
                                {isPaused ? "⏸ PAUSED" : "⏱ IN MOTION"}
                            </p>

                            <FocusTimer
                                minutes={task.estimatedTime}
                                activeWorkSeconds={activeWorkSeconds}
                                isPaused={isPaused}
                                onTogglePause={handleTogglePause}
                            />

                            {/* Break Opportunity Prompt (during 25:00 - 25:59 window) */}
                            {breakOfferAvailable && (
                                <div className="break-offer-card">
                                    <div className="break-offer-text">
                                        <strong>5 min break available</strong>
                                        <p>You've completed 25 minutes of active focus.</p>
                                    </div>
                                    <div className="break-offer-actions">
                                        <button
                                            type="button"
                                            className="break-take-btn"
                                            onClick={handleTakeBreak}
                                        >
                                            Take a 5 min break
                                        </button>
                                        <button
                                            type="button"
                                            className="break-skip-btn"
                                            onClick={handleSkipBreakOffer}
                                        >
                                            Skip
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                onClick={() => {
                                    clearTimerState(actionId);
                                    dismissActiveAction(actionId);
                                }}
                            >
                                Not now — I'll finish later
                            </button>

                            {message && <p className="message">{message}</p>}
                        </section>
                    )
                ) : (
                    /* FEEDBACK / CELEBRATION STATE */
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

                        <p className="eyebrow">✦ QUICK GUT CHECK</p>

                        <h1>
                            <FlipText text="Did that shift something?" />
                        </h1>

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
