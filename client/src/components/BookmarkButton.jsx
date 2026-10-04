import { useState } from "react";
import { useIsSaved, toggleSaveItem } from "../services/saved";

export default function BookmarkButton({ type, itemId, title, content, className = "" }) {
    const isSaved = useIsSaved(type, itemId);
    const [bouncing, setBouncing] = useState(false);

    const handleClick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        setBouncing(true);
        setTimeout(() => setBouncing(false), 350);
        await toggleSaveItem({ type, itemId, title, content });
    };

    return (
        <button
            type="button"
            className={`bookmark-btn ${isSaved ? "saved" : ""} ${bouncing ? "bouncing" : ""} ${className}`}
            onClick={handleClick}
            aria-label={isSaved ? `Remove ${type} from saved` : `Save ${type}`}
            aria-pressed={isSaved}
            title={isSaved ? "Saved" : "Save"}
        >
            <svg
                viewBox="0 0 24 24"
                className="bookmark-icon"
                aria-hidden="true"
            >
                <path
                    d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                    fill={isSaved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );
}
