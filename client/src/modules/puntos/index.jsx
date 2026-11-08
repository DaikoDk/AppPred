import { useCallback, useEffect, useState } from 'react';
import { FloppyDisk, List, MapPin, PencilSimple, Trash } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import {
    CAMPO,
    CUERPO,
    ETIQUETA,
    INSIGNIA,
    RAIZ,
    TABLA,
    TABLA_CONTENEDOR,
    TARJETA,
    TD,
    TH
} from '../../components/ui/estilos.js';
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
        <div className={RAIZ}>
            <section className={TARJETA}>
                <EncabezadoTarjeta icono={MapPin} titulo="Nuevo Punto de Reunión" />
                <div className={CUERPO}>
                    <form onSubmit={enviar} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                            <div className="min-w-0">
                                <label className={ETIQUETA}>Nombre / Referencia</label>
                                <input
                                    type="text"
                                    className={CAMPO}
                                    required
                                    placeholder="FAM "
                                    value={datos.nombre}
                                    onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className={ETIQUETA}>Coordenadas (lat,lng)</label>
                                <input
                                    type="text"
                                    className={CAMPO}
                                    placeholder="-11.9525,-77.0614"
                                    value={datos.ubicacion}
                                    onChange={(e) => setDatos((d) => ({ ...d, ubicacion: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div>
                            <Boton type="submit" variante="primario" icono={FloppyDisk} disabled={guardando}>
                                {editandoId ? 'Actualizar Punto' : 'Guardar Punto'}
                            </Boton>
                        </div>
                    </form>
                </div>
            </section>
            <section className={TARJETA}>
                <EncabezadoTarjeta icono={List} titulo="Puntos de Reunión" />
                <div className={CUERPO}>
                    <div className={TABLA_CONTENEDOR}>
                        <table className={TABLA}>
                            <thead>
                                <tr>
                                    <th className={TH}>Nombre</th>
                                    <th className={TH}>Coordenadas</th>
                                    <th className={TH}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {error && (
                                    <tr>
                                        <td colSpan={3} className={`${TD} text-danger`}>
                                            Error
                                        </td>
                                    </tr>
                                )}
                                {puntos.map((p) => (
                                    <tr key={p.id} data-id={p.id}>
                                        <td className={TD}>
                                            <span className="title-4 text-ink">
                                                {p.nombre}
                                                {p.fijo && (
                                                    <>
                                                        {' '}
                                                        <span className={`${INSIGNIA} bg-fill text-muted`}>Fijo</span>
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className={TD}>
                                            <code className="caption-2 rounded-lg bg-fill px-2 py-0.5 text-muted">
                                                {p.ubicacion || '—'}
                                            </code>
                                        </td>
                                        <td className={TD}>
                                            {!p.fijo && (
                                                <div className="flex gap-2">
                                                    <Boton
                                                        variante="secundario"
                                                        icono={PencilSimple}
                                                        soloIcono
                                                        compacto
                                                        title="Editar"
                                                        onClick={() => editar(p)}
                                                    >
                                                        Editar
                                                    </Boton>
                                                    <Boton
                                                        variante="peligroSuave"
                                                        icono={Trash}
                                                        soloIcono
                                                        compacto
                                                        title="Desactivar"
                                                        onClick={() => desactivar(p)}
                                                    >
                                                        Desactivar
                                                    </Boton>
                                                </div>
                                            )}
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
