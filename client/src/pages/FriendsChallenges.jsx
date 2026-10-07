import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    fetchFriends,
    searchUsers,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    fetchFriendProgress,
    fetchChallenges,
    createChallenge,
    respondChallenge,
    cancelChallenge
} from "../services/social";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import Select from "../components/Select";
import NumberReveal from "../components/NumberReveal";
import ErrorState from "../components/ErrorState";

const CHALLENGE_TYPES = [
    { value: "task", label: "Task Challenge — Complete X activities" },
    { value: "category", label: "Category Challenge — Complete X in a category" },
    { value: "focus", label: "Focus-Time Challenge — Accumulate X minutes" },
    { value: "consistency", label: "Consistency Challenge — Active on X days" }
];

const DURATION_OPTIONS = [
    { value: 3, label: "3 Days" },
    { value: 7, label: "7 Days (1 Week)" },
    { value: 14, label: "14 Days (2 Weeks)" }
];

function formatMinutes(mins) {
    if (!mins || mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export default function FriendsChallenges() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("friends"); // "friends" | "challenges"
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Friends state
    const [friendsData, setFriendsData] = useState({ friends: [], incoming: [], outgoing: [] });
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addFriendOpen, setAddFriendOpen] = useState(false);

    // Friend Profile modal
    const [activeFriendId, setActiveFriendId] = useState(null);
    const [friendProgress, setFriendProgress] = useState(null);
    const [loadingProgress, setLoadingProgress] = useState(false);

    // Challenges state
    const [challengesData, setChallengesData] = useState({ active: [], pending: [], past: [] });
    const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
    const [selectedFriendForChallenge, setSelectedFriendForChallenge] = useState("");
    const [challengeType, setChallengeType] = useState("task");
    const [challengeCategory, setChallengeCategory] = useState("");
    const [challengeGoal, setChallengeGoal] = useState(10);
    const [challengeDuration, setChallengeDuration] = useState(7);
    const [challengeTitle, setChallengeTitle] = useState("");
    const [submittingChallenge, setSubmittingChallenge] = useState(false);

    // Challenge Detail modal
    const [activeChallenge, setActiveChallenge] = useState(null);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [friendsRes, challengesRes] = await Promise.all([
                fetchFriends(),
                fetchChallenges()
            ]);
            setFriendsData(friendsRes);
            setChallengesData(challengesRes);
        } catch (err) {
            console.error("Failed to load friends/challenges data:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle user search debounce
    useEffect(() => {
        if (!addFriendOpen || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await searchUsers(searchQuery.trim());
                setSearchResults(results);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, addFriendOpen]);

    // Friend actions
    const handleSendRequest = async (recipientId) => {
        try {
            await sendFriendRequest({ recipientId });
            toast("Friend request sent", "success");
            setSearchResults((prev) =>
                prev.map((u) => (u._id === recipientId ? { ...u, relationship: "pending" } : u))
            );
            loadData();
        } catch (err) {
            toast(err.message || "Failed to send request", "error");
        }
    };

    const handleRespondRequest = async (requestId, action) => {
        try {
            await respondFriendRequest(requestId, action);
            toast(action === "accept" ? "Friend request accepted" : "Friend request declined", "info");
            loadData();
        } catch (err) {
            toast(err.message || "Failed to respond", "error");
        }
    };

    const handleRemoveFriend = async (friendId, name) => {
        if (!window.confirm(`Remove ${name} from your friends?`)) return;
        try {
            await removeFriend(friendId);
            toast("Friend removed", "info");
            if (activeFriendId === friendId) {
                setActiveFriendId(null);
                setFriendProgress(null);
            }
            loadData();
        } catch (err) {
            toast(err.message || "Failed to remove friend", "error");
        }
    };

    const handleOpenFriendProfile = async (friendId) => {
        setActiveFriendId(friendId);
        setLoadingProgress(true);
        try {
            const data = await fetchFriendProgress(friendId);
            setFriendProgress(data);
        } catch (err) {
            toast(err.message || "Failed to load friend profile", "error");
            setActiveFriendId(null);
        } finally {
            setLoadingProgress(false);
        }
    };

    // Challenge actions
    const handleOpenCreateChallenge = (preselectedFriendId = "") => {
        setSelectedFriendForChallenge(preselectedFriendId || friendsData.friends[0]?.user?._id || "");
        setChallengeType("task");
        setChallengeCategory("");
        setChallengeGoal(10);
        setChallengeDuration(7);
        setChallengeTitle("");
        setCreateChallengeOpen(true);
    };

    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        if (!selectedFriendForChallenge) {
            toast("Please select a friend", "error");
            return;
        }

        if (challengeType === "category" && !challengeCategory.trim()) {
            toast("Please specify a category", "error");
            return;
        }

        const goalNum = Number(challengeGoal);
        if (!goalNum || goalNum <= 0) {
            toast("Please enter a valid goal", "error");
            return;
        }

        setSubmittingChallenge(true);
        try {
            await createChallenge({
                participantId: selectedFriendForChallenge,
                type: challengeType,
                category: challengeType === "category" ? challengeCategory.trim() : null,
                goal: goalNum,
                durationDays: Number(challengeDuration),
                title: challengeTitle.trim() || undefined
            });
            toast("Challenge invitation sent!", "success");
            setCreateChallengeOpen(false);
            loadData();
        } catch (err) {
            toast(err.message || "Failed to create challenge", "error");
        } finally {
            setSubmittingChallenge(false);
        }
    };

    const handleRespondChallenge = async (challengeId, action) => {
        try {
            await respondChallenge(challengeId, action);
            toast(action === "accept" ? "Challenge accepted! Game on ⚡" : "Challenge declined", "info");
            loadData();
        } catch (err) {
            toast(err.message || "Failed to update challenge", "error");
        }
    };

    const handleCancelChallenge = async (challengeId) => {
        if (!window.confirm("Cancel this challenge invitation?")) return;
        try {
            await cancelChallenge(challengeId);
            toast("Challenge cancelled", "info");
            loadData();
        } catch (err) {
            toast(err.message || "Failed to cancel challenge", "error");
        }
    };

    const friendSelectOptions = useMemo(() => {
        return friendsData.friends.map((f) => ({
            value: f.user._id,
            label: f.user.name
        }));
    }, [friendsData.friends]);

    const incomingRequestsCount = friendsData.incoming.length;
    const pendingChallengesCount = challengesData.pending.filter((c) => !c.userIsCreator).length;

    return (
        <div className="friends-challenges-page">
            <div className="page-heading">
                <div>
                    <div className="back-bar">
                        <Link to="/" className="back-link">
                            ← Back
                        </Link>
                    </div>
                    <p className="eyebrow">✦ ACCOUNTABILITY</p>
                    <h1>Friends & Challenges</h1>
                    <p className="page-description">
                        Shared momentum and focus with trusted peers.
                    </p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="social-tabs" role="tablist">
                <button
                    role="tab"
                    aria-selected={activeTab === "friends"}
                    className={`social-tab ${activeTab === "friends" ? "active" : ""}`}
                    onClick={() => setActiveTab("friends")}
                >
                    Friends ({friendsData.friends.length})
                    {incomingRequestsCount > 0 && (
                        <span className="tab-badge">{incomingRequestsCount}</span>
                    )}
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === "challenges"}
                    className={`social-tab ${activeTab === "challenges" ? "active" : ""}`}
                    onClick={() => setActiveTab("challenges")}
                >
                    Challenges ({challengesData.active.length})
                    {pendingChallengesCount > 0 && (
                        <span className="tab-badge">{pendingChallengesCount}</span>
                    )}
                </button>
            </div>

            {loading ? (
                <p className="message">Loading your circle...</p>
            ) : error ? (
                <ErrorState onRetry={loadData} />
            ) : activeTab === "friends" ? (
                /* ================= FRIENDS TAB ================= */
                <div className="friends-section">
                    {/* Incoming requests */}
                    {incomingRequestsCount > 0 && (
                        <div className="social-alert-card">
                            <h3 className="social-alert-title">Friend Requests ({incomingRequestsCount})</h3>
                            <div className="requests-list">
                                {friendsData.incoming.map((req) => (
                                    <div key={req.requestId} className="request-row">
                                        <div className="request-user">
                                            <span className="avatar-circle">
                                                {(req.from.name || "?").charAt(0).toUpperCase()}
                                            </span>
                                            <div className="request-user-meta">
                                                <strong className="request-name">{req.from.name}</strong>
                                                <span className="request-email">{req.from.email}</span>
                                            </div>
                                        </div>
                                        <div className="request-actions">
                                            <button
                                                className="primary-button small request-action-btn"
                                                onClick={() => handleRespondRequest(req.requestId, "accept")}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                className="secondary-button small request-action-btn"
                                                onClick={() => handleRespondRequest(req.requestId, "decline")}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="social-toolbar">
                        <span className="social-count-label">
                            {friendsData.friends.length === 1
                                ? "1 friend in your circle"
                                : `${friendsData.friends.length} friends in your circle`}
                        </span>
                        <button
                            className="primary-button small"
                            onClick={() => {
                                setSearchQuery("");
                                setSearchResults([]);
                                setAddFriendOpen(true);
                            }}
                        >
                            + Add Friend
                        </button>
                    </div>

                    {/* Friends list */}
                    {friendsData.friends.length === 0 ? (
                        <div className="empty-state">
                            <h2>No friends added yet.</h2>
                            <p>
                                Add a friend by email to share high-level weekly momentum and run challenges together.
                            </p>
                            <button
                                className="secondary-button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setSearchResults([]);
                                    setAddFriendOpen(true);
                                }}
                            >
                                + ADD A FRIEND
                            </button>
                        </div>
                    ) : (
                        <div className="friends-grid">
                            {friendsData.friends.map(({ friendshipId, user, stats }) => (
                                <div key={friendshipId} className="friend-card">
                                    <div className="friend-card-head">
                                        <div className="friend-info">
                                            <span className="avatar-circle">
                                                {(user.name || "?").charAt(0).toUpperCase()}
                                            </span>
                                            <div>
                                                <h3 className="friend-name">{user.name}</h3>
                                                <span className="friend-sub">Active friend</span>
                                            </div>
                                        </div>
                                        <button
                                            className="friend-remove-btn"
                                            title="Remove friend"
                                            onClick={() => handleRemoveFriend(user._id, user.name)}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* High-level weekly summary */}
                                    <div className="friend-stats-preview">
                                        <div className="preview-stat">
                                            <strong><NumberReveal value={stats.activitiesCount} /></strong>
                                            <span>moves this week</span>
                                        </div>
                                        <div className="preview-stat">
                                            <strong>{formatMinutes(stats.focusMinutes)}</strong>
                                            <span>active time</span>
                                        </div>
                                        <div className="preview-stat">
                                            <strong>{stats.activeDaysCount} / 7</strong>
                                            <span>active days</span>
                                        </div>
                                    </div>

                                    <div className="friend-card-actions">
                                        <button
                                            className="secondary-button small"
                                            onClick={() => handleOpenFriendProfile(user._id)}
                                        >
                                            View Progress
                                        </button>
                                        <button
                                            className="primary-button small"
                                            onClick={() => handleOpenCreateChallenge(user._id)}
                                        >
                                            Challenge
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* ================= CHALLENGES TAB ================= */
                <div className="challenges-section">
                    {/* Pending invitations */}
                    {challengesData.pending.length > 0 && (
                        <div className="social-alert-card">
                            <h3 className="social-alert-title">Pending Invitations</h3>
                            <div className="challenges-pending-list">
                                {challengesData.pending.map((c) => (
                                    <div key={c._id} className="pending-challenge-row">
                                        <div className="pending-challenge-meta">
                                            <strong>{c.title}</strong>
                                            <span className="pending-sub">
                                                {c.userIsCreator
                                                    ? `Waiting for ${c.friendUser.name} to accept (${c.durationDays}d · Goal: ${c.goal})`
                                                    : `${c.friendUser.name} challenged you (${c.durationDays}d · Goal: ${c.goal})`}
                                            </span>
                                        </div>
                                        <div className="pending-challenge-actions">
                                            {c.userIsCreator ? (
                                                <button
                                                    className="secondary-button small"
                                                    onClick={() => handleCancelChallenge(c._id)}
                                                >
                                                    Cancel
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        className="primary-button small"
                                                        onClick={() => handleRespondChallenge(c._id, "accept")}
                                                    >
                                                        Accept ⚡
                                                    </button>
                                                    <button
                                                        className="secondary-button small"
                                                        onClick={() => handleRespondChallenge(c._id, "decline")}
                                                    >
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="social-toolbar">
                        <span className="social-count-label">
                            {challengesData.active.length === 1
                                ? "1 active challenge"
                                : `${challengesData.active.length} active challenges`}
                        </span>
                        <button
                            className="primary-button small"
                            disabled={friendsData.friends.length === 0}
                            onClick={() => handleOpenCreateChallenge()}
                        >
                            + Challenge a Friend
                        </button>
                    </div>

                    {friendsData.friends.length === 0 && (
                        <p className="chart-sub" style={{ margin: "-10px 0 20px" }}>
                            Add a friend first to start 1-on-1 accountability challenges.
                        </p>
                    )}

                    {/* Active challenges */}
                    {challengesData.active.length === 0 ? (
                        <div className="empty-state">
                            <h2>No active challenges.</h2>
                            <p>
                                Challenges are temporary shared goals between friends (3, 7, or 14 days) grounded strictly in your real activity.
                            </p>
                            {friendsData.friends.length > 0 && (
                                <button
                                    className="secondary-button"
                                    onClick={() => handleOpenCreateChallenge()}
                                >
                                    + START A CHALLENGE
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="challenges-grid">
                            {challengesData.active.map((c) => {
                                const userPct = Math.min(100, Math.round((c.userProgress / c.goal) * 100));
                                const friendPct = Math.min(100, Math.round((c.friendProgress / c.goal) * 100));

                                return (
                                    <div
                                        key={c._id}
                                        className="challenge-card"
                                        onClick={() => setActiveChallenge(c)}
                                    >
                                        <div className="challenge-card-head">
                                            <div>
                                                <span className="eyebrow">
                                                    ✦ {c.type.toUpperCase()} CHALLENGE
                                                    {c.category ? ` · ${c.category}` : ""}
                                                </span>
                                                <h3 className="challenge-title">{c.title}</h3>
                                            </div>
                                            <span className="remaining-badge">{c.remainingLabel}</span>
                                        </div>

                                        <p className="challenge-goal-desc">
                                            Goal: {c.type === "focus" ? formatMinutes(c.goal) : `${c.goal} ${c.type === "consistency" ? "active days" : "completed moves"}`}
                                        </p>

                                        {/* Dual progress bars */}
                                        <div className="dual-progress">
                                            <div className="progress-item">
                                                <div className="progress-label-row">
                                                    <span>You</span>
                                                    <strong>
                                                        {c.type === "focus" ? formatMinutes(c.userProgress) : c.userProgress} / {c.type === "focus" ? formatMinutes(c.goal) : c.goal}
                                                    </strong>
                                                </div>
                                                <div className="bar-track">
                                                    <div className="bar-fill" style={{ width: `${userPct}%` }} />
                                                </div>
                                            </div>

                                            <div className="progress-item">
                                                <div className="progress-label-row">
                                                    <span>{c.friendUser.name}</span>
                                                    <strong>
                                                        {c.type === "focus" ? formatMinutes(c.friendProgress) : c.friendProgress} / {c.type === "focus" ? formatMinutes(c.goal) : c.goal}
                                                    </strong>
                                                </div>
                                                <div className="bar-track">
                                                    <div className="bar-fill friend-bar" style={{ width: `${friendPct}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="challenge-card-footer">
                                            <span className="card-link-action">View details →</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Past / Completed challenges */}
                    {challengesData.past.length > 0 && (
                        <div className="past-challenges-section">
                            <p className="eyebrow" style={{ marginTop: "35px" }}>COMPLETED & PAST</p>
                            <h2 style={{ fontSize: "var(--text-lg)", marginBottom: "15px" }}>History of Challenges</h2>
                            <div className="past-challenges-list">
                                {challengesData.past.map((c) => {
                                    let outcomeLabel = "Ended";
                                    if (c.outcome === "both_completed") outcomeLabel = "Completed by both 🎉";
                                    else if (c.outcome === "creator_won") {
                                        outcomeLabel = c.userIsCreator ? "Completed by you ⚡" : `Completed by ${c.friendUser.name}`;
                                    } else if (c.outcome === "participant_won") {
                                        outcomeLabel = !c.userIsCreator ? "Completed by you ⚡" : `Completed by ${c.friendUser.name}`;
                                    } else if (c.status === "declined") {
                                        outcomeLabel = "Declined";
                                    } else if (c.status === "cancelled") {
                                        outcomeLabel = "Cancelled";
                                    }

                                    return (
                                        <div
                                            key={c._id}
                                            className="past-challenge-row"
                                            onClick={() => setActiveChallenge(c)}
                                        >
                                            <div>
                                                <strong>{c.title}</strong>
                                                <span className="past-challenge-sub">
                                                    with {c.friendUser.name} · Goal: {c.goal}
                                                </span>
                                            </div>
                                            <span className="past-outcome-badge">{outcomeLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ================= ADD FRIEND MODAL ================= */}
            <Modal
                open={addFriendOpen}
                onClose={() => setAddFriendOpen(false)}
                variant="dialog"
                labelledBy="add-friend-title"
            >
                <div className="add-friend-modal">
                    <div className="modal-header">
                        <div>
                            <p className="eyebrow">✦ ADD FRIEND</p>
                            <h2 id="add-friend-title">Find on Shift</h2>
                        </div>
                        <button
                            className="text-button"
                            onClick={() => setAddFriendOpen(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="input-group">
                        <label>Search by name or email</label>
                        <input
                            type="search"
                            autoFocus
                            placeholder="e.g. Aarav or friend@example.com"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="search-results-list">
                        {searching ? (
                            <p className="message" style={{ margin: "15px 0" }}>Searching...</p>
                        ) : searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                            <p className="chart-empty" style={{ margin: "15px 0" }}>No users found matching "{searchQuery}"</p>
                        ) : (
                            searchResults.map((user) => (
                                <div key={user._id} className="search-result-row">
                                    <div className="search-user-info">
                                        <span className="avatar-circle">
                                            {(user.name || "?").charAt(0).toUpperCase()}
                                        </span>
                                        <div>
                                            <strong>{user.name}</strong>
                                            <span className="user-email">{user.email}</span>
                                        </div>
                                    </div>

                                    {user.relationship === "friend" ? (
                                        <span className="status-pill">Friends</span>
                                    ) : user.relationship === "pending" ? (
                                        <span className="status-pill pending">Pending</span>
                                    ) : (
                                        <button
                                            className="primary-button small send-request-btn"
                                            onClick={() => handleSendRequest(user._id)}
                                        >
                                            + Send Request
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            {/* ================= FRIEND PROFILE MODAL ================= */}
            <Modal
                open={Boolean(activeFriendId && friendProgress)}
                onClose={() => {
                    setActiveFriendId(null);
                    setFriendProgress(null);
                }}
                variant="dialog"
                labelledBy="friend-profile-title"
            >
                {friendProgress && (
                    <div className="friend-profile-modal">
                        <div className="modal-header">
                            <div>
                                <p className="eyebrow">✦ FRIEND PROFILE</p>
                                <h2 id="friend-profile-title">{friendProgress.friend.name}</h2>
                            </div>
                            <button
                                className="text-button"
                                onClick={() => {
                                    setActiveFriendId(null);
                                    setFriendProgress(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* High-level weekly performance */}
                        <div className="profile-section-card">
                            <span className="section-label">THIS WEEK</span>
                            <div className="stats-grid three">
                                <div className="stat-card">
                                    <span>Activities</span>
                                    <strong><NumberReveal value={friendProgress.stats.activitiesCount} /></strong>
                                </div>
                                <div className="stat-card">
                                    <span>Focus time</span>
                                    <strong>{formatMinutes(friendProgress.stats.focusMinutes)}</strong>
                                </div>
                                <div className="stat-card">
                                    <span>Active days</span>
                                    <strong><NumberReveal value={friendProgress.stats.activeDaysCount} suffix=" / 7" /></strong>
                                </div>
                            </div>
                        </div>

                        {/* Categories breakdown */}
                        <div className="profile-section-card">
                            <span className="section-label">CATEGORIES THIS WEEK</span>
                            {friendProgress.stats.categories.length === 0 ? (
                                <p className="chart-empty">No category moves logged this week yet.</p>
                            ) : (
                                <div className="category-breakdown-list">
                                    {friendProgress.stats.categories.map((c) => (
                                        <div key={c.category} className="cat-row">
                                            <span>{c.category}</span>
                                            <strong>{c.count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="privacy-badge">
                            🛡 High-level progress only. Personal tasks, notes, and detailed timestamps remain strictly private.
                        </div>

                        <div className="modal-actions-bar">
                            <button
                                className="primary-button"
                                onClick={() => {
                                    const fid = friendProgress.friend._id;
                                    setActiveFriendId(null);
                                    setFriendProgress(null);
                                    handleOpenCreateChallenge(fid);
                                }}
                            >
                                Challenge {friendProgress.friend.name} ⚡
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ================= CREATE CHALLENGE MODAL ================= */}
            <Modal
                open={createChallengeOpen}
                onClose={() => setCreateChallengeOpen(false)}
                variant="dialog"
                labelledBy="create-challenge-title"
            >
                <form className="create-challenge-modal" onSubmit={handleCreateChallenge}>
                    <div className="modal-header">
                        <div>
                            <p className="eyebrow">✦ CHALLENGE A FRIEND</p>
                            <h2 id="create-challenge-title">New 1-on-1 Challenge</h2>
                        </div>
                        <button
                            type="button"
                            className="text-button"
                            onClick={() => setCreateChallengeOpen(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="input-group">
                        <label>Choose Friend</label>
                        <Select
                            value={selectedFriendForChallenge}
                            onChange={setSelectedFriendForChallenge}
                            options={friendSelectOptions}
                        />
                    </div>

                    <div className="input-group">
                        <label>Challenge Type</label>
                        <Select
                            value={challengeType}
                            onChange={setChallengeType}
                            options={CHALLENGE_TYPES}
                        />
                    </div>

                    {challengeType === "category" && (
                        <div className="input-group">
                            <label>Category Name</label>
                            <input
                                placeholder="e.g. Computer Science, Reading, Fitness"
                                value={challengeCategory}
                                onChange={(e) => setChallengeCategory(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="form-row challenge-form-row">
                        <div className="input-group">
                            <label>
                                {challengeType === "focus"
                                    ? "Goal (minutes)"
                                    : challengeType === "consistency"
                                    ? "Goal (active days)"
                                    : "Goal (completed moves)"}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={challengeGoal}
                                onChange={(e) => setChallengeGoal(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Duration</label>
                            <Select
                                value={challengeDuration}
                                onChange={setChallengeDuration}
                                options={DURATION_OPTIONS}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Challenge Name (Optional)</label>
                        <input
                            placeholder="e.g. CS Sprint, Focus Blitz"
                            value={challengeTitle}
                            onChange={(e) => setChallengeTitle(e.target.value)}
                        />
                    </div>

                    <div className="modal-actions-bar">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setCreateChallengeOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={submittingChallenge}
                        >
                            {submittingChallenge ? "Sending..." : "Send Challenge"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ================= CHALLENGE DETAIL MODAL ================= */}
            <Modal
                open={Boolean(activeChallenge)}
                onClose={() => setActiveChallenge(null)}
                variant="dialog"
                labelledBy="challenge-detail-title"
            >
                {activeChallenge && (
                    <div className="challenge-detail-modal">
                        <div className="modal-header">
                            <div>
                                <span className="eyebrow">
                                    ✦ {activeChallenge.type.toUpperCase()} CHALLENGE
                                    {activeChallenge.category ? ` · ${activeChallenge.category}` : ""}
                                </span>
                                <h2 id="challenge-detail-title">{activeChallenge.title}</h2>
                            </div>
                            <button
                                className="text-button"
                                onClick={() => setActiveChallenge(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="challenge-detail-meta-bar">
                            <span className="status-pill active">{activeChallenge.status.toUpperCase()}</span>
                            <span className="remaining-badge">{activeChallenge.remainingLabel}</span>
                        </div>

                        <p className="challenge-summary-text">
                            Target: {activeChallenge.type === "focus" ? formatMinutes(activeChallenge.goal) : `${activeChallenge.goal} moves`} over {activeChallenge.durationDays} days.
                        </p>

                        {/* Head-to-head comparison cards */}
                        <div className="head-to-head-grid">
                            <div className="participant-card you">
                                <span className="participant-badge">YOU</span>
                                <strong className="participant-score">
                                    {activeChallenge.type === "focus"
                                        ? formatMinutes(activeChallenge.userProgress)
                                        : activeChallenge.userProgress}
                                </strong>
                                <span className="participant-goal">
                                    of {activeChallenge.type === "focus" ? formatMinutes(activeChallenge.goal) : activeChallenge.goal}
                                </span>
                                <div className="bar-track">
                                    <div
                                        className="bar-fill"
                                        style={{
                                            width: `${Math.min(100, Math.round((activeChallenge.userProgress / activeChallenge.goal) * 100))}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="participant-card friend">
                                <span className="participant-badge">{activeChallenge.friendUser.name.toUpperCase()}</span>
                                <strong className="participant-score">
                                    {activeChallenge.type === "focus"
                                        ? formatMinutes(activeChallenge.friendProgress)
                                        : activeChallenge.friendProgress}
                                </strong>
                                <span className="participant-goal">
                                    of {activeChallenge.type === "focus" ? formatMinutes(activeChallenge.goal) : activeChallenge.goal}
                                </span>
                                <div className="bar-track">
                                    <div
                                        className="bar-fill friend-bar"
                                        style={{
                                            width: `${Math.min(100, Math.round((activeChallenge.friendProgress / activeChallenge.goal) * 100))}%`
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {activeChallenge.startDate && (
                            <div className="date-bounds-row">
                                <span>Started: {new Date(activeChallenge.startDate).toLocaleDateString()}</span>
                                {activeChallenge.endDate && (
                                    <span>Ends: {new Date(activeChallenge.endDate).toLocaleDateString()}</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
