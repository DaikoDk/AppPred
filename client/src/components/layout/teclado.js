// @ts-check
// Detecta si un elemento enfocado abre el teclado en pantalla (RN-UI-12).

const TIPOS_SIN_TECLADO = new Set([
    'checkbox',
    'radio',
    'button',
    'submit',
    'reset',
    'file',
    'range',
    'color',
    'image'
]);

/**
 * @param {{ tagName?: string, type?: string, readOnly?: boolean, disabled?: boolean, isContentEditable?: boolean } | null | undefined} el
 * @returns {boolean} true si es un campo donde se escribe
 */
export function abreTeclado(el) {
    if (!el) return false;
    const etiqueta = (el.tagName || '').toUpperCase();
    if (etiqueta === 'TEXTAREA') return !el.readOnly && !el.disabled;
    if (etiqueta === 'INPUT')
        return !el.readOnly && !el.disabled && !TIPOS_SIN_TECLADO.has((el.type || 'text').toLowerCase());
    return !!el.isContentEditable;
}
