import { useRef, useState } from 'react';
import PanelFlotante from './PanelFlotante.jsx';

/**
 * @typedef {{
 *   texto: string,
 *   icono: import('react').ComponentType<{ size?: number, 'aria-hidden'?: boolean | 'true' }>,
 *   onClick: () => void
 * }} ItemMenu
 */

/**
 * Botón con un menú que flota sobre el contenido sin empujarlo (RN-UI-03). El botón lo dibuja quien lo usa.
 * @param {{
 *   etiqueta: string,
 *   items: ItemMenu[],
 *   boton: (props: { ref: import('react').RefObject<HTMLButtonElement | null>, abierto: boolean, alternar: () => void }) => import('react').ReactNode,
 *   alinearDerecha?: boolean
 * }} props
 */
export default function MenuAcciones({ etiqueta, items, boton, alinearDerecha = true }) {
    const origen = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const [abierto, setAbierto] = useState(false);
    const itemClase =
        'body-5 flex w-full items-center gap-2 rounded-lg p-2 text-left text-ink transition-colors duration-300 ease-skill hover:bg-fill';

    return (
        <>
            {boton({ ref: origen, abierto, alternar: () => setAbierto((a) => !a) })}
            {abierto && (
                <PanelFlotante
                    origen={origen.current}
                    onCerrar={() => setAbierto(false)}
                    anchoMin={232}
                    anchoMax={280}
                    alinearDerecha={alinearDerecha}
                    rol="menu"
                    etiqueta={etiqueta}
                >
                    {items.map((it) => (
                        <button
                            key={it.texto}
                            type="button"
                            role="menuitem"
                            className={itemClase}
                            onClick={() => {
                                setAbierto(false);
                                it.onClick();
                            }}
                        >
                            <it.icono size={16} aria-hidden="true" />
                            {it.texto}
                        </button>
                    ))}
                </PanelFlotante>
            )}
        </>
    );
}
