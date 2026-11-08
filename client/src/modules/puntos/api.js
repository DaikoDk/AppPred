// @ts-check
import { apiFetch } from '../../api/client.js';

/**
 * @typedef {import('../../types/models').PuntoReunion} PuntoReunion
 * @typedef {{ nombre: string, ubicacion: string | null }} DatosPunto
 */

/** Solo activos, ordenados por nombre. @returns {Promise<PuntoReunion[]>} */
export async function listarPuntos() {
    const d = /** @type {{ puntos: PuntoReunion[] }} */ (await apiFetch('/api/puntos-reunion'));
    return d.puntos || [];
}

/** @param {DatosPunto} datos */
export function crearPunto(datos) {
    return apiFetch('/api/puntos-reunion', { method: 'POST', body: JSON.stringify(datos) });
}

/** Un punto fijo no se puede modificar (RN-PUNT-02). @param {string} id @param {DatosPunto} datos */
export function actualizarPunto(id, datos) {
    return apiFetch(`/api/puntos-reunion/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
}

/** "Eliminar" = desactivar (RN-PUNT-03). @param {string} id */
export function desactivarPunto(id) {
    return apiFetch(`/api/puntos-reunion/${id}`, { method: 'DELETE' });
}
