import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import {
    ArrowCounterClockwise,
    CalendarBlank,
    CalendarPlus,
    DotsThree,
    FileArrowDown,
    FloppyDisk,
    PencilSimple,
    Play,
    X
} from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import MenuAcciones from '../../components/ui/MenuAcciones.jsx';
import { finDeSemana, formatDate } from '../../utils/fechas.js';
import { mensajeError } from '../../utils/errores.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import EditorEscritorio from './EditorEscritorio.jsx';
import EditorMovil from './EditorMovil.jsx';
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
    // Desde 769 px, la tabla con chips; en móvil, la vista por día y por semana (misma estructura de siempre)
    const escritorio = useMediaQuery('(min-width: 769px)');

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
    const textoEditor = editorAbierto ? 'Cerrar' : esPlantilla ? 'Editar Plantilla' : 'Empezar a crear programa';
    const iconoEditor = editorAbierto ? X : esPlantilla ? PencilSimple : Play;

    let textoGuardar = 'Guardar Programa';
    if (esPlantilla) textoGuardar = 'Guardar Plantilla';
    else if (editando) textoGuardar = 'Actualizar Programa';

    let banner = null;
    if (esPlantilla) banner = TEXTO_BANNER_PLANTILLA;
    else if (editando) banner = `Editando programa: ${formatDate(inicio)} — ${formatDate(fin)}`;

    const titulo = esPlantilla ? (
        'Editar Plantilla'
    ) : editando ? (
        <span className="flex items-center gap-1">
            <PencilSimple size={20} aria-hidden="true" />
            Editando Programa
        </span>
    ) : (
        'Nuevo Programa Semanal'
    );
    // Calendario nativo con ícono atenuado y cifras tabulares; el borde reacciona al pasar el cursor y al enfocar
    const CAMPO_FECHA =
        'body-6 w-full cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-ink tabular-nums outline-none transition-[border-color] duration-300 ease-skill hover:border-ink/30 focus-visible:border-primary [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:transition-opacity [&::-webkit-calendar-picker-indicator]:duration-300 hover:[&::-webkit-calendar-picker-indicator]:opacity-100';
    const ETIQUETA_FECHA = 'title-4 mb-1 flex items-center gap-1 text-ink';

    return (
        <div className="tw mx-auto flex w-full max-w-[1244px] flex-col gap-6">
            <section className="rounded-3xl border border-line bg-surface">
                <EncabezadoTarjeta
                    icono={CalendarPlus}
                    titulo={titulo}
                    claseTitulo={editando ? 'text-warn' : ''}
                    subtitulo="Define el rango de fechas para crear un programa"
                />
                <div className="p-4">
                    <form id="form-programa" onSubmit={guardar}>
                        <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                            <label className="block">
                                <span className={ETIQUETA_FECHA}>
                                    <CalendarBlank size={16} aria-hidden="true" />
                                    Semana Inicio
                                </span>
                                <input
                                    type="date"
                                    id="prog-semana-inicio"
                                    className={CAMPO_FECHA}
                                    required
                                    value={inicio}
                                    onClick={abrirCalendario}
                                    onChange={(e) => cambiarInicio(e.target.value)}
                                />
                            </label>
                            <label className="block">
                                <span className={ETIQUETA_FECHA}>
                                    <CalendarBlank size={16} aria-hidden="true" />
                                    Semana Fin
                                </span>
                                <input
                                    type="date"
                                    id="prog-semana-fin"
                                    className={CAMPO_FECHA}
                                    required
                                    value={fin}
                                    onClick={abrirCalendario}
                                    onChange={(e) => setFin(e.target.value)}
                                />
                            </label>
                            <Boton
                                id="btn-empezar-programa"
                                variante="exito"
                                icono={iconoEditor}
                                onClick={alternarEditor}
                                className="col-span-2 sm:col-span-1"
                            >
                                {textoEditor}
                            </Boton>
                        </div>

                        {banner && (
                            <div
                                id="edit-banner"
                                className="body-5 mt-4 flex items-center gap-2 rounded-lg bg-warn-bg px-3 py-2 text-warn"
                            >
                                <PencilSimple size={16} aria-hidden="true" />
                                <span id="edit-banner-text">{banner}</span>
                            </div>
                        )}

                        {editorAbierto && (
                            <>
                                <div className="mt-4">
                                    {/* Desde 769 px la tabla con chips; en móvil, la vista por día y por semana */}
                                    {escritorio ? (
                                        <EditorEscritorio
                                            filas={filas}
                                            onCambiar={setFilas}
                                            puntos={puntos}
                                            semanaInicio={inicio}
                                        />
                                    ) : (
                                        <EditorMovil
                                            filas={filas}
                                            onCambiar={setFilas}
                                            puntos={puntos}
                                            semanaInicio={inicio}
                                        />
                                    )}
                                </div>
                                <div
                                    id="programa-actions"
                                    className="mt-4 flex flex-wrap items-center justify-end gap-2"
                                >
                                    {editando && (
                                        <MenuAcciones
                                            etiqueta="Más acciones"
                                            items={[
                                                {
                                                    texto: 'Actualizar con la plantilla',
                                                    icono: FileArrowDown,
                                                    onClick: actualizarConPlantilla
                                                }
                                            ]}
                                            boton={({ ref, abierto, alternar }) => (
                                                <Boton
                                                    ref={ref}
                                                    variante="secundario"
                                                    aria-label="Más acciones"
                                                    aria-haspopup="menu"
                                                    aria-expanded={abierto}
                                                    onClick={alternar}
                                                >
                                                    <DotsThree size={16} weight="bold" aria-hidden="true" />
                                                </Boton>
                                            )}
                                        />
                                    )}
                                    {esPlantilla && (
                                        <Boton
                                            id="btn-restablecer-plantilla"
                                            variante="advertencia"
                                            icono={ArrowCounterClockwise}
                                            onClick={restablecer}
                                        >
                                            Restablecer Plantilla
                                        </Boton>
                                    )}
                                    {editando && (
                                        <Boton variante="secundario" icono={X} onClick={cerrarEdicion}>
                                            Cancelar Edición
                                        </Boton>
                                    )}
                                    <Boton type="submit" variante="primario" icono={FloppyDisk} disabled={guardando}>
                                        {textoGuardar}
                                    </Boton>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </section>
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
