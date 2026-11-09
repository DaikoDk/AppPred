"use strict";

// Historial que usa el algoritmo de asignación (RN-ASIG-05 y RN-ASIG-06, ADR-024).
// Se miran las últimas semanas CON asignación anteriores a la semana que se asigna, por la fecha de la semana
// (semana_inicio) y no por la fecha en que se confirmó.

const SEMANAS_HISTORIAL = 4;

/**
 * Suma los turnos de cada conductor en las últimas `semanas` semanas asignadas anteriores a `semanaInicio`
 * y devuelve la semana de su última asignación. Función pura (sin base de datos).
 * @param {{ semana_id: string, conductor_id: string, cantidad_turnos: number }[]} filas filas de asignaciones_historial
 * @param {Record<string, string>} inicioPorSemana semana_inicio (YYYY-MM-DD) de cada semana_id
 * @param {string} semanaInicio semana que se está asignando (YYYY-MM-DD)
 * @param {number} [semanas]
 * @returns {{ histTotales: Record<string, number>, ultimaAsignacion: Record<string, string> }}
 */
function resumenHistorial(filas, inicioPorSemana, semanaInicio, semanas = SEMANAS_HISTORIAL) {
    // Una fila sin programa (ya borrado) no se puede ubicar en el tiempo y se ignora
    const previas = (filas || []).filter(f => {
        const inicio = inicioPorSemana[f.semana_id];
        return inicio && inicio < semanaInicio;
    });
    const dentro = new Set(
        [...new Set(previas.map(f => inicioPorSemana[f.semana_id]))].sort().reverse().slice(0, semanas)
    );

    /** @type {Record<string, number>} */
    const histTotales = {};
    /** @type {Record<string, string>} */
    const ultimaAsignacion = {};
    for (const f of previas) {
        const inicio = inicioPorSemana[f.semana_id];
        if (!dentro.has(inicio)) continue;
        histTotales[f.conductor_id] = (histTotales[f.conductor_id] || 0) + (f.cantidad_turnos || 0);
        if (!ultimaAsignacion[f.conductor_id] || inicio > ultimaAsignacion[f.conductor_id]) {
            ultimaAsignacion[f.conductor_id] = inicio;
        }
    }
    return { histTotales, ultimaAsignacion };
}

/**
 * Lee el historial de la base y lo resume para la semana que se asigna.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} semanaInicio
 */
async function cargarHistorial(supabase, semanaInicio) {
    const { data: filas } = await supabase
        .from('asignaciones_historial')
        .select('semana_id, conductor_id, cantidad_turnos');
    const ids = [...new Set((filas || []).map(f => f.semana_id).filter(Boolean))];
    /** @type {Record<string, string>} */
    const inicioPorSemana = {};
    if (ids.length > 0) {
        const { data: programas } = await supabase.from('programa_semanal').select('id, semana_inicio').in('id', ids);
        (programas || []).forEach(p => { inicioPorSemana[p.id] = p.semana_inicio; });
    }
    return resumenHistorial(filas || [], inicioPorSemana, semanaInicio);
}

module.exports = { SEMANAS_HISTORIAL, resumenHistorial, cargarHistorial };
