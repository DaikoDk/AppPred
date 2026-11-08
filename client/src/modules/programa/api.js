// @ts-check
import { apiFetch } from '../../api/client.js';
import { TEMPLATE_ID } from '../../utils/constantes.js';

/**
 * @typedef {import('../../types/models').Programa} Programa
 * @typedef {import('../../types/models').PuntoReunion} PuntoReunion
 * @typedef {{ turnos: object[], filasExtra?: object[], semana_inicio: string, semana_fin: string }} CuerpoPrograma
 */

/** Programas guardados, sin la plantilla (RN-PLAN-01). @returns {Promise<Programa[]>} */
export async function listarProgramas() {
    const d = /** @type {{ programas: Programa[] }} */ (await apiFetch('/api/programa-semanal'));
    return d.programas || [];
}

/** @param {string} id @returns {Promise<Programa>} */
export async function obtenerPrograma(id) {
    const d = /** @type {{ programa: Programa }} */ (await apiFetch(`/api/programa-semanal/${id}`));
    return d.programa;
}

/** Se crea con los valores por defecto si no existe (RN-PLAN-02). @returns {Promise<Programa>} */
export async function obtenerPlantilla() {
    const d = /** @type {{ programa: Programa }} */ (await apiFetch('/api/programa-semanal/plantilla'));
    return d.programa;
}

/** @param {CuerpoPrograma} cuerpo */
export function crearPrograma(cuerpo) {
    return apiFetch('/api/programa-semanal', { method: 'POST', body: JSON.stringify(cuerpo) });
}

/** Reemplaza todos los turnos y filas: se pierden las asignaciones (RN-PROG-04). @param {string} id @param {CuerpoPrograma} cuerpo */
export function actualizarPrograma(id, cuerpo) {
    return apiFetch(`/api/programa-semanal/${id}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
}

/** @param {CuerpoPrograma} cuerpo */
export function guardarPlantilla(cuerpo) {
    return actualizarPrograma(TEMPLATE_ID, cuerpo);
}

/** @param {string} id */
export function eliminarPrograma(id) {
    return apiFetch(`/api/programa-semanal/${id}`, { method: 'DELETE' });
}

/** Vuelve a los valores por defecto (RN-PLAN-03). */
export function restablecerPlantilla() {
    return apiFetch('/api/programa-semanal/plantilla', { method: 'POST' });
}

/** Nombres de los puntos activos para la lista desplegable. @returns {Promise<string[]>} */
export async function nombresDePuntos() {
    try {
        const d = /** @type {{ puntos: PuntoReunion[] }} */ (await apiFetch('/api/puntos-reunion'));
        return (d.puntos || []).map((p) => p.nombre);
    } catch {
        return [];
    }
}
