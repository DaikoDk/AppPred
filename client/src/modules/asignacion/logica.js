// @ts-check
// Lógica pura de la pantalla Asignación (sin DOM), equivalente a public/js/app.js.
import { DIAS, nombreDia } from '../../utils/dias.js';
import { GRUPO_LABEL } from '../../utils/constantes.js';
import { parseLocalDate } from '../../utils/fechas.js';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../utils/reglasDia.js').ExtraDatos} ExtraDatos
 * @typedef {{ id: string, nombre: string, grupo: string }} ConductorAsignado
 * @typedef {{
 *   turno_id: string, dia: string, hora: string, grupo: string,
 *   territorio: string | null, punto_reunion: string | null,
 *   asignado: boolean, conductor_asignado?: ConductorAsignado | null
 * }} Resultado
 * @typedef {{
 *   resumen: { total_turnos: number, asignados: number, sin_asignar: number, conductores_utilizados: number },
 *   resultados: Resultado[],
 *   disponibilidad?: string[]
 * }} DatosResultados
 * @typedef {{
 *   id: string, dia: string, hora: string, grupo: string, territorio: string | null,
 *   punto_reunion: string | null, conductor_id: string | null,
 *   formato?: import('../../types/models').Formato | null,
 *   conductores?: ConductorAsignado | null
 * }} TurnoGuardado
 * @typedef {{ turno_id: string, conductor_id: string, conductor_nombre: string, cantidad_semanal?: number }} Asignacion
 * @typedef {{ tipo: 'extra', dia: Dia, extra: ExtraDatos } | { tipo: 'turno', dia: Dia, resultado: Resultado }} FilaResultado
 */

const ORDEN_FRANJA = /** @type {Record<string, number>} */ ({
    'Madrugada (6:30 AM)': 0,
    'Mañana (8:20 AM)': 1,
    'Mañana (8:50 AM)': 2,
    'Tarde (6:20 PM)': 3,
    'Domingo (10:20 AM)': 4
});

/** Resultados a partir de lo guardado en la base (verAsignacion / cargarAsignacionesExistentes). @param {TurnoGuardado[]} asignaciones @returns {DatosResultados} */
export function resultadosGuardados(asignaciones) {
    const conConductor = asignaciones.filter((a) => a.conductor_id);
    return {
        resumen: {
            total_turnos: asignaciones.length,
            asignados: conConductor.length,
            sin_asignar: asignaciones.length - conConductor.length,
            conductores_utilizados: new Set(conConductor.map((a) => a.conductor_id)).size
        },
        resultados: asignaciones.map((t) => ({
            turno_id: t.id,
            dia: t.dia,
            hora: t.hora,
            grupo: t.grupo,
            territorio: t.territorio,
            punto_reunion: t.punto_reunion,
            asignado: !!t.conductor_id,
            conductor_asignado: t.conductores
                ? { id: t.conductores.id, nombre: t.conductores.nombre, grupo: t.conductores.grupo }
                : null
        }))
    };
}

/**
 * Filas de la tabla: por día, libres "antes", turnos ordenados por franja y libres "después"
 * (renderResultadosTable). Las libres ya vienen normalizadas.
 * @param {Resultado[]} resultados @param {ExtraDatos[]} extras @returns {FilaResultado[]}
 */
export function filasDeResultados(resultados, extras) {
    /** @type {Record<string, Resultado[]>} */
    const porDia = {};
    for (const r of resultados) (porDia[r.dia || 'OTRO'] ??= []).push(r);
    for (const lista of Object.values(porDia))
        lista.sort((a, b) => (ORDEN_FRANJA[a.hora] ?? 99) - (ORDEN_FRANJA[b.hora] ?? 99));

    /** @type {FilaResultado[]} */
    const filas = [];
    for (const dia of DIAS) {
        const libres = extras.filter((e) => e.dia === dia).sort((a, b) => (a.orden || 0) - (b.orden || 0));
        libres.filter((e) => (e.orden || 0) < 0).forEach((extra) => filas.push({ tipo: 'extra', dia, extra }));
        (porDia[dia] || []).forEach((resultado) => filas.push({ tipo: 'turno', dia, resultado }));
        libres.filter((e) => (e.orden || 0) >= 0).forEach((extra) => filas.push({ tipo: 'extra', dia, extra }));
    }
    return filas;
}

/** Veces que aparece cada conductor en los resultados. @param {Resultado[]} resultados */
export function contarAsignaciones(resultados) {
    /** @type {Record<string, number>} */
    const cuenta = {};
    for (const r of resultados) {
        const id = r.conductor_asignado?.id;
        if (id) cuenta[id] = (cuenta[id] || 0) + 1;
    }
    return cuenta;
}

/**
 * Texto de la opción: "(n)" si ya tiene turnos esta semana; "(-99)" si no está disponible en ese horario.
 * @param {Conductor} c @param {Resultado} r @param {Record<string, number>} cuenta @param {Set<string>} disponibles
 */
export function opcionConductor(c, r, cuenta, disponibles) {
    const n = cuenta[c.id] || 0;
    const disponible = disponibles.has(`${c.id}|${r.dia}|${r.hora}`);
    let texto = c.nombre;
    if (n > 0) texto += ` (${n})`;
    else if (!disponible) texto += ' (-99)';
    return { valor: `${c.id}|${c.nombre}`, texto, noDisponible: n === 0 && !disponible };
}

/** Valor inicial de la lista de un turno ('' = SIN ASIGNAR). @param {Resultado} r @param {Conductor[]} conductores */
export function eleccionInicial(r, conductores) {
    const a = r.conductor_asignado;
    if (!a?.id) return '';
    const c = conductores.find((x) => x.id === a.id);
    return `${a.id}|${c ? c.nombre : a.nombre}`;
}

/** Contadores tras elegir a mano (actualizarFilaConductor). @param {string[]} elecciones valores de los turnos */
export function contadores(elecciones) {
    const elegidos = elecciones.filter(Boolean);
    return {
        asignados: elegidos.length,
        sin_asignar: elecciones.length - elegidos.length,
        conductores: new Set(elegidos.map((v) => v.split('|')[0])).size
    };
}

/**
 * Lo que se envía al confirmar: solo turnos con conductor (RN-CONF-01) y cuántos turnos tiene
 * cada uno en la semana (RN-CONF-04).
 * @param {{ turnoId: string, valor: string }[]} elecciones
 * @returns {Asignacion[]}
 */
export function cuerpoConfirmar(elecciones) {
    /** @type {Asignacion[]} */
    const asignaciones = [];
    /** @type {Record<string, number>} */
    const cuenta = {};
    for (const { turnoId, valor } of elecciones) {
        if (!valor) continue;
        const [id, nombre] = valor.split('|');
        if (!id) continue;
        cuenta[id] = (cuenta[id] || 0) + 1;
        asignaciones.push({ turno_id: turnoId, conductor_id: id, conductor_nombre: nombre });
    }
    return asignaciones.map((a) => ({ ...a, cantidad_semanal: cuenta[a.conductor_id] }));
}

/**
 * Turnos con Territorio vacío para el aviso al guardar; las filas libres no cuentan (RN-CONF-03).
 * @param {Resultado[]} resultadosEnOrden turnos en el orden de la tabla
 * @param {string | undefined} semanaInicio
 */
export function turnosSinTerritorio(resultadosEnOrden, semanaInicio) {
    const inicio = parseLocalDate(semanaInicio);
    const vacio = (/** @type {string} */ t) => {
        const v = (t || '').trim();
        return v === '' || v === '—';
    };
    return resultadosEnOrden
        .filter((r) => vacio(r.territorio || '—'))
        .map((r) => {
            const dia = /** @type {Dia} */ (r.dia);
            let fecha = '';
            if (inicio) {
                const d = new Date(inicio);
                d.setDate(d.getDate() + Math.max(0, DIAS.indexOf(dia)));
                fecha = ' ' + d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '');
            }
            const grupo = etiquetaGrupo(r.grupo).trim();
            return `${nombreDia(dia)}${fecha} · ${(r.hora || '').trim()}${grupo ? ' · ' + grupo : ''}`;
        });
}

/** @param {string | null | undefined} grupo */
export function etiquetaGrupo(grupo) {
    return GRUPO_LABEL[/** @type {keyof typeof GRUPO_LABEL} */ (grupo)] || grupo || '';
}
