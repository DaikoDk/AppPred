// @ts-check
import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { DotsThree } from '@phosphor-icons/react';
import PanelFlotante from './PanelFlotante.jsx';

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
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 outline-none transition-[color] duration-300 ease-skill focus-visible:ring-2 focus-visible:ring-primary';

/**
 * Barra inferior de navegación de Hoja de Predicación, solo en móvil (menos de 640px).
 * Muestra las secciones de `barra` y un botón "Más" que abre `mas` en un menú (ADR-022).
 * @param {{ barra: Seccion[], mas: Seccion[] }} props
 */
export default function BarraInferior({ barra, mas }) {
    const { pathname } = useLocation();
    const [abierto, setAbierto] = useState(false);
    const botonMas = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const masActivo = mas.some((s) => s.ruta === pathname);

    return (
        <nav
            aria-label="Secciones de Hoja de Predicación"
            className="tw fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-line bg-surface px-2 py-1 sm:hidden"
        >
            {barra.map((s) => {
                const Icono = s.icono;
                return (
                    <NavLink
                        key={s.ruta}
                        to={s.ruta}
                        className={({ isActive }) => `${CELDA} ${isActive ? 'text-primary' : 'text-muted'}`}
                    >
                        <Icono size={22} aria-hidden="true" />
                        <span className="caption-3 w-full truncate text-center">{s.corto}</span>
                    </NavLink>
                );
            })}
            {mas.length > 0 && (
                <button
                    ref={botonMas}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={abierto}
                    onClick={() => setAbierto((a) => !a)}
                    className={`${CELDA} cursor-pointer ${masActivo || abierto ? 'text-primary' : 'text-muted'}`}
                >
                    <DotsThree size={22} weight="bold" aria-hidden="true" />
                    <span className="caption-3 w-full truncate text-center">Más</span>
                </button>
            )}
            {abierto && (
                <PanelFlotante origen={botonMas.current} onCerrar={() => setAbierto(false)} anchoMin={200}>
                    <ul role="menu" aria-label="Más secciones" className="flex list-none flex-col gap-0.5">
                        {mas.map((s) => {
                            const Icono = s.icono;
                            return (
                                <li key={s.ruta} role="none">
                                    <NavLink
                                        to={s.ruta}
                                        role="menuitem"
                                        onClick={() => setAbierto(false)}
                                        className={({ isActive }) =>
                                            `body-5 flex items-center gap-3 rounded-lg px-3 py-2.5 ${isActive ? 'bg-primary/10 text-primary' : 'text-ink hover:bg-fill'}`
                                        }
                                    >
                                        <Icono size={18} aria-hidden="true" />
                                        {s.titulo}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </PanelFlotante>
            )}
        </nav>
    );
}
