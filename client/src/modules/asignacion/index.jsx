import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarBlank, CalendarCheck, FloppyDisk, ListChecks, MagicWand, Stack, X } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import ModalImprimir from './ModalImprimir.jsx';
import Desplegable from '../../components/ui/Desplegable.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { CIFRA, CUERPO, ETIQUETA, RAIZ, RESUMEN, TARJETA } from '../../components/ui/estilos.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import ModalFormato from '../../components/ui/ModalFormato.jsx';
import ModalPng from './ModalPng.jsx';
import TablaProgramas from './TablaProgramas.jsx';
import { useCargando } from '../../components/ui/Cargando.jsx';
import { nombreDia } from '../../utils/dias.js';
import { formatDate } from '../../utils/fechas.js';
import { mensajeError } from '../../utils/errores.js';
import { normalizarExtras } from '../../utils/reglasDia.js';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import ResultadosMovil from './ResultadosMovil.jsx';
import TablaResultados from './TablaResultados.jsx';
import * as api from './api.js';
import {
    contadores,
    contarAsignaciones,
    cuerpoConfirmar,
    eleccionInicial,
    etiquetaGrupo,
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
 * @typedef {import('../../types/models').Formato} Formato
 * @typedef {{
 *   semanaId: string,
 *   editando: boolean,
 *   resumen: DatosResultados['resumen'],
 *   filas: FilaResultado[] | null,
 *   conductores: Conductor[],
 *   cuenta: Record<string, number>,
 *   disponibles: Set<string>,
 *   elecciones: Record<string, string>,
 *   formatos: Record<string, Formato>,
 *   sinAsignarAlInicio: Set<string>,
 *   tocado: boolean
 * }} EstadoResultados
 */

/** Id del turno o de la fila libre, que es la clave de su formato. @param {FilaResultado} f */
const idDeFila = (f) => (f.tipo === 'turno' ? f.resultado.turno_id : f.extra.id);

/** Texto bajo el título del modal de formato: "Domingo · 8:30AM". @param {FilaResultado} f */
function descripcionDeFila(f) {
    const hora = f.tipo === 'turno' ? f.resultado.hora : f.extra.hora;
    const grupo = f.tipo === 'turno' ? f.resultado.grupo : f.extra.grupo;
    return [nombreDia(f.dia), hora, etiquetaGrupo(grupo)].filter(Boolean).join(' · ');
}

// Pantalla Asignación. Reglas: RN-ASIG-*, RN-CONF-*, RN-SHEET-* en docs/REGLAS-NEGOCIO.md
export default function Asignacion() {
    const toast = useToast();
    const confirmar = useConfirmar();
    const cargando = useCargando();

    const [programas, setProgramas] = useState(/** @type {ProgramaEstado[] | null} */ (null));
    const [errorLista, setErrorLista] = useState(false);
    const [semana, setSemana] = useState('');
    const [ejecutando, setEjecutando] = useState(false);
    // Programa que se está imprimiendo (modal de impresión en A4 horizontal)
    const [imprimiendo, setImprimiendo] = useState(/** @type {ProgramaEstado | null} */ (null));
    // Programa cuya imagen PNG se muestra en el modal de descarga y compartir (RN-IMG-06)
    const [conImagen, setConImagen] = useState(/** @type {ProgramaEstado | null} */ (null));
    const [res, setRes] = useState(/** @type {EstadoResultados | null} */ (null));
    // En móvil se quitan la tarjeta "Ejecutar Asignación" y el resumen, y los resultados tienen vista por día (RN-UI-13)
    const movil = useMediaQuery('(max-width: 768px)');
    const tarjetaResultados = useRef(/** @type {HTMLElement | null} */ (null));
    // Fila cuyo formato de celdas se está editando; se guarda al aplicar (RN-FMT-05)
    const [formateando, setFormateando] = useState(/** @type {FilaResultado | null} */ (null));

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
            formatos: {},
            sinAsignarAlInicio,
            tocado: false
        });
        const [conductores, extras, turnos] = await Promise.all([
            api.conductoresActivos(),
            api.filasLibres(semanaId),
            api.asignacionesDeSemana(semanaId).catch(() => [])
        ]);
        /** @type {Record<string, Formato>} */
        const formatos = {};
        for (const t of turnos) formatos[t.id] = t.formato || {};
        for (const e of extras) if (e.id) formatos[e.id] = e.formato || {};
        /** @type {Record<string, string>} */
        const elecciones = {};
        for (const r of data.resultados) elecciones[r.turno_id] = r.asignado ? eleccionInicial(r, conductores) : '';
        setRes((actual) =>
            actual && actual.semanaId === semanaId
                ? {
                      ...actual,
                      conductores,
                      elecciones,
                      formatos,
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

    /** @param {string} [semanaId] por defecto, la semana elegida en el selector */
    const ejecutar = async (semanaId = semana) => {
        if (!semanaId) {
            toast('Selecciona una semana', 'warning');
            return;
        }
        setSemana(semanaId);
        setEjecutando(true);
        try {
            const d = await api.ejecutarAlgoritmo(semanaId);
            toast(`Previsualización: ${d.resumen.asignados} turnos asignados`, 'success');
            await mostrarResultados(d, semanaId, false);
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

    /** Guarda solo el formato de la fila, sin tocar las asignaciones (RN-FMT-05). @param {FilaResultado} fila @param {Formato} formato */
    const aplicarFormato = async (fila, formato) => {
        const id = idDeFila(fila);
        setFormateando(null);
        if (!id) return;
        try {
            if (fila.tipo === 'turno') await api.guardarFormatoTurno(id, formato);
            else await api.guardarFormatoLibre(id, formato);
            setRes((actual) => (actual ? { ...actual, formatos: { ...actual.formatos, [id]: formato } } : actual));
            toast('Formato guardado', 'success');
        } catch (err) {
            toast(mensajeError(err, 'No se pudo guardar el formato'), 'error');
        }
    };

    useEffect(() => {
        if (movil && res?.semanaId) tarjetaResultados.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [movil, res?.semanaId]);

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
            mensaje: `Se guardarán ${asignaciones.length} asignaciones. Para generar la hoja en Google Sheets usa «Exportar a Sheets» desde la lista de programas.`,
            textoConfirmar: 'Guardar',
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
        try {
            await api.confirmarAsignaciones(semanaId, asignaciones); // RN-CONF-06: solo guarda
            setRes(null);
            if (editando) await verAsignacion(semanaId);
            await recargarProgramas();
            setSemana(''); // la app anterior vuelve a "Seleccionar semana..." al recargar la lista
        } catch (err) {
            cargando.ocultar();
            toast(mensajeError(err, 'Error al guardar'), 'error');
            return;
        }
        cargando.ocultar();
        toast(`${asignaciones.length} asignaciones guardadas`, 'success');
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

    // Como en la app anterior: el resumen del servidor hasta que se elige un conductor a mano
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
        <div id="tab-asignacion" className={RAIZ}>
            {!movil && (
                <section className={TARJETA}>
                    <EncabezadoTarjeta
                        icono={CalendarCheck}
                        titulo="Ejecutar Asignación"
                        subtitulo="Elige una semana y genera las asignaciones automáticamente"
                    />
                    <div className={CUERPO}>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-72 max-w-full">
                                <label className={`${ETIQUETA} flex items-center gap-1`}>
                                    <CalendarBlank size={16} aria-hidden="true" />
                                    Semana
                                </label>
                                <Desplegable
                                    variante="campo"
                                    rotulo="Semana"
                                    valor={semana}
                                    onCambiar={verAsignacion}
                                    etiquetaVacio="Seleccionar semana..."
                                    textoVacioChip={errorLista ? 'Error' : 'Seleccionar semana...'}
                                    opciones={
                                        errorLista
                                            ? []
                                            : [
                                                  { valor: '', etiqueta: 'Seleccionar semana...' },
                                                  ...(programas || []).map((p) => ({
                                                      valor: p.id,
                                                      etiqueta: `${formatDate(p.semana_inicio)} - ${formatDate(p.semana_fin)}${(p.asignados || 0) > 0 ? ` ✓ ${p.asignados} asignados` : ''}`
                                                  }))
                                              ]
                                    }
                                />
                            </div>
                            <Boton
                                id="btn-ejecutar-asignacion"
                                type="button"
                                variante="primario"
                                icono={MagicWand}
                                disabled={ejecutando}
                                onClick={() => ejecutar()}
                            >
                                Ejecutar Algoritmo
                            </Boton>
                        </div>
                    </div>
                </section>
            )}

            {res && (
                <section ref={tarjetaResultados} className={TARJETA} id="card-resultados">
                    <EncabezadoTarjeta
                        icono={ListChecks}
                        titulo="Resultados"
                        subtitulo="Revisa y ajusta los conductores antes de guardar"
                    />
                    <div className={CUERPO}>
                        {!movil && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    ['text-ink', 'Total'],
                                    ['text-ok', 'Asignados'],
                                    ['text-danger', 'Sin Asignar'],
                                    ['text-info', 'Conductores']
                                ].map(([tono, etiqueta], i) => (
                                    <div key={etiqueta} className={RESUMEN}>
                                        <span className={`${CIFRA} ${tono}`}>{stats[i]}</span>
                                        <span className="caption-1 block text-muted">{etiqueta}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2" id="resultados-actions">
                            <Boton variante="primario" icono={FloppyDisk} onClick={guardar}>
                                {res.editando ? 'Actualizar Asignación' : 'Guardar Asignación'}
                            </Boton>
                            <Boton variante="secundario" icono={X} onClick={() => setRes(null)}>
                                Cancelar
                            </Boton>
                        </div>
                        <div className="mt-4" id="resultados-day-groups">
                            {res.filas &&
                                (() => {
                                    const Vista = movil ? ResultadosMovil : TablaResultados;
                                    return (
                                        <Vista
                                            filas={res.filas}
                                            semanaInicio={inicioDe(res.semanaId)}
                                            conductores={res.conductores}
                                            cuenta={res.cuenta}
                                            disponibles={res.disponibles}
                                            elecciones={res.elecciones}
                                            inicialmenteSinAsignar={res.sinAsignarAlInicio}
                                            formatos={res.formatos}
                                            onElegir={elegir}
                                            onFormato={setFormateando}
                                        />
                                    );
                                })()}
                        </div>
                    </div>
                </section>
            )}

            <section className={TARJETA}>
                <EncabezadoTarjeta icono={Stack} titulo="Programas" subtitulo="Estado de asignación de cada semana" />
                <div className={CUERPO}>
                    <TablaProgramas
                        programas={programas}
                        error={errorLista}
                        onVer={verAsignacion}
                        onPng={setConImagen}
                        onSheets={exportar}
                        onImprimir={setImprimiendo}
                        onAsignar={movil ? ejecutar : undefined}
                    />
                </div>
            </section>
            {formateando && res && (
                <ModalFormato
                    formato={res.formatos[idDeFila(formateando) ?? ''] || {}}
                    esLibre={formateando.tipo === 'extra'}
                    descripcion={descripcionDeFila(formateando)}
                    onCerrar={() => setFormateando(null)}
                    onAplicar={(formato) => aplicarFormato(formateando, formato)}
                />
            )}
            {conImagen && <ModalPng programa={conImagen} onCerrar={() => setConImagen(null)} />}
            {imprimiendo && <ModalImprimir programa={imprimiendo} onCerrar={() => setImprimiendo(null)} />}
        </div>
    );
}
