import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';

/**
 * @typedef {import('../../types/models').Programa} Programa
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {{ id: string, nombre: string, grupo: string, total: number }} FilaHistorial
 */

/**
 * Turnos asignados por conductor en los programas guardados (hasta 10, RN-PROG-03).
 * @param {Programa[]} programas
 * @param {Conductor[]} conductores
 */
function calcular(programas, conductores) {
    /** @type {Record<string, FilaHistorial>} */
    const porConductor = {};
    let total = 0;
    for (const p of programas) {
        for (const t of p.programa_semanal_turnos || []) {
            if (!t.conductor_id) continue;
            total++;
            porConductor[t.conductor_id] ??= { id: t.conductor_id, nombre: 'Cargando...', grupo: '', total: 0 };
            porConductor[t.conductor_id].total++;
        }
    }
    for (const c of conductores) {
        if (porConductor[c.id]) {
            porConductor[c.id].nombre = c.nombre;
            porConductor[c.id].grupo = c.grupo;
        }
    }
    const filas = Object.values(porConductor).sort((a, b) => b.total - a.total);
    return { total, conductoresConTurnos: filas.length, hayProgramas: programas.length > 0, filas };
}

// Pestaña Historial: mismas cifras que la app actual
export default function Historial() {
    const toast = useToast();
    const [datos, setDatos] = useState(
        /** @type {ReturnType<typeof calcular>} */ ({
            total: 0,
            conductoresConTurnos: 0,
            hayProgramas: false,
            filas: []
        })
    );

    useEffect(() => {
        (async () => {
            try {
                const [prog, cond] = await Promise.all([
                    /** @type {Promise<{ programas: Programa[] }>} */ (apiFetch('/api/programa-semanal')),
                    /** @type {Promise<{ conductores: Conductor[] }>} */ (apiFetch('/api/conductores'))
                ]);
                setDatos(calcular(prog.programas || [], cond.conductores || []));
            } catch {
                toast('Error cargando historial', 'error');
            }
        })();
    }, [toast]);

    return (
        <div className="card">
            <div className="card-header">
                <h3>
                    <i className="fas fa-chart-bar"></i> Estadísticas
                </h3>
            </div>
            <div className="card-body">
                <div className="stats-row">
                    <div className="stat-card">
                        <span className="stat-value">{datos.total}</span>
                        <span className="stat-label">Total Asignaciones</span>
                    </div>
                    {/* La app actual muestra 100% si hay programas; se mantiene igual hasta definir la fórmula */}
                    <div className="stat-card success">
                        <span className="stat-value">{datos.hayProgramas ? '100%' : '0%'}</span>
                        <span className="stat-label">Tasa Asignación</span>
                    </div>
                    <div className="stat-card info">
                        <span className="stat-value">{datos.conductoresConTurnos}</span>
                        <span className="stat-label">Conductores Activos</span>
                    </div>
                </div>
                <h4>Historial por Conductor</h4>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Conductor</th>
                                <th>Grupo</th>
                                <th>Total Turnos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {datos.filas.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.nombre}</td>
                                    <td>
                                        <span className={`badge badge-${c.grupo === 'A' ? 'info' : 'warning'}`}>
                                            {c.grupo || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <strong>{c.total}</strong>
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
