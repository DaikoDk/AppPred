// @ts-check
import { apiFetch } from '../../api/client.js';

/**
 * @typedef {{
 *   id: string,
 *   email: string,
 *   is_super_admin: boolean,
 *   added_by: string | null,
 *   created_at: string | null
 * }} CorreoAutorizado
 */

/** Solo super admins (RN-AUTH-04). @returns {Promise<CorreoAutorizado[]>} */
export function listarCorreos() {
    return apiFetch('/api/auth/allowed-emails');
}

/** @param {string} email */
export function agregarCorreo(email) {
    return apiFetch('/api/auth/allowed-emails', { method: 'POST', body: JSON.stringify({ email }) });
}

/** @param {string} id */
export function eliminarCorreo(id) {
    return apiFetch(`/api/auth/allowed-emails/${id}`, { method: 'DELETE' });
}

/** @param {string} id */
export function alternarSuperAdmin(id) {
    return apiFetch(`/api/auth/allowed-emails/${id}/toggle-admin`, { method: 'PUT' });
}

/** @returns {Promise<{ message?: string }>} */
export function renunciarSuperAdmin() {
    return apiFetch('/api/auth/allowed-emails/renounce', { method: 'POST' });
}
