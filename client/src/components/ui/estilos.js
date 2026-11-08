// @ts-check
// Clases del sistema de diseño (ADR-021) compartidas por las pestañas de Hoja de Predicación.
// Mismo patrón que Programa: raíz con `tw`, tarjetas de radio 24 con relleno 16 y textos con estilo con nombre.

/** Raíz de cada pestaña: ancho máximo y columna con separación de 24. */
export const RAIZ = 'tw mx-auto flex w-full max-w-[1244px] flex-col gap-6';

/** Tarjeta: radio 24 con borde completo (la cabecera va con EncabezadoTarjeta). */
export const TARJETA = 'rounded-3xl border border-line bg-surface';

/** Cuerpo de tarjeta. */
export const CUERPO = 'p-4';

/** Etiqueta de un campo. */
export const ETIQUETA = 'title-4 mb-1 block text-ink';

/** Campo de texto. */
export const CAMPO =
    'body-6 w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-soft hover:border-ink/30 focus:border-primary';

/** Tabla: el borde de cada fila separa las filas; el encabezado va sobre fondo canvas. */
export const TABLA = 'w-full border-separate border-spacing-0 text-left';

/** Celda de encabezado. */
export const TH =
    'caption-3 bg-canvas px-3 py-2 tracking-wide text-muted uppercase first:rounded-l-lg last:rounded-r-lg';

/** Celda de cuerpo. */
export const TD = 'body-5 border-b border-line px-3 py-3 text-ink';

/** Contenedor que desplaza la tabla en pantallas chicas. */
export const TABLA_CONTENEDOR = 'overflow-x-auto';

/** Insignia pequeña (grupo, fijo, etc.). Sumar el color de fondo y texto. */
export const INSIGNIA = 'caption-3 inline-flex items-center rounded-lg px-2 py-0.5';

/** Cifra de un resumen. */
export const CIFRA = 'heading-5 tabular-nums text-ink';

/** Caja de resumen (dentro de una tarjeta). */
export const RESUMEN = 'rounded-lg bg-canvas p-4';

/**
 * Opción marcable en forma de tarjetita (maqueta): punteada cuando no está marcada y azul cuando sí.
 * El input queda oculto pero sigue con foco visible a través de la tarjeta.
 */
export const CASILLA =
    'body-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-surface px-3 py-2 text-muted transition-[background-color,border-color,color] duration-300 ease-skill hover:border-primary/60 has-checked:border-solid has-checked:border-primary has-checked:bg-primary has-checked:text-white focus-within:ring-2 focus-within:ring-primary [&>input]:sr-only';
