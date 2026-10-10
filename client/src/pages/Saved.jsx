import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchSavedItems, unsaveItem } from "../services/saved";
import { registerCacheClearHandler } from "../services/api";
import Modal from "../components/Modal";
import BookmarkButton from "../components/BookmarkButton";
import ErrorState from "../components/ErrorState";

let cachedSavedItems = null;
let lastSavedFetch = 0;

export function clearSavedCache() {
    cachedSavedItems = null;
    lastSavedFetch = 0;
}
registerCacheClearHandler(clearSavedCache);

export default function Saved() {
    const hasCache = cachedSavedItems !== null;
    const [items, setItems] = useState(() => cachedSavedItems || []);
    const [loading, setLoading] = useState(!hasCache);
    const [error, setError] = useState(false);
    const [tab, setTab] = useState("words"); // "words" | "articles"
    const [search, setSearch] = useState("");
    const [activeItem, setActiveItem] = useState(null);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent && cachedSavedItems === null) setLoading(true);
        setError(false);
        try {
            const data = await fetchSavedItems();
            cachedSavedItems = data;
            lastSavedFetch = Date.now();
            setItems(data);
        } catch {
            if (cachedSavedItems === null) setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (cachedSavedItems && Date.now() - lastSavedFetch < 15000) {
            setItems(cachedSavedItems);
            setLoading(false);
        } else {
            load({ silent: cachedSavedItems !== null });
        }
    }, [load]);

    const words = useMemo(
        () => items.filter((it) => it.type === "word"),
        [items]
    );

    const articles = useMemo(
        () => items.filter((it) => it.type === "article"),
        [items]
    );

    const currentList = tab === "words" ? words : articles;

    const filtered = useMemo(() => {
        if (!search.trim()) return currentList;
        const q = search.toLowerCase();
        return currentList.filter((it) => {
            const titleMatch = it.title?.toLowerCase().includes(q);
            const itemMatch = it.itemId?.toLowerCase().includes(q);
            const catMatch = it.content?.category?.toLowerCase().includes(q);
            return titleMatch || itemMatch || catMatch;
        });
    }, [currentList, search]);

    const handleRemove = async (e, it) => {
        e.stopPropagation();
        await unsaveItem({ type: it.type, itemId: it.itemId, id: it._id });
        cachedSavedItems = (cachedSavedItems || []).filter((x) => x._id !== it._id);
        setItems((cur) => cur.filter((x) => x._id !== it._id));
        if (activeItem?._id === it._id) {
            setActiveItem(null);
        }
    };

    return (
        <div className="saved-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">✦ YOUR ARCHIVE</p>
                    <h1>Saved Content</h1>
                    <p className="page-description">
                        Words and briefings you've bookmarked to revisit.
                    </p>
                </div>
            </div>

            <div className="saved-toolbar">
                <div className="saved-tabs" role="tablist">
                    <button
                        role="tab"
                        aria-selected={tab === "words"}
                        className={`saved-tab ${tab === "words" ? "active" : ""}`}
                        onClick={() => setTab("words")}
                    >
                        Words ({words.length})
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === "articles"}
                        className={`saved-tab ${tab === "articles" ? "active" : ""}`}
                        onClick={() => setTab("articles")}
                    >
                        Articles ({articles.length})
                    </button>
                </div>

                {currentList.length > 0 && (
                    <div className="saved-search">
                        <input
                            type="search"
                            placeholder={`Search saved ${tab}...`}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label={`Search saved ${tab}`}
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <p className="message">Opening your archive...</p>
            ) : error ? (
                <ErrorState onRetry={load} />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <h2>
                        {search.trim()
                            ? "No matches found."
                            : tab === "words"
                            ? "No saved words yet."
                            : "No saved articles yet."}
                    </h2>
                    <p>
                        {search.trim()
                            ? "Try refining your search keyword."
                            : tab === "words"
                            ? "Open Downtime, discover memorable words in Word Forge, and hit the bookmark icon."
                            : "Read Deep Read briefings in Downtime and bookmark anything worth keeping in your arsenal."}
                    </p>
                    <Link to="/" className="secondary-button">
                        GO TO NOW →
                    </Link>
                </div>
            ) : (
                <div className="saved-grid">
                    {filtered.map((it) => (
                        <div
                            key={it._id}
                            className={`saved-card saved-card--${it.type}`}
                            onClick={() => setActiveItem(it)}
                        >
                            <div className="saved-card-header">
                                <span className="saved-type-tag">
                                    {it.type === "word" ? "WORD" : (it.content?.category || "ARTICLE").toUpperCase()}
                                </span>
                                <button
                                    className="saved-remove-btn"
                                    onClick={(e) => handleRemove(e, it)}
                                    aria-label={`Remove ${it.title}`}
                                    title="Remove from saved"
                                >
                                    ✕
                                </button>
                            </div>

                            <h2 className="saved-card-title">{it.title}</h2>

                            {it.type === "word" && it.content?.meanings?.[0] && (
                                <p className="saved-card-snippet">
                                    {it.content.meanings[0].pos && (
                                        <em className="saved-pos">{it.content.meanings[0].pos} · </em>
                                    )}
                                    {it.content.meanings[0].definition}
                                </p>
                            )}

                            {it.type === "article" && (
                                <p className="saved-card-snippet">
                                    {it.content?.hook || it.content?.description || "Click to read full briefing."}
                                </p>
                            )}

                            <div className="saved-card-footer">
                                <span className="saved-card-date">
                                    {new Date(it.createdAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric"
                                    })}
                                </span>
                                <span className="saved-card-action">View details →</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detailed Content Viewer Modal */}
            <Modal
                open={Boolean(activeItem)}
                onClose={() => setActiveItem(null)}
                variant="dialog"
                labelledBy="saved-detail-title"
            >
                {activeItem && (
                    <div className="saved-detail-modal">
                        <div className="saved-detail-top">
                            <span className="eyebrow">
                                {activeItem.type === "word"
                                    ? "✦ SAVED WORD"
                                    : `✦ ${activeItem.content?.category?.toUpperCase() || "BRIEFING"}`}
                            </span>
                            <div className="saved-detail-actions">
                                <BookmarkButton
                                    type={activeItem.type}
                                    itemId={activeItem.itemId}
                                    title={activeItem.title}
                                    content={activeItem.content}
                                />
                                <button
                                    className="text-button"
                                    onClick={() => setActiveItem(null)}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {activeItem.type === "word" ? (
                            <div className="saved-word-view">
                                <h1 id="saved-detail-title" className="vocab-word">
                                    {activeItem.content?.word || activeItem.title}
                                </h1>
                                <div className="vocab-meanings-list">
                                    {(activeItem.content?.meanings || []).map((m, i) => (
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
                        ) : (
                            <article className="saved-article-view read-body">
                                <h1 id="saved-detail-title" className="read-heading">
                                    {activeItem.content?.title || activeItem.title}
                                </h1>

                                {activeItem.content?.readingTime && (
                                    <p className="read-time-meta">
                                        ⏱ {activeItem.content.readingTime}
                                    </p>
                                )}

                                {activeItem.content?.thumb && (
                                    <img
                                        className="read-thumb"
                                        src={activeItem.content.thumb}
                                        alt=""
                                    />
                                )}

                                {activeItem.content?.hook && (
                                    <p className="read-hook">{activeItem.content.hook}</p>
                                )}

                                <div className="read-extract">
                                    {(activeItem.content?.blocks || []).map((b, i) =>
                                        b.type === "h" ? (
                                            <h2 key={i} className="read-h">
                                                {b.text}
                                            </h2>
                                        ) : (
                                            <p key={i} className="read-p">
                                                {b.text}
                                            </p>
                                        )
                                    )}
                                </div>

                                {activeItem.content?.takeaway && (
                                    <div className="read-takeaway">
                                        <span className="read-takeaway-label">Key Takeaway</span>
                                        <p className="read-takeaway-text">
                                            {activeItem.content.takeaway}
                                        </p>
                                    </div>
                                )}

                                {activeItem.content?.url && (
                                    <a
                                        className="read-more"
                                        href={activeItem.content.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Read source on Wikipedia ↗
                                    </a>
                                )}
                            </article>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
