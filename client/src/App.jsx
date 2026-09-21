import { useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    NavLink,
    useLocation
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { useIsMobile } from "./hooks/useIsMobile";
import Auth from "./pages/Auth";
import Now from "./pages/Now";
import Tasks from "./pages/Tasks";
import History from "./pages/History";
import Insights from "./pages/Insights";
import MobileShell from "./components/MobileShell";
import Modal from "./components/Modal";

function AppShell() {
    const { user, loading, logout: rawLogout } = useAuth();
    const isMobile = useIsMobile();

    const [confirmingLogout, setConfirmingLogout] = useState(false);
    const logout = () => setConfirmingLogout(true);

    if (loading) {
        return (
            <div className="app">
                <p className="app-loading">Powering up SHIFT ⚡</p>
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

    return (
        <>
            <BrowserRouter>
                {isMobile ? (
                    <MobileApp user={user} logout={logout} />
                ) : (
                    <DesktopApp user={user} logout={logout} />
                )}
            </BrowserRouter>

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

const KNOWN_PATHS = ["/", "/tasks", "/history", "/insights"];

// Mobile: one persistent swipe shell for the known sections; anything
// else falls through to a 404.
function MobileApp({ user, logout }) {
    const location = useLocation();

    if (!KNOWN_PATHS.includes(location.pathname)) {
        return (
            <div className="app">
                <NotFound />
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
                    SHIFT <span>⚡</span>
                </Link>

                <nav>
                    <NavLink to="/" end>
                        NOW
                    </NavLink>
                    <NavLink to="/tasks">TASKS</NavLink>
                    <NavLink to="/history">HISTORY</NavLink>
                    <NavLink to="/insights">INSIGHTS</NavLink>
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

function Footer() {
    return (
        <footer className="footer">
            <span>SHIFT ⚡ — momentum on demand</span>
            <a
                href="https://dhruv-solanki-about.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
            >
                Crafted by Dhruv Solanki ↗
            </a>
        </footer>
    );
}

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <AppShell />
            </AuthProvider>
        </ToastProvider>
    );
}

export default App;
