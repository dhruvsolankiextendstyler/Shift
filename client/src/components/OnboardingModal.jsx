import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SCREENS = [
    {
        step: 1,
        eyebrow: "HOW SHIFT WORKS • 1 OF 5",
        title: "Welcome to Shift",
        description:
            "Shift helps you decide what to do next based on your available time and the kind of activity you want to do.",
        visual: "welcome"
    },
    {
        step: 2,
        eyebrow: "HOW SHIFT WORKS • 2 OF 5",
        title: "Pick what you want",
        description:
            "Choose what kind of thing you want to work on and how much time you have. Shift filters your pool to find your next move.",
        visual: "flow"
    },
    {
        step: 3,
        eyebrow: "HOW SHIFT WORKS • 3 OF 5",
        title: "Just start",
        description:
            "Shift recommends a single activity so you avoid decision fatigue. Slide to confirm and start immediately.",
        visual: "start"
    },
    {
        step: 4,
        eyebrow: "HOW SHIFT WORKS • 4 OF 5",
        title: "Shift learns from your activity",
        description:
            "Completed activities appear in History and contribute to Insights, helping Shift become more useful over time.",
        visual: "learn"
    },
    {
        step: 5,
        eyebrow: "HOW SHIFT WORKS • 5 OF 5",
        title: "Add your tasks",
        description:
            "Add a few tasks to Shift so recommendations have something meaningful to work with whenever you're ready.",
        visual: "tasks"
    }
];

function StepVisual({ type }) {
    if (type === "welcome") {
        return (
            <div className="onboarding-card-preview" aria-hidden="true">
                <div className="onboarding-pill-badge">
                    <span className="onboarding-pulse-dot" />
                    <span>MOMENTUM ON DEMAND</span>
                </div>
                <div className="onboarding-preview-equation">
                    <div className="equation-chip">Available Time</div>
                    <span className="equation-op">+</span>
                    <div className="equation-chip">Category</div>
                    <span className="equation-op">→</span>
                    <div className="equation-chip equation-chip--highlight">
                        Your Move
                    </div>
                </div>
            </div>
        );
    }

    if (type === "flow") {
        return (
            <div className="onboarding-card-preview" aria-hidden="true">
                <div className="onboarding-flow-steps">
                    <div className="flow-step-box">
                        <span className="flow-step-num">01</span>
                        <span className="flow-step-label">Category</span>
                        <span className="flow-step-sub">What to do</span>
                    </div>
                    <span className="flow-arrow">→</span>
                    <div className="flow-step-box">
                        <span className="flow-step-num">02</span>
                        <span className="flow-step-label">Duration</span>
                        <span className="flow-step-sub">5 to 60+ min</span>
                    </div>
                    <span className="flow-arrow">→</span>
                    <div className="flow-step-box flow-step-box--highlight">
                        <span className="flow-step-num">03</span>
                        <span className="flow-step-label">Pick</span>
                        <span className="flow-step-sub">Best fit</span>
                    </div>
                </div>
            </div>
        );
    }

    if (type === "start") {
        return (
            <div className="onboarding-card-preview" aria-hidden="true">
                <div className="onboarding-slide-mock">
                    <div className="slide-mock-track">
                        <div className="slide-mock-thumb">⚡</div>
                        <span className="slide-mock-label">Slide to start</span>
                    </div>
                </div>
                <p className="onboarding-mock-sub">
                    One single recommendation • No distraction
                </p>
            </div>
        );
    }

    if (type === "learn") {
        return (
            <div className="onboarding-card-preview" aria-hidden="true">
                <div className="onboarding-stats-row">
                    <div className="stats-pill">
                        <span className="stats-pill-title">History</span>
                        <span className="stats-pill-val">Every action</span>
                    </div>
                    <div className="stats-pill">
                        <span className="stats-pill-title">Insights</span>
                        <span className="stats-pill-val">Daily rhythm</span>
                    </div>
                    <div className="stats-pill">
                        <span className="stats-pill-title">Momentum</span>
                        <span className="stats-pill-val">Adaptive score</span>
                    </div>
                </div>
            </div>
        );
    }

    // tasks
    return (
        <div className="onboarding-card-preview" aria-hidden="true">
            <div className="onboarding-task-chip">
                <div className="task-chip-header">
                    <span className="task-chip-title">Draft project roadmap</span>
                    <span className="task-chip-priority">high</span>
                </div>
                <div className="task-chip-meta">
                    <span>Work</span>
                    <span>•</span>
                    <span>30 min</span>
                    <span>•</span>
                    <span>high effort</span>
                </div>
            </div>
        </div>
    );
}

export default function OnboardingModal({ onComplete, completing = false }) {
    const [stepIndex, setStepIndex] = useState(0);
    const panelRef = useRef(null);
    const currentScreen = SCREENS[stepIndex];
    const isLast = stepIndex === SCREENS.length - 1;

    // Guard browser Back button: push a state so popping returns to previous step
    // and NEVER dismisses the mandatory onboarding.
    useEffect(() => {
        window.history.pushState({ shiftOnboarding: true }, "");

        const handlePopState = () => {
            window.history.pushState({ shiftOnboarding: true }, "");
            setStepIndex((cur) => (cur > 0 ? cur - 1 : 0));
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    // Lock body scrolling while onboarding is active
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, []);

    // Trap focus inside modal & keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Block Escape key completely — onboarding cannot be dismissed
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Keyboard navigation with arrow keys
            if (e.key === "ArrowRight") {
                if (stepIndex < SCREENS.length - 1) {
                    e.preventDefault();
                    setStepIndex((s) => s + 1);
                }
            } else if (e.key === "ArrowLeft") {
                if (stepIndex > 0) {
                    e.preventDefault();
                    setStepIndex((s) => s - 1);
                }
            }

            // Focus trap Tab / Shift+Tab
            if (e.key === "Tab" && panelRef.current) {
                const focusables = panelRef.current.querySelectorAll(
                    'button:not(:disabled), [tabindex="0"]:not([tabindex="-1"])'
                );
                if (focusables.length === 0) return;

                const firstEl = focusables[0];
                const lastEl = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    }
                } else {
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [stepIndex]);

    const handleNext = useCallback(() => {
        if (isLast) {
            onComplete();
        } else {
            setStepIndex((s) => s + 1);
        }
    }, [isLast, onComplete]);

    const handleBack = useCallback(() => {
        if (stepIndex > 0) {
            setStepIndex((s) => s - 1);
        }
    }, [stepIndex]);

    return createPortal(
        <div
            className="onboarding-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            aria-describedby="onboarding-desc"
        >
            <div className="onboarding-panel" ref={panelRef}>
                {/* Header with eyebrow & step dots */}
                <div className="onboarding-header">
                    <p className="eyebrow">{currentScreen.eyebrow}</p>
                    <div
                        className="onboarding-dots"
                        role="tablist"
                        aria-label="Onboarding progress"
                    >
                        {SCREENS.map((s, idx) => (
                            <button
                                key={s.step}
                                type="button"
                                role="tab"
                                aria-selected={stepIndex === idx}
                                aria-label={`Screen ${idx + 1}: ${s.title}`}
                                className={`dot ${stepIndex === idx ? "active" : ""}`}
                                onClick={() => setStepIndex(idx)}
                            />
                        ))}
                    </div>
                </div>

                {/* Animated content card */}
                <div
                    key={currentScreen.step}
                    className="onboarding-step-content"
                >
                    <h1 id="onboarding-title" className="onboarding-title">
                        {currentScreen.title}
                    </h1>

                    <p id="onboarding-desc" className="onboarding-text">
                        {currentScreen.description}
                    </p>

                    <StepVisual type={currentScreen.visual} />
                </div>

                {/* Actions row */}
                <div className="onboarding-actions">
                    {stepIndex > 0 ? (
                        <button
                            type="button"
                            className="secondary-button onboarding-back-btn"
                            onClick={handleBack}
                            disabled={completing}
                        >
                            ← Back
                        </button>
                    ) : (
                        <div className="onboarding-btn-spacer" />
                    )}

                    <button
                        type="button"
                        className="shift-button onboarding-next-btn"
                        onClick={handleNext}
                        disabled={completing}
                    >
                        {completing ? (
                            <span className="btn-spinner" />
                        ) : isLast ? (
                            "Let's Get Started →"
                        ) : (
                            "Next →"
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
