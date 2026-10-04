import { useEffect, useState } from "react";
import { useOnlineStatus, onOfflineSync } from "../services/offline";

export default function OfflineIndicator() {
    const isOnline = useOnlineStatus();
    const [wasOffline, setWasOffline] = useState(false);
    const [reconnectedMessage, setReconnectedMessage] = useState("");

    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
            setReconnectedMessage("");
        } else if (wasOffline) {
            setReconnectedMessage("Back online · Shifts synced");
            const t = setTimeout(() => {
                setReconnectedMessage("");
                setWasOffline(false);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [isOnline, wasOffline]);

    useEffect(() => {
        return onOfflineSync((res) => {
            if (res.count > 0) {
                setReconnectedMessage(`Synced ${res.count} saved item${res.count > 1 ? "s" : ""}`);
                const t = setTimeout(() => setReconnectedMessage(""), 3000);
                return () => clearTimeout(t);
            }
        });
    }, []);

    if (isOnline && !reconnectedMessage) return null;

    return (
        <div
            className={`offline-banner ${isOnline ? "offline-banner--restored" : "offline-banner--offline"}`}
            role="status"
            aria-live="polite"
        >
            <span className="offline-dot" aria-hidden="true" />
            <span className="offline-text">
                {isOnline ? reconnectedMessage : "Offline · Actions will sync when online"}
            </span>
        </div>
    );
}
