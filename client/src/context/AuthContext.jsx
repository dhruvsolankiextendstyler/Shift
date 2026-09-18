import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";
import API_URL, {
    apiFetch,
    getToken,
    setToken,
    clearToken
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On load, if we have a token, confirm it's still valid.
    useEffect(() => {
        const token = getToken();

        if (!token) {
            setLoading(false);
            return;
        }

        apiFetch("/auth/me")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.user) {
                    setUser(data.user);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const authenticate = async (path, body) => {
        const response = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong");
        }

        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const login = (email, password) =>
        authenticate("/auth/login", { email, password });

    const signup = (name, email, password) =>
        authenticate("/auth/register", { name, email, password });

    const logout = () => {
        clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, login, signup, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}
