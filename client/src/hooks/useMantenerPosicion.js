// @ts-check
import { useLayoutEffect, useRef } from 'react';

/** Ancestro que hace scroll (el contenido de Layout en móvil). @param {HTMLElement} el @returns {HTMLElement | null} */
function contenedorConScroll(el) {
    for (let p = el.parentElement; p; p = p.parentElement) {
        const { overflowY } = getComputedStyle(p);
        if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    }
    return null;
}

/**
 * Mantiene un elemento en el mismo lugar de la pantalla cuando el contenido de abajo cambia de alto (por ejemplo, el
 * selector "Ver por día / Ver por semana" al cambiar de vista). Sin esto, el alto nuevo mueve el scroll y el elemento salta
 * o queda bajo el encabezado fijo.
 *
 * Se llama a `marcar()` justo antes de cambiar el estado `cambio`; cuando `cambio` ya se dibujó, se corrige el scroll.
 * @param {import('react').RefObject<HTMLElement | null>} ref elemento que debe quedarse en su sitio
 * @param {unknown} cambio valor del estado que cambia el contenido
 * @returns {() => void} `marcar`
 */
export function useMantenerPosicion(ref, cambio) {
    const antes = useRef(/** @type {number | null} */ (null));
    useLayoutEffect(() => {
        const el = ref.current;
        const top = antes.current;
        antes.current = null;
        if (!el || top === null) return;
        const delta = el.getBoundingClientRect().top - top;
        if (delta !== 0) contenedorConScroll(el)?.scrollBy({ top: delta });
    }, [ref, cambio]);
    return () => {
        antes.current = ref.current?.getBoundingClientRect().top ?? null;
    };
}
