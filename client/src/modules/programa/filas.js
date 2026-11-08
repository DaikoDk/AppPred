// @ts-check
// Modelo del editor de turnos. En la app anterior el estado vive en la tabla del DOM (ADR-014);
// aquí es una lista ordenada de filas en memoria y la tabla solo la dibuja.
// Cada función replica a su equivalente de public/js/app.js (se indica entre paréntesis).
import { DIAS } from '../../utils/dias.js';
import { FRANJAS } from '../../utils/constantes.js';
import { diaDeExtra, diaDeTurno, normalizarExtras } from '../../utils/reglasDia.js';

/**
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').Formato} Formato
 * @typedef {import('../../types/models').FormatoCelda} FormatoCelda
 * @typedef {import('../../types/models').CampoFormato} CampoFormato
 *
 * @typedef {{
 *   clave: string, tipo: 'turno', dia: Dia,
 *   hora: string, grupo: string, territorio: string, punto_reunion: string, modalidad: string,
 *   formato: Formato
 * }} FilaTurno
 * @typedef {{
 *   clave: string, tipo: 'extra', dia: Dia, antes: boolean,
 *   hora: string, grupo: string, territorio: string, punto_reunion: string, conductor: string,
 *   formato: Formato
 * }} FilaLibre
 * @typedef {FilaTurno | FilaLibre} Fila
 *
 * @typedef {import('../../utils/reglasDia.js').TurnoDatos} TurnoDatos
 * @typedef {import('../../utils/reglasDia.js').ExtraDatos} ExtraDatos
 */

/** Turnos por defecto cuando no hay plantilla (DEFAULT_TURNOS del front; incluye Sábado y Domingo). */
export const TURNOS_POR_DEFECTO = /** @type {const} */ ([
    { dia: 'LUNES', hora: 'Mañana (8:20 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'LUNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'JUEVES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'VIERNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'SABADO', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'DOMINGO', hora: 'Domingo (10:20 AM)', grupo: 'TODA LA CONGREGACION' }
]);

// Reglas de día compartidas con Asignación (RN-PLAN-04/05)
export { diaDeTurno, diaDeExtra, normalizarExtras };

// ---------------------------------------------------------------- creación de filas

let contador = 0;
const nuevaClave = () => `f${++contador}`;

/** @param {Dia} dia @param {Partial<TurnoDatos>} [d] @returns {FilaTurno} */
export function nuevaFilaTurno(dia, d = {}) {
    return {
        clave: nuevaClave(),
        tipo: 'turno',
        dia,
        hora: d.hora || FRANJAS[0],
        grupo: d.grupo || 'TODA LA CONGREGACION',
        territorio: d.territorio || '',
        punto_reunion: d.punto_reunion || '',
        modalidad: d.modalidad || 'FISICO',
        formato: d.formato || {}
    };
}

/** @param {Dia} dia @param {boolean} antes @param {Partial<ExtraDatos>} [d] @returns {FilaLibre} */
export function nuevaFilaLibre(dia, antes, d = {}) {
    return {
        clave: nuevaClave(),
        tipo: 'extra',
        dia,
        antes,
        hora: d.hora || '',
        grupo: d.grupo || '',
        territorio: d.territorio || '',
        punto_reunion: d.punto_reunion || '',
        conductor: d.conductor || '',
        formato: d.formato || {}
    };
}

/**
 * Filas en el orden de la tabla: por día, primero las libres "antes", luego los turnos y al final
 * las libres "después" (renderTurnosDesdeDatos).
 * @param {TurnoDatos[]} turnos
 * @param {ExtraDatos[]} extras
 * @returns {Fila[]}
 */
export function filasDesdeDatos(turnos, extras) {
    const libres = normalizarExtras(extras);
    /** @type {Fila[]} */
    const filas = [];
    for (const dia of DIAS) {
        const deDia = libres.filter((e) => e.dia === dia).sort((a, b) => (a.orden || 0) - (b.orden || 0));
        deDia.filter((e) => (e.orden || 0) < 0).forEach((e) => filas.push(nuevaFilaLibre(dia, true, e)));
        turnos.filter((t) => diaDeTurno(t) === dia).forEach((t) => filas.push(nuevaFilaTurno(dia, t)));
        deDia.filter((e) => (e.orden || 0) >= 0).forEach((e) => filas.push(nuevaFilaLibre(dia, false, e)));
    }
    return filas;
}

/**
 * Programa guardado: los turnos se ordenan por día, franja y grupo (editarPrograma).
 * @param {TurnoDatos[]} turnos
 * @param {ExtraDatos[]} extras
 */
export function filasDeProgramaGuardado(turnos, extras) {
    const ordenados = turnos
        .map((t) => ({ ...t, dia: diaDeTurno(t) }))
        .sort(
            (a, b) =>
                DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) ||
                FRANJAS.indexOf(a.hora || '') - FRANJAS.indexOf(b.hora || '') ||
                (a.grupo || '').localeCompare(b.grupo || '')
        );
    return filasDesdeDatos(ordenados, extras);
}

/** Sin plantilla: turnos por defecto y filas libres en Martes, Sábado (2) y Domingo antes (renderEmptyTurnosGrid). */
export function filasPorDefecto() {
    return filasDesdeDatos(
        TURNOS_POR_DEFECTO.map((t) => ({ ...t })),
        [
            { dia: 'MARTES', orden: 0 },
            { dia: 'SABADO', orden: 0 },
            { dia: 'SABADO', orden: 0 },
            { dia: 'DOMINGO', orden: -1 }
        ]
    );
}

// ---------------------------------------------------------------- edición

/** @param {Fila[]} filas @param {string} clave @param {Fila} nueva @param {'antes' | 'despues'} lado */
function insertarJunto(filas, clave, nueva, lado) {
    const i = filas.findIndex((f) => f.clave === clave);
    if (i < 0) return filas;
    const pos = lado === 'antes' ? i : i + 1;
    return [...filas.slice(0, pos), nueva, ...filas.slice(pos)];
}

/** Botón "+": turno nuevo del mismo día, debajo de la fila (agregarFilaTurnoDesde). @param {Fila[]} filas @param {string} clave */
export function agregarTurnoDebajo(filas, clave) {
    const ref = filas.find((f) => f.clave === clave);
    return ref ? insertarJunto(filas, clave, nuevaFilaTurno(ref.dia), 'despues') : filas;
}

/** Flechas: fila libre arriba o abajo (agregarFilaExtraDesde). @param {Fila[]} filas @param {string} clave @param {boolean} arriba */
export function agregarLibreJunto(filas, clave, arriba) {
    const ref = filas.find((f) => f.clave === clave);
    return ref ? insertarJunto(filas, clave, nuevaFilaLibre(ref.dia, arriba), arriba ? 'antes' : 'despues') : filas;
}

/**
 * Turno nuevo al final de un día; si el día no tiene filas, antes del siguiente día con filas
 * (agregarTurnoDiaVista → insertAfterDay).
 * @param {Fila[]} filas @param {Dia} dia
 */
export function agregarTurnoAlDia(filas, dia) {
    const nueva = nuevaFilaTurno(dia);
    const ultima = filas.map((f) => f.dia).lastIndexOf(dia);
    if (ultima >= 0) return [...filas.slice(0, ultima + 1), nueva, ...filas.slice(ultima + 1)];
    const siguiente = filas.findIndex((f) => DIAS.indexOf(f.dia) > DIAS.indexOf(dia));
    if (siguiente >= 0) return [...filas.slice(0, siguiente), nueva, ...filas.slice(siguiente)];
    return [...filas, nueva];
}

/** @param {Fila[]} filas @param {string} clave */
export function quitarFila(filas, clave) {
    return filas.filter((f) => f.clave !== clave);
}

/** @param {Fila[]} filas @param {string} clave @param {Partial<FilaTurno> | Partial<FilaLibre>} cambio */
export function cambiarFila(filas, clave, cambio) {
    return filas.map((f) => (f.clave === clave ? /** @type {Fila} */ ({ ...f, ...cambio }) : f));
}

// ---------------------------------------------------------------- lectura

/** Filas tal como están, con campos de texto (leerFilasEditor). @param {Fila[]} filas */
export function leerFilas(filas) {
    const turnos = filas
        .filter((f) => f.tipo === 'turno')
        .map((f) => ({
            dia: f.dia,
            hora: f.hora,
            grupo: f.grupo,
            territorio: f.territorio,
            punto_reunion: f.punto_reunion,
            modalidad: f.modalidad || 'FISICO',
            formato: f.formato
        }));
    const extras = filas
        .filter((f) => f.tipo === 'extra')
        .map((f) => ({
            dia: f.dia,
            hora: f.hora,
            grupo: f.grupo,
            territorio: f.territorio,
            punto_reunion: f.punto_reunion,
            conductor: f.conductor,
            orden: f.antes ? -1 : 0,
            formato: f.formato
        }));
    return { turnos, extras };
}

/**
 * Cuerpo para guardar (guardarPrograma): turnos sin grupo se omiten, vacíos a null (RN-PROG-05)
 * y `filasExtra` solo si hay alguna.
 * @param {Fila[]} filas
 */
export function cuerpoParaGuardar(filas) {
    const { turnos, extras } = leerFilas(filas);
    return {
        turnos: turnos
            .filter((t) => t.grupo)
            .map((t) => ({ ...t, territorio: t.territorio || null, punto_reunion: t.punto_reunion || null })),
        filasExtra: extras.length > 0 ? extras : undefined
    };
}

// ---------------------------------------------------------------- actualizar con la plantilla

/**
 * Estructura de la plantilla; en cada celda gana la plantilla si tiene información y, si está
 * vacía, se conserva lo del programa en esa misma fila (RN-ACT-01..05) (combinarConPlantilla).
 * @param {{ turnos: TurnoDatos[], extras: ExtraDatos[] }} actual
 * @param {TurnoDatos[]} plantillaTurnos
 * @param {ExtraDatos[]} plantillaExtras
 */
export function combinarConPlantilla(actual, plantillaTurnos, plantillaExtras) {
    const vacio = (/** @type {unknown} */ v) => v == null || String(v).trim() === '';
    const gana = (/** @type {any} */ tpl, /** @type {any} */ prog) => (vacio(tpl) ? (prog ?? tpl) : tpl);
    /** @type {Record<string, number>} */
    const usados = {};
    /** @template T @param {Record<string, T[]>} mapa @param {string} clave @returns {T | undefined} */
    const siguiente = (mapa, clave) => {
        const lista = mapa[clave] || [];
        const n = usados[clave] || 0;
        usados[clave] = n + 1;
        return lista[n];
    };
    /** @template T @param {T[]} filas @param {(f: T) => string} clave @returns {Record<string, T[]>} */
    const indexar = (filas, clave) =>
        filas.reduce((m, f) => {
            (m[clave(f)] = m[clave(f)] || []).push(f);
            return m;
        }, /** @type {Record<string, T[]>} */ ({}));

    const progTurnos = indexar(actual.turnos, (t) => `T|${t.dia}|${t.hora}|${t.grupo}`);
    const turnos = plantillaTurnos.map((t) => {
        const dia = diaDeTurno(t);
        const p = siguiente(progTurnos, `T|${dia}|${t.hora}|${t.grupo}`);
        return {
            ...t,
            dia,
            territorio: gana(t.territorio, p?.territorio),
            punto_reunion: gana(t.punto_reunion, p?.punto_reunion),
            // FISICO es el valor por defecto: solo gana la plantilla si indica otra modalidad (RN-ACT-03)
            modalidad: t.modalidad && t.modalidad !== 'FISICO' ? t.modalidad : p?.modalidad || t.modalidad || 'FISICO',
            formato: { ...(p?.formato || {}), ...(t.formato || {}) }
        };
    });

    const lado = (/** @type {ExtraDatos} */ e) => ((e.orden || 0) < 0 ? 'antes' : 'despues');
    const progExtras = indexar(actual.extras, (e) => `E|${e.dia}|${lado(e)}`);
    const extras = normalizarExtras(plantillaExtras).map((e) => {
        const p = siguiente(progExtras, `E|${e.dia}|${lado(e)}`);
        return {
            ...e,
            hora: gana(e.hora, p?.hora),
            grupo: gana(e.grupo, p?.grupo),
            territorio: gana(e.territorio, p?.territorio),
            punto_reunion: gana(e.punto_reunion, p?.punto_reunion),
            conductor: gana(e.conductor, p?.conductor),
            formato: { ...(p?.formato || {}), ...(e.formato || {}) }
        };
    });
    return { turnos, extras };
}

// ---------------------------------------------------------------- formato por celda

/** @type {{ campo: CampoFormato, etiqueta: string, icono: string }[]} */
export const CAMPOS_FORMATO = [
    { campo: 'hora', etiqueta: 'Hora', icono: 'fa-regular fa-clock' },
    { campo: 'grupo', etiqueta: 'Grupo', icono: 'fa-solid fa-users' },
    { campo: 'territorio', etiqueta: 'Territorio', icono: 'fa-solid fa-map-location-dot' },
    { campo: 'punto_reunion', etiqueta: 'P. Reunión', icono: 'fa-solid fa-location-dot' },
    { campo: 'conductor', etiqueta: 'Conductor', icono: 'fa-solid fa-user-check' }
];

/** Igual que la exportación a Sheets (RN-FMT-03). */
export const FORMATO_DEFECTO = /** @type {const} */ ({ h: 'center', v: 'middle' });

/** Quita lo que coincide con el defecto para no guardar ruido (limpiarFormato del front). @param {Formato} formato */
export function limpiarFormato(formato) {
    /** @type {Formato} */
    const limpio = {};
    for (const [campo, f] of Object.entries(formato || {})) {
        if (!f) continue;
        /** @type {FormatoCelda} */
        const c = {};
        if (f.h && f.h !== FORMATO_DEFECTO.h) c.h = f.h;
        if (f.v && f.v !== FORMATO_DEFECTO.v) c.v = f.v;
        if (f.b) c.b = true;
        if (f.i) c.i = true;
        if (f.s) c.s = true;
        if (Object.keys(c).length) limpio[/** @type {CampoFormato} */ (campo)] = c;
    }
    return limpio;
}

/** Clases de vista previa de una celda (aplicarFormatoFila). @param {Formato} formato @param {CampoFormato} campo */
export function clasesFormato(formato, campo) {
    const f = formato?.[campo];
    if (!f) return '';
    return [f.h ? `fmt-h-${f.h}` : '', f.b ? 'fmt-b' : '', f.i ? 'fmt-i' : '', f.s ? 'fmt-s' : '']
        .filter(Boolean)
        .join(' ');
}
