import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Now from "./pages/Now";
import Tasks from "./pages/Tasks";
import History from "./pages/History";
import Insights from "./pages/Insights";

function App() {
    return (
        <BrowserRouter>
            <nav>
                <Link to="/">NOW</Link>{" "}
                <Link to="/tasks">TASKS</Link>{" "}
                <Link to="/history">HISTORY</Link>{" "}
                <Link to="/insights">INSIGHTS</Link>
            </nav>

            <Routes>
                <Route path="/" element={<Now />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/history" element={<History />} />
                <Route path="/insights" element={<Insights />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;