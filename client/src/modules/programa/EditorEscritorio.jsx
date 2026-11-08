import { useRef, useState } from 'react';
import {
    ArrowLineDown,
    ArrowLineUp,
    CellSignalFull,
    Clock,
    DotsThree,
    MapPin,
    MapTrifold,
    PaintBrush,
    Plus,
    Trash,
    UsersThree
} from '@phosphor-icons/react';
import Desplegable from '../../components/ui/Desplegable.jsx';
import PanelFlotante from '../../components/ui/PanelFlotante.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import { FRANJAS, GRUPOS, GRUPO_LABEL, MODALIDADES } from '../../utils/constantes.js';
import ModalFormato from './ModalFormato.jsx';
import { agregarLibreJunto, agregarTurnoDebajo, cambiarFila, quitarFila } from './filas.js';

/**
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').CampoFormato} CampoFormato
 * @typedef {import('../../types/models').Formato} Formato
 */

// Cada día pinta todos los campos de sus filas con su color (variable --dia)
/** @type {Record<Dia, string>} */
const COLOR_DIA = {
    LUNES: 'var(--color-lunes)',
    MARTES: 'var(--color-martes)',
    MIERCOLES: 'var(--color-miercoles)',
    JUEVES: 'var(--color-jueves)',
    VIERNES: 'var(--color-viernes)',
    SABADO: 'var(--color-sabado)',
    DOMINGO: 'var(--color-domingo)'
};

const COLUMNAS = 'grid-cols-[200px_160px_minmax(160px,1fr)_minmax(200px,1.2fr)_120px_112px]';
const CAMPO =
    'body-6 min-h-9 w-full min-w-0 rounded-lg border border-transparent bg-(--dia) px-3 py-2 text-ink outline-none transition-[border-color] duration-300 ease-skill placeholder:text-ink/50 hover:border-ink/20 focus-visible:border-ink';
const CAMPO_LIBRE = `${CAMPO} border-dashed border-ink/30`;
const BOTON_ICONO =
    'relative grid size-8 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-300 ease-skill hover:bg-fill hover:text-ink active:scale-[0.98]';

const OPCIONES_HORA = FRANJAS.map((f) => ({ valor: f, etiqueta: f }));
const OPCIONES_GRUPO = GRUPOS.map((g) => ({ valor: g, etiqueta: GRUPO_LABEL[g] || g }));
const OPCIONES_MODALIDAD = MODALIDADES.map((m) => ({ valor: m, etiqueta: m }));

/**
 * Formato por celda (alineación, negrita, cursiva, tachado) como clases de vista previa.
 * La cursiva y el tachado son una opción del usuario para su programa, no del diseño de la interfaz.
 * @param {Formato} formato @param {CampoFormato} campo
 */
function claseFormato(formato, campo) {
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
 * Botones de la fila: agregar turno debajo, quitar y un menú con filas libres y formato.
 * @param {{
 *   fila: Fila,
 *   onAgregar: () => void,
 *   onQuitar: () => void,
 *   onLibre: (arriba: boolean) => void,
 *   onFormato: () => void
 * }} props
 */
function AccionesFila({ fila, onAgregar, onQuitar, onLibre, onFormato }) {
    const boton = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const [menu, setMenu] = useState(false);
    const conFormato = Object.keys(fila.formato || {}).length > 0;

    /** @param {() => void} accion */
    const elegir = (accion) => () => {
        setMenu(false);
        accion();
    };
    const itemMenu =
        'body-5 flex w-full items-center gap-2 rounded-lg p-2 text-left text-ink transition-colors duration-300 ease-skill hover:bg-fill';

    return (
        <div className="flex items-center justify-end gap-1">
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
            <button
                ref={boton}
                type="button"
                aria-label="Más acciones de la fila"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className={BOTON_ICONO}
            >
                <DotsThree size={16} weight="bold" aria-hidden="true" />
                {conFormato && (
                    <span aria-hidden="true" className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
                )}
            </button>
            {menu && (
                <PanelFlotante
                    origen={boton.current}
                    onCerrar={() => setMenu(false)}
                    anchoMin={232}
                    anchoMax={232}
                    alinearDerecha
                    rol="menu"
                    etiqueta="Más acciones de la fila"
                >
                    <button type="button" role="menuitem" className={itemMenu} onClick={elegir(() => onLibre(true))}>
                        <ArrowLineUp size={16} aria-hidden="true" />
                        Fila libre arriba
                    </button>
                    <button type="button" role="menuitem" className={itemMenu} onClick={elegir(() => onLibre(false))}>
                        <ArrowLineDown size={16} aria-hidden="true" />
                        Fila libre abajo
                    </button>
                    <button type="button" role="menuitem" className={itemMenu} onClick={elegir(onFormato)}>
                        <PaintBrush size={16} aria-hidden="true" />
                        Formato de celdas
                    </button>
                </PanelFlotante>
            )}
        </div>
    );
}

/**
 * Editor de turnos para pantallas anchas (1321 px o más). En pantallas más chicas se usa EditorTurnos,
 * que conserva su vista por día y por semana. Los dos editan la misma lista de filas.
 * @param {{
 *   filas: Fila[],
 *   onCambiar: (actualizar: (filas: Fila[]) => Fila[]) => void,
 *   puntos: string[],
 *   semanaInicio: string
 * }} props
 */
export default function EditorEscritorio({ filas, onCambiar, puntos, semanaInicio }) {
    const toast = useToast();
    const [formateando, setFormateando] = useState(/** @type {Fila | null} */ (null));
    const opcionesPunto = [{ valor: '', etiqueta: 'Sin punto' }, ...puntos.map((p) => ({ valor: p, etiqueta: p }))];

    /** @param {string} clave @param {object} cambio */
    const editar = (clave, cambio) => onCambiar((f) => cambiarFila(f, clave, cambio));

    // Filas agrupadas por día, en el orden en que están
    /** @type {{ dia: Dia, filas: Fila[] }[]} */
    const grupos = [];
    for (const f of filas) {
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.dia === f.dia) ultimo.filas.push(f);
        else grupos.push({ dia: f.dia, filas: [f] });
    }

    const titulo = 'caption-3 flex items-center gap-1 px-1 uppercase tracking-wide';

    return (
        <div id="editor-escritorio" className="tw overflow-x-auto">
            <div className="min-w-[1132px]">
                <div role="row" className={`ml-24 grid ${COLUMNAS} gap-2 pb-2 pl-2 text-muted`}>
                    <span className={titulo}>
                        <Clock size={14} aria-hidden="true" />
                        Hora
                    </span>
                    <span className={titulo}>
                        <UsersThree size={14} aria-hidden="true" />
                        Grupo
                    </span>
                    <span className={titulo}>
                        <MapTrifold size={14} aria-hidden="true" />
                        Territorio
                    </span>
                    <span className={titulo}>
                        <MapPin size={14} aria-hidden="true" />
                        P. Reunión
                    </span>
                    <span className={titulo}>
                        <CellSignalFull size={14} aria-hidden="true" />
                        Modalidad
                    </span>
                    <span></span>
                </div>

                {grupos.map((g) => (
                    <div
                        key={g.filas[0].clave}
                        data-dia={g.dia}
                        style={/** @type {import('react').CSSProperties} */ ({ '--dia': COLOR_DIA[g.dia] })}
                        className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 pb-4"
                    >
                        <div className="flex flex-col gap-0.5 self-stretch rounded-lg bg-(--dia) px-3 py-2 text-ink">
                            <b className="body-5">{nombreDia(g.dia)}</b>
                            <small className="caption-4 text-ink/60">{fechaDelDia(semanaInicio, g.dia)}</small>
                        </div>
                        <div className="grid gap-2">
                            {g.filas.map((f) => {
                                const acciones = (
                                    <AccionesFila
                                        fila={f}
                                        onAgregar={() => onCambiar((x) => agregarTurnoDebajo(x, f.clave))}
                                        onQuitar={() => onCambiar((x) => quitarFila(x, f.clave))}
                                        onLibre={(arriba) => onCambiar((x) => agregarLibreJunto(x, f.clave, arriba))}
                                        onFormato={() => setFormateando(f)}
                                    />
                                );

                                if (f.tipo === 'turno') {
                                    return (
                                        <div key={f.clave} role="row" className={`grid ${COLUMNAS} gap-2`}>
                                            <Desplegable
                                                rotulo="Hora"
                                                valor={f.hora}
                                                opciones={OPCIONES_HORA}
                                                onCambiar={(v) => editar(f.clave, { hora: v })}
                                                claseTexto={`font-medium ${claseFormato(f.formato, 'hora')}`}
                                            />
                                            <Desplegable
                                                rotulo="Grupo"
                                                valor={f.grupo}
                                                opciones={OPCIONES_GRUPO}
                                                onCambiar={(v) => editar(f.clave, { grupo: v })}
                                                claseTexto={claseFormato(f.formato, 'grupo')}
                                            />
                                            <input
                                                type="text"
                                                aria-label="Territorio"
                                                placeholder="Territorio"
                                                value={f.territorio}
                                                onChange={(e) => editar(f.clave, { territorio: e.target.value })}
                                                className={`${CAMPO} ${claseFormato(f.formato, 'territorio')}`}
                                            />
                                            <Desplegable
                                                rotulo="Punto de reunión"
                                                valor={f.punto_reunion}
                                                opciones={opcionesPunto}
                                                etiquetaVacio="Sin punto"
                                                anchoMin={320}
                                                onCambiar={(v) => editar(f.clave, { punto_reunion: v })}
                                                claseTexto={claseFormato(f.formato, 'punto_reunion')}
                                            />
                                            <Desplegable
                                                rotulo="Modalidad"
                                                valor={f.modalidad}
                                                opciones={OPCIONES_MODALIDAD}
                                                onCambiar={(v) => editar(f.clave, { modalidad: v })}
                                            />
                                            {acciones}
                                        </div>
                                    );
                                }

                                /** @param {'hora' | 'grupo' | 'territorio' | 'punto_reunion' | 'conductor'} campo @param {string} nombre */
                                const libre = (campo, nombre) => (
                                    <input
                                        type="text"
                                        aria-label={`${nombre} libre`}
                                        placeholder={nombre}
                                        value={f[campo]}
                                        onChange={(e) => editar(f.clave, { [campo]: e.target.value })}
                                        className={`${CAMPO_LIBRE} ${claseFormato(f.formato, campo)}`}
                                    />
                                );
                                return (
                                    <div key={f.clave} role="row" className={`grid ${COLUMNAS} gap-2`}>
                                        {libre('hora', 'Hora')}
                                        {libre('grupo', 'Grupo')}
                                        {libre('territorio', 'Territorio')}
                                        {libre('punto_reunion', 'P. Reunión')}
                                        {libre('conductor', 'Conductor')}
                                        {acciones}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {formateando && (
                <ModalFormato
                    formato={formateando.formato}
                    esLibre={formateando.tipo === 'extra'}
                    descripcion={[
                        nombreDia(formateando.dia),
                        formateando.hora,
                        formateando.tipo === 'turno'
                            ? GRUPO_LABEL[/** @type {keyof typeof GRUPO_LABEL} */ (formateando.grupo)] ||
                              formateando.grupo
                            : formateando.grupo
                    ]
                        .filter(Boolean)
                        .join(' · ')}
                    onCerrar={() => setFormateando(null)}
                    onAplicar={(formato) => {
                        editar(formateando.clave, { formato });
                        setFormateando(null);
                        toast('Formato aplicado. Se guarda al guardar el programa.', 'success');
                    }}
                />
            )}
        </div>
    );
}
