const API_URL = import.meta.env.VITE_API_URL;

const TOKEN_KEY = "shift_token";
const USER_KEY = "shift_user";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// Cached user lets the app render instantly on reload instead of blocking
// on /auth/me (which stalls on a cold-start backend).
export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
}

export function setStoredUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// fetch wrapper that attaches the Bearer token and JSON headers.
// On a 401 it clears the stored token and reloads so the app falls
// back to the login screen.
export async function apiFetch(path, options = {}) {
    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearToken();
        window.location.reload();
    }

    return response;
}

export default API_URL;
