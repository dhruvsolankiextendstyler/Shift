import { useEffect, useRef } from "react";

// App-wide tap feedback for mobile & touch interactions.
// Every pointerdown from a touch interaction spawns a small ripple + droplet burst
// matching Shift's original mobile feel.
// Desktop mouse/pointer interactions are handled by DesktopCursor to prevent duplicate effects.

const COUNT = 6;
const REACH = [20, 52]; // px
const SIZE = [4, 8]; // px
const LIFE = [400, 620]; // ms
const GRAVITY = 24; // px sag
const COLOR = "var(--tap-drop-color, var(--accent, #f5f5f5))";

const rand = (a, b) => a + Math.random() * (b - a);

const BASE = {
    position: "absolute",
    borderRadius: "50%",
    willChange: "transform, opacity",
    pointerEvents: "none"
};

export default function TapDroplets() {
    const layerRef = useRef(null);

    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

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

            // Contact ripple
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

            // Droplets
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
                            transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 5}px) scale(1)`,
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

        const onDown = (e) => {
            // Only fire for touch devices or coarse pointers.
            // Mouse/desktop pointers are handled cleanly by DesktopCursor.
            if (e.pointerType === "touch" || window.matchMedia("(pointer: coarse)").matches) {
                burst(e.clientX, e.clientY);
            }
        };

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
