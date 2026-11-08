// @ts-check
// Fechas de la semana. Se leen como locales para evitar el desfase de zona horaria (RN-DATA-04).
import { DIAS } from './dias.js';

/** @typedef {import('../types/models').Dia} Dia */

/**
 * "2026-11-09" (o con hora) → Date local a medianoche. Equivale a parseLocalDate().
 * @param {string | null | undefined} texto
 * @returns {Date | null}
 */
export function parseLocalDate(texto) {
    if (!texto) return null;
    const partes = texto.split('T')[0].split('-');
    if (partes.length !== 3) return new Date(texto);
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

/**
 * Date → "YYYY-MM-DD" sin pasar por UTC.
 * @param {Date} fecha
 */
export function aISO(fecha) {
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
}

/**
 * "9 nov." como en formatDate() de la app anterior.
 * @param {string | null | undefined} texto
 */
export function formatDate(texto) {
    const fecha = parseLocalDate(texto);
    return fecha ? fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '';
}

/**
 * Fin de semana = inicio + 6 días (RN-PLAN-07).
 * @param {string} inicio YYYY-MM-DD
 */
export function finDeSemana(inicio) {
    const fecha = parseLocalDate(inicio);
    if (!fecha) return '';
    fecha.setDate(fecha.getDate() + 6);
    return aISO(fecha);
}

/**
 * Fecha corta del día dentro de la semana que empieza en `inicio` ("9 nov.").
 * @param {string | null | undefined} inicio
 * @param {Dia} dia
 */
export function fechaDelDia(inicio, dia) {
    const fecha = parseLocalDate(inicio);
    if (!fecha) return '';
    fecha.setDate(fecha.getDate() + DIAS.indexOf(dia));
    return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}
