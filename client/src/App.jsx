import { useEffect, useState } from "react";
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
import { ToastProvider, useToast } from "./context/ToastContext";
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
import MobileShell from "./components/MobileShell";
import Modal from "./components/Modal";
import OnboardingModal from "./components/OnboardingModal";
import TapDroplets from "./components/TapDroplets";
import DesktopCursor from "./components/DesktopCursor";
import Footer from "./components/Footer";
import OfflineIndicator from "./components/OfflineIndicator";

function AppShell() {
    const { user, loading, logout: rawLogout, completeOnboarding, setUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useIsMobile();
    const activeAction = useActiveAction();

    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const [completingOnboarding, setCompletingOnboarding] = useState(false);
    const logout = () => setConfirmingLogout(true);

    // If the user has zero tasks and is on the root page, directly land on TASKS
    useEffect(() => {
        if (!user || !user.onboardingCompleted) return;
        if (location.pathname !== "/") return;

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
    }, [user?._id, user?.onboardingCompleted, location.pathname, navigate]);

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

    // Mandatory first-time user onboarding: cannot be skipped or dismissed.
    // Keeps the rest of the application unmounted until explicit completion.
    if (!user.onboardingCompleted) {
        const handleOnboardingComplete = async () => {
            if (completingOnboarding) return;
            setCompletingOnboarding(true);

            try {
                // 1. Complete onboarding on backend (updates persistent User model)
                // Concurrently check task pool to determine first-time routing
                const [userRes, tasksRes] = await Promise.all([
                    completeOnboarding(false),
                    apiFetch("/tasks").catch(() => null)
                ]);

                // 2. Check if user already has tasks in the pool
                let hasTasks = false;
                if (tasksRes && tasksRes.ok) {
                    const tasks = await tasksRes.json();
                    const activeTasks = Array.isArray(tasks)
                        ? tasks.filter((t) => t.status !== "deleted")
                        : [];
                    hasTasks = activeTasks.length > 0;
                }

                // 3. First-time destination: if no tasks, land on Tasks with welcoming toast;
                // otherwise continue to normal destination (Now).
                // Navigate BEFORE updating user state so the destination route is already
                // active when OnboardingModal unmounts and DesktopApp/MobileShell mounts.
                if (!hasTasks) {
                    navigate("/tasks", { replace: true });
                    toast("Add a few tasks and Shift can get to work.", "info");
                } else {
                    navigate("/", { replace: true });
                }

                // 4. Update persistent frontend user state to unmount onboarding modal
                setUser(userRes);
            } catch (err) {
                console.error("Error completing onboarding:", err);
                toast(
                    err.message || "Couldn't finish setup. Try again.",
                    "error"
                );
            } finally {
                setCompletingOnboarding(false);
            }
        };

        return (
            <div className="app">
                <OnboardingModal
                    onComplete={handleOnboardingComplete}
                    completing={completingOnboarding}
                />
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

const KNOWN_PATHS = ["/", "/tasks", "/history", "/insights", "/saved"];

// Mobile: one persistent swipe shell for the known sections; anything
// else falls through to a 404. /saved renders as a dedicated view with back button.
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

    return (
        <div className="app">
            <MobileShell user={user} logout={logout} />
        </div>
    );
}

// Desktop: classic top-nav + routed content.
function DesktopApp({ user, logout }) {
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

                <div className="nav-user">
                    <span className="nav-user-name">{user.name}</span>
                    <button className="text-button" onClick={logout}>
                        Log out
                    </button>
                </div>
            </header>

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Now />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/insights" element={<Insights />} />
                    <Route path="/saved" element={<Saved />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>

            <Footer />
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
