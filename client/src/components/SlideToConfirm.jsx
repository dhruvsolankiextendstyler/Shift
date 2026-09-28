import { useEffect, useRef, useState } from "react";

// Slide-to-confirm — ported to Shift's stack (plain CSS + pointer events, no
// framer-motion). For high-intent, hard-to-undo actions where a stray tap
// shouldn't fire: starting a focus session (freezes the app), etc.
//
// Drag the handle past the threshold OR press Enter/Space (keyboard fallback).
// No `filter:` on the moving parts — see memory: no-animated-svg-filters.

const THRESHOLD = 0.9; // fraction of the track you must cross to fire

export default function SlideToConfirm({
    label = "Slide to confirm",
    confirmedLabel = "Starting…",
    onConfirm,
    disabled = false
}) {
    const trackRef = useRef(null);
    const fillRef = useRef(null);
    const handleRef = useRef(null);
    const dragRef = useRef({ active: false, startX: 0, max: 0 });
    const resetTimer = useRef(null);
    const [done, setDone] = useState(false);

    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    useEffect(() => () => clearTimeout(resetTimer.current), []);

    const paint = (x) => {
        const max = dragRef.current.max || 1;
        handleRef.current.style.transform = `translateX(${x}px)`;
        fillRef.current.style.width = `${x + handleRef.current.offsetWidth + 4}px`;
        trackRef.current.style.setProperty("--slide-progress", x / max);
    };

    const springBack = () => {
        const ms = reducedMotion ? 0 : 320;
        const ease = "cubic-bezier(0.34,1.3,0.64,1)"; // slight overshoot
        handleRef.current.animate(
            [{ transform: handleRef.current.style.transform }, { transform: "translateX(0)" }],
            { duration: ms, easing: ease, fill: "forwards" }
        );
        fillRef.current.animate(
            [{ width: fillRef.current.style.width }, { width: `${handleRef.current.offsetWidth}px` }],
            { duration: ms, easing: ease, fill: "forwards" }
        );
        paint(0);
    };

    const confirm = () => {
        if (done || disabled) return;
        setDone(true);
        const max = dragRef.current.max || trackWidth();
        handleRef.current.animate(
            [{ transform: handleRef.current.style.transform || "translateX(0)" }, { transform: `translateX(${max}px)` }],
            { duration: reducedMotion ? 0 : 200, easing: "ease-out", fill: "forwards" }
        );
        fillRef.current.animate(
            [{ width: fillRef.current.style.width || "0px" }, { width: `${trackRef.current.clientWidth}px` }],
            { duration: reducedMotion ? 0 : 200, easing: "ease-out", fill: "forwards" }
        );
        trackRef.current.style.setProperty("--slide-progress", 1);
        onConfirm?.();
        // If the action fails (app doesn't unmount us), let the user retry.
        resetTimer.current = setTimeout(() => {
            setDone(false);
            paint(0);
        }, 1600);
    };

    const trackWidth = () =>
        trackRef.current.clientWidth - handleRef.current.offsetWidth - 8;

    const onPointerDown = (e) => {
        if (done || disabled) return;
        const max = trackWidth();
        dragRef.current = { active: true, startX: e.clientX, max };
        handleRef.current.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d.active) return;
        const x = Math.max(0, Math.min(d.max, e.clientX - d.startX));
        paint(x);
    };

    const onPointerUp = (e) => {
        const d = dragRef.current;
        if (!d.active) return;
        d.active = false;
        handleRef.current.releasePointerCapture?.(e.pointerId);
        const x = Math.max(0, Math.min(d.max, e.clientX - d.startX));
        if (x >= d.max * THRESHOLD) confirm();
        else springBack();
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            confirm();
        }
    };

    return (
        <div
            ref={trackRef}
            className={`slide-confirm ${done ? "is-done" : ""} ${disabled ? "is-disabled" : ""}`}
        >
            <span ref={fillRef} className="slide-confirm-fill" aria-hidden="true" />
            <span className="slide-confirm-label">{done ? confirmedLabel : label}</span>
            <button
                ref={handleRef}
                type="button"
                className="slide-confirm-handle"
                aria-label={label}
                disabled={disabled}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
            >
                →
            </button>
        </div>
    );
}
