// @ts-check
// Equivale a apiFetch de public/js/app.js: pone el token y trata la sesión vencida (RN-AUTH-09).

/** @returns {string | null} */
export function getToken() {
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
}

/**
 * @template T
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
export async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
}
