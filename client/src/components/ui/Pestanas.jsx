// @ts-check
import { useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

/**
 * Barra de pestañas enlazada a rutas: la activa sale de la URL, así F5, Atrás y los favoritos funcionan.
 * Teclado (patrón de pestañas WAI-ARIA): flechas izquierda y derecha, Inicio y Fin; solo la activa entra con Tab.
 * En pantallas chicas la barra se desplaza en horizontal y la pestaña activa se lleva a la vista.
 * @param {{
 *   items: { ruta: string, titulo: string, icono: import('@phosphor-icons/react').Icon }[],
 *   etiqueta: string
 * }} props
 */
export default function Pestanas({ items, etiqueta }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const enlaces = useRef(/** @type {(HTMLAnchorElement | null)[]} */ ([]));
    const activa = Math.max(
        0,
        items.findIndex((i) => i.ruta === pathname)
    );

    useEffect(() => {
        enlaces.current[activa]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activa]);

    /** @param {import('react').KeyboardEvent} e */
    const teclado = (e) => {
        const ultima = items.length - 1;
        let destino = -1;
        if (e.key === 'ArrowRight') destino = activa === ultima ? 0 : activa + 1;
        else if (e.key === 'ArrowLeft') destino = activa === 0 ? ultima : activa - 1;
        else if (e.key === 'Home') destino = 0;
        else if (e.key === 'End') destino = ultima;
        if (destino < 0) return;
        e.preventDefault();
        navigate(items[destino].ruta);
        enlaces.current[destino]?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label={etiqueta}
            onKeyDown={teclado}
            className="tw flex gap-1 overflow-x-auto border-b border-line"
        >
            {items.map((item, i) => {
                const Icono = item.icono;
                const esActiva = i === activa;
                return (
                    <NavLink
                        key={item.ruta}
                        ref={(el) => {
                            enlaces.current[i] = el;
                        }}
                        to={item.ruta}
                        role="tab"
                        aria-selected={esActiva}
                        tabIndex={esActiva ? 0 : -1}
                        className={`button-sm -mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 whitespace-nowrap transition-[color,border-color] duration-300 ease-skill outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t-lg ${esActiva ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
                    >
                        <Icono size={16} aria-hidden="true" />
                        {item.titulo}
                    </NavLink>
                );
            })}
        </div>
    );
}
