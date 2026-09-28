import { useEffect, useRef, useState } from "react";

// Number that rolls up to its value on mount (and re-tweens when it changes).
// The "motion" for Insights' stat tiles — ported to Shift's stack with rAF, no
// deps. Integers only (all Insights numbers are counts/rounded rates). Shows the
// final value instantly under reduced motion.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function CountUp({ value, duration = 900 }) {
    const [display, setDisplay] = useState(0);
    const fromRef = useRef(0);
    const rafRef = useRef(0);

    useEffect(() => {
        const target = value || 0;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            fromRef.current = target;
            setDisplay(target);
            return;
        }
        const from = fromRef.current;
        if (from === target) return;

        const start = performance.now();
        cancelAnimationFrame(rafRef.current);
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            setDisplay(Math.round(from + (target - from) * easeOut(t)));
            if (t < 1) rafRef.current = requestAnimationFrame(tick);
            else fromRef.current = target;
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration]);

    return <>{display}</>;
}
