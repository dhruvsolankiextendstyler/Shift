import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";

import Now from "../pages/Now";
import Tasks from "../pages/Tasks";
import History from "../pages/History";
import {
    useInsightsData,
    InsightsTabContent,
    InsightsEmpty,
    INSIGHTS_TABS
} from "../pages/Insights";
import ErrorState from "./ErrorState";

// Flat swipe sequence: the 3 main sections, then Insights fanned out
// into its 4 sub-tabs — so swiping carries straight through (nested).
const VIEWS = [
    { path: "/", section: "now" },
    { path: "/tasks", section: "tasks" },
    { path: "/history", section: "history" },
    ...INSIGHTS_TABS.map((t) => ({
        path: "/insights",
        section: "insights",
        sub: t.id,
        label: t.label
    }))
];

const MAIN = [
    { path: "/", label: "Now", section: "now" },
    { path: "/tasks", label: "Tasks", section: "tasks" },
    { path: "/history", label: "History", section: "history" },
    { path: "/insights", label: "Insights", section: "insights" }
];

// Bottom-nav glyphs — line icons matching the app's style.
function NavIcon({ section }) {
    const p = {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round",
        strokeLinejoin: "round"
    };
    if (section === "now") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-ic nav-ic--now">
                <path {...p} d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" />
            </svg>
        );
    }
    if (section === "tasks") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-ic nav-ic--tasks">
                <path {...p} className="nav-ic-lines" d="M9 6h11M9 12h11M9 18h11" />
                <path {...p} className="nav-ic-check" d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
            </svg>
        );
    }
    if (section === "history") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-ic nav-ic--history">
                <path {...p} className="nav-ic-arc" d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3 8.5" />
                <path {...p} d="M3 4v4.5h4.5" />
                <path {...p} className="nav-ic-hand" d="M12 8v4.3l3 1.7" />
            </svg>
        );
    }
    // insights — three bars that rise like an equalizer, staggered
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-ic nav-ic--insights">
            <path {...p} d="M4 20h16" />
            <path {...p} className="nav-ic-bar" d="M6 20v-6" />
            <path {...p} className="nav-ic-bar" d="M12 20V6" />
            <path {...p} className="nav-ic-bar" d="M18 20v-9" />
        </svg>
    );
}

function MobileShell({ user, logout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathRef = useRef(location.pathname);
    const navRef = useRef(null);
    const profileRef = useRef(null);
    const viewportRef = useRef(null);
    const slideAnim = useRef(null);

    useEffect(() => {
        pathRef.current = location.pathname;
    }, [location.pathname]);

    // Start on whatever section the URL points at (deep link / refresh).
    const initialIndexRef = useRef(
        Math.max(
            0,
            VIEWS.findIndex((v) => v.path === location.pathname)
        )
    );
    const [selected, setSelected] = useState(initialIndexRef.current);
    const [profileOpen, setProfileOpen] = useState(false);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: false,
        align: "start",
        skipSnaps: false,
        startIndex: initialIndexRef.current
    });

    // One ref node feeds both embla (swipe) and our tap-slide animation.
    const setViewport = useCallback(
        (node) => {
            viewportRef.current = node;
            emblaRef(node);
        },
        [emblaRef]
    );

    // Insights data fetched ONCE and shared across all four insights slides.
    const insights = useInsightsData();

    // embla → state + URL
    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            const i = emblaApi.selectedScrollSnap();
            setSelected(i);
            const path = VIEWS[i].path;
            if (path !== pathRef.current) navigate(path);
        };
        emblaApi.on("select", onSelect);
        onSelect();
        return () => emblaApi.off("select", onSelect);
    }, [emblaApi, navigate]);

    // URL (sidebar tap / back button) → embla. Don't fight sub-tab position
    // while already inside insights.
    useEffect(() => {
        if (!emblaApi) return;
        const cur = emblaApi.selectedScrollSnap();
        if (VIEWS[cur].path === location.pathname) return;
        const target = VIEWS.findIndex(
            (v) => v.path === location.pathname
        );
        // jump=true: land on the target instantly instead of animating through
        // every slide in between — that mid-scroll churn is what froze the app
        // when tapping a far tab (e.g. Now → History).
        if (target >= 0) emblaApi.scrollTo(target, true);
    }, [location.pathname, emblaApi]);

    // Tapping a tab jumps embla straight to the target (jump=true) — no animated
    // churn painting every heavy slide in between, which used to freeze the app.
    // We then play a short directional slide+fade on the viewport itself, so a
    // tap reads like a native page transition instead of a hard cut. Swiping
    // still animates through embla as before.
    const goTo = useCallback(
        (index) => {
            if (!emblaApi) return;
            const from = emblaApi.selectedScrollSnap();
            emblaApi.scrollTo(index, true);

            const vp = viewportRef.current;
            if (
                !vp ||
                index === from ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
                return;
            }

            // New screen enters from the direction of travel: a right-hand tab
            // slides in from the right, a left-hand one from the left. Clipped
            // by .mobile-shell's overflow, so the offset never leaks a scrollbar.
            const dir = index > from ? 1 : -1;
            slideAnim.current?.cancel();
            slideAnim.current = vp.animate(
                [
                    { transform: `translateX(${dir * 60}px)`, opacity: 0.35 },
                    { transform: "translateX(0)", opacity: 1 }
                ],
                { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
            );
        },
        [emblaApi]
    );

    // Bottom-nav pill motion, ported from the reference bar (see the vendored
    // liquid_glass_widgets / AttendEase root_screen.dart): one pill that is the
    // single source of truth for its position, tracks the swipe frame-for-frame,
    // and does the "jelly" stretch — elongating along its travel and contracting
    // on arrival. Driven straight to the DOM through navRef on a spring, never
    // through React state, so a swipe rebuilds nothing above the bar.
    useEffect(() => {
        const nav = navRef.current;
        if (!emblaApi || !nav) return;
        if (
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            return; // fall back to the discrete --nav-active CSS glide
        }

        const tabCount = MAIN.length; // pill lives in 0..tabCount-1 space

        // Continuous slide position folded onto the main tabs: the 4 Insights
        // sub-slides all collapse onto the Insights tab, matching mainIndex.
        const liveMain = () => {
            const snaps = emblaApi.scrollSnapList().length || 1;
            const p = Math.min(Math.max(emblaApi.scrollProgress(), 0), 1);
            return Math.min(p * (snaps - 1), tabCount - 1);
        };

        let pos = liveMain();
        let vel = 0;
        let target = pos;
        let following = false; // a drag / its momentum owns the position
        let raf = 0;
        let last = 0;

        nav.dataset.live = "1"; // CSS drops its fallback transition here

        const write = () => {
            const stretch = 1 + Math.min(Math.abs(vel) * 0.5, 0.38);
            nav.style.setProperty("--nav-pos", pos.toFixed(4));
            nav.style.setProperty("--nav-stretch", stretch.toFixed(3));
            nav.style.setProperty(
                "--nav-squash",
                (1 - (stretch - 1) * 0.6).toFixed(3)
            );
        };

        const frame = (t) => {
            const dt = last ? Math.min((t - last) / 1000, 0.032) : 0.016;
            last = t;
            if (following) {
                const live = liveMain();
                vel = (live - pos) / dt; // tab-units per second
                pos = live; // follow the finger 1:1
                target = live;
            } else {
                // ~critically-damped spring → 350ms-ish emphasized settle
                const accel = (target - pos) * 170 - vel * 26;
                vel += accel * dt;
                pos += vel * dt;
                if (
                    Math.abs(target - pos) < 0.002 &&
                    Math.abs(vel) < 0.02
                ) {
                    pos = target;
                    vel = 0;
                }
            }
            write();
            const moving =
                following ||
                Math.abs(target - pos) > 0.001 ||
                Math.abs(vel) > 0.01;
            if (moving) {
                raf = requestAnimationFrame(frame);
            } else {
                raf = 0;
                last = 0;
            }
        };

        const kick = () => {
            if (!raf) {
                last = 0;
                raf = requestAnimationFrame(frame);
            }
        };

        // rAF is paused while the tab is hidden, so a navigation that lands
        // off-screen would leave the pill parked wrong until something ticks.
        // When hidden, snap straight to the target (no one sees the travel);
        // when visible, run the spring.
        const advance = () => {
            if (document.hidden) {
                pos = target;
                vel = 0;
                write();
            } else {
                kick();
            }
        };

        const onScroll = () => following && kick();
        const onDown = () => {
            following = true;
            kick();
        };
        const settleTarget = () => {
            following = false;
            target = Math.min(emblaApi.selectedScrollSnap(), tabCount - 1);
            advance();
        };
        const onSelect = () => {
            target = Math.min(emblaApi.selectedScrollSnap(), tabCount - 1);
            advance();
        };
        // Coming back to the foreground: converge on whatever the current tab is.
        const onVisible = () => !document.hidden && kick();

        emblaApi.on("scroll", onScroll);
        emblaApi.on("pointerDown", onDown);
        emblaApi.on("settle", settleTarget);
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
        document.addEventListener("visibilitychange", onVisible);
        write();
        advance();

        return () => {
            emblaApi.off("scroll", onScroll);
            emblaApi.off("pointerDown", onDown);
            emblaApi.off("settle", settleTarget);
            emblaApi.off("select", onSelect);
            emblaApi.off("reInit", onSelect);
            document.removeEventListener("visibilitychange", onVisible);
            if (raf) cancelAnimationFrame(raf);
            if (nav) {
                delete nav.dataset.live;
                nav.style.removeProperty("--nav-pos");
                nav.style.removeProperty("--nav-stretch");
                nav.style.removeProperty("--nav-squash");
            }
        };
    }, [emblaApi]);

    // Profile popover: close on any pointer press outside it (the avatar and
    // menu share profileRef, so a press on either is "inside" and won't close),
    // and whenever the section changes so a stray open menu never rides along
    // to another tab.
    useEffect(() => {
        if (!profileOpen) return;
        const onDown = (e) => {
            if (
                profileRef.current &&
                !profileRef.current.contains(e.target)
            ) {
                setProfileOpen(false);
            }
        };
        document.addEventListener("pointerdown", onDown);
        return () =>
            document.removeEventListener("pointerdown", onDown);
    }, [profileOpen]);

    useEffect(() => {
        setProfileOpen(false);
    }, [location.pathname]);

    const current = VIEWS[selected];
    const mainIndex = selected < 3 ? selected : 3;
    const inInsights = current.section === "insights";
    const subIndex = inInsights ? selected - 3 : 0;

    const renderInsightsSlide = (sub) => {
        if (insights.loading) {
            return (
                <p className="message">Crunching your patterns...</p>
            );
        }
        if (insights.error) {
            return <ErrorState onRetry={insights.reload} />;
        }
        return (
            <div className="insights-page">
                <div className="page-heading">
                    <div>
                        <p className="eyebrow">◈ INSIGHTS</p>
                        <h1>
                            {
                                INSIGHTS_TABS.find((t) => t.id === sub)
                                    .label
                            }
                        </h1>
                    </div>
                </div>
                {insights.isEmpty ? (
                    <InsightsEmpty />
                ) : (
                    <InsightsTabContent d={insights.d} tab={sub} />
                )}
            </div>
        );
    };

    return (
        <div className="mobile-shell">
            <header className="mobile-header">
                <span className="mobile-header-spacer" />

                <button
                    className="mobile-logo"
                    aria-label="Back to Now"
                    onClick={() => {
                        setProfileOpen(false);
                        goTo(0);
                    }}
                >
                    SHIFT <span>⚡</span>
                </button>

                <div className="mobile-profile" ref={profileRef}>
                    <button
                        className="mobile-avatar"
                        aria-label="Account"
                        aria-haspopup="true"
                        aria-expanded={profileOpen}
                        onClick={() => setProfileOpen((o) => !o)}
                    >
                        {(user?.name || "?").charAt(0).toUpperCase()}
                    </button>

                    {profileOpen && (
                        <div className="profile-menu" role="menu">
                            <div className="profile-head">
                                <span className="profile-avatar">
                                    {(user?.name || "?")
                                        .charAt(0)
                                        .toUpperCase()}
                                </span>
                                <div className="profile-id">
                                    <p className="profile-name">
                                        {user?.name}
                                    </p>
                                    <p
                                        className="profile-email"
                                        title={user?.email}
                                    >
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                className="profile-logout"
                                onClick={() => {
                                    setProfileOpen(false);
                                    logout();
                                }}
                            >
                                Log out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="embla" ref={setViewport}>
                <div className="embla__container">
                    <div className="embla__slide">
                        <Now active={current.section === "now"} />
                    </div>
                    <div className="embla__slide">
                        <Tasks />
                    </div>
                    <div className="embla__slide">
                        <History />
                    </div>
                    {INSIGHTS_TABS.map((t) => (
                        <div className="embla__slide" key={t.id}>
                            {renderInsightsSlide(t.id)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sub-tab position — only while inside Insights */}
            {inInsights && (
                <div className="sub-dots">
                    {INSIGHTS_TABS.map((t, i) => (
                        <button
                            key={t.id}
                            aria-label={t.label}
                            className={`dot dot-sm ${subIndex === i ? "active" : ""}`}
                            onClick={() => goTo(3 + i)}
                        />
                    ))}
                </div>
            )}

            <nav
                className="bottom-nav"
                ref={navRef}
                style={{ "--nav-active": mainIndex }}
            >
                <span className="nav-pill" aria-hidden="true" />
                {MAIN.map((m, i) => (
                    <button
                        key={m.path}
                        className={`bottom-tab ${mainIndex === i ? "active" : ""}`}
                        aria-label={m.label}
                        aria-current={mainIndex === i ? "page" : undefined}
                        onClick={() => goTo(i < 3 ? i : 3)}
                    >
                        <NavIcon section={m.section} />
                        <span className="bottom-tab-label">
                            {m.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}

export default MobileShell;
