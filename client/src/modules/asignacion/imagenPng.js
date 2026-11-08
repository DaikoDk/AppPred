// @ts-check
// Dibuja la tabla del programa en un canvas y la descarga o comparte como PNG. Sin dependencias: usa la API Canvas del navegador.
import { COLORES, construirTabla } from './tablaImagen.js';
import * as api from './api.js';
import { normalizarExtras } from '../../utils/reglasDia.js';

/** @typedef {import('./tablaImagen.js').TablaImagen} TablaImagen */

const ESCALA = 2; // la imagen sale al doble de resolución para que se lea bien en el celular
const MARGEN = 10;
const RELLENO = 14; // espacio a cada lado del texto de una celda
const ALTO_TITULO = 46;
const ALTO_ENCABEZADO = 28;
const ALTO_FILA = 27;
const LETRA = 13;
const SANS = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const NEGRITA = "'Arial Black', Arial, Helvetica, sans-serif";

/**
 * @param {boolean} negrita @param {boolean} cursiva
 * @param {boolean} [pesada] usa Arial Black como la hoja de Sheets en el título, el encabezado y las reuniones
 */
const fuente = (negrita, cursiva, pesada = false) =>
    `${cursiva ? 'italic ' : ''}${negrita || pesada ? 'bold ' : ''}${LETRA}px ${pesada ? NEGRITA : SANS}`;

/** Ancho de cada columna: el del texto más largo (sin contar las reuniones, RN-SHEET-08) más el relleno. @param {CanvasRenderingContext2D} ctx @param {TablaImagen} tabla */
function medirColumnas(ctx, tabla) {
    const anchos = [0, 0, 0, 0, 0, 0];
    ctx.font = fuente(true, false, true);
    tabla.encabezados.forEach((t, i) => (anchos[i] = Math.max(anchos[i], ctx.measureText(t).width)));
    for (const bloque of tabla.bloques) {
        ctx.font = fuente(false, false);
        anchos[0] = Math.max(anchos[0], ctx.measureText(bloque.nombre).width);
    }
    for (const fila of tabla.filas) {
        if (fila.tipo === 'reunion') continue;
        fila.celdas.forEach((celda, i) => {
            ctx.font = fuente(!!celda.formato?.b, !!celda.formato?.i);
            anchos[i + 1] = Math.max(anchos[i + 1], ctx.measureText(celda.texto).width);
        });
    }
    const columnas = anchos.map((a) => Math.ceil(a) + RELLENO * 2);
    // El título ocupa todo el ancho: si es más largo que la tabla, se reparte lo que falta entre las columnas
    ctx.font = `bold ${LETRA * 1.75}px ${NEGRITA}`;
    const falta = Math.ceil(ctx.measureText(tabla.titulo).width) + RELLENO * 2 - columnas.reduce((a, b) => a + b, 0);
    if (falta > 0) columnas.forEach((_, i) => (columnas[i] += falta / columnas.length));
    return columnas;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {string} texto @param {number} x0 @param {number} x1 @param {number} yMedio
 * @param {'left' | 'center' | 'right'} alineacion @param {boolean} tachado
 */
function escribir(ctx, texto, x0, x1, yMedio, alineacion, tachado) {
    const ancho = ctx.measureText(texto).width;
    const x =
        alineacion === 'left' ? x0 + RELLENO : alineacion === 'right' ? x1 - RELLENO - ancho : (x0 + x1 - ancho) / 2;
    ctx.textAlign = 'left';
    ctx.fillText(texto, x, yMedio);
    if (tachado) {
        ctx.fillRect(x, yMedio, ancho, 1);
    }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 */
function linea(ctx, x0, y0, x1, y1) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

/**
 * Dibuja el título, el encabezado azul, los bloques de cada día y las filas con los colores de la hoja exportada.
 * @param {TablaImagen} tabla
 * @returns {HTMLCanvasElement}
 */
export function dibujarTabla(tabla) {
    const canvas = document.createElement('canvas');
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const columnas = medirColumnas(ctx, tabla);
    const anchoTabla = columnas.reduce((a, b) => a + b, 0);
    const alto = ALTO_TITULO + ALTO_ENCABEZADO + tabla.filas.length * ALTO_FILA;

    canvas.width = Math.ceil((anchoTabla + MARGEN * 2) * ESCALA);
    canvas.height = Math.ceil((alto + MARGEN * 2) * ESCALA);
    ctx.scale(ESCALA, ESCALA);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /** Borde izquierdo de cada columna (la última entrada es el borde derecho de la tabla). */
    const xs = [MARGEN];
    columnas.forEach((a) => xs.push(xs[xs.length - 1] + a));
    const yEncabezado = MARGEN + ALTO_TITULO;
    const yCuerpo = yEncabezado + ALTO_ENCABEZADO;

    // Título
    ctx.fillStyle = COLORES.titulo;
    ctx.font = `bold ${LETRA * 1.75}px ${NEGRITA}`;
    escribir(ctx, tabla.titulo, MARGEN, MARGEN + anchoTabla, MARGEN + ALTO_TITULO / 2, 'center', false);

    // Encabezado
    ctx.fillStyle = COLORES.encabezado;
    ctx.fillRect(MARGEN, yEncabezado, anchoTabla, ALTO_ENCABEZADO);
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(true, false, true);
    tabla.encabezados.forEach((t, i) =>
        escribir(ctx, t, xs[i], xs[i + 1], yEncabezado + ALTO_ENCABEZADO / 2, 'center', false)
    );

    // Bloques de día: una celda por día con su nombre y número
    for (const b of tabla.bloques) {
        const y0 = yCuerpo + b.desde * ALTO_FILA;
        const y1 = yCuerpo + b.hasta * ALTO_FILA;
        ctx.fillStyle = b.fondo;
        ctx.fillRect(xs[0], y0, columnas[0], y1 - y0);
        ctx.fillStyle = COLORES.textoDia;
        ctx.font = fuente(false, false);
        const medio = (y0 + y1) / 2;
        escribir(ctx, b.nombre, xs[0], xs[1], medio - (b.numero == null ? 0 : LETRA * 0.6), 'center', false);
        if (b.numero != null) escribir(ctx, String(b.numero), xs[0], xs[1], medio + LETRA * 0.7, 'center', false);
    }

    // Filas
    tabla.filas.forEach((fila, r) => {
        const y = yCuerpo + r * ALTO_FILA;
        const reunion = fila.tipo === 'reunion';
        ctx.fillStyle = fila.fondo;
        ctx.fillRect(xs[1], y, anchoTabla - columnas[0], ALTO_FILA);
        fila.celdas.forEach((celda, i) => {
            const f = celda.formato;
            ctx.fillStyle = reunion ? '#ffffff' : COLORES.textoCuerpo;
            ctx.font = fuente(!!f?.b, !!f?.i, reunion);
            const alineacion = f?.h === 'left' || f?.h === 'right' ? f.h : 'center';
            escribir(ctx, celda.texto, xs[i + 1], xs[i + 2], y + ALTO_FILA / 2, alineacion, !!f?.s);
        });
    });

    // Líneas: separadores de columnas y filas, y borde exterior más grueso
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 1;
    const yFin = yCuerpo + tabla.filas.length * ALTO_FILA;
    for (let i = 1; i < xs.length - 1; i++) linea(ctx, xs[i], yEncabezado, xs[i], yEncabezado + ALTO_ENCABEZADO);
    tabla.filas.forEach((fila, r) => {
        const y = yCuerpo + r * ALTO_FILA;
        linea(ctx, xs[1], y, xs[xs.length - 1], y);
        // Las filas de reunión se ven como una sola celda
        for (let i = 1; i < xs.length - 1; i++)
            if (fila.tipo !== 'reunion' || i === 1) linea(ctx, xs[i], y, xs[i], y + ALTO_FILA);
    });
    for (const b of tabla.bloques)
        linea(ctx, xs[0], yCuerpo + b.hasta * ALTO_FILA, xs[xs.length - 1], yCuerpo + b.hasta * ALTO_FILA);
    ctx.lineWidth = 2;
    ctx.strokeRect(MARGEN, yEncabezado, anchoTabla, yFin - yEncabezado);
    return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas @returns {Promise<Blob>}
 */
function aBlob(canvas) {
    return new Promise((resolver, rechazar) => {
        canvas.toBlob((blob) => {
            if (blob) resolver(blob);
            else rechazar(new Error('No se pudo generar la imagen'));
        }, 'image/png');
    });
}

/** @param {Blob} blob @param {string} nombre sin extensión */
function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombre}.png`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

/**
 * Descarga el canvas como archivo PNG.
 * @param {HTMLCanvasElement} canvas @param {string} nombre sin extensión
 * @returns {Promise<void>}
 */
export async function descargarPng(canvas, nombre) {
    descargarBlob(await aBlob(canvas), nombre);
}

/**
 * Comparte el PNG por la hoja de compartir del sistema (en el celular aparece WhatsApp). Si el navegador no puede
 * compartir archivos (en la PC), descarga la imagen y abre WhatsApp Web con el texto para adjuntarla (RN-IMG-06).
 * Si el usuario cierra la hoja de compartir, se lanza AbortError.
 * @param {HTMLCanvasElement} canvas @param {string} nombre sin extensión @param {string} texto
 * @returns {Promise<'compartido' | 'descargado'>}
 */
export async function compartirPng(canvas, nombre, texto) {
    const blob = await aBlob(canvas);
    const archivo = new File([blob], `${nombre}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: nombre, text: texto });
        return 'compartido';
    }
    descargarBlob(blob, nombre);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    return 'descargado';
}

/** Dibuja el programa asignado como imagen (RN-IMG-01 a 04). @param {import('./api.js').ProgramaEstado} programa */
export async function canvasDelPrograma(programa) {
    const { turnos, extras } = await api.datosParaImagen(programa.id);
    const tabla = construirTabla({
        turnos,
        extras: normalizarExtras(extras),
        semanaInicio: programa.semana_inicio,
        semanaFin: programa.semana_fin
    });
    return dibujarTabla(tabla);
}

/**
 * Abre el cuadro de impresión del navegador con la imagen en una hoja A4 horizontal. Desde ahí también se puede
 * elegir "Guardar como PDF". Se imprime desde un iframe oculto, así no se imprime la pantalla de la app (RN-IMG-05).
 * @param {string} urlImagen imagen como data URL
 * @param {string} titulo título del documento (nombre sugerido al guardar el PDF)
 * @returns {Promise<void>} se resuelve al cerrarse el cuadro de impresión
 */
export function imprimirImagen(urlImagen, titulo) {
    return new Promise((resolver) => {
        const marco = document.createElement('iframe');
        marco.setAttribute('aria-hidden', 'true');
        marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        document.body.appendChild(marco);
        const ventana = /** @type {Window} */ (marco.contentWindow);
        const doc = /** @type {Document} */ (marco.contentDocument);
        doc.open();
        doc.write(
            '<!doctype html><html><head><meta charset="utf-8"><style>' +
                '@page{size:A4 landscape;margin:10mm}' +
                'html,body{margin:0;height:100%}' +
                'body{display:flex;align-items:center;justify-content:center}' +
                'img{display:block;max-width:100%;max-height:100%}' +
                '</style></head><body><img alt=""></body></html>'
        );
        doc.close();
        doc.title = titulo;
        const limpiar = () => {
            marco.remove();
            resolver();
        };
        const imagen = /** @type {HTMLImageElement} */ (doc.querySelector('img'));
        imagen.addEventListener('load', () => {
            ventana.addEventListener('afterprint', limpiar);
            ventana.focus();
            ventana.print();
            // Respaldo por si el navegador no avisa que terminó la impresión
            setTimeout(limpiar, 120000);
        });
        imagen.src = urlImagen;
    });
}
