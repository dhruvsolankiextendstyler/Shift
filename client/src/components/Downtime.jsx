import { useCallback, useEffect, useState } from "react";
import Modal from "./Modal";
import DowntimeFeed from "./DowntimeFeed";
import {
    nextWord,
    nextArticle,
    fetchWordExamples,
    applyExamples
} from "../downtime/content";

// One word card. Renders immediately with the guaranteed fallback sentences,
// then layers in real usage examples from dictionaryapi.dev in the background
// when it's reachable (same behaviour as the old Word Forge, no buttons). The
// cleanup aborts an in-flight fetch if the card leaves before it lands.
function WordCard({ entry }) {
    const [meanings, setMeanings] = useState(entry.meanings);

    useEffect(() => {
        const ctrl = new AbortController();
        (async () => {
            const ex = await fetchWordExamples(entry.word, ctrl.signal);
            if (ctrl.signal.aborted || !ex.any.length) return;
            setMeanings((cur) => applyExamples(cur, ex));
        })();
        return () => ctrl.abort();
    }, [entry.word]);

    return (
        <div className="dt-word">
            <h1 className="vocab-word">{entry.word}</h1>
            {meanings.map((m, i) => (
                <div key={i} className="vocab-meaning">
                    {m.pos && <span className="vocab-pos">{m.pos}</span>}
                    <p className="vocab-def">{m.definition}</p>
                    <p className="vocab-example">{m.example}</p>
                </div>
            ))}
        </div>
    );
}

// One article card — reuses the existing Deep Read (.read-*) typography.
function ArticleCard({ article }) {
    return (
        <article className="dt-article read-body">
            {article.category && (
                <p className="eyebrow read-eyebrow">
                    ✦ {article.category.toUpperCase()}
                </p>
            )}
            {article.thumb && (
                <img className="read-thumb" src={article.thumb} alt="" />
            )}
            <h1 className="read-heading">{article.title}</h1>
            {article.description && (
                <p className="read-desc">{article.description}</p>
            )}
            <div className="read-extract">
                {article.blocks.map((b, i) =>
                    b.type === "h" ? (
                        <h2
                            key={i}
                            className={
                                b.level >= 3 ? "read-h read-h-sub" : "read-h"
                            }
                        >
                            {b.text}
                        </h2>
                    ) : (
                        <p key={i} className="read-p">
                            {b.text}
                        </p>
                    )
                )}
            </div>
            {article.url && (
                <a
                    className="read-more"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read the full thing ↗
                </a>
            )}
        </article>
    );
}
const TABS = [
    { id: "words", label: "Words" },
    { id: "articles", label: "Articles" }
];

// Full-screen downtime discovery. Rendered inside Modal (variant="sheet") so it
// inherits the proven back-button parking (device Back → close → NOW, never
// exit), Escape, scroll-lock and portal — no second navigation system. Two
// tabs, each its own vertical swipe feed.
function Downtime({ open, onClose }) {
    const [tab, setTab] = useState("words");
    const tabIndex = TABS.findIndex((t) => t.id === tab);

    // Stable fetchers so the feed's mount effect / observer don't churn.
    const fetchWordItem = useCallback(() => nextWord(), []);
    const fetchArticleItem = useCallback(
        (prev) => nextArticle(prev?.topic),
        []
    );

    const onTabKey = (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        setTab(TABS[(tabIndex + dir + TABS.length) % TABS.length].id);
    };

    return (
        <Modal open={open} onClose={onClose} variant="sheet" labelledBy="dt-title">
            <div className="dt-shell">
                <div className="dt-head">
                    <div
                        className="dt-tabs"
                        role="tablist"
                        aria-label="Downtime content"
                        style={{ "--dt-tab": tabIndex }}
                        onKeyDown={onTabKey}
                    >
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                role="tab"
                                id={t.id === "words" ? "dt-title" : undefined}
                                aria-selected={tab === t.id}
                                tabIndex={tab === t.id ? 0 : -1}
                                className={`dt-tab ${tab === t.id ? "active" : ""}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                        <span className="dt-tab-underline" aria-hidden="true" />
                    </div>

                    <button
                        className="read-close"
                        aria-label="Close downtime"
                        onClick={onClose}
                    >
                        ←
                    </button>
                </div>

                {tab === "words" ? (
                    <DowntimeFeed
                        key="words"
                        snap="mandatory"
                        fetchNext={fetchWordItem}
                        keyOf={(w) => w.word}
                        titleOf={(w) => w.word}
                        logKind="vocab"
                        loadingLabel="Forging words worth keeping…"
                        renderItem={(w) => <WordCard entry={w} />}
                    />
                ) : (
                    <DowntimeFeed
                        key="articles"
                        snap="proximity"
                        cardClass="dt-card--article"
                        fetchNext={fetchArticleItem}
                        keyOf={(a) => a.topic}
                        titleOf={(a) => a.title}
                        logKind="read"
                        loadingLabel="Pulling something worth your minutes…"
                        renderItem={(a) => <ArticleCard article={a} />}
                    />
                )}

                <span className="dt-hint" aria-hidden="true">
                    ↑
                </span>
            </div>
        </Modal>
    );
}

export default Downtime;

