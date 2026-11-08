import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { useSesion } from '../../hooks/useSesion.jsx';
import { mensajeError } from '../../utils/errores.js';
import { agregarCorreo, alternarSuperAdmin, eliminarCorreo, listarCorreos, renunciarSuperAdmin } from './api.js';

/** @typedef {import('./api.js').CorreoAutorizado} CorreoAutorizado */

// Límites del backend (routes/auth.js). Pendientes de revisar con más usuarios: RN-AUTH-02/03, ADR-019.
const MAX_USUARIOS = 4;
const MAX_SUPER_ADMINS = 2;

const BOTON_CHICO = { fontSize: '0.75rem', padding: '2px 8px', height: 'auto', lineHeight: 1.4 };

// Pestaña Admin (solo super admins, fuera de Hoja de Predicación; ADR-022). Reglas: RN-AUTH-01..08
export default function Admin() {
    const toast = useToast();
    const confirmar = useConfirmar();
    const { usuario, refrescarRol } = useSesion();
    const [correos, setCorreos] = useState(/** @type {CorreoAutorizado[]} */ ([]));
    const [nuevoCorreo, setNuevoCorreo] = useState('');

    const cargarCorreos = useCallback(async () => {
        try {
            setCorreos(await listarCorreos());
        } catch {
            toast('Error cargando lista de emails', 'error');
        }
    }, [toast]);

    useEffect(() => {
        cargarCorreos();
    }, [cargarCorreos]);

    const agregar = async () => {
        const email = nuevoCorreo.trim();
        if (!email) {
            toast('Ingresa un email', 'warning');
            return;
        }
        try {
            await agregarCorreo(email);
            toast('Email añadido correctamente', 'success');
            setNuevoCorreo('');
            cargarCorreos();
        } catch (err) {
            toast(mensajeError(err, 'Error al añadir email'), 'error');
        }
    };

    /** @param {CorreoAutorizado} c */
    const eliminar = async (c) => {
        const ok = await confirmar({
            titulo: '¿Eliminar este email?',
            mensaje: `${c.email} ya no podrá entrar al sistema.`,
            textoConfirmar: 'Eliminar',
            peligro: true,
            icono: 'fa-trash'
        });
        if (ok !== true) return;
        try {
            await eliminarCorreo(c.id);
            toast('Email eliminado', 'success');
            cargarCorreos();
        } catch (err) {
            toast(mensajeError(err, 'Error al eliminar'), 'error');
        }
    };

    /** @param {CorreoAutorizado} c */
    const alternarRol = async (c) => {
        try {
            await alternarSuperAdmin(c.id);
            toast('Rol actualizado', 'success');
            cargarCorreos();
        } catch (err) {
            toast(mensajeError(err, 'Error al actualizar rol'), 'error');
        }
    };

    const renunciar = async () => {
        const ok = await confirmar({
            titulo: '¿Renunciar como super admin?',
            mensaje: 'Ya no podrás gestionar la lista de emails.',
            textoConfirmar: 'Renunciar',
            peligro: true,
            icono: 'fa-user-minus'
        });
        if (ok !== true) return;
        try {
            const res = await renunciarSuperAdmin();
            toast(res.message || 'Has renunciado como super admin', 'success');
            await refrescarRol(); // sin el rol, la ruta /admin redirige a Hoja de Predicación
        } catch (err) {
            toast(mensajeError(err, 'Error al renunciar'), 'error');
        }
    };

    const admins = correos.filter((c) => c.is_super_admin).length;

    return (
        <div className="card">
            <div className="card-header">
                <h3>
                    <i className="fas fa-shield-alt"></i> Administración
                </h3>
            </div>
            <div className="card-body">
                <p>Gestiona los emails autorizados para acceder al sistema.</p>
                <div className="stats-row" style={{ marginBottom: 15, gap: 10 }}>
                    <div className="stat-card" style={{ padding: '8px 16px' }}>
                        <strong>{correos.length}</strong>
                        <span style={{ fontSize: '0.8rem', marginLeft: 4 }}>/ {MAX_USUARIOS} usuarios</span>
                    </div>
                    <div className="stat-card" style={{ padding: '8px 16px' }}>
                        <strong>{admins}</strong>
                        <span style={{ fontSize: '0.8rem', marginLeft: 4 }}>/ {MAX_SUPER_ADMINS} super admins</span>
                    </div>
                </div>
                <div className="form-row" style={{ alignItems: 'end', gap: 8, marginBottom: 15 }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                            type="email"
                            className="form-control"
                            placeholder="correo@ejemplo.com"
                            value={nuevoCorreo}
                            onChange={(e) => setNuevoCorreo(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <button className="btn btn-primary" disabled={correos.length >= MAX_USUARIOS} onClick={agregar}>
                            <i className="fas fa-plus"></i> Añadir
                        </button>
                    </div>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th style={{ width: 120 }}>Super Admin</th>
                                <th style={{ width: 120 }}>Agregado Por</th>
                                <th style={{ width: 120 }}>Fecha</th>
                                <th style={{ width: 160 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {correos.map((c) => {
                                const esYo = c.email === usuario?.email;
                                const puedeRenunciar = c.is_super_admin && admins > 1; // RN-AUTH-06
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            {c.email}
                                            {esYo && (
                                                <>
                                                    {' '}
                                                    <span className="badge badge-info">tú</span>
                                                </>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {c.is_super_admin ? (
                                                <span className="badge badge-success">
                                                    <i className="fas fa-check"></i>
                                                </span>
                                            ) : (
                                                <span className="badge badge-secondary">—</span>
                                            )}
                                        </td>
                                        <td>{c.added_by || '—'}</td>
                                        <td>
                                            {c.created_at ? new Date(c.created_at).toLocaleDateString('es-PE') : '—'}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {/* RN-AUTH-05: uno mismo no se elimina ni cambia el rol; solo renuncia */}
                                            {esYo && c.is_super_admin && (
                                                <button
                                                    className="btn btn-warning"
                                                    style={BOTON_CHICO}
                                                    disabled={!puedeRenunciar}
                                                    title={
                                                        puedeRenunciar
                                                            ? 'Renunciar como super admin'
                                                            : 'Debe haber al menos 1 super admin'
                                                    }
                                                    onClick={renunciar}
                                                >
                                                    <i className="fas fa-user-minus"></i> Renunciar
                                                </button>
                                            )}
                                            {esYo && !c.is_super_admin && (
                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    —
                                                </span>
                                            )}
                                            {!esYo && (
                                                <>
                                                    <button
                                                        className={`btn btn-${c.is_super_admin ? 'warning' : 'info'}`}
                                                        style={BOTON_CHICO}
                                                        onClick={() => alternarRol(c)}
                                                    >
                                                        <i
                                                            className={`fas ${c.is_super_admin ? 'fa-user-minus' : 'fa-user-shield'}`}
                                                        ></i>{' '}
                                                        {c.is_super_admin ? 'Quitar Admin' : 'Hacer Admin'}
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ ...BOTON_CHICO, marginLeft: 4 }}
                                                        title="Eliminar"
                                                        onClick={() => eliminar(c)}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
