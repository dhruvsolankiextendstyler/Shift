// TEMPORARY — Downtime open to test Articles loading. Delete when done.
import ReactDOM from "react-dom/client";
import Downtime from "./components/Downtime";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <Downtime open={true} onClose={() => {}} />
);
