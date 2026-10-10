import { useEffect, useRef, useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    NavLink,
    useLocation,
    useNavigate
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useIsMobile } from "./hooks/useIsMobile";
import {
    useActiveAction,
    startActionSync
} from "./services/activeAction";
import { apiFetch } from "./services/api";
import FocusLock from "./components/FocusLock";
import Auth from "./pages/Auth";
import Now from "./pages/Now";
import Tasks from "./pages/Tasks";
import History from "./pages/History";
import Insights from "./pages/Insights";
import Saved from "./pages/Saved";
import FriendsChallenges from "./pages/FriendsChallenges";
import MobileShell from "./components/MobileShell";
import Modal from "./components/Modal";
import TapDroplets from "./components/TapDroplets";
import DesktopCursor from "./components/DesktopCursor";
import Footer from "./components/Footer";
import ToolsMenu from "./components/ToolsMenu";
import OfflineIndicator from "./components/OfflineIndicator";
import { useSocialNotifications } from "./hooks/useSocialNotifications";
import { clearSocialCache } from "./services/social";

function AppShell() {
    const { user, loading, logout: rawLogout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const activeAction = useActiveAction();
    useSocialNotifications(Boolean(user));

    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const logout = () => setConfirmingLogout(true);

    const hasCheckedInitialTasks = useRef(false);

    // If the user has zero tasks and is on the root page, directly land on TASKS (initial load only)
    useEffect(() => {
        if (!user) return;
        if (location.pathname !== "/") return;
        if (hasCheckedInitialTasks.current) return;
        hasCheckedInitialTasks.current = true;

        let cancelled = false;
        apiFetch("/tasks")
            .then((res) => (res.ok ? res.json() : []))
            .then((tasks) => {
                if (cancelled) return;
                const activeTasks = Array.isArray(tasks)
                    ? tasks.filter((t) => t.status !== "deleted")
                    : [];
                if (activeTasks.length === 0) {
                    navigate("/tasks", { replace: true });
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [user?._id, location.pathname, navigate]);

    // Mirror a started task across the user's devices: poll while logged in so
    // a focus lock on one device shows on the others and releases everywhere
    // once it's resolved.
    useEffect(() => {
        if (!user?._id) return;
        return startActionSync();
    }, [user?._id]);

    if (loading) {
        return (
            <div className="app">
                <p className="app-loading">Powering up SHIFT</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="app">
                <Auth />
            </div>
        );
    }

    // A started task freezes the whole app: no nav, no other page mounts,
    // only complete/skip — and it holds across reloads.
    if (activeAction) {
        return (
            <FocusLock
                actionId={activeAction.actionId}
                task={activeAction.task}
                startedAt={activeAction.startedAt}
            />
        );
    }

    return (
        <>
            {isMobile ? (
                <MobileApp user={user} logout={logout} />
            ) : (
                <DesktopApp user={user} logout={logout} />
            )}

            <OfflineIndicator />

            <Modal
                open={confirmingLogout}
                onClose={() => setConfirmingLogout(false)}
                labelledBy="logout-title"
            >
                <h2 id="logout-title" className="modal-title">
                    Log out of SHIFT?
                </h2>
                <p className="modal-text">
                    You'll need to sign back in to pick up your momentum.
                </p>
                <div className="modal-actions">
                    <button
                        className="secondary-button"
                        onClick={() => setConfirmingLogout(false)}
                    >
                        Stay
                    </button>
                    <button
                        className="danger-button"
                        onClick={() => {
                            setConfirmingLogout(false);
                            clearSocialCache();
                            rawLogout();
                        }}
                    >
                        Log out
                    </button>
                </div>
            </Modal>
        </>
    );
}

const KNOWN_PATHS = ["/", "/tasks", "/history", "/insights", "/saved", "/friends"];

// Mobile: one persistent swipe shell for the known sections; anything
// else falls through to a 404. /saved and /friends render as dedicated views with back button.
function MobileApp({ user, logout }) {
    const location = useLocation();

    if (!KNOWN_PATHS.includes(location.pathname)) {
        return (
            <div className="app">
                <NotFound />
            </div>
        );
    }

    if (location.pathname === "/saved") {
        return (
            <div className="app">
                <header className="mobile-header">
                    <Link to="/" className="mobile-header-link" aria-label="Back to Now">
                        ← Now
                    </Link>
                    <span className="mobile-logo">SHIFT</span>
                    <span className="mobile-header-spacer" />
                </header>
                <div className="mobile-page-wrap">
                    <Saved />
                </div>
            </div>
        );
    }

    if (location.pathname === "/friends") {
        return (
            <div className="app">
                <header className="mobile-header">
                    <Link to="/" className="mobile-header-link" aria-label="Back to Now">
                        ← Now
                    </Link>
                    <span className="mobile-logo">SHIFT</span>
                    <span className="mobile-header-spacer" />
                </header>
                <div className="mobile-page-wrap">
                    <FriendsChallenges />
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <MobileShell user={user} logout={logout} />
        </div>
    );
}

// Desktop: classic top-nav + routed content + profile popover.
function DesktopApp({ user, logout }) {
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const socialCount = useSocialNotifications(Boolean(user));

    useEffect(() => {
        if (!profileOpen) return;
        const onPointerDown = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        window.addEventListener("pointerdown", onPointerDown);
        return () => window.removeEventListener("pointerdown", onPointerDown);
    }, [profileOpen]);

    return (
        <div className="app">
            <header className="navbar">
                <Link to="/" className="logo">
                    SHIFT
                </Link>

                <nav>
                    <NavLink to="/" end>
                        NOW
                    </NavLink>
                    <NavLink to="/tasks">TASKS</NavLink>
                    <NavLink to="/history">HISTORY</NavLink>
                    <NavLink to="/insights">INSIGHTS</NavLink>
                    <NavLink to="/saved">SAVED</NavLink>
                </nav>

                <div className="nav-user" ref={profileRef}>
                    <button
                        className="desktop-profile-btn"
                        aria-label="Profile menu"
                        aria-expanded={profileOpen}
                        onClick={() => setProfileOpen((o) => !o)}
                    >
                        <span className="profile-avatar-wrap">
                            <span className="desktop-avatar">
                                {(user?.name || "?").charAt(0).toUpperCase()}
                            </span>
                            {socialCount > 0 && (
                                <span
                                    className="profile-badge"
                                    aria-label={`${socialCount} pending notification${socialCount === 1 ? "" : "s"}`}
                                >
                                    {socialCount > 9 ? "9+" : socialCount}
                                </span>
                            )}
                        </span>
                        <span className="nav-user-name">{user.name}</span>
                        <span className="profile-chevron">▾</span>
                    </button>

                    {profileOpen && (
                        <div className="profile-menu desktop" role="menu">
                            <div className="profile-head">
                                <span className="profile-avatar">
                                    {(user?.name || "?").charAt(0).toUpperCase()}
                                </span>
                                <div className="profile-id">
                                    <p className="profile-name">{user?.name}</p>
                                    <p className="profile-email" title={user?.email}>
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                            <div className="profile-actions">
                                <button
                                    className="profile-menu-item"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        navigate("/friends");
                                    }}
                                >
                                    <span>Friends & Challenges</span>
                                    {socialCount > 0 && (
                                        <span className="menu-notification-badge">
                                            {socialCount > 9 ? "9+" : socialCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    className="profile-menu-item"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        navigate("/saved");
                                    }}
                                >
                                    Saved items
                                </button>
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
                        </div>
                    )}
                </div>
            </header>

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Now />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="/saved" element={<Saved />} />
                    <Route path="/friends" element={<FriendsChallenges />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>

            <Footer />
            <ToolsMenu active={true} />
        </div>
    );
}

function NotFound() {
    return (
        <div className="not-found">
            <p className="eyebrow">LOST THE THREAD</p>
            <h1>404</h1>
            <p className="subtitle">
                This page drifted off. Let's get you back in motion.
            </p>
            <Link to="/" className="secondary-button not-found-link">
                BACK TO NOW →
            </Link>
        </div>
    );
}

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppShell />
                    <TapDroplets />
                    <DesktopCursor />
                </BrowserRouter>
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
