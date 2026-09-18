import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
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
                <p className="app-loading">Loading SHIFT...</p>
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
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppShell />
        </AuthProvider>
    );
}

export default App;
