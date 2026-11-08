import { CalendarBlank, Clock, MapPin, MapTrifold, UserCheck, UsersThree } from '@phosphor-icons/react';
import DiaBadge from '../../components/ui/DiaBadge.jsx';
import Desplegable from '../../components/ui/Desplegable.jsx';
import { TABLA, TABLA_CONTENEDOR, TD, TH } from '../../components/ui/estilos.js';
import { fechaDelDia } from '../../utils/fechas.js';
import { etiquetaGrupo, opcionConductor } from './logica.js';

/**
 * @typedef {import('./logica.js').FilaResultado} FilaResultado
 * @typedef {import('../../types/models').Conductor} Conductor
 */

/** Encabezado con ícono (Phosphor, ADR-021). */
const COL = 'inline-flex items-center gap-1';

/**
 * Tabla de Resultados con la lista de conductores en cada turno (renderResultadosTable).
 * Mismas columnas, atributos y orden que la app anterior.
 * @param {{
 *   filas: FilaResultado[],
 *   semanaInicio: string | undefined,
 *   conductores: Conductor[],
 *   cuenta: Record<string, number>,
 *   disponibles: Set<string>,
 *   elecciones: Record<string, string>,
 *   inicialmenteSinAsignar: Set<string>,
 *   onElegir: (turnoId: string, valor: string) => void
 * }} props
 */
export default function TablaResultados({
    filas,
    semanaInicio,
    conductores,
    cuenta,
    disponibles,
    elecciones,
    inicialmenteSinAsignar,
    onElegir
}) {
    /** @type {Record<string, number>} */
    const primera = {};
    /** @type {Record<string, number>} */
    const ultima = {};
    filas.forEach((f, i) => {
        primera[f.dia] ??= i;
        ultima[f.dia] = i;
    });

    return (
        <div className={TABLA_CONTENEDOR}>
            <table className={TABLA} id="resultados-table">
                <thead>
                    <tr>
                        <th className={TH}>
                            <span className={COL}>
                                <CalendarBlank size={14} aria-hidden="true" /> Día
                            </span>
                        </th>
                        <th className={TH}>
                            <span className={COL}>
                                <Clock size={14} aria-hidden="true" /> Hora
                            </span>
                        </th>
                        <th className={TH}>
                            <span className={COL}>
                                <UsersThree size={14} aria-hidden="true" /> Grupo
                            </span>
                        </th>
                        <th className={TH}>
                            <span className={COL}>
                                <MapTrifold size={14} aria-hidden="true" /> Territorio
                            </span>
                        </th>
                        <th className={TH}>
                            <span className={COL}>
                                <MapPin size={14} aria-hidden="true" /> P. Reunión
                            </span>
                        </th>
                        <th className={TH}>
                            <span className={COL}>
                                <UserCheck size={14} aria-hidden="true" /> Conductor
                            </span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filas.map((f, i) => {
                        const marcas = {
                            'data-dia': f.dia,
                            'data-dia-label': primera[f.dia] === i ? '1' : undefined,
                            'data-dia-fin': ultima[f.dia] === i ? 'true' : undefined
                        };
                        const badge =
                            primera[f.dia] === i ? (
                                <DiaBadge dia={f.dia} fecha={fechaDelDia(semanaInicio, f.dia)} />
                            ) : null;

                        if (f.tipo === 'extra') {
                            // Fila libre del programa: se muestra, no se asigna
                            const e = f.extra;
                            return (
                                <tr key={`e${i}`} className="bg-canvas" {...marcas}>
                                    <td className={TD}>{badge}</td>
                                    <td className={TD}>{e.hora || ''}</td>
                                    <td className={TD}>{etiquetaGrupo(e.grupo)}</td>
                                    <td className={TD}>{(e.territorio || '').trim()}</td>
                                    <td className={TD}>{(e.punto_reunion || '').trim()}</td>
                                    <td className={TD}>{(e.conductor || '').trim()}</td>
                                </tr>
                            );
                        }

                        const r = f.resultado;
                        const valor = elecciones[r.turno_id] ?? '';
                        const vacio = !valor;
                        return (
                            <tr
                                key={r.turno_id}
                                className={vacio ? 'bg-danger-bg/60' : undefined}
                                data-turno-id={r.turno_id}
                                {...marcas}
                            >
                                <td className={TD}>{badge}</td>
                                <td className={TD}>{r.hora || ''}</td>
                                <td className={TD}>{etiquetaGrupo(r.grupo)}</td>
                                <td className={TD}>{r.territorio || '—'}</td>
                                <td className={TD}>{r.punto_reunion || '—'}</td>
                                <td className={TD}>
                                    <Desplegable
                                        variante="celda"
                                        rotulo={`Conductor del turno ${r.hora || ''} ${r.territorio || ''}`.trim()}
                                        valor={valor}
                                        onCambiar={(v) => onElegir(r.turno_id, v)}
                                        etiquetaVacio="SIN ASIGNAR"
                                        textoVacioChip="SIN ASIGNAR"
                                        anchoMin={260}
                                        claseTexto={vacio ? 'text-danger' : ''}
                                        opciones={[
                                            ...(inicialmenteSinAsignar.has(r.turno_id)
                                                ? [{ valor: '', etiqueta: 'SIN ASIGNAR' }]
                                                : []),
                                            ...conductores.map((c) => {
                                                const op = opcionConductor(c, r, cuenta, disponibles);
                                                return { valor: op.valor, etiqueta: op.texto };
                                            })
                                        ]}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
