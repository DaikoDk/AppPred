// @ts-check
// Valores cerrados del dominio (docs/REGLAS-NEGOCIO.md, sección Dominio). Copiados de public/js/app.js.

/**
 * @typedef {import('../types/models').GrupoTurno} GrupoTurno
 * @typedef {import('../types/models').Modalidad} Modalidad
 */

/** Id fijo de la plantilla; se excluye de los listados (ADR-006, RN-PLAN-01). */
export const TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

/** Franjas horarias en orden. El texto exacto se usa como clave de disponibilidad (RN-COND-04). */
export const FRANJAS = [
    'Madrugada (6:30 AM)',
    'Mañana (8:20 AM)',
    'Mañana (8:50 AM)',
    'Tarde (6:20 PM)',
    'Domingo (10:20 AM)'
];

/** @type {GrupoTurno[]} */
export const GRUPOS = ['TODA LA CONGREGACION', 'GRUPO A', 'GRUPO B'];

/** @type {Record<GrupoTurno, string>} */
export const GRUPO_LABEL = {
    'TODA LA CONGREGACION': 'Toda la Congre.',
    'GRUPO A': 'Grupo A',
    'GRUPO B': 'Grupo B'
};

/** @type {Modalidad[]} */
export const MODALIDADES = ['FISICO', 'ZOOM', 'CARTAS'];

/** Puntos de reunión con efecto en el algoritmo; el nombre debe coincidir exacto (RN-PUNT-04). */
export const PUNTO_ZOOM = 'ZOOM';
export const PUNTO_PARQUE_LAS_VEGAS = 'PARQUE LAS VEGAS';
