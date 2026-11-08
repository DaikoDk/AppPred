import { useState } from 'react';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { FRANJAS } from '../../utils/constantes.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { OPCIONES_GRUPO } from './grupos.js';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('./api.js').Disponibilidad} Disponibilidad
 * @typedef {Pick<Conductor, 'grupo' | 'tiene_pc' | 'poca_movilidad' | 'solo_parque' | 'ubicacion_casa'>} Atributos
 */

/** Orden por día y franja, como sortKeyDisp() de la app anterior. @param {{ dia: Dia, hora: string }} s */
const ordenSlot = (s) => DIAS.indexOf(s.dia) * 10 + FRANJAS.indexOf(s.hora);

/**
 * Ver y editar la disponibilidad y los atributos de un conductor.
 * Los espacios quitados se guardan como `disponible: false` (no se borran) y se pueden restaurar.
 * @param {{
 *   conductor: Conductor,
 *   inicial: Disponibilidad[],
 *   onGuardar: (slots: Disponibilidad[], atributos: Atributos) => Promise<void>,
 *   onCancelarEdicion: () => void,
 *   onCerrar: () => void
 * }} props
 */
export default function Disponibilidad({ conductor, inicial, onGuardar, onCancelarEdicion, onCerrar }) {
    const toast = useToast();
    const confirmar = useConfirmar();
    const [editando, setEditando] = useState(false);
    const [slots, setSlots] = useState(inicial);
    const [nuevoDia, setNuevoDia] = useState(/** @type {Dia} */ ('LUNES'));
    const [nuevaHora, setNuevaHora] = useState(FRANJAS[0]);
    const [atributos, setAtributos] = useState(
        /** @type {Atributos} */ ({
            grupo: conductor.grupo,
            ubicacion_casa: conductor.ubicacion_casa || '',
            tiene_pc: conductor.tiene_pc,
            poca_movilidad: conductor.poca_movilidad,
            solo_parque: conductor.solo_parque
        })
    );

    const activos = slots.filter((s) => s.disponible).sort((a, b) => ordenSlot(a) - ordenSlot(b));
    const quitados = slots.filter((s) => !s.disponible).sort((a, b) => ordenSlot(a) - ordenSlot(b));

    /** @param {Dia} dia @param {string} hora @param {boolean} disponible */
    const marcar = (dia, hora, disponible) =>
        setSlots((lista) => {
            const existe = lista.some((s) => s.dia === dia && s.hora === hora);
            return existe
                ? lista.map((s) => (s.dia === dia && s.hora === hora ? { ...s, disponible } : s))
                : [...lista, { dia, hora, disponible }];
        });

    const agregar = () => {
        if (slots.some((s) => s.dia === nuevoDia && s.hora === nuevaHora && s.disponible)) {
            toast('Este horario ya está activo', 'warning');
            return;
        }
        marcar(nuevoDia, nuevaHora, true);
        toast(`✓ ${nombreDia(nuevoDia)} — ${nuevaHora}`, 'success');
    };

    /** @param {Disponibilidad} s */
    const quitar = async (s) => {
        const ok = await confirmar({
            titulo: '¿Quitar este horario?',
            mensaje: `${nombreDia(s.dia)} — ${s.hora}`,
            textoConfirmar: 'Quitar',
            peligro: true,
            icono: 'fa-trash'
        });
        if (ok === true) marcar(s.dia, s.hora, false);
    };

    /** @param {Disponibilidad} s */
    const restaurar = (s) => {
        marcar(s.dia, s.hora, true);
        toast(`Restaurado ${nombreDia(s.dia)} — ${s.hora}`, 'success');
    };

    const guardar = async () => {
        try {
            await onGuardar(slots, { ...atributos, ubicacion_casa: atributos.ubicacion_casa || null });
        } catch {
            // el error ya se mostró en un aviso; se sigue en modo edición para reintentar
        }
    };

    /** @param {Partial<Atributos>} cambio */
    const cambiarAtributo = (cambio) => setAtributos((a) => ({ ...a, ...cambio }));
    const estiloChico = { fontSize: '0.75rem', padding: '4px 6px' };

    return (
        <div className="disp-editor" data-conductor-id={conductor.id}>
            <h4 style={{ marginBottom: 10 }}>
                Conductor <strong>{conductor.nombre}</strong>
            </h4>

            {!editando ? (
                <>
                    {activos.length === 0 ? (
                        <p className="text-muted">Sin slots de disponibilidad.</p>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Día</th>
                                        <th>Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activos.map((s) => (
                                        <tr key={`${s.dia}|${s.hora}`}>
                                            <td>{nombreDia(s.dia)}</td>
                                            <td>{s.hora}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#555' }}>
                        Grupo: <strong>{conductor.grupo || '—'}</strong> | PC Zoom:{' '}
                        <strong>{conductor.tiene_pc ? 'Sí' : 'No'}</strong> | Poca movilidad:{' '}
                        <strong>{conductor.poca_movilidad ? 'Sí' : 'No'}</strong>
                        {conductor.solo_parque && (
                            <>
                                {' | '}
                                <span className="badge badge-success">Solo Parque</span>
                            </>
                        )}
                        {conductor.ubicacion_casa && (
                            <>
                                {' | Ubicación: '}
                                <code>{conductor.ubicacion_casa}</code>
                            </>
                        )}
                    </div>
                    <div style={{ marginTop: 15, display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={() => setEditando(true)}>
                            <i className="fas fa-edit"></i> Editar
                        </button>
                        <button className="btn btn-secondary" onClick={onCerrar}>
                            <i className="fas fa-times"></i> Cerrar
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Día</th>
                                    <th>Hora</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {activos.map((s) => (
                                    <tr key={`a|${s.dia}|${s.hora}`}>
                                        <td>{nombreDia(s.dia)}</td>
                                        <td>{s.hora}</td>
                                        <td>
                                            <span className="badge badge-success">Disponible</span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => quitar(s)}
                                            >
                                                <i className="fas fa-trash"></i> Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {quitados.map((s) => (
                                    <tr
                                        key={`q|${s.dia}|${s.hora}`}
                                        style={{ opacity: 0.5, textDecoration: 'line-through' }}
                                    >
                                        <td>{nombreDia(s.dia)}</td>
                                        <td>{s.hora}</td>
                                        <td>
                                            <span className="badge badge-secondary">Eliminado</span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-warning"
                                                onClick={() => restaurar(s)}
                                            >
                                                <i className="fas fa-undo"></i> Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="form-row disp-add-row" style={{ marginTop: 10, alignItems: 'end' }}>
                        <div className="form-group">
                            <label>Día</label>
                            <select
                                className="form-control disp-add-dia"
                                value={nuevoDia}
                                onChange={(e) => setNuevoDia(/** @type {Dia} */ (e.target.value))}
                            >
                                {DIAS.map((d) => (
                                    <option key={d} value={d}>
                                        {nombreDia(d)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Hora</label>
                            <select
                                className="form-control disp-add-hora"
                                value={nuevaHora}
                                onChange={(e) => setNuevaHora(e.target.value)}
                            >
                                {FRANJAS.map((f) => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ alignSelf: 'end' }}>
                            <button type="button" className="btn btn-secondary" onClick={agregar}>
                                <i className="fas fa-plus"></i> Guardar
                            </button>
                        </div>
                    </div>

                    <div
                        style={{
                            marginTop: 15,
                            padding: 12,
                            background: '#f9f9f9',
                            borderRadius: 6,
                            border: '1px solid #eee'
                        }}
                    >
                        <strong style={{ fontSize: '0.85rem' }}>Atributos del conductor</strong>
                        <div className="form-row" style={{ marginTop: 8, alignItems: 'end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Grupo</label>
                                <select
                                    className="form-control"
                                    style={estiloChico}
                                    value={atributos.grupo}
                                    onChange={(e) =>
                                        cambiarAtributo({ grupo: /** @type {Atributos['grupo']} */ (e.target.value) })
                                    }
                                >
                                    {OPCIONES_GRUPO.map((g) => (
                                        <option key={g.valor} value={g.valor}>
                                            {g.texto}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Ubicación Casa (lat,lng)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    style={estiloChico}
                                    placeholder="-12.0464,-77.0428"
                                    value={atributos.ubicacion_casa || ''}
                                    onChange={(e) => cambiarAtributo({ ubicacion_casa: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={atributos.tiene_pc}
                                        onChange={(e) => cambiarAtributo({ tiene_pc: e.target.checked })}
                                    />{' '}
                                    Tiene PC (Zoom)
                                </label>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={atributos.poca_movilidad}
                                        onChange={(e) => cambiarAtributo({ poca_movilidad: e.target.checked })}
                                    />{' '}
                                    Poca Movilidad
                                </label>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="checkbox-label" style={{ fontSize: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={atributos.solo_parque}
                                        onChange={(e) => cambiarAtributo({ solo_parque: e.target.checked })}
                                    />{' '}
                                    Solo Parque
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 15, display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" onClick={guardar}>
                            <i className="fas fa-save"></i> Confirmar
                        </button>
                        <button className="btn btn-secondary" onClick={onCancelarEdicion}>
                            <i className="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
