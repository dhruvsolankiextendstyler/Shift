import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

// Eye icon — two states: open (visible) and closed (slashed).
function EyeIcon({ open }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {open ? (
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            )}
        </svg>
    );
}

// Google 4-color 'G' icon for custom button fallback
function GoogleIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            className="google-icon"
        >
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
        </svg>
    );
}

function Auth() {
    const { login, signup, loginWithGoogle } = useAuth();

    const [mode, setMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Show/hide state — each password field is independent.
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const isSignup = mode === "signup";
    const googleBtnRef = useRef(null);
    const [googleLoaded, setGoogleLoaded] = useState(false);

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Load Google Identity Services script
    useEffect(() => {
        if (!googleClientId) return;

        if (window.google?.accounts?.id) {
            setGoogleLoaded(true);
            return;
        }

        const scriptId = "google-identity-services-script";
        if (document.getElementById(scriptId)) return;

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => setGoogleLoaded(true);
        script.onerror = () => {
            console.warn("Failed to load Google Identity Services script");
        };
        document.body.appendChild(script);
    }, [googleClientId]);

    // Initialize Google Sign-In and render Google button when available
    useEffect(() => {
        if (!googleLoaded || !googleClientId || !googleBtnRef.current) return;

        try {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: async (response) => {
                    if (!response?.credential) {
                        setError("No credential returned from Google.");
                        return;
                    }
                    try {
                        setLoading(true);
                        setError("");
                        await loginWithGoogle(response.credential);
                    } catch (err) {
                        setError(err.message || "Failed to authenticate with Google.");
                    } finally {
                        setLoading(false);
                    }
                },
                cancel_on_tap_outside: true
            });

            window.google.accounts.id.renderButton(googleBtnRef.current, {
                type: "standard",
                theme: "filled_black",
                size: "large",
                text: isSignup ? "signup_with" : "continue_with",
                shape: "rectangular",
                width: 380,
                logo_alignment: "left"
            });
        } catch (err) {
            console.error("Error initializing Google Identity Services:", err);
        }
    }, [googleLoaded, googleClientId, isSignup, loginWithGoogle]);

    const handleCustomGoogleClick = () => {
        if (!googleClientId) {
            setError(
                "Google Sign-In is not configured. Please set VITE_GOOGLE_CLIENT_ID in client/.env."
            );
            return;
        }

        if (!window.google?.accounts?.id) {
            setError(
                "Unable to connect to Google Identity Services. Check your connection or ad blocker."
            );
            return;
        }

        // Trigger Google One Tap or Account Chooser prompt
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // If One Tap is skipped or blocked, user can click the rendered Google button
                setError(
                    "Please click the Google button below to select your Google account."
                );
            }
        });
    };

    const switchMode = () => {
        setMode(isSignup ? "login" : "signup");
        setError("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirm(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

        if (isSignup && password !== confirmPassword) {
            setError("Passwords don't match.");
            setLoading(false);
            return;
        }

        try {
            if (isSignup) {
                await signup(name, email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <section className="auth-card">
                <div className="hero">
                    <p className="eyebrow">SHIFT</p>

                    <h1>
                        {isSignup
                            ? "Momentum starts here"
                            : "Welcome back to the flow"}
                    </h1>

                    <p className="subtitle">
                        {isSignup
                            ? "Set up once, and never stare at a blank to-do list again."
                            : "Sign back in and pick up the momentum."}
                    </p>
                </div>

                {/* Google Sign-In Container */}
                <div className="google-auth-container">
                    <div className="google-btn-wrapper">
                        {/* Native Shift-designed button */}
                        <button
                            type="button"
                            className="google-auth-button"
                            onClick={handleCustomGoogleClick}
                            disabled={loading}
                            aria-label="Continue with Google"
                        >
                            <span className="google-icon-wrapper" aria-hidden="true">
                                <GoogleIcon />
                            </span>
                            <span className="google-btn-text">
                                {loading ? "Connecting..." : "Continue with Google"}
                            </span>
                        </button>

                        {/* Transparent Google Identity Services overlay to capture clicks and trigger GIS popup */}
                        {googleClientId && (
                            <div
                                ref={googleBtnRef}
                                className={`google-gis-overlay ${!googleLoaded ? "hidden" : ""}`}
                                aria-hidden="true"
                            />
                        )}
                    </div>
                </div>

                <div className="auth-divider">
                    <span>or continue with email</span>
                </div>

                <form className="task-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <div className="input-group">
                            <label>Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={
                                    isSignup
                                        ? "At least 6 characters"
                                        : "Your password"
                                }
                                autoComplete={
                                    isSignup
                                        ? "new-password"
                                        : "current-password"
                                }
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                onClick={() => setShowPassword((v) => !v)}
                            >
                                <EyeIcon open={showPassword} />
                            </button>
                        </div>
                    </div>

                    {isSignup && (
                        <div className="input-group">
                            <label>Confirm password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    aria-label={
                                        showConfirm
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    title={
                                        showConfirm
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    onClick={() => setShowConfirm((v) => !v)}
                                >
                                    <EyeIcon open={showConfirm} />
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <p className="message">{error}</p>}

                    <button
                        type="submit"
                        className="shift-button"
                        disabled={loading}
                    >
                        {loading
                            ? "..."
                            : isSignup
                              ? "SIGN UP →"
                              : "LOG IN →"}
                    </button>
                </form>

                <p className="auth-switch">
                    {isSignup
                        ? "Already in the flow?"
                        : "First time here?"}{" "}
                    <button
                        type="button"
                        className="text-button"
                        onClick={switchMode}
                    >
                        {isSignup ? "Log in" : "Sign up"}
                    </button>
                </p>
            </section>
        </div>
    );
}

export default Auth;
