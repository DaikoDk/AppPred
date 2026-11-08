// @ts-check
import { apiFetch } from './client.js';

/** @typedef {import('../types/models').Usuario} Usuario */

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

/** @returns {Usuario | null} */
export function leerUsuarioGuardado() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_USUARIO) || 'null');
    } catch {
        return null;
    }
}

/**
 * @param {string} token
 * @param {Usuario} usuario
 */
export function guardarSesion(token, usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function borrarSesion() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
}

/** Lanza si el token no es válido. */
export function validarSesion() {
    return apiFetch('/api/auth/validate');
}

/**
 * Intercambia el access_token de Supabase por el JWT propio (RN-AUTH-01).
 * @param {string} accessToken
 * @returns {Promise<{ token: string, usuario: Usuario }>}
 */
export function iniciarSesionConGoogle(accessToken) {
    return apiFetch('/api/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify({ access_token: accessToken })
    });
}

// Super admin = el endpoint de correos autorizados responde (RN-AUTH-04).
export async function consultarEsSuperAdmin() {
    try {
        await apiFetch('/api/auth/allowed-emails');
        return true;
    } catch {
        return false;
    }
}
