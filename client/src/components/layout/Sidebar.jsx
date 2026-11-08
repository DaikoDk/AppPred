// @ts-check
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CaretDown, MapPin, SignOut } from '@phosphor-icons/react';
import { ITEMS_NAV, PESTANAS_HOJA } from './navegacion.js';
import { useSesion } from '../../hooks/useSesion.jsx';

// Clases de la skill (ADR-021) aplicadas sobre las del CSS anterior, que siguen manejando ancho, estado contraído
// y overlay. Las etiquetas van en flujo normal (no absolutas) y se ocultan al contraer.
const ITEM =
    'nav-item body-5 static flex items-center gap-3 rounded-lg border-l-0 px-3 py-2.5 no-underline transition-[background-color,color] duration-300 ease-skill outline-none focus-visible:ring-2 focus-visible:ring-white/60';
const ITEM_ACTIVO = 'bg-white/15 text-white';
const ITEM_INACTIVO = 'text-white/75 hover:bg-white/10 hover:text-white';
// Padre con subsecciones: texto más fuerte; lleva el resalte principal y la subsección activa uno más suave
const ITEM_GRUPO = ITEM.replace('body-5', 'body-4');
const SUBITEM_ACTIVO = 'bg-white/10 text-white';
const SUBITEM_INACTIVO = 'text-white/70 hover:bg-white/10 hover:text-white';
const ITEM_SALIR = 'text-[#ff9b92] hover:bg-[#ff9b92]/10 hover:text-[#ff9b92]';
const SUBITEM =
    'caption-4 flex items-center gap-2 rounded-lg py-2 pr-3 pl-3 no-underline transition-[background-color,color] duration-300 ease-skill outline-none focus-visible:ring-2 focus-visible:ring-white/60';

/** Secciones que cada ítem del menú despliega con su flecha (ADR-022). */
const HIJOS = { '/hoja': PESTANAS_HOJA };

/**
 * Menú lateral (ADR-022). Mantiene las clases de comportamiento del CSS anterior y aplica el estilo de la skill.
 * Hoja de Predicación tiene una flecha que despliega sus secciones; cada una lleva directo a su pestaña.
 * @param {{ colapsado: boolean, abierto: boolean, onNavegar: () => void }} props
 */
export default function Sidebar({ colapsado, abierto, onNavegar }) {
    const { esSuperAdmin, cerrar } = useSesion();
    const { pathname } = useLocation();
    const clases = ['sidebar', colapsado ? 'collapsed' : '', abierto ? 'open' : ''].filter(Boolean).join(' ');
    // Al entrar a una sección de la hoja, el grupo se muestra abierto; la flecha lo abre y cierra a mano
    const [grupoAbierto, setGrupoAbierto] = useState(() => pathname.startsWith('/hoja'));
    useEffect(() => {
        if (pathname.startsWith('/hoja')) setGrupoAbierto(true);
    }, [pathname]);

    return (
        <aside className={`${clases} tw bg-primary-dark text-white`} id="sidebar">
            <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
                <MapPin size={20} weight="fill" aria-hidden="true" className="shrink-0" />
                <span className={`heading-6 static whitespace-nowrap transform-none ${colapsado ? 'hidden' : ''}`}>
                    Predicación
                </span>
            </div>
            {/* Contraído, los tooltips salen hacia la derecha: sin recorte no aparece la barra de desplazamiento */}
            <nav className={`sidebar-nav flex flex-col gap-1 p-3 ${colapsado ? 'overflow-visible!' : ''}`}>
                {ITEMS_NAV.filter((i) => !i.soloSuperAdmin || esSuperAdmin).map((item) => {
                    const Icono = item.icono;
                    const hijos = (HIJOS[/** @type {keyof typeof HIJOS} */ (item.ruta)] ?? []).filter(
                        (h) => !h.soloSuperAdmin || esSuperAdmin
                    );
                    const idGrupo = `grupo-${item.ruta.replace(/\W/g, '')}`;
                    return (
                        <div key={item.ruta} className="relative">
                            <NavLink
                                to={item.ruta}
                                className={({ isActive }) =>
                                    hijos.length > 0 && !colapsado
                                        ? `${ITEM_GRUPO} pr-12 ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`
                                        : `${ITEM} ${isActive ? ITEM_ACTIVO : ITEM_INACTIVO}`
                                }
                                data-tooltip={item.tooltip}
                                onClick={onNavegar}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icono size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                                        <span className={colapsado ? 'hidden' : 'static transform-none'}>
                                            {item.titulo}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                            {hijos.length > 0 && !colapsado && (
                                <>
                                    <button
                                        type="button"
                                        aria-expanded={grupoAbierto}
                                        aria-controls={idGrupo}
                                        aria-label={`${grupoAbierto ? 'Ocultar' : 'Mostrar'} las secciones de ${item.titulo}`}
                                        onClick={() => setGrupoAbierto((a) => !a)}
                                        className="absolute top-1.5 right-2 grid size-8 cursor-pointer place-items-center rounded-lg text-white/75 transition-[background-color,color] duration-300 ease-skill outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                                    >
                                        <CaretDown
                                            size={16}
                                            aria-hidden="true"
                                            className={`transition-transform duration-300 ease-skill ${grupoAbierto ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {grupoAbierto && (
                                        <ul
                                            id={idGrupo}
                                            className="mt-1 ml-4 flex animate-sube list-none flex-col gap-0.5"
                                        >
                                            {hijos.map((h) => {
                                                const IconoHijo = h.icono;
                                                return (
                                                    <li key={h.ruta}>
                                                        <NavLink
                                                            to={h.ruta}
                                                            onClick={onNavegar}
                                                            className={({ isActive }) =>
                                                                `${SUBITEM} ${isActive ? SUBITEM_ACTIVO : SUBITEM_INACTIVO}`
                                                            }
                                                        >
                                                            <IconoHijo size={16} aria-hidden="true" />
                                                            {h.titulo}
                                                        </NavLink>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
                <a
                    href="#"
                    className={`nav-item logout ${ITEM} ${ITEM_SALIR} mt-2`}
                    data-tooltip="Cerrar Sesión"
                    onClick={(e) => {
                        e.preventDefault();
                        cerrar();
                    }}
                >
                    <SignOut size={20} aria-hidden="true" />
                    <span className={colapsado ? 'hidden' : 'static transform-none'}>Cerrar Sesión</span>
                </a>
            </nav>
        </aside>
    );
}
