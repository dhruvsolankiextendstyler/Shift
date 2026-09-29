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
// taller). `fetchNext(prev)` returns the next item (may throw); `keyOf` is a
// stable dedupe/React key; `titleOf` is what History records; `logKind` is
// "vocab" | "read"; `snap` is "mandatory" (words) | "proximity" (articles).
function DowntimeFeed({
    fetchNext,
    keyOf,
    titleOf,
    logKind,
    renderItem,
    snap,
    cardClass = "",
    loadingLabel
}) {
    const [items, setItems] = useState([]);
    const [failed, setFailed] = useState(false);

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
    // double-fetch. Never throws — a failure flips the retry tail on.
    const loadMore = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            const prev =
                itemsRef.current[itemsRef.current.length - 1] || null;
            const item = await fetchNext(prev);
            setItems((cur) => [...cur, item]);
            setFailed(false);
        } catch {
            setFailed(true);
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
    const onIntersect = useCallback(
        (entries) => {
            for (const e of entries) {
                const key = e.target.dataset.key;
                if (!key) continue;

                if (e.isIntersecting) {
                    // Prefetch when this card is near the tail.
                    const idx = itemsRef.current.findIndex(
                        (it) => keyOf(it) === key
                    );
                    if (
                        idx >= 0 &&
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
                            const it = itemsRef.current.find(
                                (x) => keyOf(x) === key
                            );
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
        [keyOf, titleOf, logKind, loadMore]
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

    return (
        <div className={`dt-feed dt-feed--${snap}`}>
            {items.length === 0 && !failed && (
                <p className="dt-status message">{loadingLabel}</p>
            )}

            {items.map((it) => {
                const k = keyOf(it);
                return (
                    <section
                        key={k}
                        data-key={k}
                        ref={cardRef}
                        className={`dt-card ${cardClass}`}
                    >
                        {renderItem(it)}
                    </section>
                );
            })}

            {failed && (
                <div className="dt-tail">
                    <p className="message">Couldn't reach the source.</p>
                    <button className="shift-button" onClick={loadMore}>
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}

export default DowntimeFeed;
