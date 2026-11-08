// @ts-check
// Fechas del calendario. Todo en hora local para que "2026-11-09" no se corra de día (RN-DATA-04).
import { aISO, parseLocalDate } from './fechas.js';

/** Cuadrícula de 6 semanas que empiezan en lunes. @param {Date} mes cualquier día del mes que se muestra @returns {Date[]} */
export function diasDeCuadricula(mes) {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const desplaza = (primero.getDay() + 6) % 7; // 0 = lunes
    return Array.from({ length: 42 }, (_, i) => new Date(primero.getFullYear(), primero.getMonth(), 1 - desplaza + i));
}

/** @param {Date} d */
export function inicioDeMes(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Suma meses sin pasarse del último día del destino (31 de enero + 1 mes = 28 o 29 de febrero). @param {Date} d @param {number} n */
export function sumarMeses(d, n) {
    const destino = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(d.getDate(), ultimo));
    return destino;
}

/** @param {Date} d @param {number} n */
export function sumarDias(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** @param {string | null | undefined} iso "YYYY-MM-DD" @returns {Date | null} */
export function fechaDeISO(iso) {
    if (!iso) return null;
    const d = parseLocalDate(iso);
    return d && !Number.isNaN(d.getTime()) ? d : null;
}

/** @param {Date} a @param {Date} b */
export function mismoDia(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "noviembre de 2026" @param {Date} d */
export function tituloMes(d) {
    return d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
}

/** "9 de noviembre de 2026", para lectores de pantalla @param {Date} d */
export function etiquetaLarga(d) {
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "09/11/2026" para mostrar en el campo; vacío si no hay fecha. @param {string | null | undefined} iso */
export function formatoCorto(iso) {
    const d = fechaDeISO(iso);
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Hoy en formato "YYYY-MM-DD". */
export function hoyISO() {
    return aISO(new Date());
}
