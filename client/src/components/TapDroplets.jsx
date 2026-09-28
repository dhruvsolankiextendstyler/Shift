import { useEffect, useRef } from "react";

// App-wide tap feedback: every pointer-down spawns a small ripple + a burst of
// droplets that arc out and fade. Mounted once at the root; listens on document
// so it fires everywhere (Auth, FocusLock, pages, modals).
//
// Constraints baked in:
//  - No CSS `filter:` on the animating nodes — that re-rasterizes every frame
//    and crashes mobile tabs (see memory: no-animated-svg-filters). Only
//    transform + opacity, which the compositor handles.
//  - Skipped entirely under prefers-reduced-motion.
//
// Tuning knobs (safe to tweak):
const COUNT = 6; // droplets per tap
const REACH = [22, 58]; // px, min/max travel
const SIZE = [4, 9]; // px, droplet diameter range
const LIFE = [430, 680]; // ms, droplet duration range
const GRAVITY = 26; // px the arc sags by the end
const COLOR = "var(--tap-drop-color, var(--accent, #f5f5f5))";

const rand = (a, b) => a + Math.random() * (b - a);

const BASE = {
    position: "absolute",
    borderRadius: "50%",
    willChange: "transform, opacity"
};

export default function TapDroplets() {
    const layerRef = useRef(null);

    useEffect(() => {
        const reduce = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const drop = (node, keyframes, ms, easing) => {
            const anim = node.animate(keyframes, {
                duration: ms,
                easing,
                fill: "forwards"
            });
            anim.onfinish = () => node.remove();
            anim.oncancel = () => node.remove();
        };

        const burst = (x, y) => {
            if (reduce.matches) return;
            const layer = layerRef.current;
            if (!layer) return;

            // contact ripple
            const ripple = document.createElement("span");
            ripple.className = "tap-drop";
            const rSize = 18;
            Object.assign(ripple.style, {
                left: `${x - rSize / 2}px`,
                top: `${y - rSize / 2}px`,
                width: `${rSize}px`,
                height: `${rSize}px`,
                background: `radial-gradient(circle, transparent 45%, ${COLOR} 70%, transparent 72%)`,
                ...BASE
            });
            layer.appendChild(ripple);
            drop(
                ripple,
                [
                    { transform: "scale(0.2)", opacity: 0.9 },
                    { transform: "scale(2.2)", opacity: 0 }
                ],
                420,
                "cubic-bezier(0.2,0.6,0.3,1)"
            );

            // droplets
            for (let i = 0; i < COUNT; i++) {
                const angle = (i / COUNT) * Math.PI * 2 + rand(-0.4, 0.4);
                const reach = rand(...REACH);
                const size = rand(...SIZE);
                const dx = Math.cos(angle) * reach;
                const dy = Math.sin(angle) * reach;

                const d = document.createElement("span");
                d.className = "tap-drop";
                Object.assign(d.style, {
                    left: `${x - size / 2}px`,
                    top: `${y - size / 2}px`,
                    width: `${size}px`,
                    height: `${size}px`,
                    background: COLOR,
                    ...BASE
                });
                layer.appendChild(d);
                drop(
                    d,
                    [
                        { transform: "translate(0,0) scale(0.6)", opacity: 1 },
                        {
                            transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 6}px) scale(1)`,
                            opacity: 1,
                            offset: 0.45
                        },
                        {
                            transform: `translate(${dx}px, ${dy + GRAVITY}px) scale(0.3)`,
                            opacity: 0
                        }
                    ],
                    rand(...LIFE),
                    "cubic-bezier(0.15,0.7,0.25,1)"
                );
            }
        };

        const onDown = (e) => burst(e.clientX, e.clientY);
        document.addEventListener("pointerdown", onDown, { passive: true });
        return () => document.removeEventListener("pointerdown", onDown);
    }, []);

    return (
        <div
            ref={layerRef}
            aria-hidden="true"
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                overflow: "hidden",
                zIndex: 2147483000
            }}
        />
    );
}
