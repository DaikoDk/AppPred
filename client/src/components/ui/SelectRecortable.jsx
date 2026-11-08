import { useLayoutEffect, useRef } from 'react';

/**
 * <select> que recorta con elipsis el texto largo en navegadores con `appearance: base-select`.
 * Equivale a prepararSelects() del front actual: inserta <button><selectedcontent></button>
 * como primer hijo. Se hace con el DOM porque React no admite <button> dentro de <select>.
 * Acepta las mismas props que un <select> normal.
 * @param {import('react').SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function SelectRecortable(props) {
    const ref = useRef(/** @type {HTMLSelectElement | null} */ (null));

    useLayoutEffect(() => {
        const sel = ref.current;
        if (!sel || sel.firstElementChild?.tagName === 'BUTTON') return;
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.appendChild(document.createElement('selectedcontent'));
        sel.prepend(boton);
    }, []);

    return <select ref={ref} {...props} />;
}
