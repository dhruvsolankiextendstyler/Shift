// Shown when a page fetch fails (server down, network error).
function ErrorState({ onRetry, message }) {
    return (
        <div className="empty-state error-state">
            <h2>Couldn't load that.</h2>
            <p>
                {message ||
                    "We hit a snag reaching the server. Check your connection and try again."}
            </p>
            {onRetry && (
                <button
                    className="secondary-button retry-button"
                    onClick={onRetry}
                >
                    Retry
                </button>
            )}
        </div>
    );
}

export default ErrorState;
