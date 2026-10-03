import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";
import Modal from "./Modal";

const GITHUB_REPO_URL = "https://github.com/dhruvsolankiextendstyler/Shift";
const CREATOR_URL = "https://dhruv-solanki-about.vercel.app/";

function Footer({ isMobile = false }) {
    // User count states: "loading" | "success" | "error"
    const [userCount, setUserCount] = useState(null);
    const [countStatus, setCountStatus] = useState("loading");

    // Modal states
    const [activeModal, setActiveModal] = useState(null); // null | "how" | "about" | "privacy"

    useEffect(() => {
        let mounted = true;

        async function fetchStats() {
            try {
                // Public stats endpoint requires no auth
                const res = await apiFetch("/stats/public");
                if (!res.ok) throw new Error("Stats request failed");
                const data = await res.json();
                if (mounted && typeof data.userCount === "number") {
                    setUserCount(data.userCount);
                    setCountStatus("success");
                } else if (mounted) {
                    setCountStatus("error");
                }
            } catch (err) {
                // Graceful fallback on API error: do not crash or show fake numbers
                console.error("Footer stats fetch error:", err);
                if (mounted) setCountStatus("error");
            }
        }

        fetchStats();

        return () => {
            mounted = false;
        };
    }, []);

    const closeModal = () => setActiveModal(null);

    return (
        <>
            <footer className={`shift-footer ${isMobile ? "shift-footer--mobile" : ""}`}>
                <div className="shift-footer-container">
                    <div className="shift-footer-brand-section">
                        <div className="shift-footer-logo">SHIFT</div>
                        <p className="shift-footer-tagline">
                            Choose something. Do something. Keep moving.
                        </p>
                    </div>

                    {/* Aggregate Registered User Count */}
                    {countStatus === "loading" && (
                        <div className="shift-footer-count shift-footer-count--loading">
                            <span className="shift-footer-count-shimmer" aria-hidden="true" />
                            <span>Counting the movers shifting with us...</span>
                        </div>
                    )}

                    {countStatus === "success" && userCount !== null && (
                        <div className="shift-footer-count">
                            <span className="shift-footer-count-highlight">
                                {userCount.toLocaleString()}
                            </span>{" "}
                            people are shifting with us
                        </div>
                    )}

                    {/* On countStatus === "error", gracefully hide count row */}

                    <nav className="shift-footer-links" aria-label="Footer navigation">
                        <button
                            type="button"
                            className="shift-footer-link"
                            onClick={() => setActiveModal("how")}
                        >
                            How Shift Works
                        </button>
                        <span className="shift-footer-bullet" aria-hidden="true">
                            •
                        </span>
                        <button
                            type="button"
                            className="shift-footer-link"
                            onClick={() => setActiveModal("about")}
                        >
                            About
                        </button>
                        <span className="shift-footer-bullet" aria-hidden="true">
                            •
                        </span>
                        <button
                            type="button"
                            className="shift-footer-link"
                            onClick={() => setActiveModal("privacy")}
                        >
                            Privacy
                        </button>
                        <span className="shift-footer-bullet" aria-hidden="true">
                            •
                        </span>
                        <a
                            href={GITHUB_REPO_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shift-footer-link"
                        >
                            GitHub ↗
                        </a>
                    </nav>

                    <div className="shift-footer-credit">
                        <a
                            href={CREATOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Crafted by Dhruv Solanki ↗
                        </a>
                    </div>
                </div>
            </footer>

            {/* How Shift Works Modal */}
            <Modal
                open={activeModal === "how"}
                onClose={closeModal}
                labelledBy="how-shift-works-title"
            >
                <div className="shift-info-modal">
                    <p className="eyebrow">GUIDE</p>
                    <h2 id="how-shift-works-title" className="modal-title">
                        How Shift Works
                    </h2>
                    <p className="shift-info-lead">
                        SHIFT breaks decision fatigue by handing you the single
                        action worth doing right now.
                    </p>

                    <ol className="shift-how-list">
                        <li className="shift-how-item">
                            <span className="shift-how-num">1</span>
                            <div className="shift-how-content">
                                <strong>Choose what you want to do</strong>
                                <p>
                                    Pick a category from your active action pool,
                                    or choose <em>Surprise Me</em> to let Shift choose across areas.
                                </p>
                            </div>
                        </li>

                        <li className="shift-how-item">
                            <span className="shift-how-num">2</span>
                            <div className="shift-how-content">
                                <strong>Choose how much time you have</strong>
                                <p>
                                    Set your time window (5, 15, 30, or 60+ min).
                                    Shift respects your window as a hard limit.
                                </p>
                            </div>
                        </li>

                        <li className="shift-how-item">
                            <span className="shift-how-num">3</span>
                            <div className="shift-how-content">
                                <strong>Get your move</strong>
                                <p>
                                    Shift scores your tasks balancing priority, past feedback,
                                    repetition, and fit to recommend one next move.
                                </p>
                            </div>
                        </li>

                        <li className="shift-how-item">
                            <span className="shift-how-num">4</span>
                            <div className="shift-how-content">
                                <strong>Start with focus lock</strong>
                                <p>
                                    Slide to start. The app locks in on your active task
                                    so you stay immersed until it's finished.
                                </p>
                            </div>
                        </li>

                        <li className="shift-how-item">
                            <span className="shift-how-num">5</span>
                            <div className="shift-how-content">
                                <strong>Complete and keep shifting</strong>
                                <p>
                                    Resolve the task with feedback. Completed tasks record
                                    in your History and build your Insights rhythm.
                                </p>
                            </div>
                        </li>
                    </ol>

                    <div className="modal-actions">
                        <button className="primary-button" onClick={closeModal}>
                            Got it →
                        </button>
                    </div>
                </div>
            </Modal>

            {/* About Modal */}
            <Modal
                open={activeModal === "about"}
                onClose={closeModal}
                labelledBy="about-shift-title"
            >
                <div className="shift-info-modal">
                    <p className="eyebrow">ABOUT</p>
                    <h2 id="about-shift-title" className="modal-title">
                        About SHIFT
                    </h2>
                    <p className="shift-info-lead">
                        Your state changes. Your next move shifts.
                    </p>

                    <div className="shift-info-body">
                        <p>
                            Most productivity tools throw the whole backlog at you
                            and let you figure out what matters. That is the hardest
                            part — and it is exactly when low energy or decision fatigue
                            wrecks the choice.
                        </p>
                        <p>
                            SHIFT flips it. No endless to-do list. No paralysis.
                            Pick a category, tell Shift your minutes, and get the single
                            thing worth doing right now.
                        </p>
                    </div>

                    <div className="shift-about-credit-box">
                        <span>Designed and built by</span>
                        <a
                            href={CREATOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shift-about-author-link"
                        >
                            Dhruv Solanki ↗
                        </a>
                    </div>

                    <div className="modal-actions">
                        <button className="secondary-button" onClick={closeModal}>
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Privacy Modal */}
            <Modal
                open={activeModal === "privacy"}
                onClose={closeModal}
                labelledBy="privacy-shift-title"
            >
                <div className="shift-info-modal">
                    <p className="eyebrow">PRIVACY</p>
                    <h2 id="privacy-shift-title" className="modal-title">
                        Privacy & Data
                    </h2>
                    <p className="shift-info-lead">
                        Your tasks, actions, and focus belong entirely to you.
                    </p>

                    <div className="shift-privacy-points">
                        <div className="shift-privacy-point">
                            <strong>Scoped strictly to your account</strong>
                            <p>
                                All tasks, sessions, and activity logs are tied
                                to your user ID and protected behind secure JWT authentication.
                            </p>
                        </div>

                        <div className="shift-privacy-point">
                            <strong>Safe public aggregate stats</strong>
                            <p>
                                The registered user count displayed in the footer is
                                a simple aggregate tally. No names, emails, or personal details
                                are ever exposed publicly.
                            </p>
                        </div>

                        <div className="shift-privacy-point">
                            <strong>Zero third-party trackers</strong>
                            <p>
                                SHIFT does not sell personal information, run ads, or
                                embed tracking analytics that follow you across the web.
                            </p>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="secondary-button" onClick={closeModal}>
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default Footer;
