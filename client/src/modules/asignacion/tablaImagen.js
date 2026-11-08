// @ts-check
// Modelo de la tabla de la imagen PNG del programa asignado. Replica el contenido y los colores de la hoja que se
// exporta a Google Sheets (RN-SHEET-03..07 y 09), pero se arma en el front: no cambia la exportación (RN-IMG-*).
import { DIAS, nombreDia } from '../../utils/dias.js';
import { FRANJAS } from '../../utils/constantes.js';
import { parseLocalDate } from '../../utils/fechas.js';

/**
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').Formato} Formato
 * @typedef {import('../../utils/reglasDia.js').ExtraDatos} ExtraDatos
 * @typedef {{
 *   id: string, dia: string, hora: string, grupo: string, territorio: string | null,
 *   punto_reunion: string | null, conductor_id: string | null, formato?: Formato | null,
 *   conductores?: { nombre?: string | null } | null
 * }} TurnoDeImagen
 * @typedef {{ h?: string, b?: boolean, i?: boolean, s?: boolean }} FormatoCeldaImagen
 * @typedef {{ texto: string, formato: FormatoCeldaImagen | null }} CeldaImagen
 * @typedef {{ dia: Dia, tipo: 'regular' | 'extra' | 'reunion', fondo: string, celdas: CeldaImagen[] }} FilaImagen
 * @typedef {{ dia: Dia, nombre: string, numero: number | null, desde: number, hasta: number, fondo: string }} BloqueDia
 * @typedef {{ titulo: string, encabezados: string[], filas: FilaImagen[], bloques: BloqueDia[] }} TablaImagen
 */

/** Colores de la hoja exportada (utils/googleSheets.js: DAY_THEMES y estilos). RN-SHEET-05 y RN-SHEET-07. */
export const COLORES = {
    titulo: '#C00000',
    encabezado: '#2F5597',
    textoCuerpo: '#0F3B63',
    textoDia: '#1F4E79',
    reunion: '#000080',
    dias: /** @type {Record<Dia, { base: string, alterno: string | null }>} */ ({
        LUNES: { base: '#FBE4D5', alterno: '#FFD6BB' },
        MARTES: { base: '#E2EFD9', alterno: '#C5E1B9' },
        MIERCOLES: { base: '#DEEAF6', alterno: '#C9DAF8' },
        JUEVES: { base: '#FFF2CC', alterno: '#FFEDB9' },
        VIERNES: { base: '#EAD1DC', alterno: '#EDC4D8' },
        SABADO: { base: '#FFDFC0', alterno: null },
        DOMINGO: { base: '#FFE599', alterno: null }
    })
};

const ENCABEZADOS = ['DÍA', 'HORA', 'GRUPO', 'TERRITORIO', 'PUNTO DE REUNIÓN', 'CONDUCTOR'];
const CAMPOS = /** @type {const} */ (['hora', 'grupo', 'territorio', 'punto_reunion', 'conductor']);

/** "Madrugada (6:30 AM)" pasa a "6:30 AM" (extraerHoraSimple del Sheet). @param {string | null | undefined} hora */
export function horaSimple(hora) {
    if (!hora) return '';
    const m = hora.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return m ? m[1].toUpperCase() : hora.toUpperCase();
}

/** Título de la hoja: "Semana del 9 de noviembre al 15 de noviembre del 2026". @param {string} inicio @param {string} [fin] */
export function tituloSemana(inicio, fin) {
    const desde = parseLocalDate(inicio);
    if (!desde) return '';
    const hasta = (fin && parseLocalDate(fin)) || desde;
    const formato = /** @type {Intl.DateTimeFormatOptions} */ ({ day: 'numeric', month: 'long' });
    return `Semana del ${desde.toLocaleDateString('es-PE', formato)} al ${hasta.toLocaleDateString('es-PE', formato)} del ${desde.getFullYear()}`;
}

/** Texto sin acentos y en mayúsculas, para reconocer "REUNION". @param {string} t */
const sinAcentos = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** @param {Formato | null | undefined} formato @param {string} campo @returns {FormatoCeldaImagen | null} */
const formatoDe = (formato, campo) =>
    /** @type {FormatoCeldaImagen | null} */ (formato?.[/** @type {never} */ (campo)] ?? null);

/**
 * Arma la tabla del programa asignado, con las mismas reglas que la hoja de Google Sheets:
 * por día, filas libres con orden menor a cero, turnos por franja y el resto de las libres (RN-SHEET-04);
 * turnos sin conductor como SIN ASIGNAR y vacíos como "—" (RN-SHEET-03); colores por día que alternan solo en las
 * filas regulares (RN-SHEET-05 y 06); filas de reunión especial en azul oscuro (RN-SHEET-07).
 * @param {{
 *   turnos: TurnoDeImagen[],
 *   extras: ExtraDatos[],
 *   semanaInicio: string,
 *   semanaFin?: string
 * }} datos
 * @returns {TablaImagen}
 */
export function construirTabla({ turnos, extras, semanaInicio, semanaFin }) {
    const inicio = parseLocalDate(semanaInicio);
    /** @type {FilaImagen[]} */
    const filas = [];
    /** @type {BloqueDia[]} */
    const bloques = [];

    DIAS.forEach((dia, indice) => {
        const regulares = turnos
            .filter((t) => t.dia === dia)
            .sort((a, b) => (FRANJAS.indexOf(a.hora) + 1 || 99) - (FRANJAS.indexOf(b.hora) + 1 || 99));
        const libres = extras.filter((e) => e.dia === dia).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
        if (regulares.length === 0 && libres.length === 0) return;

        const tema = COLORES.dias[dia];
        const desde = filas.length;
        /** @type {Array<{ regular: boolean, formato: Formato | null | undefined, textos: string[] }>} */
        const items = [];

        const libre = (/** @type {ExtraDatos} */ e) => ({
            regular: false,
            formato: e.formato,
            textos: [e.hora, e.grupo, e.territorio, e.punto_reunion, e.conductor].map((t) =>
                (t || '').trim().toUpperCase()
            )
        });
        libres.filter((e) => (e.orden ?? 0) < 0).forEach((e) => items.push(libre(e)));
        regulares.forEach((t) =>
            items.push({
                regular: true,
                formato: t.formato,
                textos: [
                    horaSimple(t.hora),
                    (t.grupo || '').toUpperCase(),
                    (t.territorio || '—').toUpperCase(),
                    (t.punto_reunion || '—').toUpperCase(),
                    t.conductor_id && t.conductores?.nombre ? t.conductores.nombre.toUpperCase() : 'SIN ASIGNAR'
                ]
            })
        );
        libres.filter((e) => (e.orden ?? 0) >= 0).forEach((e) => items.push(libre(e)));

        let alternancia = 0;
        for (const item of items) {
            const [, , territorio, punto, conductor] = item.textos;
            const conVacias = !territorio || !punto || !conductor;
            const esReunion = item.textos.some((t) => sinAcentos(t).includes('REUNION'));
            /** @type {FilaImagen['tipo']} */
            let tipo = 'regular';
            let fondo = tema.base;
            if (esReunion && conVacias) {
                tipo = 'reunion';
                fondo = COLORES.reunion;
            } else if (conVacias) {
                tipo = 'extra';
            } else {
                // Solo las filas regulares avanzan la alternancia (RN-SHEET-06)
                if (tema.alterno && alternancia % 2 === 1) fondo = tema.alterno;
                alternancia++;
            }
            filas.push({
                dia,
                tipo,
                fondo,
                celdas: item.textos.map((texto, i) => ({ texto, formato: formatoDe(item.formato, CAMPOS[i]) }))
            });
        }

        const fecha = inicio ? new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice) : null;
        bloques.push({
            dia,
            nombre: nombreDia(dia).toUpperCase(),
            numero: fecha ? fecha.getDate() : null,
            desde,
            hasta: filas.length,
            fondo: tema.base
        });
    });

    return { titulo: tituloSemana(semanaInicio, semanaFin), encabezados: ENCABEZADOS, filas, bloques };
}
