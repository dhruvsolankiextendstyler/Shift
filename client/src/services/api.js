const API_URL = import.meta.env.VITE_API_URL;

const TOKEN_KEY = "shift_token";

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
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
