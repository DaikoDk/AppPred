import { ArrowLineDown, ArrowLineUp, DotsThree, PaintBrush, Plus, Trash } from '@phosphor-icons/react';
import MenuAcciones from '../../components/ui/MenuAcciones.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { nombreDia } from '../../utils/dias.js';
import { FRANJAS, GRUPOS, GRUPO_LABEL, MODALIDADES } from '../../utils/constantes.js';
import ModalFormato from './ModalFormato.jsx';

/**
 * Piezas compartidas por el editor de pantalla ancha y el de móvil: ambos editan la misma lista de filas (RN-UI-09).
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').CampoFormato} CampoFormato
 * @typedef {import('../../types/models').Formato} Formato
 */

// Cada día pinta todos los campos de sus filas con su color (variable --dia)
/** @type {Record<Dia, string>} */
export const COLOR_DIA = {
    LUNES: 'var(--color-lunes)',
    MARTES: 'var(--color-martes)',
    MIERCOLES: 'var(--color-miercoles)',
    JUEVES: 'var(--color-jueves)',
    VIERNES: 'var(--color-viernes)',
    SABADO: 'var(--color-sabado)',
    DOMINGO: 'var(--color-domingo)'
};

export const CAMPO =
    'body-6 min-h-9 w-full min-w-0 rounded-lg border border-transparent bg-(--dia) px-3 py-2 text-ink outline-none transition-[border-color] duration-300 ease-skill placeholder:text-ink/50 hover:border-ink/20 focus-visible:border-ink';
export const CAMPO_LIBRE = `${CAMPO} border-dashed border-ink/30`;
export const BOTON_ICONO =
    'relative grid size-8 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-300 ease-skill hover:bg-fill hover:text-ink active:scale-[0.98]';

export const OPCIONES_HORA = FRANJAS.map((f) => ({ valor: f, etiqueta: f }));
export const OPCIONES_GRUPO = GRUPOS.map((g) => ({ valor: g, etiqueta: GRUPO_LABEL[g] || g }));
export const OPCIONES_MODALIDAD = MODALIDADES.map((m) => ({ valor: m, etiqueta: m }));

/** @param {string[]} puntos */
export const opcionesDePunto = (puntos) => [
    { valor: '', etiqueta: 'Sin punto' },
    ...puntos.map((p) => ({ valor: p, etiqueta: p }))
];

/**
 * Formato por celda (alineación, negrita, cursiva, tachado) como clases de vista previa.
 * La cursiva y el tachado son una opción del usuario para su programa, no del diseño de la interfaz.
 * @param {Formato} formato @param {CampoFormato} campo
 */
export function claseFormato(formato, campo) {
    const f = formato?.[campo];
    if (!f) return '';
    return [
        f.h === 'left' ? 'text-left' : f.h === 'center' ? 'text-center' : f.h === 'right' ? 'text-right' : '',
        f.b ? 'font-semibold' : '',
        f.i ? 'italic' : '',
        f.s ? 'line-through' : ''
    ]
        .filter(Boolean)
        .join(' ');
}

/**
 * Elementos del menú ⋯ de una fila: filas libres y formato de celdas.
 * @param {{ onLibre: (arriba: boolean) => void, onFormato: () => void }} acciones
 */
export const itemsMenuFila = ({ onLibre, onFormato }) => [
    { texto: 'Fila libre arriba', icono: ArrowLineUp, onClick: () => onLibre(true) },
    { texto: 'Fila libre abajo', icono: ArrowLineDown, onClick: () => onLibre(false) },
    { texto: 'Formato de celdas', icono: PaintBrush, onClick: onFormato }
];

/**
 * Botones de la fila en pantalla ancha: agregar turno debajo, quitar y menú ⋯.
 * @param {{
 *   fila: Fila,
 *   onAgregar: () => void,
 *   onQuitar: () => void,
 *   onLibre: (arriba: boolean) => void,
 *   onFormato: () => void
 * }} props
 */
export function AccionesFila({ fila, onAgregar, onQuitar, onLibre, onFormato }) {
    const conFormato = Object.keys(fila.formato || {}).length > 0;
    return (
        <div className="flex items-center justify-end">
            <button type="button" aria-label="Agregar turno debajo" onClick={onAgregar} className={BOTON_ICONO}>
                <Plus size={16} aria-hidden="true" />
            </button>
            <button
                type="button"
                aria-label="Quitar fila"
                onClick={onQuitar}
                className={`${BOTON_ICONO} hover:bg-danger-bg hover:text-danger`}
            >
                <Trash size={16} aria-hidden="true" />
            </button>
            <MenuAcciones
                etiqueta="Más acciones de la fila"
                items={itemsMenuFila({ onLibre, onFormato })}
                boton={({ ref, abierto, alternar }) => (
                    <button
                        ref={ref}
                        type="button"
                        aria-label="Más acciones de la fila"
                        aria-haspopup="menu"
                        aria-expanded={abierto}
                        onClick={alternar}
                        className={BOTON_ICONO}
                    >
                        <DotsThree size={16} weight="bold" aria-hidden="true" />
                        {conFormato && (
                            <span
                                aria-hidden="true"
                                className="absolute top-1 right-1 size-2 rounded-full bg-primary"
                            />
                        )}
                    </button>
                )}
            />
        </div>
    );
}

/**
 * Modal de formato de celdas de una fila. El cambio se guarda al guardar el programa (RN-FMT-04).
 * @param {{ fila: Fila, onAplicar: (formato: Formato) => void, onCerrar: () => void }} props
 */
export function ModalFormatoFila({ fila, onAplicar, onCerrar }) {
    const toast = useToast();
    return (
        <ModalFormato
            formato={fila.formato}
            esLibre={fila.tipo === 'extra'}
            descripcion={[
                nombreDia(fila.dia),
                fila.hora,
                fila.tipo === 'turno'
                    ? GRUPO_LABEL[/** @type {keyof typeof GRUPO_LABEL} */ (fila.grupo)] || fila.grupo
                    : fila.grupo
            ]
                .filter(Boolean)
                .join(' · ')}
            onCerrar={onCerrar}
            onAplicar={(formato) => {
                onAplicar(formato);
                toast('Formato aplicado. Se guarda al guardar el programa.', 'success');
            }}
        />
    );
}
