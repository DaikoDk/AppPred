import IndicadorCarga from './IndicadorCarga.jsx';

/**
 * Encabezado de tarjeta: ícono en caja, título y subtítulo. Mide 80px como mínimo con o sin subtítulo, para que
 * todas las pestañas tengan la misma altura. Muestra el indicador de carga flotando en su borde inferior. La tarjeta es de radio 24 con relleno de 16,
 * así que las formas interiores (la caja del ícono) quedan en 8, como pide la fórmula de radios anidados.
 * @param {{
 *   icono: import('react').ComponentType<{ size?: number, weight?: 'regular' | 'bold' | 'fill', 'aria-hidden'?: boolean | 'true' }>,
 *   titulo: import('react').ReactNode,
 *   subtitulo?: string,
 *   sinCaja?: boolean,
 *   claseTitulo?: string
 * }} props
 */
export default function EncabezadoTarjeta({ icono: Icono, titulo, subtitulo, sinCaja = false, claseTitulo = '' }) {
    return (
        <div className="relative flex min-h-20 items-center gap-3 border-b border-line p-4">
            <span
                className={`grid size-10 shrink-0 place-items-center rounded-lg text-primary ${sinCaja ? '' : 'bg-fill'}`}
            >
                <Icono size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h3 className={`heading-6 text-ink ${claseTitulo}`}>{titulo}</h3>
                {subtitulo && <p className="body-6 text-muted">{subtitulo}</p>}
            </div>
            {/* Flotante (absoluta) en el borde inferior: avisa que se cargan datos sin cambiar el alto del encabezado */}
            <IndicadorCarga />
        </div>
    );
}
