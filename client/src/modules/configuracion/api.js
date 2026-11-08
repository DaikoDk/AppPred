// @ts-check
import { apiFetch } from '../../api/client.js';

/** @typedef {{ spreadsheet_id?: string, spreadsheet_url?: string }} Configuracion */

/** Solo super admins (RN-AUTH-04). @returns {Promise<Configuracion>} */
export function obtenerConfiguracion() {
    return apiFetch('/api/auth/config');
}

/** @param {string} spreadsheetId */
export function guardarSpreadsheetId(spreadsheetId) {
    return apiFetch('/api/auth/config', {
        method: 'PUT',
        body: JSON.stringify({ key: 'spreadsheet_id', value: spreadsheetId })
    });
}

/**
 * Acepta la URL completa del Sheet o solo el ID.
 * @param {string} entrada
 */
export function extraerSpreadsheetId(entrada) {
    const m = entrada.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : entrada;
}
