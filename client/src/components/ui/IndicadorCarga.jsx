// @ts-check
import { useHayActividad } from '../../hooks/useHayActividad.js';

/**
 * Barra fina animada que avisa que se están cargando datos o una pantalla. No bloquea nada: no captura toques ni
 * tapa contenido. Se coloca en el borde de un contenedor posicionado (el encabezado). Con "reducir movimiento"
 * queda quieta pero visible.
 */
export default function IndicadorCarga() {
    const visible = useHayActividad();
    if (!visible) return null;
    return (
        <div
            role="progressbar"
            aria-busy="true"
            aria-label="Cargando"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-primary/15"
        >
            <div className="h-full w-1/3 animate-barra bg-primary" />
        </div>
    );
}
