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

// Every word gets a usage sentence, always. Real examples come from
// dictionaryapi.dev when it's reachable, but it's occasionally down (HTTP 5xx)
// and not every sense has an example — so a local fallback guarantees a word is
// never shown without one. Keeps the feature fully client-side (like the
// Datamuse word fetch) instead of adding a backend proxy.
const fallbackSentence = (word) =>
    `Try slipping “${word}” into a sentence today.`;

// Real example sentences for `word`, grouped by part of speech. Best-effort:
// a network error, CORS block, timeout, abort, or missing entry just yields no
// examples (never throws), and the caller keeps its fallback. Aborts on the
// caller's signal (word changed / closed) and on its own timeout so a slow or
// hung dictionary can't linger.
async function fetchExamples(word, externalSignal) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const onAbort = () => ctrl.abort();
    externalSignal?.addEventListener("abort", onAbort);
    try {
        const res = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
                word
            )}`,
            { signal: ctrl.signal }
        );
        if (!res.ok) return { byPos: {}, any: [] };

        const data = await res.json();
        const byPos = {};
        const any = [];
        for (const entry of Array.isArray(data) ? data : []) {
            for (const m of entry.meanings || []) {
                for (const d of m.definitions || []) {
                    if (d.example) {
                        (byPos[m.partOfSpeech] ??= []).push(d.example);
                        any.push(d.example);
                    }
                }
            }
        }
        return { byPos, any };
    } catch {
        return { byPos: {}, any: [] };
    } finally {
        clearTimeout(timer);
        externalSignal?.removeEventListener("abort", onAbort);
    }
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

        if (!meanings.length) continue;

        // Show the word straight away with a guaranteed fallback sentence on
        // every meaning — no meaning ever renders without one. Real usage
        // examples are layered in afterwards (see the upgrade effect below) so
        // a slow or down dictionary never delays the word itself.
        const withExamples = meanings.map((m) => ({
            ...m,
            example: fallbackSentence(pick.word)
        }));

        return { word: pick.word, meanings: withExamples };
    }
    throw new Error("no word");
}

// Map fetched examples onto meanings: each meaning takes a real example of its
// own part of speech first, then any leftover real example; a meaning with no
// real match keeps whatever sentence it already had (the fallback). Pure and
// synchronous — no forEach(async).
function applyExamples(meanings, ex) {
    const used = new Set();
    return meanings.map((m) => {
        const pool = ex.byPos[m.pos] || [];
        const real =
            pool.find((s) => !used.has(s)) ||
            ex.any.find((s) => !used.has(s));
        if (real) used.add(real);
        return real ? { ...m, example: real } : m;
    });
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

    // Layer real usage examples over the fallbacks once the word is on screen,
    // without blocking it. Re-runs per word; the cleanup aborts an in-flight
    // fetch when the word changes or the card closes, so a stale dictionary
    // response can never overwrite a newer word.
    useEffect(() => {
        const word = entry?.word;
        if (!word) return;
        const ctrl = new AbortController();
        (async () => {
            const ex = await fetchExamples(word, ctrl.signal);
            if (ctrl.signal.aborted || !ex.any.length) return;
            setEntry((cur) =>
                cur && cur.word === word
                    ? { ...cur, meanings: applyExamples(cur.meanings, ex) }
                    : cur
            );
        })();
        return () => ctrl.abort();
    }, [entry?.word]);

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
                                    <p className="vocab-example">
                                        {m.example}
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
