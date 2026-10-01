import { useCallback, useEffect, useRef, useState } from "react";
import { logActivity } from "../services/activity";

// How long a card must stay at screen-centre before it counts as "viewed".
const DWELL_MS = 2500;
// Fetch the next item when the current card is within this many of the end.
const PREFETCH_WITHIN = 1;

// Generic vertical snap feed. Owns a growing buffer, prefetches ahead, and logs
// ONE activity per item after a dwell — the swipe feed's stand-in for the old
// "Done" button. Completion + prefetch both ride a single IntersectionObserver
// with a thin centre band, so "the card crossing screen-centre" is the one
// you're on, regardless of card height (words fill a screen; articles are
// taller). `fetchNext(prev)` returns the next item (may throw); `titleOf` is
// what History records; `logKind` is "vocab" | "read"; `snap` is "mandatory"
// (words) | "proximity" (articles). Cards are keyed by position (append-only
// feed) — never by content, since a repeated word/article would collide and
// React drops duplicate-keyed nodes, leaving blank gaps in the feed.
function DowntimeFeed({
    fetchNext,
    titleOf,
    logKind,
    renderItem,
    snap,
    cardClass = "",
    loadingLabel
}) {
    const [items, setItems] = useState([]);
    // "loading" | "ready" | "error"
    const [status, setStatus] = useState("loading");
    // Whether a "load more" at the tail also failed (items already exist).
    const [tailFailed, setTailFailed] = useState(false);

    const itemsRef = useRef([]);
    const loadingRef = useRef(false);
    const didInit = useRef(false);
    const seenRef = useRef(new Set()); // item keys already logged (per open)
    const timersRef = useRef(new Map()); // key -> dwell timeout
    const ioRef = useRef(null);

    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // Append the next item. Serialized via loadingRef so mount + scroll can't
    // double-fetch. Never throws — a failure flips the error state on.
    const loadMore = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const prev =
                itemsRef.current[itemsRef.current.length - 1] || null;
            const item = await fetchNext(prev);
            setItems((cur) => {
                // Sync the ref synchronously: the mount effect chains a second
                // loadMore in a microtask, before the [items] effect runs, so
                // without this the chained call reads a stale (empty) buffer,
                // passes prev=null, and can refetch the very same item.
                const next = [...cur, item];
                itemsRef.current = next;
                return next;
            });
            setStatus("ready");
            setTailFailed(false);
        } catch {
            // Distinguish: initial failure (no items yet) vs tail failure.
            setItems((cur) => {
                if (cur.length === 0) {
                    setStatus("error");
                } else {
                    setTailFailed(true);
                }
                return cur;
            });
        } finally {
            loadingRef.current = false;
        }
    }, [fetchNext]);

    // First paint: show one, prefetch one. Guarded so StrictMode's double-mount
    // doesn't load twice.
    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        loadMore().then(loadMore);
    }, [loadMore]);

    // The observer callback lives in a ref so the once-created observer always
    // runs the latest closure (loadMore/items change over the feed's life).
    // Cards carry their array index in data-key (append-only feed → stable).
    const onIntersect = useCallback(
        (entries) => {
            for (const e of entries) {
                const key = e.target.dataset.key;
                if (key == null) continue;
                const idx = Number(key);

                if (e.isIntersecting) {
                    // Prefetch when this card is near the tail.
                    if (
                        idx >= itemsRef.current.length - 1 - PREFETCH_WITHIN
                    ) {
                        loadMore();
                    }
                    // Start the dwell timer → log once when it fires.
                    if (
                        !seenRef.current.has(key) &&
                        !timersRef.current.has(key)
                    ) {
                        const t = setTimeout(() => {
                            timersRef.current.delete(key);
                            if (seenRef.current.has(key)) return;
                            seenRef.current.add(key);
                            const it = itemsRef.current[idx];
                            logActivity(logKind, it ? titleOf(it) : "");
                        }, DWELL_MS);
                        timersRef.current.set(key, t);
                    }
                } else {
                    // Left centre before the dwell elapsed — cancel.
                    const t = timersRef.current.get(key);
                    if (t) {
                        clearTimeout(t);
                        timersRef.current.delete(key);
                    }
                }
            }
        },
        [titleOf, logKind, loadMore]
    );

    const onIntersectRef = useRef(onIntersect);
    useEffect(() => {
        onIntersectRef.current = onIntersect;
    });

    // Callback ref: lazily builds the observer (root = viewport; the overlay
    // fills it) and observes each card. Forward-only feed, so we never
    // unobserve individual cards — teardown disconnects the lot.
    const cardRef = useCallback((el) => {
        if (!el) return;
        if (!ioRef.current) {
            ioRef.current = new IntersectionObserver(
                (entries) => onIntersectRef.current(entries),
                { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
            );
        }
        ioRef.current.observe(el);
    }, []);

    useEffect(
        () => () => {
            ioRef.current?.disconnect();
            ioRef.current = null;
            timersRef.current.forEach((t) => clearTimeout(t));
            timersRef.current.clear();
        },
        []
    );

    // Full-panel states (before any item has ever loaded).
    if (status === "loading") {
        return (
            <div className="dt-feed dt-feed--status">
                <p className="dt-status message">{loadingLabel}</p>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="dt-feed dt-feed--status">
                <div className="dt-status-panel">
                    <p className="message">Couldn't reach the source.</p>
                    <button
                        className="shift-button"
                        onClick={() => {
                            setStatus("loading");
                            loadMore();
                        }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`dt-feed dt-feed--${snap}`}>
            {items.map((it, i) => (
                <section
                    key={i}
                    data-key={i}
                    ref={cardRef}
                    className={`dt-card ${cardClass}`}
                >
                    {renderItem(it)}
                </section>
            ))}

            {tailFailed && (
                <div className="dt-tail">
                    <p className="message">Couldn't load more.</p>
                    <button
                        className="shift-button"
                        onClick={() => {
                            setTailFailed(false);
                            loadMore();
                        }}
                    >
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}

export default DowntimeFeed;
