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
import Sidebar from "./Sidebar";

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
    { path: "/", label: "Now" },
    { path: "/tasks", label: "Tasks" },
    { path: "/history", label: "History" },
    { path: "/insights", label: "Insights" }
];

function MobileShell({ user, logout }) {
    const location = useLocation();
    const navigate = useNavigate();
    const pathRef = useRef(location.pathname);

    useEffect(() => {
        pathRef.current = location.pathname;
    }, [location.pathname]);

    const [menuOpen, setMenuOpen] = useState(false);
    // Start on whatever section the URL points at (deep link / refresh).
    const initialIndexRef = useRef(
        Math.max(
            0,
            VIEWS.findIndex((v) => v.path === location.pathname)
        )
    );
    const [selected, setSelected] = useState(initialIndexRef.current);

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
        if (target >= 0) emblaApi.scrollTo(target);
    }, [location.pathname, emblaApi]);

    const goTo = useCallback(
        (index) => emblaApi && emblaApi.scrollTo(index),
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
                <button
                    className={`hamburger ${menuOpen ? "open" : ""}`}
                    aria-label="Open menu"
                    onClick={() => setMenuOpen(true)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <span className="mobile-logo">
                    SHIFT <span>⚡</span>
                </span>

                <span className="mobile-header-spacer" />
            </header>

            <Sidebar
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                user={user}
                activePath={current.path}
                onNavigate={(path) => navigate(path)}
                onLogout={logout}
            />

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

            {/* Position indicator */}
            <div className="pager-dots">
                <div className="dots-main">
                    {MAIN.map((m, i) => (
                        <button
                            key={m.path}
                            aria-label={m.label}
                            className={`dot ${mainIndex === i ? "active" : ""}`}
                            onClick={() => goTo(i < 3 ? i : 3)}
                        />
                    ))}
                </div>

                {inInsights && (
                    <div className="dots-sub">
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
            </div>
        </div>
    );
}

export default MobileShell;
