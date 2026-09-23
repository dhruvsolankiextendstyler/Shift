import { useEffect } from "react";
import { createPortal } from "react-dom";

// Themed overlay: click-out + Escape to close, body scroll locked while open.
// variant "sheet" fills the screen like a page (for the reader); default is a
// centered dialog.
// Portaled to <body> so its position:fixed backdrop is measured against the
// viewport — not against a transformed ancestor like the mobile swipe
// carousel, which otherwise drags the popup onto the wrong tab.
function Modal({ open, onClose, children, labelledBy, variant = "dialog" }) {
    useEffect(() => {
        if (!open) return;

        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

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
