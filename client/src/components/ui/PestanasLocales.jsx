// @ts-check
import { useRef } from 'react';

/**
 * Pestañas dentro de una pantalla o ventana. A diferencia de `Pestanas`, no están ligadas a la URL.
 * Teclado (patrón WAI-ARIA): flechas izquierda y derecha, Inicio y Fin; solo la activa entra con Tab.
 * Ocupan el ancho por igual, así que sirven también en móvil.
 * @param {{
 *   opciones: { id: string, titulo: string }[],
 *   valor: string,
 *   onCambiar: (id: string) => void,
 *   etiqueta: string
 * }} props
 */
export default function PestanasLocales({ opciones, valor, onCambiar, etiqueta }) {
    const botones = useRef(/** @type {(HTMLButtonElement | null)[]} */ ([]));
    const activa = Math.max(
        0,
        opciones.findIndex((o) => o.id === valor)
    );

    /** @param {import('react').KeyboardEvent} e */
    const teclado = (e) => {
        const ultima = opciones.length - 1;
        let destino = -1;
        if (e.key === 'ArrowRight') destino = activa === ultima ? 0 : activa + 1;
        else if (e.key === 'ArrowLeft') destino = activa === 0 ? ultima : activa - 1;
        else if (e.key === 'Home') destino = 0;
        else if (e.key === 'End') destino = ultima;
        if (destino < 0) return;
        e.preventDefault();
        onCambiar(opciones[destino].id);
        botones.current[destino]?.focus();
    };

    return (
        <div role="tablist" aria-label={etiqueta} onKeyDown={teclado} className="tw flex gap-1 border-b border-line">
            {opciones.map((o, i) => {
                const esActiva = i === activa;
                return (
                    <button
                        key={o.id}
                        ref={(el) => {
                            botones.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={esActiva}
                        tabIndex={esActiva ? 0 : -1}
                        onClick={() => onCambiar(o.id)}
                        className={`button-sm -mb-px flex flex-1 items-center justify-center gap-2 rounded-t-lg border-b-2 px-3 py-2.5 whitespace-nowrap transition-[color,border-color] duration-300 ease-skill outline-none focus-visible:ring-2 focus-visible:ring-primary ${esActiva ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
                    >
                        {o.titulo}
                    </button>
                );
            })}
        </div>
    );
}
