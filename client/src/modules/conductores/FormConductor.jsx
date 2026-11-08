import { useState } from 'react';
import { OPCIONES_GRUPO } from './grupos.js';

/**
 * @typedef {import('./api.js').DatosConductor} DatosConductor
 */

/** @type {DatosConductor} */
const VACIO = {
    nombre: '',
    grupo: 'A',
    tiene_pc: false,
    poca_movilidad: false,
    solo_parque: false,
    ubicacion_casa: ''
};

/**
 * Alta de conductor. Nombre y grupo son obligatorios (RN-COND-01).
 * @param {{ onGuardar: (datos: DatosConductor) => Promise<void> }} props
 */
export default function FormConductor({ onGuardar }) {
    const [datos, setDatos] = useState(VACIO);
    const [guardando, setGuardando] = useState(false);

    /** @param {Partial<DatosConductor>} cambio */
    const cambiar = (cambio) => setDatos((d) => ({ ...d, ...cambio }));

    /** @param {import('react').FormEvent} e */
    const enviar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            await onGuardar({ ...datos, ubicacion_casa: datos.ubicacion_casa || null });
            setDatos(VACIO);
        } catch {
            // el error ya se mostró en un aviso; se conservan los datos para reintentar
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3>
                    <i className="fas fa-user-plus"></i> Nuevo Conductor
                </h3>
            </div>
            <div className="card-body">
                <form onSubmit={enviar}>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label>Nombre Completo</label>
                            <input
                                type="text"
                                className="form-control"
                                required
                                placeholder="Juan Pérez"
                                value={datos.nombre}
                                onChange={(e) => cambiar({ nombre: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Grupo</label>
                            <select
                                className="form-control"
                                required
                                value={datos.grupo}
                                onChange={(e) =>
                                    cambiar({ grupo: /** @type {DatosConductor['grupo']} */ (e.target.value) })
                                }
                            >
                                {OPCIONES_GRUPO.map((g) => (
                                    <option key={g.valor} value={g.valor}>
                                        {g.texto}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ alignSelf: 'end' }}>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={datos.tiene_pc}
                                    onChange={(e) => cambiar({ tiene_pc: e.target.checked })}
                                />{' '}
                                Tiene PC (Zoom)
                            </label>
                        </div>
                        <div className="form-group" style={{ alignSelf: 'end' }}>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={datos.poca_movilidad}
                                    onChange={(e) => cambiar({ poca_movilidad: e.target.checked })}
                                />{' '}
                                Poca Movilidad
                            </label>
                        </div>
                        <div className="form-group" style={{ alignSelf: 'end' }}>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={datos.solo_parque}
                                    onChange={(e) => cambiar({ solo_parque: e.target.checked })}
                                />{' '}
                                Solo Parque Las Vegas
                            </label>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Ubicación Casa (lat,lng) — opcional</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="-12.0464,-77.0428"
                            value={datos.ubicacion_casa || ''}
                            onChange={(e) => cambiar({ ubicacion_casa: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={guardando}>
                        <i className="fas fa-save"></i> <span className="btn-text">Guardar Conductor</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
