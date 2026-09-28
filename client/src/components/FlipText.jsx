import { Fragment, useLayoutEffect, useRef } from "react";

// One-shot per-word flip-in reveal for headings. Ported from ObsidianUI's Flip
// Text to Shift's stack: WAAPI, no framer-motion, no `filter:` on the moving
// words (see memory: no-animated-svg-filters). Words render visible by default
// (no-JS / reduced-motion safe); we only hide-then-flip them when motion is on.
export default function FlipText({ text, stagger = 55, className = "" }) {
    const ref = useRef(null);

    useLayoutEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const words = ref.current?.querySelectorAll(".flip-word");
        if (!words) return;
        words.forEach((w, i) => {
            w.animate(
                [
                    {
                        transform:
                            "perspective(600px) rotateX(-90deg) translateY(0.35em)",
                        opacity: 0
                    },
                    {
                        transform: "perspective(600px) rotateX(0) translateY(0)",
                        opacity: 1
                    }
                ],
                {
                    duration: 520,
                    delay: i * stagger,
                    easing: "cubic-bezier(0.2,0.7,0.3,1)",
                    fill: "backwards" // hold the hidden start state through the delay
                }
            );
        });
    }, [text, stagger]);

    const words = text.split(" ");
    return (
        <span ref={ref} className={`flip-text ${className}`}>
            {words.map((w, i) => (
                <Fragment key={i}>
                    <span className="flip-word">{w}</span>
                    {i < words.length - 1 ? " " : ""}
                </Fragment>
            ))}
        </span>
    );
}
