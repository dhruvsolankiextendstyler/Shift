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
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path {...p} d="M13 2L4.5 13H11l-1 9 8.5-11H12l1-9z" />
            </svg>
        );
    }
    if (section === "tasks") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path {...p} d="M9 6h11M9 12h11M9 18h11" />
                <path {...p} d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
            </svg>
        );
    }
    if (section === "history") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path {...p} d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3 8.5" />
                <path {...p} d="M3 4v4.5h4.5" />
                <path {...p} d="M12 8v4.3l3 1.7" />
            </svg>
        );
    }
    // insights
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path {...p} d="M4 20h16" />
            <path {...p} d="M6 20v-6M12 20V6M18 20v-9" />
        </svg>
    );
}

function MobileShell({ user, logout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathRef = useRef(location.pathname);

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

    // Tabs jump straight to their slide (jump=true) — no animated churn through
    // the slides in between. Swiping still animates normally.
    const goTo = useCallback(
        (index) => emblaApi && emblaApi.scrollTo(index, true),
        [emblaApi]
    );

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

                <span className="mobile-logo">
                    SHIFT <span>⚡</span>
                </span>

                <div className="mobile-profile">
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
                        <>
                            <button
                                className="profile-scrim"
                                aria-label="Close account menu"
                                onClick={() => setProfileOpen(false)}
                            />
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
                        </>
                    )}
                </div>
            </header>

            <div className="embla" ref={emblaRef}>
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

            <nav className="bottom-nav">
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
