// @ts-check
import { Clock, MapPin, MapTrifold, UserCheck, UsersThree } from '@phosphor-icons/react';
import Desplegable from '../../components/ui/Desplegable.jsx';
import { nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import MenuFormatoFila from './MenuFormatoFila.jsx';
import { etiquetaGrupo, opcionesDeConductor } from './logica.js';

/**
 * @typedef {import('./logica.js').FilaResultado} FilaResultado
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').Formato} Formato
 */

// Mismo aspecto que el editor de Programa (modules/programa/editorComun.jsx, RN-UI-09): bloque de día a la
// izquierda, chips del color del día y el mismo ancho de columnas. Se copian las clases porque los módulos no se importan entre sí.
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
// `break-words`: un texto largo sin espacios (AV.UNIVERSITARIA/AV.MEXICO) se parte dentro de su celda en vez de salirse de ella
export const CAMPO =
    'body-6 min-h-9 w-full min-w-0 rounded-lg border border-transparent bg-(--dia) px-3 py-2 text-ink outline-none break-words';
export const CAMPO_LIBRE = `${CAMPO} border-dashed border-ink/30`;
// Hora y Grupo tienen ancho fijo (su contenido más largo); Territorio y P. Reunión reparten el resto. Por debajo de 740 px la tabla se desplaza en horizontal
const COLUMNAS = 'grid-cols-[176px_140px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_32px]';
// Vista por semana en móvil: columnas con el ancho que necesita su contenido y la tabla se desplaza en horizontal
const COLUMNAS_COMPLETO = 'grid-cols-[190px_220px_230px_240px_260px_32px]';
const TITULO = 'caption-3 flex items-center gap-1 px-1 uppercase tracking-wide';

/**
 * Tabla de Resultados con la lista de conductores en cada turno (renderResultadosTable). Solo el conductor se elige;
 * el resto de los campos se muestran como en el editor de Programa.
 * @param {{
 *   filas: FilaResultado[],
 *   semanaInicio: string | undefined,
 *   conductores: Conductor[],
 *   cuenta: Record<string, number>,
 *   disponibles: Set<string>,
 *   elecciones: Record<string, string>,
 *   inicialmenteSinAsignar: Set<string>,
 *   formatos: Record<string, Formato>,
 *   onElegir: (turnoId: string, valor: string) => void,
 *   onFormato: (fila: FilaResultado) => void,
 *   completo?: boolean
 * }} props
 * `formatos` guarda el formato por id de turno o de fila libre; el menú ⋯ de cada fila abre el formato de celdas.
 * `completo` muestra cada celda con todo su contenido (grupo sin abreviar y texto que se ajusta sin salirse).
 */
export default function TablaResultados({
    filas,
    semanaInicio,
    conductores,
    cuenta,
    disponibles,
    elecciones,
    inicialmenteSinAsignar,
    formatos,
    onElegir,
    onFormato,
    completo = false
}) {
    const columnas = completo ? COLUMNAS_COMPLETO : COLUMNAS;
    /** @param {string | null | undefined} grupo */
    const textoGrupo = (grupo) => (completo ? grupo || '' : etiquetaGrupo(grupo));
    /** @param {FilaResultado} f @param {string | undefined} id */
    const menu = (f, id) => (
        <MenuFormatoFila
            conFormato={!!id && Object.keys(formatos[id] || {}).length > 0}
            onFormato={() => onFormato(f)}
        />
    );

    // Filas agrupadas por día, en el orden en que llegan; cada una conserva su posición para la clave
    /** @type {{ dia: Dia, items: { f: FilaResultado, i: number }[] }[]} */
    const grupos = [];
    filas.forEach((f, i) => {
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.dia === f.dia) ultimo.items.push({ f, i });
        else grupos.push({ dia: f.dia, items: [{ f, i }] });
    });

    return (
        <div className="tw overflow-x-auto">
            <div id="resultados-table" className={completo ? 'w-max min-w-full' : 'min-w-[780px]'}>
                <div role="row" className={`ml-24 grid ${columnas} gap-2 pb-2 pl-2 text-muted`}>
                    <span className={TITULO}>
                        <Clock size={14} aria-hidden="true" />
                        Hora
                    </span>
                    <span className={TITULO}>
                        <UsersThree size={14} aria-hidden="true" />
                        Grupo
                    </span>
                    <span className={TITULO}>
                        <MapTrifold size={14} aria-hidden="true" />
                        Territorio
                    </span>
                    <span className={TITULO}>
                        <MapPin size={14} aria-hidden="true" />
                        P. Reunión
                    </span>
                    <span className={TITULO}>
                        <UserCheck size={14} aria-hidden="true" />
                        Conductor
                    </span>
                    <span></span>
                </div>

                {grupos.map((g) => (
                    <div
                        key={g.items[0].i}
                        data-dia={g.dia}
                        style={/** @type {import('react').CSSProperties} */ ({ '--dia': COLOR_DIA[g.dia] })}
                        className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 pb-4"
                    >
                        <div className="flex flex-col gap-0.5 self-stretch rounded-lg bg-(--dia) px-3 py-2 text-ink">
                            <b className="body-5">{nombreDia(g.dia)}</b>
                            <small className="caption-4 text-ink/60">{fechaDelDia(semanaInicio, g.dia)}</small>
                        </div>
                        <div className="grid gap-2">
                            {g.items.map(({ f, i }) => {
                                if (f.tipo === 'extra') {
                                    // Fila libre del programa: se muestra, no se asigna
                                    const e = f.extra;
                                    return (
                                        <div key={`e${i}`} role="row" className={`grid ${columnas} gap-2`}>
                                            <div className={CAMPO_LIBRE}>{e.hora || ''}</div>
                                            <div className={CAMPO_LIBRE}>{textoGrupo(e.grupo)}</div>
                                            <div className={CAMPO_LIBRE}>{(e.territorio || '').trim()}</div>
                                            <div className={CAMPO_LIBRE}>{(e.punto_reunion || '').trim()}</div>
                                            <div className={CAMPO_LIBRE}>{(e.conductor || '').trim()}</div>
                                            {menu(f, e.id)}
                                        </div>
                                    );
                                }

                                const r = f.resultado;
                                const valor = elecciones[r.turno_id] ?? '';
                                const vacio = !valor;
                                return (
                                    <div
                                        key={r.turno_id}
                                        role="row"
                                        data-turno-id={r.turno_id}
                                        className={`grid ${columnas} gap-2`}
                                    >
                                        <div className={`${CAMPO} font-medium`}>{r.hora || ''}</div>
                                        <div className={CAMPO}>{textoGrupo(r.grupo)}</div>
                                        <div className={CAMPO}>{r.territorio || '—'}</div>
                                        <div className={CAMPO}>{r.punto_reunion || '—'}</div>
                                        <Desplegable
                                            rotulo={`Conductor del turno ${r.hora || ''} ${r.territorio || ''}`.trim()}
                                            valor={valor}
                                            onCambiar={(v) => onElegir(r.turno_id, v)}
                                            etiquetaVacio="SIN ASIGNAR"
                                            textoVacioChip="SIN ASIGNAR"
                                            anchoMin={260}
                                            sinRecorte={completo}
                                            claseTexto={vacio ? 'text-danger' : ''}
                                            opciones={opcionesDeConductor(
                                                r,
                                                conductores,
                                                cuenta,
                                                disponibles,
                                                inicialmenteSinAsignar.has(r.turno_id)
                                            )}
                                        />
                                        {menu(f, r.turno_id)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
