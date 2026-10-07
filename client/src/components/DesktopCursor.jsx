import { useEffect, useRef } from "react";

// Centralized Desktop Custom Cursor Interaction for Shift.
// Enabled strictly for desktop/fine-pointer devices: @media (hover: hover) and (pointer: fine).
// Features:
// 1. Precise main cursor dot following mouse.
// 2. Smooth trailing tail with diminishing scale/opacity that catches up and fades when idle.
// 3. Click interaction matching Shift's mobile tap animation language.
// 4. Subtle hover expansion over interactive elements.
// 5. Preserves native I-beam cursor & selection over inputs and textareas.
// 6. Respects prefers-reduced-motion.

const TRAIL_LENGTH = 7;
const COLOR = "var(--tap-drop-color, var(--accent, #f5f5f5))";

export default function DesktopCursor() {
    const rootRef = useRef(null);
    const mainRef = useRef(null);
    const trailRefs = useRef([]);
    const clickLayerRef = useRef(null);

    useEffect(() => {
        // Capability check: only run on devices with hover and fine pointer (mouse/trackpad).
        const hasFinePointer = window.matchMedia(
            "(hover: hover) and (pointer: fine)"
        ).matches;
        if (!hasFinePointer) return;

        const reduceMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

        const root = rootRef.current;
        const main = mainRef.current;
        const clickLayer = clickLayerRef.current;
        if (!root || !main || !clickLayer) return;

        // Add class to body so custom cursor styles apply only when active
        document.body.classList.add("has-desktop-cursor");

        let mouseX = -100;
        let mouseY = -100;
        let isVisible = false;
        let isHovering = false;
        let isOverText = false;
        let lastMoveTime = 0;
        let rafId = null;

        // Position history for tail points
        const points = Array.from({ length: TRAIL_LENGTH }, () => ({
            x: -100,
            y: -100,
            angle: 0
        }));

        // Slower, fluid lerp factors so the trail sweeps with gentle inertia
        const lerpFactors = [0.24, 0.18, 0.13, 0.09, 0.065, 0.045, 0.03];
        // Tapered-comet thickness profile: slightly thicker at head, smoothly tapering to tail
        const scales = [1.20, 1.00, 0.82, 0.65, 0.48, 0.32, 0.18];
        const opacities = [0.65, 0.54, 0.44, 0.34, 0.25, 0.18, 0.12];

        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            lastMoveTime = performance.now();

            if (!isVisible) {
                isVisible = true;
                root.style.opacity = "1";
                for (let i = 0; i < TRAIL_LENGTH; i++) {
                    points[i].x = mouseX;
                    points[i].y = mouseY;
                    points[i].angle = 0;
                }
            }

            // Check if hovering over interactive elements or text inputs
            const target = e.target;
            if (target && target.closest) {
                const textInput = target.closest(
                    "input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio']), textarea, [contenteditable='true']"
                );
                isOverText = !!textInput;

                const interactive = target.closest(
                    "button, a, [role='button'], input[type='button'], input[type='submit'], select, .clickable, .tab, .dot, .bookmark-btn, .focus-release"
                );
                isHovering = !!interactive && !isOverText;
            } else {
                isOverText = false;
                isHovering = false;
            }
        };

        const onMouseEnter = () => {
            isVisible = true;
            root.style.opacity = "1";
        };

        const onMouseLeave = () => {
            isVisible = false;
            root.style.opacity = "0";
        };

        // Click animation in the exact design language of Shift mobile tap
        const onClick = (e) => {
            if (e.pointerType && e.pointerType !== "mouse") return;
            if (isOverText) return;

            const x = e.clientX;
            const y = e.clientY;

            // Contact ripple
            const ripple = document.createElement("span");
            const rSize = 20;
            Object.assign(ripple.style, {
                position: "absolute",
                left: `${x - rSize / 2}px`,
                top: `${y - rSize / 2}px`,
                width: `${rSize}px`,
                height: `${rSize}px`,
                borderRadius: "50%",
                background: `radial-gradient(circle, transparent 40%, ${COLOR} 68%, transparent 72%)`,
                willChange: "transform, opacity",
                pointerEvents: "none"
            });
            clickLayer.appendChild(ripple);

            const rippleAnim = ripple.animate(
                [
                    { transform: "scale(0.2)", opacity: 0.9 },
                    { transform: "scale(2.2)", opacity: 0 }
                ],
                {
                    duration: 400,
                    easing: "cubic-bezier(0.2, 0.6, 0.3, 1)",
                    fill: "forwards"
                }
            );
            rippleAnim.onfinish = () => ripple.remove();
            rippleAnim.oncancel = () => ripple.remove();

            // Under normal motion, spawn 4 micro-droplets
            if (!reduceMotion.matches) {
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                    const dist = 24 + Math.random() * 20;
                    const dx = Math.cos(angle) * dist;
                    const dy = Math.sin(angle) * dist;
                    const size = 4 + Math.random() * 2;

                    const drop = document.createElement("span");
                    Object.assign(drop.style, {
                        position: "absolute",
                        left: `${x - size / 2}px`,
                        top: `${y - size / 2}px`,
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: "50%",
                        background: COLOR,
                        willChange: "transform, opacity",
                        pointerEvents: "none"
                    });
                    clickLayer.appendChild(drop);

                    const dropAnim = drop.animate(
                        [
                            { transform: "translate(0, 0) scale(0.6)", opacity: 0.9 },
                            {
                                transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 4}px) scale(1)`,
                                opacity: 0.8,
                                offset: 0.5
                            },
                            {
                                transform: `translate(${dx}px, ${dy + 16}px) scale(0.2)`,
                                opacity: 0
                            }
                        ],
                        {
                            duration: 380 + Math.random() * 140,
                            easing: "cubic-bezier(0.15, 0.7, 0.25, 1)",
                            fill: "forwards"
                        }
                    );
                    dropAnim.onfinish = () => drop.remove();
                    dropAnim.oncancel = () => drop.remove();
                }
            }
        };

        // Animation loop
        const loop = (now) => {
            if (isVisible) {
                // If over text input, hide custom cursor so native I-beam cursor displays cleanly
                if (isOverText) {
                    main.style.opacity = "0";
                    trailRefs.current.forEach((el) => {
                        if (el) el.style.opacity = "0";
                    });
                } else {
                    main.style.opacity = "1";
                    // Position main cursor
                    const scale = isHovering ? 1.5 : 1.0;
                    main.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) scale(${scale})`;
                    main.style.borderColor = isHovering
                        ? "var(--accent, #f5f5f5)"
                        : "rgba(245, 245, 245, 0.6)";

                    // Update tail points with smooth lerping
                    if (!reduceMotion.matches) {
                        const idleMs = now - lastMoveTime;
                        // Tail stays visible for 1000ms idle, then fades smoothly over 800ms (~1800ms total)
                        const idleFade = Math.max(0, 1 - Math.max(0, idleMs - 1000) / 800);

                        let prevX = mouseX;
                        let prevY = mouseY;

                        for (let i = 0; i < TRAIL_LENGTH; i++) {
                            const p = points[i];
                            const el = trailRefs.current[i];
                            if (!el) continue;

                            const factor = lerpFactors[i];
                            p.x += (prevX - p.x) * factor;
                            p.y += (prevY - p.y) * factor;

                            const dx = prevX - p.x;
                            const dy = prevY - p.y;
                            const dist = Math.hypot(dx, dy);

                            if (dist > 0.4) {
                                p.angle = Math.atan2(dy, dx);
                            }

                            prevX = p.x;
                            prevY = p.y;

                            const pointOpacity = opacities[i] * idleFade;
                            el.style.opacity = pointOpacity.toFixed(3);

                            // Subtle tapered-comet shape: slightly thicker near cursor, smoothly tapered to tail
                            const stretch = Math.min(dist * 0.035, 0.45);
                            const distToCursor = Math.hypot(mouseX - p.x, mouseY - p.y);
                            const convergence = Math.min(1, Math.max(0.75, distToCursor / 6));
                            const baseScale = scales[i] * (i === 0 ? convergence : 1);
                            const scaleX = baseScale * (1 + stretch);
                            const scaleY = baseScale;
                            const angle = p.angle || 0;

                            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${angle}rad) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
                        }
                    } else {
                        // Reduced motion: hide tail
                        trailRefs.current.forEach((el) => {
                            if (el) el.style.opacity = "0";
                        });
                    }
                }
            }

            rafId = requestAnimationFrame(loop);
        };

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        window.addEventListener("pointerdown", onClick, { passive: true });
        document.documentElement.addEventListener("mouseenter", onMouseEnter);
        document.documentElement.addEventListener("mouseleave", onMouseLeave);

        rafId = requestAnimationFrame(loop);

        return () => {
            document.body.classList.remove("has-desktop-cursor");
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("pointerdown", onClick);
            document.documentElement.removeEventListener("mouseenter", onMouseEnter);
            document.documentElement.removeEventListener("mouseleave", onMouseLeave);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <>
            <div
                ref={rootRef}
                className="desktop-cursor-root"
                aria-hidden="true"
                style={{
                    position: "fixed",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 2147483640,
                    opacity: 0,
                    transition: "opacity 0.2s ease"
                }}
            >
                {/* Tail points (diminishing dots) */}
                {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
                    <div
                        key={i}
                        ref={(el) => (trailRefs.current[i] = el)}
                        className="cursor-tail-point"
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: 8,
                            height: 8,
                            marginLeft: -4,
                            marginTop: -4,
                            borderRadius: "50%",
                            background: "var(--accent, #f5f5f5)",
                            pointerEvents: "none",
                            willChange: "transform, opacity",
                            opacity: 0
                        }}
                    />
                ))}

                {/* Main cursor */}
                <div
                    ref={mainRef}
                    className="cursor-main-dot"
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: 8,
                        height: 8,
                        marginLeft: -4,
                        marginTop: -4,
                        borderRadius: "50%",
                        background: "var(--accent, #f5f5f5)",
                        border: "1px solid rgba(245, 245, 245, 0.7)",
                        pointerEvents: "none",
                        willChange: "transform, opacity",
                        transition:
                            "border-color 0.15s ease, background-color 0.15s ease"
                    }}
                />
            </div>

            {/* Click animation layer */}
            <div
                ref={clickLayerRef}
                className="desktop-click-layer"
                aria-hidden="true"
                style={{
                    position: "fixed",
                    inset: 0,
                    pointerEvents: "none",
                    overflow: "hidden",
                    zIndex: 2147483641
                }}
            />
        </>
    );
}
