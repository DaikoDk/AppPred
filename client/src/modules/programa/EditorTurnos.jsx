import { useEffect, useRef, useState } from 'react';
import DiaBadge from '../../components/ui/DiaBadge.jsx';
import SelectRecortable from '../../components/ui/SelectRecortable.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import { FRANJAS, GRUPOS, GRUPO_LABEL, MODALIDADES } from '../../utils/constantes.js';
import ModalFormato from './ModalFormato.jsx';
import {
    agregarLibreJunto,
    agregarTurnoAlDia,
    agregarTurnoDebajo,
    cambiarFila,
    clasesFormato,
    quitarFila
} from './filas.js';

/**
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {'dia' | 'semana'} Vista
 */

// Colores de fondo por día (DAY_COLORS de la app anterior)
const COLOR_DIA = {
    LUNES: '#fbe4d5',
    MARTES: '#e2efd9',
    MIERCOLES: '#deeaf6',
    JUEVES: '#fff2cc',
    VIERNES: '#ead1dc',
    SABADO: '#ffdfc0',
    DOMINGO: '#ffe599'
};
// Estilos en línea copiados de la app anterior para que la tabla se vea igual
const CELDA = { padding: '1px 2px', borderBottom: '1px solid #ddd' };
const CELDA_LIBRE = { padding: '2px 6px', borderBottom: '1px dashed #ccc' };
const COMPACTO = {
    fontSize: '0.75rem',
    padding: '0 2px',
    height: 'auto',
    lineHeight: 1.1,
    borderWidth: 1,
    boxSizing: /** @type {const} */ ('border-box')
};
/** @param {string} ancho */
const estiloInputLibre = (ancho) => ({
    width: ancho,
    border: '1px solid #ddd',
    borderRadius: 3,
    padding: '2px 4px',
    fontSize: '0.7rem'
});

/** @returns {Vista} */
function leerVista() {
    try {
        return localStorage.getItem('vistaTurnos') === 'semana' ? 'semana' : 'dia';
    } catch {
        return 'dia';
    }
}

/**
 * Navegación entre días de la vista por día.
 * @param {{ idx: number, onMover: (delta: number) => void }} props
 */
function DiaNav({ idx, onMover }) {
    const n = DIAS.length;
    return (
        <div className="dia-nav">
            <button type="button" className="dia-nav-btn" onClick={() => onMover(-1)}>
                <i className="fas fa-chevron-left"></i>{' '}
                <span className="dia-nav-prev">{nombreDia(DIAS[(idx + n - 1) % n])}</span>
            </button>{' '}
            <span className="dia-nav-act">{nombreDia(DIAS[idx])}</span>{' '}
            <button type="button" className="dia-nav-btn" onClick={() => onMover(1)}>
                <span className="dia-nav-next">{nombreDia(DIAS[(idx + 1) % n])}</span>{' '}
                <i className="fas fa-chevron-right"></i>
            </button>
        </div>
    );
}

/**
 * Botones de cada fila: agregar turno, fila libre arriba/abajo, quitar, ⋯ y formato.
 * Los espacios entre botones replican los del HTML actual.
 * @param {{ fila: Fila, abierto: boolean, onAccion: (a: 'turno' | 'arriba' | 'abajo' | 'quitar' | 'mas' | 'formato') => void, estilo: object }} props
 */
function CeldaAcciones({ fila, abierto, onAccion, estilo }) {
    return (
        <td style={{ ...estilo, whiteSpace: 'nowrap', textAlign: 'right' }} className={abierto ? 'abierto' : undefined}>
            <button
                type="button"
                onClick={() => onAccion('turno')}
                className="add-btn add-btn-turno"
                title="Agregar turno"
            >
                <i className="fas fa-plus"></i>
            </button>{' '}
            <button
                type="button"
                onClick={() => onAccion('arriba')}
                className="add-btn add-btn-extra"
                title="Agregar fila vacía arriba"
            >
                <i className="fas fa-arrow-up"></i>
            </button>{' '}
            <button
                type="button"
                onClick={() => onAccion('abajo')}
                className="add-btn add-btn-extra"
                title="Agregar fila vacía abajo"
            >
                <i className="fas fa-arrow-down"></i>
            </button>{' '}
            <button
                type="button"
                onClick={() => onAccion('quitar')}
                className={fila.tipo === 'turno' ? 'del-btn' : 'btn-extra-del'}
            >
                <i className="fa-regular fa-trash-can"></i>
            </button>
            <button type="button" className="mas-btn" onClick={() => onAccion('mas')} title="Más acciones">
                <i className="fas fa-ellipsis-h"></i>
            </button>
            <button type="button" className="fmt-btn" onClick={() => onAccion('formato')} title="Formato de celdas">
                <i className="fas fa-paintbrush"></i>
            </button>
        </td>
    );
}

/**
 * Editor de turnos del programa: tabla tipo hoja de cálculo con vista por día y por semana en móvil.
 * Mismo marcado, clases y atributos que el editor actual para reutilizar styles.css sin cambios.
 * @param {{
 *   filas: Fila[],
 *   onCambiar: (actualizar: (filas: Fila[]) => Fila[]) => void,
 *   puntos: string[],
 *   semanaInicio: string
 * }} props
 */
export default function EditorTurnos({ filas, onCambiar, puntos, semanaInicio }) {
    const toast = useToast();
    const contenedor = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [vista, setVista] = useState(leerVista);
    const [diaIdx, setDiaIdx] = useState(0);
    const [abierto, setAbierto] = useState(/** @type {string | null} */ (null));
    const [formateando, setFormateando] = useState(/** @type {Fila | null} */ (null));

    // El menú ⋯ de la fila se cierra al tocar fuera (como el listener global de la app anterior)
    useEffect(() => {
        if (!abierto) return undefined;
        const cerrar = (/** @type {MouseEvent} */ e) => {
            const t = /** @type {HTMLElement} */ (e.target);
            if (!t.closest('.mas-btn') && !t.closest('td.abierto')) setAbierto(null);
        };
        document.addEventListener('click', cerrar);
        return () => document.removeEventListener('click', cerrar);
    }, [abierto]);

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

    // Al tocar una fila, su día pasa a ser el activo de "Ver por día" (recordarDiaActivo)
    const recordarDia = (/** @type {import('react').SyntheticEvent} */ e) => {
        const tr = /** @type {HTMLElement} */ (e.target).closest?.('tr[data-dia]');
        const i = tr ? DIAS.indexOf(/** @type {Dia} */ (/** @type {HTMLElement} */ (tr).dataset.dia)) : -1;
        if (i >= 0 && i !== diaIdx) setDiaIdx(i);
    };

    /** @param {Fila} fila @param {Parameters<typeof CeldaAcciones>[0]['onAccion'] extends (a: infer A) => void ? A : never} accion */
    const accion = (fila, accion) => {
        if (accion === 'turno') onCambiar((f) => agregarTurnoDebajo(f, fila.clave));
        else if (accion === 'arriba') onCambiar((f) => agregarLibreJunto(f, fila.clave, true));
        else if (accion === 'abajo') onCambiar((f) => agregarLibreJunto(f, fila.clave, false));
        else if (accion === 'quitar') onCambiar((f) => quitarFila(f, fila.clave));
        else if (accion === 'mas') setAbierto((a) => (a === fila.clave ? null : fila.clave));
        else if (accion === 'formato') {
            setAbierto(null);
            setFormateando(fila);
        }
    };

    /** @param {string} clave @param {object} cambio */
    const editar = (clave, cambio) => onCambiar((f) => cambiarFila(f, clave, cambio));

    // Marcas por día: primera fila (badge y etiqueta) y última (cierre del bloque)
    /** @type {Record<string, string>} */
    const primera = {};
    /** @type {Record<string, string>} */
    const ultima = {};
    for (const f of filas) {
        primera[f.dia] ??= f.clave;
        ultima[f.dia] = f.clave;
    }
    const diaActivo = DIAS[diaIdx];
    const hayFilasDia = filas.some((f) => f.dia === diaActivo);
    const fechaActiva = fechaDelDia(semanaInicio, diaActivo);

    const opcionesPunto =
        puntos.length === 0 ? (
            <option value="">— Sin puntos —</option>
        ) : (
            <>
                <option value="">—</option>
                {puntos.map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                ))}
            </>
        );

    return (
        <div
            id="turnos-container"
            ref={contenedor}
            data-vista={vista}
            onFocus={recordarDia}
            onPointerDown={recordarDia}
        >
            <div className="vista-toolbar">
                <div className="vista-switch">
                    {
                        /** @type {const} */ ([
                            ['dia', 'far fa-calendar', 'Ver por día'],
                            ['semana', 'fas fa-calendar-week', 'Ver por semana']
                        ]).map(([v, icono, texto]) => (
                            <button
                                key={v}
                                type="button"
                                className={`vista-opt${vista === v ? ' active' : ''}`}
                                data-vista={v}
                                onClick={() => cambiarVista(v)}
                            >
                                <i className={icono}></i> {texto}
                            </button>
                        ))
                    }
                </div>
                <DiaNav idx={diaIdx} onMover={moverDia} />
                <div className="dia-titulo">
                    <strong id="dia-titulo-nombre">{nombreDia(diaActivo)}</strong>
                    <span id="dia-titulo-fecha">{fechaActiva}</span>
                </div>
            </div>

            <div className="table-container">
                <table className="table" id="programa-table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                        <tr>
                            <th>
                                <i className="fa-regular fa-calendar"></i> Día
                            </th>
                            <th>
                                <i className="fa-regular fa-clock"></i> Hora
                            </th>
                            <th>
                                <i className="fa-solid fa-users"></i> Grupo
                            </th>
                            <th>
                                <i className="fa-solid fa-map-location-dot"></i> Territorio
                            </th>
                            <th>
                                <i className="fa-solid fa-location-dot"></i> P. Reunión
                            </th>
                            <th>
                                <i className="fa-solid fa-signal"></i> Modalidad
                            </th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((f) => {
                            const esPrimera = primera[f.dia] === f.clave;
                            const fecha = fechaDelDia(semanaInicio, f.dia);
                            const oculta = vista === 'dia' && f.dia !== diaActivo;
                            const clases = [
                                f.tipo === 'turno' ? 'programa-row' : 'extra-fila-row',
                                Object.keys(f.formato || {}).length > 0 ? 'con-formato' : '',
                                oculta ? 'fila-oculta' : ''
                            ]
                                .filter(Boolean)
                                .join(' ');
                            const comunes = {
                                className: clases,
                                'data-dia': f.dia,
                                'data-dia-label': esPrimera
                                    ? `${nombreDia(f.dia)}${fecha ? ' · ' + fecha : ''}`
                                    : undefined,
                                'data-dia-fin': ultima[f.dia] === f.clave ? 'true' : undefined,
                                style: { background: COLOR_DIA[f.dia] || '#fff' }
                            };
                            const badge = esPrimera ? <DiaBadge dia={f.dia} fecha={fecha} /> : null;

                            if (f.tipo === 'turno') {
                                return (
                                    <tr key={f.clave} {...comunes}>
                                        <td
                                            className="dia-cell"
                                            style={{ ...CELDA, fontWeight: 600, fontSize: '0.7rem' }}
                                        >
                                            {badge}
                                        </td>
                                        <td style={CELDA} className={clasesFormato(f.formato, 'hora') || undefined}>
                                            <SelectRecortable
                                                className="form-control turno-hora"
                                                style={COMPACTO}
                                                value={f.hora}
                                                onChange={(e) => editar(f.clave, { hora: e.target.value })}
                                            >
                                                {FRANJAS.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </SelectRecortable>
                                        </td>
                                        <td style={CELDA} className={clasesFormato(f.formato, 'grupo') || undefined}>
                                            <SelectRecortable
                                                className="form-control turno-grupo"
                                                style={COMPACTO}
                                                value={f.grupo}
                                                onChange={(e) => editar(f.clave, { grupo: e.target.value })}
                                            >
                                                {GRUPOS.map((g) => (
                                                    <option key={g} value={g}>
                                                        {GRUPO_LABEL[g] || g}
                                                    </option>
                                                ))}
                                            </SelectRecortable>
                                        </td>
                                        <td
                                            style={CELDA}
                                            className={clasesFormato(f.formato, 'territorio') || undefined}
                                        >
                                            <input
                                                type="text"
                                                className="form-control turno-territorio"
                                                style={COMPACTO}
                                                value={f.territorio}
                                                onChange={(e) => editar(f.clave, { territorio: e.target.value })}
                                            />
                                        </td>
                                        <td
                                            style={CELDA}
                                            className={clasesFormato(f.formato, 'punto_reunion') || undefined}
                                        >
                                            <SelectRecortable
                                                className="form-control turno-punto"
                                                style={COMPACTO}
                                                value={f.punto_reunion}
                                                onChange={(e) => editar(f.clave, { punto_reunion: e.target.value })}
                                            >
                                                {opcionesPunto}
                                            </SelectRecortable>
                                        </td>
                                        <td style={CELDA}>
                                            <SelectRecortable
                                                className="form-control turno-modalidad"
                                                style={COMPACTO}
                                                value={f.modalidad}
                                                onChange={(e) => editar(f.clave, { modalidad: e.target.value })}
                                            >
                                                {MODALIDADES.map((m) => (
                                                    <option key={m} value={m}>
                                                        {m}
                                                    </option>
                                                ))}
                                            </SelectRecortable>
                                        </td>
                                        <CeldaAcciones
                                            fila={f}
                                            abierto={abierto === f.clave}
                                            onAccion={(a) => accion(f, a)}
                                            estilo={CELDA}
                                        />
                                    </tr>
                                );
                            }

                            /** @param {'hora' | 'grupo' | 'territorio' | 'punto_reunion' | 'conductor'} campo @param {string} clase @param {string} ph @param {string} ancho */
                            const celdaLibre = (campo, clase, ph, ancho) => (
                                <td style={CELDA_LIBRE} className={clasesFormato(f.formato, campo) || undefined}>
                                    <input
                                        type="text"
                                        className={clase}
                                        placeholder={ph}
                                        style={estiloInputLibre(ancho)}
                                        value={f[campo]}
                                        onChange={(e) => editar(f.clave, { [campo]: e.target.value })}
                                    />
                                </td>
                            );
                            return (
                                <tr key={f.clave} {...comunes} data-antes={f.antes ? 'true' : 'false'}>
                                    <td style={CELDA_LIBRE}>{badge}</td>
                                    {celdaLibre('hora', 'extra-fila-hora', 'Hora', '70px')}
                                    {celdaLibre('grupo', 'extra-fila-grupo', 'Grupo', '100%')}
                                    {celdaLibre('territorio', 'extra-fila-territorio', 'Territorio', '100%')}
                                    {celdaLibre('punto_reunion', 'extra-fila-punto', 'P. Reunión', '100%')}
                                    {celdaLibre('conductor', 'extra-fila-conductor', 'Conductor', '100%')}
                                    <CeldaAcciones
                                        fila={f}
                                        abierto={abierto === f.clave}
                                        onAccion={(a) => accion(f, a)}
                                        estilo={CELDA_LIBRE}
                                    />
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="dia-vacio" hidden={hayFilasDia}>
                <p>Sin filas este día.</p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onCambiar((f) => agregarTurnoAlDia(f, diaActivo))}
                >
                    <i className="fas fa-plus"></i> Agregar Fila
                </button>
            </div>
            <div className="dia-footer">
                <DiaNav idx={diaIdx} onMover={moverDia} />
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
