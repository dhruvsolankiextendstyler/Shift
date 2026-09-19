import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    NavLink
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Auth from "./pages/Auth";
import Now from "./pages/Now";
import Tasks from "./pages/Tasks";
import History from "./pages/History";
import Insights from "./pages/Insights";

function AppShell() {
    const { user, loading, logout } = useAuth();

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
        <BrowserRouter>
            <div className="app">
                <header className="navbar">
                    <Link to="/" className="logo">
                        SHIFT <span>⚡</span>
                    </Link>

                    <nav>
                        <NavLink to="/" end>NOW</NavLink>
                        <NavLink to="/tasks">TASKS</NavLink>
                        <NavLink to="/history">HISTORY</NavLink>
                        <NavLink to="/insights">INSIGHTS</NavLink>
                    </nav>

                    <div className="nav-user">
                        <span className="nav-user-name">
                            {user.name}
                        </span>
                        <button
                            className="text-button"
                            onClick={logout}
                        >
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
        </BrowserRouter>
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
