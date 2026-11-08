import { useState } from 'react';
import { CellSignalFull, Clock, MapPin, MapTrifold, UsersThree } from '@phosphor-icons/react';
import Desplegable from '../../components/ui/Desplegable.jsx';
import { nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import {
    AccionesFila,
    CAMPO,
    CAMPO_LIBRE,
    COLOR_DIA,
    ModalFormatoFila,
    OPCIONES_GRUPO,
    OPCIONES_HORA,
    OPCIONES_MODALIDAD,
    claseFormato,
    opcionesDePunto
} from './editorComun.jsx';
import { agregarLibreJunto, agregarTurnoDebajo, cambiarFila, quitarFila } from './filas.js';

/**
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Dia} Dia
 */

// Las columnas se reparten el ancho disponible; por debajo de 740 px la tabla se desplaza en horizontal
const COLUMNAS =
    'grid-cols-[minmax(120px,1.25fr)_minmax(92px,1fr)_minmax(84px,1fr)_minmax(108px,1.3fr)_minmax(76px,0.7fr)_96px]';

/**
 * Editor de turnos con chips del color de cada día. Se usa desde 769 px; en móvil se usa EditorMovil
 * (vista por día) y, en su vista por semana, este mismo editor con scroll horizontal.
 * @param {{
 *   filas: Fila[],
 *   onCambiar: (actualizar: (filas: Fila[]) => Fila[]) => void,
 *   puntos: string[],
 *   semanaInicio: string,
 *   onDiaTocado?: (dia: Dia) => void
 * }} props
 */
export default function EditorEscritorio({ filas, onCambiar, puntos, semanaInicio, onDiaTocado }) {
    const [formateando, setFormateando] = useState(/** @type {Fila | null} */ (null));
    const opcionesPunto = opcionesDePunto(puntos);

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

    // Al tocar una fila, su día pasa a ser el activo de "Ver por día" en móvil
    /** @param {import('react').SyntheticEvent} e */
    const tocado = (e) => {
        const dia = /** @type {HTMLElement} */ (e.target).closest?.('[data-dia]')?.getAttribute('data-dia');
        if (dia && onDiaTocado) onDiaTocado(/** @type {Dia} */ (dia));
    };

    const titulo = 'caption-3 flex items-center gap-1 px-1 uppercase tracking-wide';

    return (
        <>
            <div id="editor-escritorio" className="tw overflow-x-auto" onFocus={tocado} onPointerDown={tocado}>
                <div className="min-w-[740px]">
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
                                            onLibre={(arriba) =>
                                                onCambiar((x) => agregarLibreJunto(x, f.clave, arriba))
                                            }
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
            </div>
            {formateando && (
                <ModalFormatoFila
                    fila={formateando}
                    onCerrar={() => setFormateando(null)}
                    onAplicar={(formato) => {
                        editar(formateando.clave, { formato });
                        setFormateando(null);
                    }}
                />
            )}
        </>
    );
}
