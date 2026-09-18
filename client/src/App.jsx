import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";

import Now from "./pages/Now";
import Tasks from "./pages/Tasks";
import History from "./pages/History";
import Insights from "./pages/Insights";

function App() {
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

export default App;