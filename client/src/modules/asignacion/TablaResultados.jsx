import DiaBadge from '../../components/ui/DiaBadge.jsx';
import SelectRecortable from '../../components/ui/SelectRecortable.jsx';
import { fechaDelDia } from '../../utils/fechas.js';
import { etiquetaGrupo, opcionConductor } from './logica.js';

/**
 * @typedef {import('./logica.js').FilaResultado} FilaResultado
 * @typedef {import('../../types/models').Conductor} Conductor
 */

/**
 * Tabla de Resultados con la lista de conductores en cada turno (renderResultadosTable).
 * Mismo marcado y clases que la app actual.
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
        <div className="table-container">
            <table className="table" id="resultados-table">
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
                            <i className="fa-solid fa-user-check"></i> Conductor
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
                                <tr key={`e${i}`} className="fila-extra-res" {...marcas}>
                                    <td className="dia-cell">{badge}</td>
                                    <td>{e.hora || ''}</td>
                                    <td>{etiquetaGrupo(e.grupo)}</td>
                                    <td>{(e.territorio || '').trim()}</td>
                                    <td>{(e.punto_reunion || '').trim()}</td>
                                    <td>{(e.conductor || '').trim()}</td>
                                </tr>
                            );
                        }

                        const r = f.resultado;
                        const valor = elecciones[r.turno_id] ?? '';
                        const vacio = !valor;
                        return (
                            <tr
                                key={r.turno_id}
                                className={vacio ? 'sin-asignar' : undefined}
                                data-turno-id={r.turno_id}
                                {...marcas}
                            >
                                <td className="dia-cell">{badge}</td>
                                <td>{r.hora || ''}</td>
                                <td>{etiquetaGrupo(r.grupo)}</td>
                                <td>{r.territorio || '—'}</td>
                                <td>{r.punto_reunion || '—'}</td>
                                <td>
                                    <SelectRecortable
                                        className={`form-control cond-select${vacio ? ' cond-vacio' : ''}`}
                                        value={valor}
                                        onChange={(e) => onElegir(r.turno_id, e.target.value)}
                                    >
                                        {inicialmenteSinAsignar.has(r.turno_id) && (
                                            <option value="" className="op-vacio">
                                                SIN ASIGNAR
                                            </option>
                                        )}
                                        {conductores.map((c) => {
                                            const op = opcionConductor(c, r, cuenta, disponibles);
                                            return (
                                                <option
                                                    key={c.id}
                                                    value={op.valor}
                                                    className={op.noDisponible ? 'op-no-disp' : undefined}
                                                >
                                                    {op.texto}
                                                </option>
                                            );
                                        })}
                                    </SelectRecortable>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
