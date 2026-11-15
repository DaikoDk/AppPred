// @ts-check
// Medidas de la hoja de Google Sheets (utils/googleSheets.js) para que la imagen PNG salga igual (RN-IMG-04 y RN-IMG-08).
// Los anchos de columna son una COPIA de `calcularAnchosColumnas` del backend: si cambia uno, cambiar el otro (ADR-030).

/** @typedef {import('./tablaImagen.js').TablaImagen} TablaImagen */

/** Puntos tipográficos a píxeles CSS. @param {number} pt */
export const pxDePt = (pt) => (pt * 4) / 3;

/** Lo que `googleSheets.js` fija (filas de datos, fuentes y bordes) o deja por defecto de Sheets (título y encabezado). */
export const MEDIDAS = {
    altoFila: 25, // updateDimensionProperties de las filas de datos
    altoEncabezado: 21, // sin fijar: alto por defecto de una fila de Sheets
    altoTitulo: 32, // sin fijar: Sheets ajusta la fila a Arial Black de 17 pt
    letra: pxDePt(10), // Arial 10 en cuerpo, día, encabezado y reuniones
    letraTitulo: pxDePt(17), // Arial Black 17 en el título
    interlineado: 15, // Arial 10: dos líneas en la celda del día
    relleno: 3, // margen interior de una celda de Sheets
    borde: 1, // SOLID
    bordeGrueso: 3 // SOLID_THICK
};

/** Ancho aproximado (px) de un texto en Arial 10 (anchoTexto del backend). @param {string} texto @param {boolean} negrita */
export function anchoTexto(texto, negrita) {
    const ANGOSTOS = "IJ.,:;/-'|!li1";
    let w = 0;
    for (const ch of String(texto || '')) {
        if (ch === ' ') w += 4;
        else if (ANGOSTOS.includes(ch)) w += 5;
        else if (ch === 'M' || ch === 'W') w += 12.5;
        else if (ch === '—') w += 12;
        else if (/[0-9]/.test(ch)) w += 7.5;
        else if (/[A-ZÁÉÍÓÚÑÜ]/.test(ch)) w += 9.5;
        else w += 7.5;
    }
    return w * (negrita ? 1.3 : 1);
}

/** Fila de reunión especial: azul y Arial Black, ocupa más ancho (esFilaReunionEspecial del backend). @param {string[]} row */
export function esFilaReunionEspecial(row) {
    const celdas = [row[1], row[2], row[3], row[4], row[5]].map((c) =>
        (c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
    );
    const vacias = !row[3] || !row[4] || !row[5];
    return vacias && celdas.some((c) => c.includes('REUNION'));
}

/**
 * Ancho de cada columna en px (calcularAnchosColumnas del backend). La fila 0 es el título y se ignora; la 1, el
 * encabezado, cuenta en negrita.
 * @param {string[][]} dataRows
 * @returns {number[]}
 */
export function calcularAnchosColumnas(dataRows) {
    const MIN = [95, 75, 120, 120, 120, 140];
    const MAX = 520;
    const PADDING = 24;
    const anchos = MIN.slice();
    dataRows.forEach((row, ri) => {
        if (ri === 0) return;
        const negrita = ri === 1 || esFilaReunionEspecial(row);
        row.forEach((celda, ci) => {
            const lineas = String(celda || '').split('\n');
            const w = Math.max(...lineas.map((l) => anchoTexto(l, negrita))) + PADDING;
            if (w > anchos[ci]) anchos[ci] = w;
        });
    });
    return anchos.map((w) => Math.min(MAX, Math.ceil(w)));
}

/**
 * Las filas de la tabla como las escribe el backend en el Sheet: título, encabezado y una fila por turno, con
 * "NOMBRE\nnúmero" en la primera fila de cada día.
 * @param {TablaImagen} tabla
 * @returns {string[][]}
 */
export function filasDeDatos(tabla) {
    /** @type {string[][]} */
    const filas = [[tabla.titulo, '', '', '', '', ''], tabla.encabezados];
    const primeras = new Map(tabla.bloques.map((b) => [b.desde, b]));
    tabla.filas.forEach((f, i) => {
        const b = primeras.get(i);
        filas.push([b ? `${b.nombre}\n${b.numero ?? ''}` : '', ...f.celdas.map((c) => c.texto)]);
    });
    return filas;
}
