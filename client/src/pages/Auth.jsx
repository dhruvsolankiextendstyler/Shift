import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Eye icon — two states: open (visible) and closed (slashed).
// Drawn in the same stroke style as the rest of Shift's icon set:
// fill:none, stroke:currentColor, strokeWidth 1.8, round caps/joins.
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
                // Eye open — show the iris circle
                <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            ) : (
                // Eye with a diagonal slash across it
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </>
            )}
        </svg>
    );
}

function Auth() {
    const { login, signup } = useAuth();

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

    const switchMode = () => {
        setMode(isSignup ? "login" : "signup");
        setError("");
        setConfirmPassword("");
        // Reset visibility when switching mode to keep passwords hidden by default.
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

                <form className="task-form" onSubmit={handleSubmit}>
                    {isSignup && (
                        <div className="input-group">
                            <label>Name</label>
                            <input
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
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
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
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
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
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
                                onClick={() =>
                                    setShowPassword((v) => !v)
                                }
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
                                    onClick={() =>
                                        setShowConfirm((v) => !v)
                                    }
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
