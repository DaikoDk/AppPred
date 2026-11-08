const BASE =
    'button-sm inline-flex cursor-pointer items-center justify-center gap-0.5 rounded-lg border py-2 transition-[transform,background-color,border-color] duration-300 ease-skill active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

// Estándar de botones: acciones sobre un elemento (Ver, Editar) y principales (Guardar) en azul sólido (primario); confirmación y
// exportación (Sheets) en verde sólido (exito); destructivas (Eliminar, Limpiar) en rojo sólido (peligro); descargas de imagen (PNG) en violeta (acento);
// neutras o de cancelar (Cancelar, Cerrar) con fondo blanco y borde (secundario).
// Clases completas y estáticas para que Tailwind las detecte
const VARIANTES = {
    primario: 'border-transparent bg-primary text-white hover:bg-primary-dark',
    secundario: 'border-line bg-surface text-ink hover:bg-fill',
    exito: 'border-transparent bg-ok text-white hover:bg-[#17703d]',
    peligro: 'border-transparent bg-danger text-white hover:bg-[#b42318]',
    advertencia: 'border-transparent bg-warn text-white hover:bg-[#7a4800]',
    acento: 'border-transparent bg-acento text-white hover:bg-acento-dark'
};

/**
 * Botón del sistema de diseño (Button-sm: 14/20 semibold, relleno de 8 y 12). Va dentro de un contenedor `tw`.
 * @param {import('react').ButtonHTMLAttributes<HTMLButtonElement> & {
 *   ref?: import('react').Ref<HTMLButtonElement>,
 *   variante?: keyof typeof VARIANTES,
 *   icono?: import('react').ComponentType<{ size?: number, weight?: 'regular' | 'bold' | 'fill', 'aria-hidden'?: boolean | 'true' }>,
 *   soloIcono?: boolean,
 *   compacto?: boolean
 * }} props
 */
export default function Boton({
    variante = 'secundario',
    icono: Icono,
    soloIcono = false,
    compacto = false,
    className = '',
    children,
    type = 'button',
    ...resto
}) {
    return (
        <button
            type={type}
            className={`${BASE} ${compacto ? 'px-2' : 'px-3'} ${VARIANTES[variante]} ${className}`}
            {...resto}
        >
            {Icono && <Icono size={16} aria-hidden="true" />}
            {soloIcono ? <span className="sr-only">{children}</span> : children}
        </button>
    );
}
