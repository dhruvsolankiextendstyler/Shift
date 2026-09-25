import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal";
import { logActivity } from "../services/activity";

// Datamuse — free, no-key, CORS-enabled, and reliable. `sp=` with N "?" pulls
// real N-letter words ranked by usage; `md=dp` returns their part of speech
// and definitions in the same call. Random word length + a random pick from
// the results = effectively unlimited variety, no baked-in cap.
const POS = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "" };

function randomPattern() {
    const len = 4 + Math.floor(Math.random() * 6); // 4–9 letters
    return "?".repeat(len);
}

async function fetchWord() {
    // A pattern occasionally yields nothing definable — retry a few times.
    for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch(
            `https://api.datamuse.com/words?sp=${randomPattern()}&md=dp&max=1000`
        );
        if (!res.ok) continue;

        const list = await res.json();
        const defined = list.filter(
            (w) => w.defs && w.defs.length && /^[a-z]+$/.test(w.word)
        );
        if (!defined.length) continue;

        const pick = defined[Math.floor(Math.random() * defined.length)];
        const meanings = pick.defs
            .slice(0, 3)
            .map((d) => {
                const tab = d.indexOf("\t");
                const code = d.slice(0, tab);
                return {
                    pos: POS[code] ?? code,
                    definition: d.slice(tab + 1).trim()
                };
            })
            .filter((m) => m.definition);

        if (meanings.length) return { word: pick.word, meanings };
    }
    throw new Error("no word");
}

// Word Forge — a fresh word (meaning + part of speech) on every open/Another.
// Controlled by the parent (ToolsMenu owns open/close).
function VocabBuilder({ open, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [entry, setEntry] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            setEntry(await fetchWord());
        } catch {
            setError("Couldn't reach the word bank. Try another.");
            setEntry(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // First open pulls a word; reopening keeps the last one.
    useEffect(() => {
        if (open && !entry && !loading && !error) load();
    }, [open, entry, loading, error, load]);

    return (
        <Modal open={open} onClose={onClose} labelledBy="vocab-title">
            <div className="vocab-card">
                <div className="vocab-topbar">
                    <p className="eyebrow read-eyebrow">✦ WORD FORGE</p>
                    <button
                        className="read-close"
                        aria-label="Close Word Forge"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="vocab-body">
                    {loading && (
                        <p className="message read-status">
                            Forging a word worth keeping...
                        </p>
                    )}

                    {error && !loading && (
                        <p className="message read-status">{error}</p>
                    )}

                    {entry && !loading && (
                        <>
                            <h1 id="vocab-title" className="vocab-word">
                                {entry.word}
                            </h1>
                            {entry.meanings.map((m, i) => (
                                <div key={i} className="vocab-meaning">
                                    {m.pos && (
                                        <span className="vocab-pos">
                                            {m.pos}
                                        </span>
                                    )}
                                    <p className="vocab-def">
                                        {m.definition}
                                    </p>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="vocab-actions">
                    <button
                        className="secondary-button"
                        onClick={() => {
                            logActivity("vocab");
                            onClose();
                        }}
                    >
                        Done
                    </button>
                    <button
                        className="shift-button"
                        onClick={load}
                        disabled={loading}
                    >
                        {loading ? "..." : "Another →"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default VocabBuilder;
