// @ts-check
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DotsThree } from '@phosphor-icons/react';

/**
 * @typedef {{
 *   ruta: string,
 *   titulo: string,
 *   corto: string,
 *   icono: import('@phosphor-icons/react').Icon
 * }} Seccion
 */

// Cada celda ocupa lo mismo; el texto corto cabe en 390 px con cuatro secciones y "Más"
const CELDA =
    'no-underline flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 outline-none transition-[color] duration-300 ease-skill focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Barra inferior de navegación de Hoja de Predicación, solo en móvil (menos de 640px).
 * Muestra las secciones de `barra` y un botón "Más" que abre `mas` en un menú justo encima de la barra (ADR-022).
 * No usa position: fixed: Layout la monta en un espacio pegado (sticky) al fondo del contenedor que hace scroll,
 * así queda siempre sobre la barra del navegador de Android, que tapa el borde inferior de la página.
 * El menú "Más" es parte de la propia barra (absoluto sobre ella), sin depender de la posición de otros elementos.
 * @param {{ barra: Seccion[], mas: Seccion[] }} props
 */
export default function BarraInferior({ barra, mas }) {
    const { pathname } = useLocation();
    const [abierto, setAbierto] = useState(false);
    const contenedorMas = useRef(/** @type {HTMLDivElement | null} */ (null));
    const masActivo = mas.some((s) => s.ruta === pathname);

    // El menú se cierra al tocar fuera o con Escape
    useEffect(() => {
        if (!abierto) return undefined;
        /** @param {PointerEvent} e */
        const fuera = (e) => {
            if (!(e.target instanceof Node) || !contenedorMas.current?.contains(e.target)) setAbierto(false);
        };
        /** @param {KeyboardEvent} e */
        const tecla = (e) => {
            if (e.key === 'Escape') setAbierto(false);
        };
        document.addEventListener('pointerdown', fuera);
        document.addEventListener('keydown', tecla);
        return () => {
            document.removeEventListener('pointerdown', fuera);
            document.removeEventListener('keydown', tecla);
        };
    }, [abierto]);

    return (
        <nav
            aria-label="Secciones de Hoja de Predicación"
            className="tw flex h-16 gap-1 border-t border-primary-dark bg-primary px-2 py-1"
        >
            {barra.map((s) => {
                const Icono = s.icono;
                return (
                    <NavLink
                        key={s.ruta}
                        to={s.ruta}
                        className={({ isActive }) =>
                            `${CELDA} ${isActive ? 'bg-white/20 text-white' : 'text-white/75 hover:text-white'}`
                        }
                    >
                        <Icono size={22} aria-hidden="true" />
                        <span className="caption-3 w-full truncate text-center">{s.corto}</span>
                    </NavLink>
                );
            })}
            {mas.length > 0 && (
                <div ref={contenedorMas} className="relative flex min-w-0 flex-1">
                    <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={abierto}
                        onClick={() => setAbierto((a) => !a)}
                        className={`${CELDA} w-full cursor-pointer ${masActivo || abierto ? 'bg-white/20 text-white' : 'text-white/75 hover:text-white'}`}
                    >
                        <DotsThree size={22} weight="bold" aria-hidden="true" />
                        <span className="caption-3 w-full truncate text-center">Más</span>
                    </button>
                    {abierto && (
                        <ul
                            role="menu"
                            aria-label="Más secciones"
                            className="absolute right-0 bottom-full mb-2 flex w-56 list-none flex-col gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-[0_16px_40px_rgba(24,24,24,0.16)]"
                        >
                            {mas.map((s) => {
                                const Icono = s.icono;
                                return (
                                    <li key={s.ruta} role="none">
                                        <NavLink
                                            to={s.ruta}
                                            role="menuitem"
                                            onClick={() => setAbierto(false)}
                                            className={({ isActive }) =>
                                                `body-5 flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline ${isActive ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-fill'}`
                                            }
                                        >
                                            <Icono size={18} aria-hidden="true" />
                                            {s.titulo}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </nav>
    );
}
