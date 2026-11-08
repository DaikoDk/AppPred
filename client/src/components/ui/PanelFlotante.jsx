import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Panel que flota junto a un elemento sin que lo recorte ningún contenedor con scroll.
 * Se abre hacia abajo, o hacia arriba si no hay espacio, y se cierra al tocar fuera, al hacer scroll o al redimensionar.
 * Hereda de su origen la variable `--dia` (color del día) porque se dibuja fuera de la tabla.
 * @param {{
 *   origen: HTMLElement | null,
 *   onCerrar: () => void,
 *   anchoMin?: number,
 *   anchoMax?: number,
 *   altoMax?: number,
 *   alinearDerecha?: boolean,
 *   children: import('react').ReactNode,
 *   className?: string,
 *   rol?: string,
 *   etiqueta?: string
 * }} props
 */
export default function PanelFlotante({
    origen,
    onCerrar,
    anchoMin = 240,
    anchoMax = 400,
    altoMax = 360,
    alinearDerecha = false,
    children,
    className = '',
    rol,
    etiqueta
}) {
    const panel = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [estilo, setEstilo] = useState(/** @type {import('react').CSSProperties} */ ({ visibility: 'hidden' }));

    useLayoutEffect(() => {
        if (!origen) return undefined;
        const r = origen.getBoundingClientRect();
        const ancho = Math.min(Math.max(r.width, anchoMin), anchoMax);
        const alto = Math.min(panel.current?.offsetHeight ?? altoMax, altoMax);
        const abajo = window.innerHeight - r.bottom - 8;
        const arriba = r.top - 8;
        const haciaAbajo = abajo >= alto || abajo >= arriba;
        const izquierda = alinearDerecha ? r.right - ancho : r.left;
        setEstilo(
            /** @type {import('react').CSSProperties} */ ({
                width: ancho,
                left: Math.max(8, Math.min(izquierda, window.innerWidth - ancho - 8)),
                top: Math.max(8, haciaAbajo ? r.bottom + 4 : r.top - alto - 4),
                maxHeight: Math.max(160, Math.min(altoMax, haciaAbajo ? abajo : arriba)),
                '--dia': getComputedStyle(origen).getPropertyValue('--dia') || 'var(--color-fill)'
            })
        );
        const cerrarSiFuera = (/** @type {Event} */ e) => {
            if (e.target instanceof Node && panel.current?.contains(e.target)) return;
            onCerrar();
        };
        window.addEventListener('resize', onCerrar);
        window.addEventListener('scroll', cerrarSiFuera, true);
        return () => {
            window.removeEventListener('resize', onCerrar);
            window.removeEventListener('scroll', cerrarSiFuera, true);
        };
    }, [origen, onCerrar, anchoMin, anchoMax, altoMax, alinearDerecha]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9090]" onMouseDown={onCerrar} />
            <div
                ref={panel}
                role={rol}
                aria-label={etiqueta}
                style={estilo}
                className={`tw fixed z-[9100] flex animate-sube flex-col rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_rgba(24,24,24,0.16)] ${className}`}
            >
                {children}
            </div>
        </>,
        document.body
    );
}
