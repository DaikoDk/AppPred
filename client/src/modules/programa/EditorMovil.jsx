import { useRef, useState } from 'react';
import { CalendarBlank, CalendarDots, CaretLeft, CaretRight, DotsThree, Plus, Trash } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import Desplegable from '../../components/ui/Desplegable.jsx';
import MenuAcciones from '../../components/ui/MenuAcciones.jsx';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import EditorEscritorio from './EditorEscritorio.jsx';
import {
    CAMPO,
    CAMPO_LIBRE,
    COLOR_DIA,
    ModalFormatoFila,
    OPCIONES_GRUPO,
    OPCIONES_HORA,
    OPCIONES_MODALIDAD,
    claseFormato,
    itemsMenuFila,
    opcionesDePunto
} from './editorComun.jsx';
import { agregarLibreJunto, agregarTurnoAlDia, agregarTurnoDebajo, cambiarFila, quitarFila } from './filas.js';

/**
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {'dia' | 'semana'} Vista
 */

/** @returns {Vista} */
function leerVista() {
    try {
        return localStorage.getItem('vistaTurnos') === 'semana' ? 'semana' : 'dia';
    } catch {
        return 'dia';
    }
}

/** @param {{ idx: number, onMover: (delta: number) => void }} props */
function DiaNav({ idx, onMover }) {
    const n = DIAS.length;
    const lado =
        'button-sm flex min-w-0 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-[transform,background-color] duration-300 ease-skill hover:bg-fill active:scale-[0.98]';
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button type="button" className={lado} onClick={() => onMover(-1)}>
                <CaretLeft size={16} aria-hidden="true" />
                <span className="truncate">{nombreDia(DIAS[(idx + n - 1) % n])}</span>
            </button>
            <span className="button-sm rounded-lg bg-primary px-4 py-2 text-white" aria-current="true">
                {nombreDia(DIAS[idx])}
            </span>
            <button type="button" className={lado} onClick={() => onMover(1)}>
                <span className="truncate">{nombreDia(DIAS[(idx + 1) % n])}</span>
                <CaretRight size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

/** @param {{ etiqueta: string, ancho?: boolean, children: import('react').ReactNode }} props */
function Campo({ etiqueta, ancho = false, children }) {
    return (
        <div className={`min-w-0 ${ancho ? 'col-span-2' : ''}`}>
            <span className="caption-4 mb-1 block text-muted">{etiqueta}</span>
            {children}
        </div>
    );
}

/**
 * Editor de turnos para móvil: por día (una tarjeta por fila) o por semana (la tabla con scroll horizontal).
 * Edita la misma lista de filas que el editor de pantalla ancha.
 * @param {{
 *   filas: Fila[],
 *   onCambiar: (actualizar: (filas: Fila[]) => Fila[]) => void,
 *   puntos: string[],
 *   semanaInicio: string
 * }} props
 */
export default function EditorMovil({ filas, onCambiar, puntos, semanaInicio }) {
    const contenedor = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [vista, setVista] = useState(leerVista);
    const [diaIdx, setDiaIdx] = useState(0);
    const [formateando, setFormateando] = useState(/** @type {Fila | null} */ (null));
    const opcionesPunto = opcionesDePunto(puntos);
    const diaActivo = DIAS[diaIdx];
    const filasDia = filas.filter((f) => f.dia === diaActivo);

    /** @param {string} clave @param {object} cambio */
    const editar = (clave, cambio) => onCambiar((f) => cambiarFila(f, clave, cambio));

    /** @param {Vista} v */
    const cambiarVista = (v) => {
        setVista(v);
        try {
            localStorage.setItem('vistaTurnos', v);
        } catch {
            // sin almacenamiento: la vista no se recuerda
        }
        if (v === 'dia') contenedor.current?.scrollIntoView({ block: 'start' });
    };

    /** @param {number} delta */
    const moverDia = (delta) => {
        const n = DIAS.length;
        setDiaIdx((i) => (((i + delta) % n) + n) % n);
        contenedor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div ref={contenedor} className="tw">
            <div className="mb-4 flex justify-center">
                <div className="inline-flex gap-1 rounded-xl bg-fill p-1" role="group" aria-label="Vista del programa">
                    {
                        /** @type {const} */ ([
                            ['dia', CalendarBlank, 'Ver por día'],
                            ['semana', CalendarDots, 'Ver por semana']
                        ]).map(([v, Icono, texto]) => (
                            <button
                                key={v}
                                type="button"
                                aria-pressed={vista === v}
                                onClick={() => cambiarVista(v)}
                                className={`button-sm flex items-center gap-2 rounded-lg px-3 py-2 transition-[background-color,color,transform] duration-300 ease-skill active:scale-[0.98] ${
                                    vista === v ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                                }`}
                            >
                                <Icono size={16} aria-hidden="true" />
                                {texto}
                            </button>
                        ))
                    }
                </div>
            </div>

            {vista === 'semana' ? (
                <EditorEscritorio
                    filas={filas}
                    onCambiar={onCambiar}
                    puntos={puntos}
                    semanaInicio={semanaInicio}
                    onDiaTocado={(dia) => setDiaIdx(Math.max(0, DIAS.indexOf(dia)))}
                />
            ) : (
                <>
                    <DiaNav idx={diaIdx} onMover={moverDia} />
                    <div className="mt-4 mb-3 flex items-baseline gap-2">
                        <h4 className="heading-6 text-ink">{nombreDia(diaActivo)}</h4>
                        <span className="body-6 text-muted">{fechaDelDia(semanaInicio, diaActivo)}</span>
                    </div>

                    <div className="grid gap-3">
                        {filasDia.map((f) => {
                            const menu = (
                                <MenuAcciones
                                    etiqueta="Más acciones de la fila"
                                    alinearDerecha={false}
                                    items={itemsMenuFila({
                                        onLibre: (arriba) => onCambiar((x) => agregarLibreJunto(x, f.clave, arriba)),
                                        onFormato: () => setFormateando(f)
                                    })}
                                    boton={({ ref, abierto, alternar }) => (
                                        <Boton
                                            ref={ref}
                                            variante="secundario"
                                            aria-label="Más acciones de la fila"
                                            aria-haspopup="menu"
                                            aria-expanded={abierto}
                                            onClick={alternar}
                                            className="relative"
                                        >
                                            <DotsThree size={16} weight="bold" aria-hidden="true" />
                                            {Object.keys(f.formato || {}).length > 0 && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute top-1 right-1 size-2 rounded-full bg-primary"
                                                />
                                            )}
                                        </Boton>
                                    )}
                                />
                            );
                            const acciones = (
                                <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                                    <Boton
                                        compacto
                                        variante="secundario"
                                        icono={Plus}
                                        onClick={() => onCambiar((x) => agregarTurnoDebajo(x, f.clave))}
                                    >
                                        Agregar fila
                                    </Boton>
                                    <Boton
                                        compacto
                                        variante="peligro"
                                        icono={Trash}
                                        onClick={() => onCambiar((x) => quitarFila(x, f.clave))}
                                    >
                                        Eliminar fila
                                    </Boton>
                                    {menu}
                                </div>
                            );
                            const tarjeta = 'rounded-lg border border-line bg-surface p-2';

                            if (f.tipo === 'turno') {
                                return (
                                    <div
                                        key={f.clave}
                                        style={
                                            /** @type {import('react').CSSProperties} */ ({
                                                '--dia': COLOR_DIA[f.dia]
                                            })
                                        }
                                        className={tarjeta}
                                    >
                                        <div className="grid grid-cols-2 gap-2">
                                            <Campo etiqueta="Hora" ancho>
                                                <Desplegable
                                                    rotulo="Hora"
                                                    valor={f.hora}
                                                    opciones={OPCIONES_HORA}
                                                    onCambiar={(v) => editar(f.clave, { hora: v })}
                                                    claseTexto={`font-medium ${claseFormato(f.formato, 'hora')}`}
                                                />
                                            </Campo>
                                            <Campo etiqueta="Grupo">
                                                <Desplegable
                                                    rotulo="Grupo"
                                                    valor={f.grupo}
                                                    opciones={OPCIONES_GRUPO}
                                                    onCambiar={(v) => editar(f.clave, { grupo: v })}
                                                    claseTexto={claseFormato(f.formato, 'grupo')}
                                                />
                                            </Campo>
                                            <Campo etiqueta="Territorio">
                                                <input
                                                    type="text"
                                                    aria-label="Territorio"
                                                    placeholder="Territorio"
                                                    value={f.territorio}
                                                    onChange={(e) => editar(f.clave, { territorio: e.target.value })}
                                                    className={`${CAMPO} ${claseFormato(f.formato, 'territorio')}`}
                                                />
                                            </Campo>
                                            <Campo etiqueta="P. Reunión">
                                                <Desplegable
                                                    rotulo="Punto de reunión"
                                                    valor={f.punto_reunion}
                                                    opciones={opcionesPunto}
                                                    etiquetaVacio="Sin punto"
                                                    anchoMin={280}
                                                    onCambiar={(v) => editar(f.clave, { punto_reunion: v })}
                                                    claseTexto={claseFormato(f.formato, 'punto_reunion')}
                                                />
                                            </Campo>
                                            <Campo etiqueta="Modalidad">
                                                <Desplegable
                                                    rotulo="Modalidad"
                                                    valor={f.modalidad}
                                                    opciones={OPCIONES_MODALIDAD}
                                                    onCambiar={(v) => editar(f.clave, { modalidad: v })}
                                                />
                                            </Campo>
                                        </div>
                                        {acciones}
                                    </div>
                                );
                            }

                            /** @param {'hora' | 'grupo' | 'territorio' | 'punto_reunion' | 'conductor'} campo @param {string} nombre @param {boolean} [ancho] */
                            const libre = (campo, nombre, ancho = false) => (
                                <Campo etiqueta={nombre} ancho={ancho}>
                                    <input
                                        type="text"
                                        aria-label={`${nombre} libre`}
                                        placeholder={nombre}
                                        value={f[campo]}
                                        onChange={(e) => editar(f.clave, { [campo]: e.target.value })}
                                        className={`${CAMPO_LIBRE} ${claseFormato(f.formato, campo)}`}
                                    />
                                </Campo>
                            );
                            return (
                                <div
                                    key={f.clave}
                                    style={/** @type {import('react').CSSProperties} */ ({ '--dia': COLOR_DIA[f.dia] })}
                                    className={tarjeta}
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        {libre('hora', 'Hora', true)}
                                        {libre('grupo', 'Grupo')}
                                        {libre('territorio', 'Territorio')}
                                        {libre('punto_reunion', 'P. Reunión')}
                                        {libre('conductor', 'Conductor')}
                                    </div>
                                    {acciones}
                                </div>
                            );
                        })}
                    </div>

                    {filasDia.length === 0 && (
                        <div className="rounded-lg bg-canvas p-6 text-center">
                            <p className="body-6 mb-3 text-muted">Sin filas este día.</p>
                            <Boton
                                variante="primario"
                                icono={Plus}
                                onClick={() => onCambiar((f) => agregarTurnoAlDia(f, diaActivo))}
                            >
                                Agregar fila
                            </Boton>
                        </div>
                    )}

                    <div className="mt-4">
                        <DiaNav idx={diaIdx} onMover={moverDia} />
                    </div>
                </>
            )}

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
        </div>
    );
}
