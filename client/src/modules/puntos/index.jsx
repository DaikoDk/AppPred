import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { mensajeError } from '../../utils/errores.js';
import { actualizarPunto, crearPunto, desactivarPunto, listarPuntos } from './api.js';

/** @typedef {import('../../types/models').PuntoReunion} PuntoReunion */

const VACIO = { nombre: '', ubicacion: '' };

// Pestaña Puntos de Reunión. Reglas: RN-PUNT-01..04 en docs/REGLAS-NEGOCIO.md
export default function Puntos() {
    const toast = useToast();
    const confirmar = useConfirmar();
    const [puntos, setPuntos] = useState(/** @type {PuntoReunion[]} */ ([]));
    const [error, setError] = useState(false);
    const [datos, setDatos] = useState(VACIO);
    const [editandoId, setEditandoId] = useState(/** @type {string | null} */ (null));
    const [guardando, setGuardando] = useState(false);

    const recargar = useCallback(async () => {
        try {
            setPuntos(await listarPuntos());
            setError(false);
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        recargar();
    }, [recargar]);

    /** @param {import('react').FormEvent} e */
    const enviar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        const payload = { nombre: datos.nombre, ubicacion: datos.ubicacion || null };
        try {
            if (editandoId) {
                await actualizarPunto(editandoId, payload);
                toast('Punto actualizado', 'success');
            } else {
                await crearPunto(payload);
                toast('Punto creado', 'success');
            }
            setDatos(VACIO);
            setEditandoId(null);
            recargar();
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        } finally {
            setGuardando(false);
        }
    };

    /** @param {PuntoReunion} p */
    const editar = (p) => {
        if (p.fijo) {
            toast('No se puede editar un punto fijo', 'error');
            return;
        }
        setDatos({ nombre: p.nombre || '', ubicacion: p.ubicacion || '' });
        setEditandoId(p.id);
    };

    /** @param {PuntoReunion} p */
    const desactivar = async (p) => {
        if (p.fijo) {
            toast('No se puede eliminar un punto fijo', 'error');
            return;
        }
        const ok = await confirmar({
            titulo: '¿Desactivar este punto de reunión?',
            mensaje: `${p.nombre} dejará de aparecer en las listas.`,
            textoConfirmar: 'Desactivar',
            peligro: true,
            icono: 'fa-map-pin'
        });
        if (ok !== true) return;
        try {
            await desactivarPunto(p.id);
            toast('Punto desactivado', 'success');
            if (editandoId === p.id) {
                setEditandoId(null);
                setDatos(VACIO);
            }
            recargar();
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        }
    };

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3>
                        <i className="fas fa-map-pin"></i> Nuevo Punto de Reunión
                    </h3>
                </div>
                <div className="card-body">
                    <form onSubmit={enviar}>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Nombre / Referencia</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="FAM "
                                    value={datos.nombre}
                                    onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Coordenadas (lat,lng)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="-11.9525,-77.0614"
                                    value={datos.ubicacion}
                                    onChange={(e) => setDatos((d) => ({ ...d, ubicacion: e.target.value }))}
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={guardando}>
                            <i className="fas fa-save"></i>{' '}
                            <span className="btn-text">{editandoId ? 'Actualizar Punto' : 'Guardar Punto'}</span>
                        </button>
                    </form>
                </div>
            </div>
            <div className="card">
                <div className="card-header">
                    <h3>
                        <i className="fas fa-list"></i> Puntos de Reunión
                    </h3>
                </div>
                <div className="card-body">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Coordenadas</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {error && (
                                    <tr>
                                        <td colSpan={3}>Error</td>
                                    </tr>
                                )}
                                {puntos.map((p) => (
                                    <tr key={p.id} data-id={p.id}>
                                        <td>
                                            <strong>
                                                {p.nombre}
                                                {p.fijo && (
                                                    <>
                                                        {' '}
                                                        <span className="badge badge-secondary">Fijo</span>
                                                    </>
                                                )}
                                            </strong>
                                        </td>
                                        <td>
                                            <code>{p.ubicacion || '—'}</code>
                                        </td>
                                        <td>
                                            {!p.fijo && (
                                                <>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        title="Editar"
                                                        onClick={() => editar(p)}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>{' '}
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        title="Desactivar"
                                                        onClick={() => desactivar(p)}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
