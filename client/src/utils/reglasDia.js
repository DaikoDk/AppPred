// @ts-check
// Reglas de día del programa, compartidas por Programa y Asignación.

/**
 * @typedef {import('../types/models').Dia} Dia
 * @typedef {import('../types/models').Formato} Formato
 * Datos como vienen de la API o de la plantilla (campos opcionales y nulos).
 * @typedef {{ dia: string, hora?: string | null, grupo?: string | null, territorio?: string | null,
 *   punto_reunion?: string | null, modalidad?: string | null, formato?: Formato | null }} TurnoDatos
 * @typedef {{ dia: string, hora?: string | null, grupo?: string | null, territorio?: string | null,
 *   punto_reunion?: string | null, conductor?: string | null, orden?: number | null,
 *   formato?: Formato | null }} ExtraDatos
 */

/** El turno "Domingo (10:20 AM)" siempre es del domingo (RN-PLAN-04) (diaDeTurno). @param {TurnoDatos} t @returns {Dia} */
export function diaDeTurno(t) {
    return /** @type {Dia} */ (/^Domingo/i.test(t.hora || '') ? 'DOMINGO' : t.dia);
}

/** La reunión de fin de semana va el domingo (RN-PLAN-05) (diaDeExtra). @param {ExtraDatos} e @returns {Dia} */
export function diaDeExtra(e) {
    return /** @type {Dia} */ (/fin de semana/i.test(e.punto_reunion || '') ? 'DOMINGO' : e.dia);
}

/** ...y antes de los turnos de ese día (normalizarExtras). @param {ExtraDatos[] | null | undefined} extras */
export function normalizarExtras(extras) {
    return (extras || []).map((e) => {
        const dia = diaDeExtra(e);
        return dia === e.dia ? e : { ...e, dia, orden: -1 };
    });
}
