import { useEffect, useState } from 'react';
import { ChartBar } from '@phosphor-icons/react';
import { apiFetch } from '../../api/client.js';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import {
    CIFRA,
    CUERPO,
    INSIGNIA,
    RAIZ,
    RESUMEN,
    TABLA,
    TABLA_CONTENEDOR,
    TARJETA,
    TD,
    TH
} from '../../components/ui/estilos.js';

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

// Pestaña Historial: mismas cifras que la app anterior
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
        <div className={RAIZ}>
            <section className={TARJETA}>
                <EncabezadoTarjeta
                    icono={ChartBar}
                    titulo="Estadísticas"
                    subtitulo="Turnos asignados en los programas guardados"
                />
                <div className={CUERPO}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className={RESUMEN}>
                            <span className={CIFRA}>{datos.total}</span>
                            <span className="caption-1 block text-muted">Total Asignaciones</span>
                        </div>
                        {/* La app anterior muestra 100% si hay programas; se mantiene igual hasta definir la fórmula */}
                        <div className={RESUMEN}>
                            <span className={`${CIFRA} text-ok`}>{datos.hayProgramas ? '100%' : '0%'}</span>
                            <span className="caption-1 block text-muted">Tasa Asignación</span>
                        </div>
                        <div className={RESUMEN}>
                            <span className={`${CIFRA} text-info`}>{datos.conductoresConTurnos}</span>
                            <span className="caption-1 block text-muted">Conductores Activos</span>
                        </div>
                    </div>
                    <h4 className="title-2 mt-6 mb-3 text-ink">Historial por Conductor</h4>
                    <div className={TABLA_CONTENEDOR}>
                        <table className={TABLA}>
                            <thead>
                                <tr>
                                    <th className={TH}>Conductor</th>
                                    <th className={TH}>Grupo</th>
                                    <th className={TH}>Total Turnos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.filas.map((c) => (
                                    <tr key={c.id}>
                                        <td className={TD}>{c.nombre}</td>
                                        <td className={TD}>
                                            <span
                                                className={`${INSIGNIA} ${c.grupo === 'A' ? 'bg-info-bg text-info' : 'bg-warn-bg text-warn'}`}
                                            >
                                                {c.grupo || '—'}
                                            </span>
                                        </td>
                                        <td className={TD}>
                                            <strong className="title-4 text-ink">{c.total}</strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}
