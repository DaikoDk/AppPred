// @ts-check
import { apiFetch } from '../../api/client.js';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {{ dia: Dia, hora: string, disponible: boolean }} Disponibilidad
 * @typedef {Pick<Conductor, 'nombre' | 'grupo' | 'tiene_pc' | 'poca_movilidad' | 'solo_parque' | 'ubicacion_casa'>} DatosConductor
 */

/** Solo activos, ordenados por nombre (RN-COND-03). @returns {Promise<Conductor[]>} */
export async function listarConductores() {
    const d = /** @type {{ conductores: Conductor[] }} */ (await apiFetch('/api/conductores'));
    return d.conductores || [];
}

/** @param {DatosConductor} datos @returns {Promise<Conductor>} */
export async function crearConductor(datos) {
    const d = /** @type {{ conductor: Conductor }} */ (
        await apiFetch('/api/conductores', { method: 'POST', body: JSON.stringify(datos) })
    );
    return d.conductor;
}

/** @param {string} id @param {Partial<DatosConductor>} cambios */
export function actualizarConductor(id, cambios) {
    return apiFetch(`/api/conductores/${id}`, { method: 'PUT', body: JSON.stringify(cambios) });
}

/** "Eliminar" = desactivar (RN-COND-02). @param {string} id */
export function desactivarConductor(id) {
    return apiFetch(`/api/conductores/${id}`, { method: 'DELETE' });
}

/** @param {string} id @returns {Promise<Disponibilidad[]>} */
export async function obtenerDisponibilidad(id) {
    const d = /** @type {{ disponibilidad: Disponibilidad[] }} */ (
        await apiFetch(`/api/conductores/${id}/disponibilidad`)
    );
    return d.disponibilidad || [];
}

/** Upsert por (conductor, día, franja) (RN-COND-04). @param {string} id @param {Disponibilidad[]} disponibilidad */
export function guardarDisponibilidad(id, disponibilidad) {
    return apiFetch(`/api/conductores/${id}/disponibilidad`, {
        method: 'PUT',
        body: JSON.stringify({ disponibilidad })
    });
}
