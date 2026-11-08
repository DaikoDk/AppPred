import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import MenuFlotante from '../../components/ui/MenuFlotante.jsx';
import { finDeSemana, formatDate } from '../../utils/fechas.js';
import { mensajeError } from '../../utils/errores.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import EditorEscritorio from './EditorEscritorio.jsx';
import EditorTurnos from './EditorTurnos.jsx';
import ProgramasGuardados from './ProgramasGuardados.jsx';
import {
    combinarConPlantilla,
    cuerpoParaGuardar,
    filasDeProgramaGuardado,
    filasDesdeDatos,
    filasPorDefecto,
    leerFilas
} from './filas.js';
import * as api from './api.js';

/**
 * @typedef {import('./filas.js').Fila} Fila
 * @typedef {import('../../types/models').Programa} Programa
 * @typedef {'programa' | 'plantilla'} Modo
 */

const TEXTO_BANNER_PLANTILLA = 'PLANTILLA — haz clic en "Editar Plantilla" para modificar los turnos';

/** Filas iniciales a partir de la plantilla; sin plantilla, los valores por defecto (toggleTurnosGrid). */
async function filasDeLaPlantilla() {
    try {
        const prog = await api.obtenerPlantilla();
        if (prog && (prog.programa_semanal_turnos || []).length > 0) {
            return filasDesdeDatos(prog.programa_semanal_turnos, prog.filas_extra || []);
        }
    } catch {
        // sin plantilla: se usan los valores por defecto
    }
    return filasPorDefecto();
}

/** Abre el calendario al tocar el campo de fecha, como en la app anterior. @param {import('react').MouseEvent<HTMLInputElement>} e */
const abrirCalendario = (e) => {
    try {
        e.currentTarget.showPicker();
    } catch {
        // navegador sin showPicker
    }
};

/**
 * Pestañas Programa y Plantilla: comparten formulario y editor, como en la app anterior.
 * Reglas: RN-PLAN-*, RN-PROG-*, RN-ACT-*, RN-FMT-* en docs/REGLAS-NEGOCIO.md
 * @param {{ modo: Modo }} props
 */
export default function PaginaPrograma({ modo }) {
    const toast = useToast();
    const confirmar = useConfirmar();
    const esPlantilla = modo === 'plantilla';
    // Editor nuevo solo en pantallas anchas: por debajo (tablets y móvil) se conserva el editor y la responsividad actuales
    const escritorio = useMediaQuery('(min-width: 1321px)');

    const [inicio, setInicio] = useState('');
    const [fin, setFin] = useState('');
    const [editorAbierto, setEditorAbierto] = useState(false);
    const [filas, setFilas] = useState(/** @type {Fila[]} */ ([]));
    const [editandoId, setEditandoId] = useState(/** @type {string | null} */ (null));
    const [guardando, setGuardando] = useState(false);
    const [puntos, setPuntos] = useState(/** @type {string[]} */ ([]));
    const [programas, setProgramas] = useState(/** @type {Programa[] | null} */ (null));
    const [errorLista, setErrorLista] = useState(false);

    const recargarLista = useCallback(async () => {
        setProgramas(null);
        try {
            setProgramas(await api.listarProgramas());
            setErrorLista(false);
        } catch {
            setErrorLista(true);
        }
    }, []);

    // En Plantilla, las fechas son las de la plantilla (loadPlantilla)
    const cargarFechasPlantilla = useCallback(async () => {
        try {
            const prog = await api.obtenerPlantilla();
            if (prog) {
                setInicio(prog.semana_inicio);
                setFin(prog.semana_fin);
            }
        } catch (err) {
            console.error('Error cargando plantilla:', err);
        }
    }, []);

    useEffect(() => {
        api.nombresDePuntos().then(setPuntos);
        if (esPlantilla) cargarFechasPlantilla();
        else recargarLista();
    }, [esPlantilla, cargarFechasPlantilla, recargarLista]);

    const editando = !esPlantilla && editandoId !== null;

    const cerrarEdicion = () => {
        setEditandoId(null);
        setEditorAbierto(false);
        setFilas([]);
        setInicio('');
        setFin('');
    };

    /** @param {string} valor */
    const cambiarInicio = (valor) => {
        setInicio(valor);
        setFin(valor ? finDeSemana(valor) : ''); // RN-PLAN-07
    };

    // Botón "Empezar a crear programa" / "Editar Plantilla" / "Cerrar"
    const alternarEditor = async () => {
        if (editorAbierto) {
            // "Cerrar" al editar un programa equivale a cancelar la edición
            if (editando) cerrarEdicion();
            else setEditorAbierto(false);
            return;
        }
        setFilas(await filasDeLaPlantilla());
        setEditorAbierto(true);
    };

    /** @param {string} id */
    const editarPrograma = async (id) => {
        try {
            const prog = await api.obtenerPrograma(id);
            if (!prog) {
                toast('Programa no encontrado', 'error');
                return;
            }
            setEditandoId(id);
            setInicio(prog.semana_inicio);
            setFin(prog.semana_fin);
            setFilas(filasDeProgramaGuardado(prog.programa_semanal_turnos || [], prog.filas_extra || []));
            setEditorAbierto(true);
            toast('Editando programa — modifica los turnos y guarda', 'info');
        } catch (err) {
            toast(mensajeError(err, 'Error al cargar programa'), 'error');
        }
    };

    /** @param {Programa} p */
    const eliminar = async (p) => {
        const rango = `${formatDate(p.semana_inicio)} — ${formatDate(p.semana_fin)}`;
        const respuesta = await confirmar({
            titulo: '¿Eliminar o editar?',
            mensaje: `Programa del ${rango}. ¿Realmente quieres eliminarlo? Esta acción no se puede deshacer. Si solo necesitas hacer cambios, mejor edítalo.`,
            textoConfirmar: 'ELIMINAR',
            peligro: true,
            icono: 'fa-exclamation-triangle',
            espera: 10, // RN-PROG-06
            alternativa: { texto: 'EDITAR', icono: 'fa-edit' }
        });
        if (respuesta === 'alternativa') {
            editarPrograma(p.id);
            return;
        }
        if (respuesta !== true) return;
        try {
            await api.eliminarPrograma(p.id);
            toast('Programa eliminado', 'success');
            if (editandoId === p.id) cerrarEdicion();
            recargarLista();
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        }
    };

    const actualizarConPlantilla = async () => {
        if (!editando) return;
        const ok = await confirmar({
            titulo: '¿Actualizar con la plantilla?',
            mensaje:
                'Las filas del programa se ajustan a las de la plantilla actual: las filas que la plantilla no tiene se quitan y las nuevas se agregan. ' +
                'En cada celda gana la plantilla si tiene información; si está vacía en la plantilla, se conserva lo que ya tiene el programa. ' +
                'El cambio se aplica al tocar Actualizar Programa y, como al guardar cualquier edición, habrá que volver a ejecutar la asignación de conductores de esta semana.',
            textoConfirmar: 'Actualizar filas',
            peligro: true,
            icono: 'fa-file-import'
        });
        if (ok !== true) return;
        try {
            const prog = await api.obtenerPlantilla();
            if (!prog || (prog.programa_semanal_turnos || []).length === 0) {
                toast('La plantilla no tiene filas; no se cambió nada', 'warning'); // RN-ACT-06
                return;
            }
            const { turnos, extras } = combinarConPlantilla(
                leerFilas(filas),
                prog.programa_semanal_turnos,
                prog.filas_extra || []
            );
            setFilas(filasDesdeDatos(turnos, extras));
            toast('Filas actualizadas con la plantilla. Toca Actualizar Programa para guardar.', 'success');
        } catch (err) {
            toast(mensajeError(err, 'No se pudo cargar la plantilla'), 'error');
        }
    };

    const restablecer = async () => {
        const ok = await confirmar({
            titulo: '¿Restablecer la plantilla?',
            mensaje: 'Vuelve a los valores por defecto. Se perderán los cambios personalizados.',
            textoConfirmar: 'Restablecer',
            peligro: true,
            icono: 'fa-undo'
        });
        if (ok !== true) return;
        try {
            await api.restablecerPlantilla();
            toast('Plantilla restablecida', 'success');
            setEditorAbierto(false);
            setFilas([]);
            cargarFechasPlantilla();
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        }
    };

    /** @param {import('react').FormEvent} e */
    const guardar = async (e) => {
        e.preventDefault();
        const cuerpo = cuerpoParaGuardar(filas);
        if (cuerpo.turnos.length === 0) {
            toast('Completa al menos un turno (selecciona grupo)', 'warning');
            return;
        }
        setGuardando(true);
        try {
            const datos = { ...cuerpo, semana_inicio: inicio, semana_fin: fin };
            if (esPlantilla) {
                await api.guardarPlantilla(datos);
                toast('Plantilla guardada', 'success');
            } else if (editandoId) {
                await api.actualizarPrograma(editandoId, datos);
                toast('Programa actualizado', 'success');
                cerrarEdicion();
                recargarLista();
            } else {
                await api.crearPrograma(datos);
                toast('Programa creado', 'success');
                cerrarEdicion();
                recargarLista();
            }
        } catch (err) {
            toast(mensajeError(err, 'Error guardando'), 'error');
        } finally {
            setGuardando(false);
        }
    };

    // ---- textos que cambian según el modo (los mismos que la app anterior)
    let titulo = <>Nuevo Programa Semanal</>;
    if (esPlantilla)
        titulo = (
            <>
                <i className="fas fa-pencil-alt"></i> Editar Plantilla
            </>
        );
    else if (editando)
        titulo = (
            <>
                <i className="fas fa-edit" style={{ color: '#e67e22' }}></i>{' '}
                <span style={{ color: '#e67e22' }}>Editando Programa</span>
            </>
        );

    let botonEditor = (
        <>
            <i className="fas fa-play"></i> Empezar a crear programa
        </>
    );
    if (editorAbierto)
        botonEditor = (
            <>
                <i className="fas fa-times"></i> Cerrar
            </>
        );
    else if (esPlantilla)
        botonEditor = (
            <>
                <i className="fas fa-pencil-alt"></i> Editar Plantilla
            </>
        );

    let textoGuardar = 'Guardar Programa';
    if (esPlantilla) textoGuardar = 'Guardar Plantilla';
    else if (editando) textoGuardar = 'Actualizar Programa';

    let banner = null;
    if (esPlantilla) banner = TEXTO_BANNER_PLANTILLA;
    else if (editando) banner = `Editando programa: ${formatDate(inicio)} — ${formatDate(fin)}`;

    return (
        <div id="tab-programa" className="tab-content active">
            <div className="card">
                <div className="card-header">
                    <div className="card-title-rich">
                        <span className="title-icon">
                            <i className="fas fa-calendar-plus"></i>
                        </span>
                        <div>
                            <h3>{titulo}</h3>
                            <p className="card-subtitle">Define el rango de fechas para crear un programa</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <form id="form-programa" onSubmit={guardar}>
                        <div className="form-row" style={{ alignItems: 'end' }}>
                            <div className="form-group">
                                <label>
                                    <i className="far fa-calendar"></i> Semana Inicio
                                </label>
                                <input
                                    type="date"
                                    id="prog-semana-inicio"
                                    className="form-control"
                                    required
                                    value={inicio}
                                    onClick={abrirCalendario}
                                    onChange={(e) => cambiarInicio(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <i className="far fa-calendar"></i> Semana Fin
                                </label>
                                <input
                                    type="date"
                                    id="prog-semana-fin"
                                    className="form-control"
                                    required
                                    value={fin}
                                    onClick={abrirCalendario}
                                    onChange={(e) => setFin(e.target.value)}
                                />
                            </div>
                            <div className="form-group form-group-action" style={{ alignSelf: 'end' }}>
                                <button
                                    type="button"
                                    id="btn-empezar-programa"
                                    className="btn btn-success"
                                    onClick={alternarEditor}
                                >
                                    {botonEditor}
                                </button>
                            </div>
                        </div>
                        {banner && (
                            <div
                                id="edit-banner"
                                className="alert alert-warning"
                                style={{ marginTop: 16, marginBottom: 15, padding: '10px 15px', fontWeight: 'bold' }}
                            >
                                <i className="fas fa-edit"></i> <span id="edit-banner-text">{banner}</span>
                            </div>
                        )}
                        {editorAbierto && (
                            <>
                                {/* Pantalla ancha: editor con chips; el resto: editor actual con vista por día y por semana */}
                                {escritorio ? (
                                    <EditorEscritorio
                                        filas={filas}
                                        onCambiar={setFilas}
                                        puntos={puntos}
                                        semanaInicio={inicio}
                                    />
                                ) : (
                                    <EditorTurnos
                                        filas={filas}
                                        onCambiar={setFilas}
                                        puntos={puntos}
                                        semanaInicio={inicio}
                                    />
                                )}
                                <div id="programa-actions" style={{ marginTop: 20 }}>
                                    <button type="submit" className="btn btn-primary" disabled={guardando}>
                                        <i className="fas fa-save"></i> <span className="btn-text">{textoGuardar}</span>
                                    </button>
                                    {editando && (
                                        <>
                                            {' '}
                                            <button type="button" className="btn btn-secondary" onClick={cerrarEdicion}>
                                                <i className="fas fa-times"></i> Cancelar Edición
                                            </button>{' '}
                                            <MenuFlotante
                                                opciones={[
                                                    {
                                                        texto: 'Actualizar con la plantilla',
                                                        icono: 'fa-file-import',
                                                        onClick: actualizarConPlantilla
                                                    }
                                                ]}
                                            />
                                        </>
                                    )}
                                    {esPlantilla && (
                                        <>
                                            {' '}
                                            <button
                                                type="button"
                                                id="btn-restablecer-plantilla"
                                                className="btn btn-warning"
                                                style={{ display: 'inline-flex' }}
                                                onClick={restablecer}
                                            >
                                                <i className="fas fa-undo"></i> Restablecer Plantilla
                                            </button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
            {!esPlantilla && (
                <ProgramasGuardados
                    programas={programas}
                    error={errorLista}
                    onEditar={editarPrograma}
                    onEliminar={eliminar}
                />
            )}
        </div>
    );
}
