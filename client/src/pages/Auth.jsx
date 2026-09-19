import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function Auth() {
    const { login, signup } = useAuth();

    const [mode, setMode] = useState("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const isSignup = mode === "signup";

    const switchMode = () => {
        setMode(isSignup ? "login" : "signup");
        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setLoading(true);

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
                        <input
                            type="password"
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
                    </div>

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
