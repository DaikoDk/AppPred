import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { useCargando } from '../../components/ui/Cargando.jsx';
import { formatDate } from '../../utils/fechas.js';
import { mensajeError } from '../../utils/errores.js';
import { normalizarExtras } from '../../utils/reglasDia.js';
import TablaResultados from './TablaResultados.jsx';
import * as api from './api.js';
import {
    contadores,
    contarAsignaciones,
    cuerpoConfirmar,
    eleccionInicial,
    filasDeResultados,
    resultadosGuardados,
    turnosSinTerritorio
} from './logica.js';

/**
 * @typedef {import('./api.js').ProgramaEstado} ProgramaEstado
 * @typedef {import('./api.js').ResultadoExportacion} ResultadoExportacion
 * @typedef {import('./logica.js').DatosResultados} DatosResultados
 * @typedef {import('./logica.js').FilaResultado} FilaResultado
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {{
 *   semanaId: string,
 *   editando: boolean,
 *   resumen: DatosResultados['resumen'],
 *   filas: FilaResultado[] | null,
 *   conductores: Conductor[],
 *   cuenta: Record<string, number>,
 *   disponibles: Set<string>,
 *   elecciones: Record<string, string>,
 *   sinAsignarAlInicio: Set<string>,
 *   tocado: boolean
 * }} EstadoResultados
 */

// Pantalla Asignación. Reglas: RN-ASIG-*, RN-CONF-*, RN-SHEET-* en docs/REGLAS-NEGOCIO.md
export default function Asignacion() {
    const toast = useToast();
    const confirmar = useConfirmar();
    const cargando = useCargando();

    const [programas, setProgramas] = useState(/** @type {ProgramaEstado[] | null} */ (null));
    const [errorLista, setErrorLista] = useState(false);
    const [semana, setSemana] = useState('');
    const [ejecutando, setEjecutando] = useState(false);
    const [res, setRes] = useState(/** @type {EstadoResultados | null} */ (null));

    const recargarProgramas = useCallback(async () => {
        try {
            setProgramas(await api.programasConEstado());
            setErrorLista(false);
        } catch {
            setErrorLista(true);
        }
    }, []);

    useEffect(() => {
        recargarProgramas();
    }, [recargarProgramas]);

    const inicioDe = (/** @type {string} */ id) => programas?.find((p) => p.id === id)?.semana_inicio;

    /**
     * Muestra la tarjeta de resultados (mostrarResultados): conductores y filas libres se cargan aparte.
     * @param {DatosResultados} data @param {string} semanaId @param {boolean} editando
     */
    const mostrarResultados = async (data, semanaId, editando) => {
        const sinAsignarAlInicio = new Set(data.resultados.filter((r) => !r.asignado).map((r) => r.turno_id));
        setRes({
            semanaId,
            editando,
            resumen: data.resumen,
            filas: null,
            conductores: [],
            cuenta: contarAsignaciones(data.resultados),
            disponibles: new Set(data.disponibilidad || []),
            elecciones: {},
            sinAsignarAlInicio,
            tocado: false
        });
        const [conductores, extras] = await Promise.all([api.conductoresActivos(), api.filasLibres(semanaId)]);
        /** @type {Record<string, string>} */
        const elecciones = {};
        for (const r of data.resultados) elecciones[r.turno_id] = r.asignado ? eleccionInicial(r, conductores) : '';
        setRes((actual) =>
            actual && actual.semanaId === semanaId
                ? {
                      ...actual,
                      conductores,
                      elecciones,
                      filas: filasDeResultados(data.resultados, normalizarExtras(extras))
                  }
                : actual
        );
    };

    /** Asignaciones ya guardadas de una semana; si no hay ninguna, se oculta la tarjeta. @param {string} semanaId */
    const verAsignacion = async (semanaId) => {
        if (!semanaId) return;
        setSemana(semanaId);
        try {
            const guardadas = await api.asignacionesDeSemana(semanaId);
            if (!guardadas.some((a) => a.conductor_id)) {
                setRes(null);
                return;
            }
            await mostrarResultados(resultadosGuardados(guardadas), semanaId, true);
        } catch {
            setRes(null);
        }
    };

    const ejecutar = async () => {
        if (!semana) {
            toast('Selecciona una semana', 'warning');
            return;
        }
        setEjecutando(true);
        try {
            const d = await api.ejecutarAlgoritmo(semana);
            toast(`Previsualización: ${d.resumen.asignados} turnos asignados`, 'success');
            await mostrarResultados(d, semana, false);
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        } finally {
            setEjecutando(false);
        }
    };

    /** @param {string} turnoId @param {string} valor */
    const elegir = (turnoId, valor) =>
        setRes((actual) =>
            actual ? { ...actual, tocado: true, elecciones: { ...actual.elecciones, [turnoId]: valor } } : actual
        );

    /** Modal con enlaces al Sheet y a la hoja creada (mostrarModalSheet). @param {ResultadoExportacion} r @param {string} titulo */
    const modalSheet = async (r, titulo) => {
        const eleccion = await confirmar({
            titulo,
            mensaje: `Se creó la hoja "${r.sheetName}" en Google Sheets.`,
            textoConfirmar: 'Ir a la hoja',
            icono: 'fa-table',
            exito: true,
            cerrable: true,
            alternativa: { texto: 'Ir al Sheet', icono: 'fa-arrow-up-right-from-square', secundario: true }
        });
        if (eleccion === true) window.open(r.urlHoja || r.url, '_blank');
        else if (eleccion === 'alternativa') window.open(r.url, '_blank');
    };

    const guardar = async () => {
        if (!res?.filas) {
            toast('No hay resultados para guardar', 'warning');
            return;
        }
        const turnos = res.filas.flatMap((f) => (f.tipo === 'turno' ? [f.resultado] : []));
        const asignaciones = cuerpoConfirmar(
            turnos.map((r) => ({ turnoId: r.turno_id, valor: res.elecciones[r.turno_id] }))
        );
        if (asignaciones.length === 0) {
            toast('No hay asignaciones para guardar', 'warning');
            return;
        }
        const vacios = turnosSinTerritorio(turnos, inicioDe(res.semanaId));
        const ok = await confirmar({
            titulo: '¿Guardar la asignación?',
            mensaje: `Se guardarán ${asignaciones.length} asignaciones y la semana se exportará a Google Sheets en una hoja nueva.`,
            textoConfirmar: 'Guardar y exportar',
            icono: 'fa-floppy-disk',
            advertencia: vacios.length
                ? {
                      titulo: `${vacios.length} ${vacios.length === 1 ? 'turno tiene' : 'turnos tienen'} el Territorio vacío:`,
                      items: vacios
                  }
                : null
        });
        if (ok !== true) return;

        const { semanaId, editando } = res;
        cargando.mostrar('Guardando asignación…');
        /** @type {ResultadoExportacion | null} */
        let exportacion = null;
        /** @type {unknown} */
        let errorExportar = null;
        try {
            await api.confirmarAsignaciones(semanaId, asignaciones);
            setRes(null);
            cargando.mostrar('Exportando a Google Sheets…');
            try {
                exportacion = await api.exportarASheets(semanaId); // RN-CONF-06
            } catch (err) {
                errorExportar = err;
            }
            if (editando) await verAsignacion(semanaId);
            await recargarProgramas();
            setSemana(''); // la app actual vuelve a "Seleccionar semana..." al recargar la lista
        } catch (err) {
            cargando.ocultar();
            toast(mensajeError(err, 'Error al guardar'), 'error');
            return;
        }
        cargando.ocultar();
        toast(`${asignaciones.length} asignaciones guardadas`, 'success');
        if (exportacion) await modalSheet(exportacion, 'Asignación guardada');
        else
            toast(
                `Se guardó, pero no se pudo exportar a Google Sheets: ${mensajeError(errorExportar, 'error desconocido')}`,
                'error',
                8000
            );
    };

    /** @param {string} semanaId */
    const exportar = async (semanaId) => {
        cargando.mostrar('Exportando a Google Sheets…');
        try {
            const r = await api.exportarASheets(semanaId);
            cargando.ocultar();
            await modalSheet(r, 'Exportación lista');
        } catch (err) {
            cargando.ocultar();
            toast(mensajeError(err, 'Error al exportar'), 'error');
        }
    };

    /** @param {ProgramaEstado} p */
    const limpiar = async (p) => {
        const ok = await confirmar({
            titulo: '¿Eliminar todas las asignaciones de esta semana?',
            mensaje: `Semana del ${formatDate(p.semana_inicio)} — ${formatDate(p.semana_fin)}. Los turnos quedarán sin asignar.`,
            textoConfirmar: 'Limpiar',
            peligro: true,
            icono: 'fa-eraser'
        });
        if (ok !== true) return;
        try {
            await api.limpiarAsignaciones(p.id);
            toast('Asignaciones eliminadas', 'success');
            setRes(null);
            setSemana('');
            recargarProgramas();
        } catch (err) {
            toast(mensajeError(err, 'Error al borrar'), 'error');
        }
    };

    // Como en la app actual: el resumen del servidor hasta que se elige un conductor a mano
    const stats = res
        ? res.filas && res.tocado
            ? (() => {
                  const c = contadores(
                      res.filas.flatMap((f) => (f.tipo === 'turno' ? [res.elecciones[f.resultado.turno_id] ?? ''] : []))
                  );
                  return [res.resumen.total_turnos, c.asignados, c.sin_asignar, c.conductores];
              })()
            : [
                  res.resumen.total_turnos,
                  res.resumen.asignados,
                  res.resumen.sin_asignar,
                  res.resumen.conductores_utilizados
              ]
        : [0, 0, 0, 0];

    return (
        <div id="tab-asignacion" className="tab-content active">
            <div className="card">
                <div className="card-header">
                    <div className="card-title-rich">
                        <span className="title-icon">
                            <i className="fas fa-calendar-check"></i>
                        </span>
                        <div>
                            <h3>Ejecutar Asignación</h3>
                            <p className="card-subtitle">Elige una semana y genera las asignaciones automáticamente</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>
                                <i className="far fa-calendar"></i> Semana
                            </label>
                            <select
                                id="sel-semana"
                                className="form-control"
                                value={semana}
                                onChange={(e) => verAsignacion(e.target.value)}
                            >
                                {errorLista ? (
                                    <option value="">Error</option>
                                ) : (
                                    <>
                                        <option value="">Seleccionar semana...</option>
                                        {(programas || []).map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {formatDate(p.semana_inicio)} - {formatDate(p.semana_fin)}
                                                {(p.asignados || 0) > 0 ? ` ✓ ${p.asignados} asignados` : ''}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                        <div className="form-group form-group-action" style={{ alignSelf: 'end' }}>
                            <button
                                type="button"
                                id="btn-ejecutar-asignacion"
                                className="btn btn-primary btn-block"
                                disabled={ejecutando}
                                onClick={ejecutar}
                            >
                                <i className="fas fa-magic"></i>{' '}
                                <span className="btn-text" style={{ display: ejecutando ? 'none' : 'inline' }}>
                                    Ejecutar Algoritmo
                                </span>
                                <span className="btn-loading" style={{ display: ejecutando ? 'inline-flex' : 'none' }}>
                                    <i className="fas fa-spinner fa-spin"></i>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {res && (
                <div className="card" id="card-resultados">
                    <div className="card-header">
                        <div className="card-title-rich">
                            <span className="title-icon">
                                <i className="fas fa-list-check"></i>
                            </span>
                            <div>
                                <h3>Resultados</h3>
                                <p className="card-subtitle">Revisa y ajusta los conductores antes de guardar</p>
                            </div>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="stats-row">
                            {[
                                ['', 'Total'],
                                ['success', 'Asignados'],
                                ['danger', 'Sin Asignar'],
                                ['info', 'Conductores']
                            ].map(([clase, etiqueta], i) => (
                                <div key={etiqueta} className={`stat-card${clase ? ' ' + clase : ''}`}>
                                    <span className="stat-value">{stats[i]}</span>
                                    <span className="stat-label">{etiqueta}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginBottom: 10 }} id="resultados-actions">
                            <button type="button" className="btn btn-primary" onClick={guardar}>
                                <i className="fas fa-save"></i>{' '}
                                <span className="btn-text">
                                    {res.editando ? 'Actualizar Asignación' : 'Guardar Asignación'}
                                </span>
                            </button>{' '}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ marginLeft: 8 }}
                                onClick={() => setRes(null)}
                            >
                                <i className="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                        <div id="resultados-day-groups">
                            {res.filas && (
                                <TablaResultados
                                    filas={res.filas}
                                    semanaInicio={inicioDe(res.semanaId)}
                                    conductores={res.conductores}
                                    cuenta={res.cuenta}
                                    disponibles={res.disponibles}
                                    elecciones={res.elecciones}
                                    inicialmenteSinAsignar={res.sinAsignarAlInicio}
                                    onElegir={elegir}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="card-title-rich">
                        <span className="title-icon plain">
                            <i className="fas fa-layer-group"></i>
                        </span>
                        <div>
                            <h3>Programas</h3>
                            <p className="card-subtitle">Estado de asignación de cada semana</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-container">
                        <table className="table table-programas table-asignacion">
                            <thead>
                                <tr>
                                    <th className="col-semana">Semana</th>
                                    <th className="col-fechas">Inicio - Fin</th>
                                    <th className="col-acciones">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-programas-asignacion">
                                {errorLista && (
                                    <tr className="fila-estado">
                                        <td colSpan={3}>Error</td>
                                    </tr>
                                )}
                                {!errorLista && programas === null && (
                                    <tr className="fila-estado">
                                        <td colSpan={3}>
                                            <i className="fas fa-circle-notch fa-spin"></i> Cargando programas…
                                        </td>
                                    </tr>
                                )}
                                {!errorLista && programas?.length === 0 && (
                                    <tr className="fila-estado">
                                        <td colSpan={3}>No hay programas</td>
                                    </tr>
                                )}
                                {!errorLista &&
                                    (programas || []).map((p) => {
                                        const asignados = p.asignados || 0;
                                        return (
                                            <tr key={p.id}>
                                                <td className="col-semana">
                                                    <strong>Semana</strong>
                                                </td>
                                                <td className="col-fechas">
                                                    <span className="fecha-icon">
                                                        <i className="far fa-calendar"></i>
                                                    </span>
                                                    <span className="fecha-texto">
                                                        <span className="fecha-rango">
                                                            {formatDate(p.semana_inicio)} — {formatDate(p.semana_fin)}
                                                        </span>
                                                        <small className="fecha-sub">
                                                            {p.total_turnos || 0} turnos ·{' '}
                                                            {asignados > 0 ? (
                                                                <span className="estado-ok">
                                                                    ✓ {asignados} asignados
                                                                </span>
                                                            ) : (
                                                                <span className="estado-pendiente">sin asignar</span>
                                                            )}
                                                        </small>
                                                    </span>
                                                </td>
                                                <td className="col-acciones">
                                                    {asignados > 0 && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-primary"
                                                                onClick={() => verAsignacion(p.id)}
                                                                title="Ver"
                                                            >
                                                                <i className="fas fa-eye"></i>
                                                                <span className="btn-label">Ver</span>
                                                            </button>{' '}
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => exportar(p.id)}
                                                                title="Exportar a Sheets"
                                                            >
                                                                <i className="fab fa-google"></i>
                                                                <span className="btn-label">Sheets</span>
                                                            </button>{' '}
                                                        </>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => limpiar(p)}
                                                        title="Limpiar"
                                                    >
                                                        <i className="fas fa-eraser"></i>
                                                        <span className="btn-label">Limpiar</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
