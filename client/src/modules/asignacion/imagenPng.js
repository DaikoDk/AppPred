// @ts-check
// Dibuja la tabla del programa en un canvas y la descarga o comparte como PNG. Sin dependencias: usa la API Canvas del navegador.
// Fuentes equivalentes a Arial y Arial Black (las de la hoja de Sheets), incluidas en la app: el celular no las tiene
import '@fontsource/arimo/400.css';
import '@fontsource/arimo/400-italic.css';
import '@fontsource/arimo/700.css';
import '@fontsource/arimo/700-italic.css';
import '@fontsource/archivo-black/400.css';
import { COLORES, construirTabla } from './tablaImagen.js';
import { MEDIDAS, calcularAnchosColumnas, filasDeDatos } from './medidasSheets.js';
import * as api from './api.js';
import { normalizarExtras } from '../../utils/reglasDia.js';

/** @typedef {import('./tablaImagen.js').TablaImagen} TablaImagen */

// Las medidas (filas, fuentes, bordes y anchos de columna) son las de la hoja de Sheets: ver medidasSheets.js (ADR-030)
const ESCALA = 2; // la imagen sale al doble de resolución para que se lea bien en el celular
const MARGEN = 10;
const SANS = "Arimo, Arial, 'Helvetica Neue', Helvetica, sans-serif";
const NEGRITA = "'Archivo Black', 'Arial Black', Arial, Helvetica, sans-serif"; // ya es pesada: sin 'bold' no se falsea

/**
 * @param {boolean} negrita @param {boolean} cursiva
 * @param {boolean} [pesada] usa la fuente pesada (Arial Black en la hoja de Sheets) en el título, el encabezado y las reuniones
 * @param {number} [tamano] en px; por defecto Arial 10 como la hoja
 */
const fuente = (negrita, cursiva, pesada = false, tamano = MEDIDAS.letra) =>
    pesada
        ? `${cursiva ? 'italic ' : ''}${tamano}px ${NEGRITA}`
        : `${cursiva ? 'italic ' : ''}${negrita ? 'bold ' : ''}${tamano}px ${SANS}`;

/** Espera a que las fuentes del dibujo estén cargadas: el canvas no las pide solo y usaría la de respaldo. */
async function cargarFuentes() {
    const texto = 'ÁÉÍÓÚÑ0123456789';
    await Promise.all([
        document.fonts.load(fuente(false, false), texto),
        document.fonts.load(fuente(true, false), texto),
        document.fonts.load(fuente(false, true), texto),
        document.fonts.load(fuente(true, true), texto),
        document.fonts.load(fuente(false, false, true), texto)
    ]);
}

/**
 * Escribe un texto dentro de una celda con su alineación horizontal y vertical (el relleno es el de Sheets).
 * @param {CanvasRenderingContext2D} ctx @param {string} texto @param {number} x0 @param {number} x1
 * @param {number} y0 @param {number} y1 @param {'left' | 'center' | 'right'} h @param {'top' | 'middle' | 'bottom'} v
 * @param {boolean} tachado
 */
function escribir(ctx, texto, x0, x1, y0, y1, h, v, tachado) {
    const { relleno, interlineado } = MEDIDAS;
    const ancho = ctx.measureText(texto).width;
    const x = h === 'left' ? x0 + relleno : h === 'right' ? x1 - relleno - ancho : (x0 + x1 - ancho) / 2;
    const y =
        v === 'top'
            ? y0 + relleno + interlineado / 2
            : v === 'bottom'
              ? y1 - relleno - interlineado / 2
              : (y0 + y1) / 2;
    ctx.textAlign = 'left';
    ctx.fillText(texto, x, y);
    if (tachado) ctx.fillRect(x, y, ancho, 1);
}

/**
 * Ejecuta el dibujo recortado a un rectángulo: lo que no cabe en la celda no se ve, como en Sheets.
 * @param {CanvasRenderingContext2D} ctx @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {() => void} dibujar
 */
function recortado(ctx, x0, y0, x1, y1, dibujar) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    dibujar();
    ctx.restore();
}

/** Recuadro de una celda o de un conjunto de celdas, con el ancho de línea indicado. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} ancho @param {number} alto @param {number} grosor */
function recuadro(ctx, x, y, ancho, alto, grosor) {
    ctx.lineWidth = grosor;
    ctx.strokeRect(x, y, ancho, alto);
}

/**
 * Dibuja la hoja exportada: título combinado, encabezado, bloque de cada día y filas con sus colores, y los bordes de
 * Sheets (cada celda del encabezado, el bloque del día, cada fila y el borde exterior grueso).
 * @param {TablaImagen} tabla
 * @returns {HTMLCanvasElement}
 */
export function dibujarTabla(tabla) {
    const { altoFila, altoEncabezado, altoTitulo, letraTitulo, interlineado, borde, bordeGrueso } = MEDIDAS;
    const canvas = document.createElement('canvas');
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const columnas = calcularAnchosColumnas(filasDeDatos(tabla));
    const anchoTabla = columnas.reduce((a, b) => a + b, 0);
    // El título va combinado sobre toda la tabla; si fuera más ancho que ella, la imagen crece para que no se corte
    ctx.font = fuente(false, false, true, letraTitulo);
    const anchoTotal = Math.max(anchoTabla, Math.ceil(ctx.measureText(tabla.titulo).width) + 12);
    const alto = altoTitulo + altoEncabezado + tabla.filas.length * altoFila;

    canvas.width = Math.ceil((anchoTotal + MARGEN * 2) * ESCALA);
    canvas.height = Math.ceil((alto + MARGEN * 2) * ESCALA);
    ctx.scale(ESCALA, ESCALA);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x0 = MARGEN + (anchoTotal - anchoTabla) / 2;
    /** Borde izquierdo de cada columna (la última entrada es el borde derecho de la tabla). */
    const xs = [x0];
    columnas.forEach((a) => xs.push(xs[xs.length - 1] + a));
    const yTitulo = MARGEN;
    const yEncabezado = yTitulo + altoTitulo;
    const yCuerpo = yEncabezado + altoEncabezado;
    const yFin = yCuerpo + tabla.filas.length * altoFila;

    // Título: Arial Black 17 en rojo, centrado sobre toda la tabla
    ctx.fillStyle = COLORES.titulo;
    ctx.font = fuente(false, false, true, letraTitulo);
    escribir(ctx, tabla.titulo, MARGEN, MARGEN + anchoTotal, yTitulo, yEncabezado, 'center', 'middle', false);

    // Encabezado
    ctx.fillStyle = COLORES.encabezado;
    ctx.fillRect(x0, yEncabezado, anchoTabla, altoEncabezado);
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(true, false, true);
    tabla.encabezados.forEach((t, i) =>
        recortado(ctx, xs[i], yEncabezado, xs[i + 1], yCuerpo, () =>
            escribir(ctx, t, xs[i], xs[i + 1], yEncabezado, yCuerpo, 'center', 'middle', false)
        )
    );

    // Bloques de día: una celda combinada con el nombre y el número en dos líneas
    for (const b of tabla.bloques) {
        const y0 = yCuerpo + b.desde * altoFila;
        const y1 = yCuerpo + b.hasta * altoFila;
        ctx.fillStyle = b.fondo;
        ctx.fillRect(xs[0], y0, columnas[0], y1 - y0);
        ctx.fillStyle = COLORES.textoDia;
        ctx.font = fuente(false, false);
        const medio = (y0 + y1) / 2;
        const arriba = medio - interlineado / 2;
        const abajo = medio + interlineado / 2;
        recortado(ctx, xs[0], y0, xs[1], y1, () => {
            escribir(ctx, b.nombre, xs[0], xs[1], arriba, arriba, 'center', 'middle', false);
            escribir(
                ctx,
                b.numero == null ? '' : String(b.numero),
                xs[0],
                xs[1],
                abajo,
                abajo,
                'center',
                'middle',
                false
            );
        });
    }

    // Filas
    tabla.filas.forEach((fila, r) => {
        const y = yCuerpo + r * altoFila;
        const reunion = fila.tipo === 'reunion';
        ctx.fillStyle = fila.fondo;
        ctx.fillRect(xs[1], y, anchoTabla - columnas[0], altoFila);
        fila.celdas.forEach((celda, i) => {
            if (!celda.texto) return;
            const f = celda.formato;
            ctx.fillStyle = reunion ? '#ffffff' : COLORES.textoCuerpo;
            ctx.font = fuente(!!f?.b, !!f?.i, reunion);
            const h = f?.h === 'left' || f?.h === 'right' ? f.h : 'center';
            const v = f?.v === 'top' || f?.v === 'bottom' ? f.v : 'middle';
            // Como Sheets: el texto que no cabe desborda sobre las celdas vecinas vacías (hacia la izquierda si va a la
            // derecha o al centro; hacia la derecha si va a la izquierda o al centro) y, si no hay espacio, se recorta
            let desde = i;
            let hasta = i;
            if (h !== 'left') while (desde > 0 && !fila.celdas[desde - 1].texto) desde--;
            if (h !== 'right') while (hasta < fila.celdas.length - 1 && !fila.celdas[hasta + 1].texto) hasta++;
            recortado(ctx, xs[desde + 1], y, xs[hasta + 2], y + altoFila, () =>
                escribir(ctx, celda.texto, xs[i + 1], xs[i + 2], y, y + altoFila, h, v, !!f?.s)
            );
        });
    });

    // Bordes negros como en la hoja (RN-IMG-08): cada celda del encabezado, el recuadro de cada bloque de día y de cada
    // fila (sin líneas entre las celdas de una fila) y, al final, el borde exterior grueso
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    columnas.forEach((a, i) => recuadro(ctx, xs[i], yEncabezado, a, altoEncabezado, borde));
    for (const b of tabla.bloques)
        recuadro(ctx, xs[0], yCuerpo + b.desde * altoFila, columnas[0], (b.hasta - b.desde) * altoFila, borde);
    tabla.filas.forEach((_, r) =>
        recuadro(ctx, xs[1], yCuerpo + r * altoFila, anchoTabla - columnas[0], altoFila, borde)
    );
    recuadro(ctx, x0, yEncabezado, anchoTabla, yFin - yEncabezado, bordeGrueso);
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
 * Prepara el PNG como archivo antes del clic. `navigator.share` exige un gesto reciente del usuario: si se genera el
 * blob dentro del clic, Brave/Chrome del celular rechazan con "Permission denied" (NotAllowedError).
 * @param {HTMLCanvasElement} canvas @param {string} nombre sin extensión
 * @returns {Promise<File>}
 */
export async function archivoPng(canvas, nombre) {
    return new File([await aBlob(canvas)], `${nombre}.png`, { type: 'image/png' });
}

/**
 * Comparte el PNG por la hoja de compartir del sistema (en el celular aparece WhatsApp). Si el navegador no puede
 * compartir archivos (en la PC) o la rechaza por permisos, descarga la imagen y abre WhatsApp Web con el texto para
 * adjuntarla (RN-IMG-06). Si el usuario cierra la hoja de compartir, se lanza AbortError.
 * Se llama sin `await` previo, para conservar el gesto del usuario.
 * @param {File} archivo de `archivoPng` @param {string} nombre sin extensión @param {string} texto
 * @returns {Promise<'compartido' | 'descargado'>}
 */
export async function compartirPng(archivo, nombre, texto) {
    if (navigator.canShare?.({ files: [archivo] })) {
        try {
            await navigator.share({ files: [archivo], title: nombre, text: texto });
            return 'compartido';
        } catch (err) {
            if (/** @type {Error} */ (err).name !== 'NotAllowedError') throw err;
        }
    }
    descargarBlob(archivo, nombre);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    return 'descargado';
}

/** Dibuja el programa asignado como imagen (RN-IMG-01 a 04). @param {import('./api.js').ProgramaEstado} programa */
export async function canvasDelPrograma(programa) {
    const [{ turnos, extras }] = await Promise.all([api.datosParaImagen(programa.id), cargarFuentes()]);
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
