import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState
} from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    // toast(message, type?, action?) — type: "success" | "error" | "info".
    // action: { label, onClick } renders a button (e.g. Undo).
    const toast = useCallback(
        (message, type = "info", action) => {
            const id = ++idRef.current;
            setToasts((current) => [
                ...current,
                { id, message, type, action }
            ]);

            // Give undo toasts a little longer to be clicked.
            const ttl = action ? 6000 : 3200;
            setTimeout(() => dismiss(id), ttl);

            return id;
        },
        [dismiss]
    );

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}

            <div className="toast-stack" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast toast-${t.type}`}
                    >
                        <span className="toast-msg">{t.message}</span>

                        {t.action && (
                            <button
                                className="toast-action"
                                onClick={() => {
                                    t.action.onClick();
                                    dismiss(t.id);
                                }}
                            >
                                {t.action.label}
                            </button>
                        )}

                        <button
                            className="toast-close"
                            aria-label="Dismiss"
                            onClick={() => dismiss(t.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }

    return context;
}
