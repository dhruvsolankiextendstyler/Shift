import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import DowntimeFeed from "./DowntimeFeed";
import BookmarkButton from "./BookmarkButton";
import {
    nextWord,
    nextArticle,
    fetchWordExamples,
    applyExamples
} from "../downtime/content";
import { refreshSavedIds } from "../services/saved";

// One word card. Renders immediately with the guaranteed fallback sentences,
// then layers in real usage examples from dictionaryapi.dev in the background
// when it's reachable. Cleanup aborts an in-flight fetch if the card leaves before it lands.
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
            <div className="dt-card-head">
                <span className="eyebrow dt-card-eyebrow">✦ VOCABULARY</span>
                <BookmarkButton
                    type="word"
                    itemId={entry.word}
                    title={entry.word}
                    content={{ word: entry.word, meanings }}
                />
            </div>

            <h1 className="vocab-word">{entry.word}</h1>

            <div className="vocab-meanings-list">
                {meanings.map((m, i) => (
                    <div key={i} className="vocab-meaning">
                        {m.pos && <span className="vocab-pos">{m.pos}</span>}
                        <p className="vocab-def">{m.definition}</p>
                        {m.example && (
                            <div className="vocab-example-block">
                                <span className="vocab-example-label">Example</span>
                                <p className="vocab-example">"{m.example}"</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// One article card — structured editorial reading experience with clear boundaries,
// reading time, takeaway, and bookmark controls.
function ArticleCard({ article }) {
    return (
        <article className="dt-article read-body">
            <div className="dt-card-head">
                <div className="dt-card-meta">
                    {article.category && (
                        <span className="eyebrow read-eyebrow">
                            ✦ {article.category.toUpperCase()}
                        </span>
                    )}
                    {article.readingTime && (
                        <span className="read-time-badge">
                            {article.readingTime}
                        </span>
                    )}
                </div>

                <BookmarkButton
                    type="article"
                    itemId={article.title || article.topic}
                    title={article.title}
                    content={article}
                />
            </div>

            {article.thumb && (
                <img className="read-thumb" src={article.thumb} alt="" loading="lazy" />
            )}

            <h1 className="read-heading">{article.title}</h1>

            {article.hook ? (
                <p className="read-hook">{article.hook}</p>
            ) : article.description ? (
                <p className="read-desc">{article.description}</p>
            ) : null}

            <div className="read-extract">
                {article.blocks?.map((b, i) =>
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

            {article.takeaway && (
                <div className="read-takeaway">
                    <span className="read-takeaway-label">Key Takeaway</span>
                    <p className="read-takeaway-text">{article.takeaway}</p>
                </div>
            )}

            {article.url && (
                <a
                    className="read-more"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Read source on Wikipedia ↗
                </a>
            )}
        </article>
    );
}

const TABS = [
    { id: "words", label: "Words" },
    { id: "articles", label: "Articles" }
];

const SWIPE_MIN = 50;
const SWIPE_RATIO = 1.45;

function Downtime({ open, onClose }) {
    const [tab, setTab] = useState("words");
    const tabIndex = TABS.findIndex((t) => t.id === tab);

    useEffect(() => {
        if (open) {
            refreshSavedIds();
        }
    }, [open]);

    // Stable fetchers so the feed's mount effect / observer don't churn.
    const fetchWordItem = useCallback(() => nextWord(), []);
    const fetchArticleItem = useCallback(
        (prev) => nextArticle(prev?.topic),
        []
    );

    const go = (dir) => {
        const next = tabIndex + dir;
        if (next >= 0 && next < TABS.length) setTab(TABS[next].id);
    };

    const onTabKey = (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        go(e.key === "ArrowRight" ? 1 : -1);
    };

    const touchRef = useRef(null);
    const onTouchStart = (e) => {
        if (e.touches.length !== 1) {
            touchRef.current = null;
            return;
        }
        touchRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    };

    const onTouchEnd = (e) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) < SWIPE_MIN) return;
        if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
        go(dx < 0 ? 1 : -1); // swipe left → next (Words → Articles)
    };

    return (
        <Modal open={open} onClose={onClose} variant="sheet" labelledBy="dt-title">
            <div className="dt-shell" style={{ "--dt-tab": tabIndex }}>
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
                        ✕
                    </button>
                </div>

                <div
                    className="dt-track"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    <div
                        className="dt-pane"
                        role="tabpanel"
                        aria-hidden={tab !== "words"}
                        inert={tab !== "words"}
                    >
                        <DowntimeFeed
                            key="words"
                            snap="mandatory"
                            fetchNext={fetchWordItem}
                            titleOf={(w) => w.word}
                            logKind="vocab"
                            loadingLabel="Forging words worth keeping…"
                            renderItem={(w) => <WordCard entry={w} />}
                        />
                    </div>
                    <div
                        className="dt-pane"
                        role="tabpanel"
                        aria-hidden={tab !== "articles"}
                        inert={tab !== "articles"}
                    >
                        <DowntimeFeed
                            key="articles"
                            snap="mandatory"
                            cardClass="dt-card--article"
                            fetchNext={fetchArticleItem}
                            titleOf={(a) => a.title}
                            logKind="read"
                            loadingLabel="Pulling something worth your minutes…"
                            renderItem={(a) => <ArticleCard article={a} />}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default Downtime;
