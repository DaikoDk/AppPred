import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * @typedef {{ texto: string, icono: string, onClick: () => void }} OpcionMenu
 */

/**
 * Botón ⋯ con un menú que flota sobre el contenido sin empujarlo (RN-UI-03).
 * Mismo marcado que #menu-programa-wrap del front actual.
 * @param {{ opciones: OpcionMenu[], titulo?: string, claseBoton?: string }} props
 */
export default function MenuFlotante({ opciones, titulo = 'Más acciones', claseBoton = 'btn btn-secondary' }) {
    const [abierto, setAbierto] = useState(false);
    const [haciaIzquierda, setHaciaIzquierda] = useState(false);
    const menu = useRef(/** @type {HTMLDivElement | null} */ (null));

    // Se cierra con cualquier clic fuera del menú
    useEffect(() => {
        if (!abierto) return undefined;
        const cerrar = () => setAbierto(false);
        document.addEventListener('click', cerrar);
        return () => document.removeEventListener('click', cerrar);
    }, [abierto]);

    // Se ancla al lado que tenga espacio para no salirse de la pantalla
    useLayoutEffect(() => {
        if (!abierto || !menu.current || haciaIzquierda) return;
        if (menu.current.getBoundingClientRect().left < 8) setHaciaIzquierda(true);
    }, [abierto, haciaIzquierda]);

    const estilo = haciaIzquierda ? { left: 0, right: 'auto' } : { left: 'auto', right: 0 };

    return (
        <span className="menu-flotante-wrap">
            <button
                type="button"
                className={claseBoton}
                title={titulo}
                aria-label={titulo}
                aria-expanded={abierto}
                onClick={(e) => {
                    e.stopPropagation();
                    setHaciaIzquierda(false);
                    setAbierto((a) => !a);
                }}
            >
                <i className="fas fa-ellipsis-h"></i>
            </button>
            <div ref={menu} className="menu-flotante" hidden={!abierto} style={estilo}>
                {opciones.map((op) => (
                    <button
                        key={op.texto}
                        type="button"
                        onClick={() => {
                            setAbierto(false);
                            op.onClick();
                        }}
                    >
                        <i className={`fas ${op.icono}`}></i> {op.texto}
                    </button>
                ))}
            </div>
        </span>
    );
}
