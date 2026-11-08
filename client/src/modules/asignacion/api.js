// @ts-check
import { apiFetch } from '../../api/client.js';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('./logica.js').DatosResultados} DatosResultados
 * @typedef {import('./logica.js').TurnoGuardado} TurnoGuardado
 * @typedef {import('./logica.js').Asignacion} Asignacion
 * @typedef {import('../../utils/reglasDia.js').ExtraDatos} ExtraDatos
 * @typedef {{ id: string, semana_inicio: string, semana_fin: string, total_turnos: number, asignados: number }} ProgramaEstado
 * @typedef {{ url: string, urlHoja?: string, sheetName: string, sheetId?: number, mensaje?: string }} ResultadoExportacion
 */

/** Programas con cuántos turnos tienen conductor. @returns {Promise<ProgramaEstado[]>} */
export async function programasConEstado() {
    const d = /** @type {{ programas: ProgramaEstado[] }} */ (await apiFetch('/api/programa-semanal/con-estado'));
    return d.programas || [];
}

/** Turnos de la semana con su conductor guardado. @param {string} semanaId @returns {Promise<TurnoGuardado[]>} */
export async function asignacionesDeSemana(semanaId) {
    const d = /** @type {{ asignaciones: TurnoGuardado[] }} */ (
        await apiFetch(`/api/asignacion/asignaciones/semana/${semanaId}`)
    );
    return d.asignaciones || [];
}

/**
 * Turnos con conductor y filas libres de la semana, con su formato, para armar la imagen PNG (RN-IMG-01).
 * @param {string} semanaId
 */
export async function datosParaImagen(semanaId) {
    const [turnos, extras] = await Promise.all([asignacionesDeSemana(semanaId), filasLibres(semanaId)]);
    return { turnos, extras };
}

/** Previsualización del algoritmo; no escribe (RN-ASIG-01). @param {string} semanaId @returns {Promise<DatosResultados>} */
export function ejecutarAlgoritmo(semanaId) {
    return apiFetch('/api/asignacion/asignar', { method: 'POST', body: JSON.stringify({ semana_id: semanaId }) });
}

/** RN-CONF-04. @param {string} semanaId @param {Asignacion[]} asignaciones */
export function confirmarAsignaciones(semanaId, asignaciones) {
    return apiFetch('/api/asignacion/confirmar', {
        method: 'POST',
        body: JSON.stringify({ semana_id: semanaId, asignaciones })
    });
}

/** Crea una pestaña nueva en el Sheet (RN-SHEET-02). @param {string} semanaId @returns {Promise<ResultadoExportacion>} */
export function exportarASheets(semanaId) {
    return apiFetch('/api/asignacion/exportar-sheets', {
        method: 'POST',
        body: JSON.stringify({ semana_id: semanaId })
    });
}

/** Quita conductores y el historial de la semana (RN-CONF-07). @param {string} semanaId */
export function limpiarAsignaciones(semanaId) {
    return apiFetch(`/api/asignacion/semana/${semanaId}`, { method: 'DELETE' });
}

/** @returns {Promise<Conductor[]>} */
export async function conductoresActivos() {
    try {
        const d = /** @type {{ conductores: Conductor[] }} */ (await apiFetch('/api/conductores'));
        return d.conductores || [];
    } catch {
        return [];
    }
}

/** Filas libres del programa (se muestran, no se asignan). @param {string} semanaId @returns {Promise<ExtraDatos[]>} */
export async function filasLibres(semanaId) {
    try {
        const d = /** @type {{ filas: ExtraDatos[] }} */ (await apiFetch(`/api/programa-semanal/${semanaId}/extras`));
        return d.filas || [];
    } catch {
        return [];
    }
}
