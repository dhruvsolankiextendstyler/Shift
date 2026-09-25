import { useState } from "react";
import ReadAnything from "./ReadAnything";
import VocabBuilder from "./VocabBuilder";

// Book icon (was the reader FAB) — now the "Deep Read" option glyph.
function BookIcon() {
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
            <path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5" />
            <path d="M12 6.5C13.5 5 16 4.5 20 5v13c-4-.5-6.5 0-8 1.5" />
            <path d="M12 6.5v13" />
        </svg>
    );
}

// Pencil — the "Word Forge" option glyph.
function PenIcon() {
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
            <path d="M4 20l3.6-.9L18.9 7.8a1.9 1.9 0 1 0-2.7-2.7L4.9 16.4 4 20z" />
            <path d="M14.5 6.5l3 3" />
        </svg>
    );
}

// Three-line FAB that fans out into the downtime toolkit: Word Forge (vocab)
// and Deep Read (reader). `active` gates the fixed button so it doesn't bleed
// onto other mobile slides (all slides mount at once).
function ToolsMenu({ active = true }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [tool, setTool] = useState(null); // "vocab" | "read" | null

    if (!active) return null;

    const pick = (t) => {
        setTool(t);
        setMenuOpen(false);
    };

    return (
        <>
            {menuOpen && (
                <button
                    className="tools-scrim"
                    aria-label="Close tools"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            <div className="tools-dial">
                <div className={`tools-options ${menuOpen ? "open" : ""}`}>
                    <button
                        className="tools-option"
                        style={{ "--i": 1 }}
                        tabIndex={menuOpen ? 0 : -1}
                        onClick={() => pick("vocab")}
                    >
                        <span className="tools-option-label">
                            Word Forge
                        </span>
                        <span className="tools-option-icon">
                            <PenIcon />
                        </span>
                    </button>

                    <button
                        className="tools-option"
                        style={{ "--i": 0 }}
                        tabIndex={menuOpen ? 0 : -1}
                        onClick={() => pick("read")}
                    >
                        <span className="tools-option-label">
                            Deep Read
                        </span>
                        <span className="tools-option-icon">
                            <BookIcon />
                        </span>
                    </button>
                </div>

                <button
                    className={`tools-fab ${menuOpen ? "open" : ""}`}
                    aria-label={menuOpen ? "Close tools" : "Downtime tools"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((o) => !o)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            <ReadAnything
                open={tool === "read"}
                onClose={() => setTool(null)}
            />
            <VocabBuilder
                open={tool === "vocab"}
                onClose={() => setTool(null)}
            />
        </>
    );
}

export default ToolsMenu;
