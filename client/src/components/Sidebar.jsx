const NAV = [
    { path: "/", label: "Now" },
    { path: "/tasks", label: "Tasks" },
    { path: "/history", label: "History" },
    { path: "/insights", label: "Insights" }
];

// Slide-in drawer for mobile: user, section nav, log out, portfolio.
function Sidebar({ open, onClose, user, activePath, onNavigate, onLogout }) {
    return (
        <>
            <div
                className={`sidebar-backdrop ${open ? "open" : ""}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${open ? "open" : ""}`}>
                <div className="sidebar-head">
                    <span className="sidebar-logo">
                        SHIFT <span>⚡</span>
                    </span>
                    <button
                        className="sidebar-close"
                        aria-label="Close menu"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="sidebar-user">
                    <span className="sidebar-avatar">
                        {(user?.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="sidebar-user-text">
                        <p className="sidebar-name">{user?.name}</p>
                        <p
                            className="sidebar-role"
                            title={user?.email}
                        >
                            {user?.email}
                        </p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {NAV.map((item, i) => (
                        <button
                            key={item.path}
                            className={`sidebar-link ${activePath === item.path ? "active" : ""}`}
                            style={{ "--i": i }}
                            onClick={() => {
                                onNavigate(item.path);
                                onClose();
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-foot">
                    <button
                        className="sidebar-logout"
                        onClick={onLogout}
                    >
                        Log out
                    </button>
                    <a
                        href="https://dhruv-solanki-about.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sidebar-credit"
                    >
                        Crafted by Dhruv Solanki ↗
                    </a>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
