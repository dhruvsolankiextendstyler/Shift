import { useState } from "react";
import Downtime from "./Downtime";

// Stacked-cards glyph — the downtime discovery launcher.
function StreamIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="6" y="3.5" width="12" height="7" rx="2" />
            <rect x="4" y="13.5" width="16" height="7" rx="2" />
        </svg>
    );
}

// Floating downtime launcher. One tap opens the full-screen Downtime discovery
// feed (Words / Articles) — no more two-tool popup dial. `active` gates the
// fixed button so it doesn't bleed onto other mobile slides (all slides mount
// at once).
function ToolsMenu({ active = true }) {
    const [open, setOpen] = useState(false);

    if (!active) return null;

    return (
        <>
            <div className="tools-dial">
                <button
                    className="tools-fab tools-fab--solo"
                    aria-label="Open downtime"
                    onClick={() => setOpen(true)}
                >
                    <StreamIcon />
                </button>
            </div>

            <Downtime open={open} onClose={() => setOpen(false)} />
        </>
    );
}

export default ToolsMenu;
