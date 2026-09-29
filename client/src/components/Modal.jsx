import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Slide duration for the sheet. Kept in sync with the CSS `sheet-up` /
// `sheet-down` animation length — JS waits this long before unmounting so the
// exit slide is actually seen.
const SHEET_MS = 360;

const reducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Themed overlay: click-out + Escape to close, body scroll locked while open,
// and the device/browser Back button closes the modal instead of leaving the
// app. variant "sheet" fills the screen like a page and rises from the bottom
// (for the reader / Downtime); default is a centered dialog.
//
// Closing is a two-phase move: a close request (in-app Back, click-out, Escape,
// or a device Back press) flips `closing` on to play the slide-down, and only
// once that finishes do we unmount and drop our parked history entry. That's
// what lets both Back methods show the exit animation without the route
// changing out from under it.
//
// Portaled to <body> so its position:fixed backdrop is measured against the
// viewport — not against a transformed ancestor like the mobile swipe
// carousel, which otherwise drags the popup onto the wrong tab.
function Modal({ open, onClose, children, labelledBy, variant = "dialog" }) {
    // onClose is usually an inline arrow (new identity each render). Hold it in
    // a ref so the effects below can key on state alone and not re-run — and
    // re-push history entries — on every parent render.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    // `present` = mounted in the DOM. It lags `open` on the way out so the exit
    // animation can finish first. `closing` = that exit is in flight.
    const [present, setPresent] = useState(open);
    const [closing, setClosing] = useState(false);

    const parkedRef = useRef(false); // we currently own a parked history entry
    const closingRef = useRef(false); // exit in progress (idempotency guard)
    const ignorePopRef = useRef(false); // next popstate is our own history.back()
    const panelRef = useRef(null);

    // open → ensure we're mounted, not mid-close, and holding a parked history
    // entry (so a Back press has something of ours to pop).
    useEffect(() => {
        if (open) {
            setPresent(true);
            setClosing(false);
            closingRef.current = false;
            if (!parkedRef.current) {
                window.history.pushState({ shiftModal: true }, "");
                parkedRef.current = true;
            }
        }
    }, [open]);

    // Unmount, sync the parent's `open` (needed on the device-Back path, where
    // the parent still thinks it's open), and drop our history entry. Idempotent
    // via closingRef so a stray repeat can't double-navigate.
    const finishClose = useCallback(() => {
        if (!closingRef.current) return;
        closingRef.current = false;
        setClosing(false);
        setPresent(false);
        onCloseRef.current();
        if (parkedRef.current) {
            parkedRef.current = false;
            ignorePopRef.current = true; // swallow the popstate this back() fires
            window.history.back();
        }
    }, []);

    // Start the exit. Idempotent — repeated triggers (rapid Back, prop change +
    // popstate arriving together) are ignored while already closing.
    const beginClose = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        setClosing(true);
    }, []);

    // Parent flipped `open` to false (in-app Back button / click-out / Escape).
    useEffect(() => {
        if (present && !open) beginClose();
    }, [open, present, beginClose]);

    // Once closing, wait out the slide-down, then finish. Non-sheet dialogs and
    // reduced-motion skip straight to unmount (no visible slide anyway).
    useEffect(() => {
        if (!closing) return;
        if (variant !== "sheet" || reducedMotion()) {
            finishClose();
            return;
        }
        const t = setTimeout(finishClose, SHEET_MS);
        return () => clearTimeout(t);
    }, [closing, variant, finishClose]);

    // Escape + body scroll-lock, held for as long as we're on screen.
    useEffect(() => {
        if (!present) return;
        const onKey = (e) => {
            if (e.key === "Escape") onCloseRef.current();
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [present]);

    // Device/browser Back → close (playing the slide-down), never leave the
    // app. This listener lives for the component's whole lifetime, so the
    // history.back() we fire ourselves in finishClose is always caught here and
    // swallowed — no stale ignore flag leaking into the next open. On a real
    // Back we re-park a guard entry first, so a rapid second Back can't pop the
    // real page underneath the sheet.
    useEffect(() => {
        const onPop = () => {
            if (ignorePopRef.current) {
                ignorePopRef.current = false;
                return;
            }
            if (!parkedRef.current) return;
            window.history.pushState({ shiftModal: true }, "");
            beginClose();
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [beginClose]);

    if (!present) return null;

    return createPortal(
        <div
            className={`modal-backdrop modal-${variant}${
                closing ? " modal-closing" : ""
            }`}
            onClick={() => onCloseRef.current()}
        >
            <div
                className="modal-panel"
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body
    );
}

export default Modal;
