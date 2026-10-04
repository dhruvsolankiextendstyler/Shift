import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Number reveal animation in the exact design language of Now.jsx's FlipText:
// 3D perspective flip-in (rotateX(-90deg) -> 0) with cubic-bezier(0.2, 0.7, 0.3, 1)
// paired with a rolling counter from 0 to the target number.
// Strictly displays the exact real value on completion.

const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export default function NumberReveal({
    value,
    duration = 540,
    delay = 0,
    prefix = "",
    suffix = "",
    className = ""
}) {
    const elRef = useRef(null);
    const [display, setDisplay] = useState(0);
    const fromRef = useRef(0);
    const rafRef = useRef(0);

    const isNumeric = typeof value === "number" && !isNaN(value);

    // 1. Flip-in reveal matching FlipText.jsx
    useLayoutEffect(() => {
        if (!isNumeric) return;
        if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        const el = elRef.current;
        if (!el) return;

        const anim = el.animate(
            [
                {
                    transform: "perspective(600px) rotateX(-90deg) translateY(0.35em)",
                    opacity: 0
                },
                {
                    transform: "perspective(600px) rotateX(0) translateY(0)",
                    opacity: 1
                }
            ],
            {
                duration: 520,
                delay,
                easing: "cubic-bezier(0.2,0.7,0.3,1)",
                fill: "backwards"
            }
        );

        return () => anim.cancel();
    }, [value, delay, isNumeric]);

    // 2. Rolling count-up to exact backend value
    useEffect(() => {
        if (!isNumeric) return;

        const target = value;
        if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            fromRef.current = target;
            setDisplay(target);
            return;
        }

        const from = fromRef.current;
        if (from === target) {
            setDisplay(target);
            return;
        }

        const start = performance.now() + delay;
        cancelAnimationFrame(rafRef.current);

        const tick = (now) => {
            if (now < start) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const t = Math.min((now - start) / duration, 1);
            const current = Math.round(from + (target - from) * easeOut(t));
            setDisplay(current);

            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                setDisplay(target); // Guarantee exact target value
                fromRef.current = target;
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration, delay, isNumeric]);

    if (!isNumeric) {
        return <span className={className}>{value ?? ""}</span>;
    }

    return (
        <span
            ref={elRef}
            className={`number-reveal ${className}`}
            style={{ display: "inline-block", willChange: "transform, opacity" }}
        >
            {prefix}
            {display}
            {suffix}
        </span>
    );
}
