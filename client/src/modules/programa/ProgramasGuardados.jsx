import { formatDate } from '../../utils/fechas.js';

/** @typedef {import('../../types/models').Programa} Programa */

/**
 * Lista "Programas Guardados" (listarProgramas de la app actual).
 * @param {{
 *   programas: Programa[] | null,
 *   error: boolean,
 *   onEditar: (id: string) => void,
 *   onEliminar: (p: Programa) => void
 * }} props  `programas` en null = cargando.
 */
export default function ProgramasGuardados({ programas, error, onEditar, onEliminar }) {
    let cuerpo;
    if (error) {
        cuerpo = (
            <tr>
                <td colSpan={3}>Error</td>
            </tr>
        );
    } else if (programas === null) {
        cuerpo = (
            <tr className="fila-estado">
                <td colSpan={3}>
                    <i className="fas fa-circle-notch fa-spin"></i> Cargando programas…
                </td>
            </tr>
        );
    } else if (programas.length === 0) {
        cuerpo = (
            <tr className="fila-estado">
                <td colSpan={3}>No hay programas guardados</td>
            </tr>
        );
    } else {
        cuerpo = programas.map((p) => (
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
                        <small className="fecha-sub">Programa semanal</small>
                    </span>
                </td>
                <td className="col-acciones">
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => onEditar(p.id)}
                        title="Editar"
                    >
                        <i className="fas fa-edit"></i>
                        <span className="btn-label">Editar</span>
                    </button>{' '}
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => onEliminar(p)}>
                        <i className="fas fa-trash"></i>
                        <span className="btn-label">Eliminar</span>
                    </button>
                </td>
            </tr>
        ));
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title-rich">
                    <span className="title-icon plain">
                        <i className="fas fa-layer-group"></i>
                    </span>
                    <div>
                        <h3>Programas Guardados</h3>
                        <p className="card-subtitle">Programas creados previamente</p>
                    </div>
                </div>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="table table-programas">
                        <thead>
                            <tr>
                                <th className="col-semana">Semana</th>
                                <th className="col-fechas">Inicio - Fin</th>
                                <th className="col-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-programas">{cuerpo}</tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
