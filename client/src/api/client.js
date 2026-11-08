// @ts-check
// Equivale a apiFetch de public/js/app.js: pone el token y avisa cuando la sesión venció (RN-AUTH-09).
// Cada petición cuenta como actividad para el indicador de carga (utils/actividad.js).
import { iniciarActividad, terminarActividad } from '../utils/actividad.js';

export const EVENTO_SESION_VENCIDA = 'sesion-vencida';

// El backend responde 401/403 con estos textos cuando el JWT falta o venció. Otros 403
// (por ejemplo "se requiere super admin") NO son sesión vencida (RN-AUTH-04).
const ERRORES_DE_TOKEN = ['Token requerido', 'Token inválido'];

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
    iniciarActividad();
    try {
        const res = await fetch(url, { ...options, headers });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if ((res.status === 401 || res.status === 403) && ERRORES_DE_TOKEN.includes(data.error)) {
                window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA));
            }
            throw new Error(data.error || `Error ${res.status}`);
        }
        return data;
    } finally {
        terminarActividad();
    }
}
