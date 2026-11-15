// @ts-check
import { DotsThree, PaintBrush } from '@phosphor-icons/react';
import MenuAcciones from '../../components/ui/MenuAcciones.jsx';

// Mismo botón ⋯ que el editor de Programa (modules/programa/editorComun.jsx); se copian las clases porque los módulos no se importan entre sí
const BOTON_ICONO =
    'relative grid size-8 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-300 ease-skill hover:bg-fill hover:text-ink active:scale-[0.98]';

/**
 * Menú ⋯ de una fila de Resultados: abre el formato de celdas (RN-FMT-05). El punto marca las filas que ya tienen formato.
 * @param {{ conFormato: boolean, onFormato: () => void, className?: string }} props
 */
export default function MenuFormatoFila({ conFormato, onFormato, className = '' }) {
    return (
        <MenuAcciones
            etiqueta="Más acciones de la fila"
            items={[{ texto: 'Formato de celdas', icono: PaintBrush, onClick: onFormato }]}
            boton={({ ref, abierto, alternar }) => (
                <button
                    ref={ref}
                    type="button"
                    aria-label="Más acciones de la fila"
                    aria-haspopup="menu"
                    aria-expanded={abierto}
                    onClick={alternar}
                    className={`${BOTON_ICONO} ${className}`}
                >
                    <DotsThree size={16} weight="bold" aria-hidden="true" />
                    {conFormato && (
                        <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
                    )}
                </button>
            )}
        />
    );
}
