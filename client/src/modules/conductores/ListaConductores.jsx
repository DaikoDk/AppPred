import { useState } from 'react';
import { OPCIONES_GRUPO, claseBadgeGrupo } from './grupos.js';

/** @typedef {import('../../types/models').Conductor} Conductor */

/**
 * Lista con filtros por nombre, grupo y atributos.
 * @param {{
 *   conductores: Conductor[],
 *   error: boolean,
 *   onDisponibilidad: (id: string) => void,
 *   onDesactivar: (c: Conductor) => void
 * }} props
 */
export default function ListaConductores({ conductores, error, onDisponibilidad, onDesactivar }) {
    const [texto, setTexto] = useState('');
    const [grupo, setGrupo] = useState('');
    const [soloPc, setSoloPc] = useState(false);
    const [soloPMov, setSoloPMov] = useState(false);
    const [soloParque, setSoloParque] = useState(false);

    const visibles = conductores.filter(
        (c) =>
            c.nombre.toLowerCase().includes(texto.toLowerCase()) &&
            (!grupo || c.grupo === grupo) &&
            (!soloPc || c.tiene_pc) &&
            (!soloPMov || c.poca_movilidad) &&
            (!soloParque || c.solo_parque)
    );

    return (
        <div className="card">
            <div className="card-header">
                <h3>
                    <i className="fas fa-users"></i> Lista de Conductores
                </h3>
            </div>
            <div className="card-body">
                <div className="form-row" style={{ marginBottom: 10, alignItems: 'end', gap: 8 }}>
                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Filtrar por nombre..."
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <select className="form-control" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                            <option value="">Todos los grupos</option>
                            {OPCIONES_GRUPO.map((g) => (
                                <option key={g.valor} value={g.valor}>
                                    {g.texto}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="checkbox-label" style={{ fontSize: '0.8rem' }}>
                            <input type="checkbox" checked={soloPc} onChange={(e) => setSoloPc(e.target.checked)} /> PC
                            (Zoom)
                        </label>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="checkbox-label" style={{ fontSize: '0.8rem' }}>
                            <input type="checkbox" checked={soloPMov} onChange={(e) => setSoloPMov(e.target.checked)} />{' '}
                            P. Mov
                        </label>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="checkbox-label" style={{ fontSize: '0.8rem' }}>
                            <input
                                type="checkbox"
                                checked={soloParque}
                                onChange={(e) => setSoloParque(e.target.checked)}
                            />{' '}
                            Parque
                        </label>
                    </div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Grupo</th>
                                <th>Ubicación</th>
                                <th>Etiquetas</th>
                                <th>Disponibilidad</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {error && (
                                <tr>
                                    <td colSpan={5}>Error</td>
                                </tr>
                            )}
                            {visibles.map((c) => (
                                <tr key={c.id} data-id={c.id}>
                                    <td>
                                        <strong className="cond-name">{c.nombre}</strong>
                                    </td>
                                    <td>
                                        <span className={`badge ${claseBadgeGrupo(c.grupo)}`}>Grupo {c.grupo}</span>
                                    </td>
                                    <td>
                                        <code>{c.ubicacion_casa || '—'}</code>
                                    </td>
                                    <td>
                                        {c.tiene_pc && <span className="badge badge-info">PC</span>}
                                        {c.poca_movilidad && (
                                            <>
                                                {' '}
                                                <span className="badge badge-warning">P.Mov</span>
                                            </>
                                        )}
                                        {c.solo_parque && (
                                            <>
                                                {' '}
                                                <span className="badge badge-success">Parque</span>
                                            </>
                                        )}
                                        {!c.tiene_pc && !c.poca_movilidad && !c.solo_parque && '—'}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => onDisponibilidad(c.id)}
                                        >
                                            <i className="fas fa-table"></i> Disponibilidad
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            title="Desactivar"
                                            onClick={() => onDesactivar(c)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
