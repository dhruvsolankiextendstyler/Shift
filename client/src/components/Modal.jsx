import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Themed overlay: click-out + Escape to close, body scroll locked while open,
// and the device/browser Back button closes the modal instead of leaving the
// app. variant "sheet" fills the screen like a page (for the reader); default
// is a centered dialog.
// Portaled to <body> so its position:fixed backdrop is measured against the
// viewport — not against a transformed ancestor like the mobile swipe
// carousel, which otherwise drags the popup onto the wrong tab.
function Modal({ open, onClose, children, labelledBy, variant = "dialog" }) {
    // onClose is usually an inline arrow (new identity each render). Hold it in
    // a ref so the effects below can key on `open` alone and not re-run — and
    // re-push history entries — on every parent render.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    // Whether we currently own a parked history entry. A ref (not state) so it
    // survives StrictMode's double-invoked effects without pushing twice.
    const historyParkedRef = useRef(false);

    // Escape to close + lock body scroll while open.
    useEffect(() => {
        if (!open) return;

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
    }, [open]);

    // Park a throwaway history entry while open so a Back press pops THAT entry
    // (→ popstate → close the modal) instead of navigating the app away/out.
    useEffect(() => {
        if (!open) return;

        if (!historyParkedRef.current) {
            window.history.pushState({ shiftModal: true }, "");
            historyParkedRef.current = true;
        }

        const onPop = () => {
            // Back already removed our entry — just close, don't unwind again.
            historyParkedRef.current = false;
            onCloseRef.current();
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [open]);

    // Closed via the UI (X / Escape / click-out), not Back: remove the parked
    // entry so the next Back press isn't wasted swallowing a stale one.
    useEffect(() => {
        if (open || !historyParkedRef.current) return;
        historyParkedRef.current = false;
        window.history.back();
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            className={`modal-backdrop modal-${variant}`}
            onClick={onClose}
        >
            <div
                className="modal-panel"
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
