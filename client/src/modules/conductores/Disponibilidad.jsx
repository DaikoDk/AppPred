import { useState } from 'react';
import { FloppyDisk, PencilSimple, X } from '@phosphor-icons/react';
import { nombreDia } from '../../utils/dias.js';
import Boton from '../../components/ui/Boton.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { CAMPO, CASILLA, ETIQUETA, INSIGNIA, RESUMEN } from '../../components/ui/estilos.js';
import Desplegable from '../../components/ui/Desplegable.jsx';
import { OPCIONES_GRUPO } from './grupos.js';
import GrillaDisponibilidad from './GrillaDisponibilidad.jsx';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('./api.js').Disponibilidad} Disponibilidad
 * @typedef {Pick<Conductor, 'grupo' | 'tiene_pc' | 'poca_movilidad' | 'solo_parque' | 'ubicacion_casa'>} Atributos
 */

/**
 * Ver y editar la disponibilidad y los atributos de un conductor.
 * Quitar un horario lo guarda como `disponible: false` (no se borra), así que se puede volver a marcar.
 * @param {{
 *   conductor: Conductor,
 *   inicial: Disponibilidad[],
 *   onGuardar: (slots: Disponibilidad[], atributos: Atributos) => Promise<void>,
 *   onCancelarEdicion: () => void,
 *   onCerrar: () => void
 * }} props
 */
export default function Disponibilidad({ conductor, inicial, onGuardar, onCancelarEdicion, onCerrar }) {
    const confirmar = useConfirmar();
    const [editando, setEditando] = useState(false);
    const [slots, setSlots] = useState(inicial);
    const [atributos, setAtributos] = useState(
        /** @type {Atributos} */ ({
            grupo: conductor.grupo,
            ubicacion_casa: conductor.ubicacion_casa || '',
            tiene_pc: conductor.tiene_pc,
            poca_movilidad: conductor.poca_movilidad,
            solo_parque: conductor.solo_parque
        })
    );

    const cantidadActivos = slots.filter((s) => s.disponible).length;

    /** @param {Dia} dia @param {string} hora @param {boolean} disponible */
    const marcar = (dia, hora, disponible) =>
        setSlots((lista) => {
            const existe = lista.some((s) => s.dia === dia && s.hora === hora);
            return existe
                ? lista.map((s) => (s.dia === dia && s.hora === hora ? { ...s, disponible } : s))
                : [...lista, { dia, hora, disponible }];
        });

    /** Marcar o quitar pide confirmación (modal), como el resto de confirmaciones de la app (ADR-016). @param {Dia} dia @param {string} hora */
    const alternar = async (dia, hora) => {
        const activo = slots.some((s) => s.dia === dia && s.hora === hora && s.disponible);
        const ok = await confirmar(
            activo
                ? {
                      titulo: '¿Quitar este horario?',
                      mensaje: `${nombreDia(dia)} — ${hora}`,
                      textoConfirmar: 'Quitar',
                      peligro: true,
                      icono: 'fa-trash'
                  }
                : {
                      titulo: '¿Agregar este horario?',
                      mensaje: `${nombreDia(dia)} — ${hora}`,
                      textoConfirmar: 'Agregar',
                      icono: 'fa-plus'
                  }
        );
        if (ok === true) marcar(dia, hora, !activo);
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

    const textoGuardar =
        cantidadActivos === 0
            ? 'Guardar sin horarios'
            : `Guardar ${cantidadActivos} ${cantidadActivos === 1 ? 'horario' : 'horarios'}`;

    return (
        <div data-conductor-id={conductor.id}>
            <h4 className="title-2 mb-3 text-ink">
                Conductor <strong>{conductor.nombre}</strong>
            </h4>

            {!editando ? (
                <>
                    <GrillaDisponibilidad slots={slots} editable={false} />
                    <div className="caption-1 mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
                        <span>
                            Grupo: <strong className="text-ink">{conductor.grupo || '—'}</strong>
                        </span>
                        <span>|</span>
                        <span>
                            PC Zoom: <strong className="text-ink">{conductor.tiene_pc ? 'Sí' : 'No'}</strong>
                        </span>
                        <span>|</span>
                        <span>
                            Poca movilidad:{' '}
                            <strong className="text-ink">{conductor.poca_movilidad ? 'Sí' : 'No'}</strong>
                        </span>
                        {conductor.solo_parque && (
                            <>
                                <span>|</span>
                                <span className={`${INSIGNIA} bg-ok-bg text-ok`}>Solo Parque</span>
                            </>
                        )}
                        {conductor.ubicacion_casa && (
                            <>
                                <span>|</span>
                                <span>
                                    Ubicación:{' '}
                                    <code className="caption-2 rounded-lg bg-fill px-2 py-0.5 text-ink">
                                        {conductor.ubicacion_casa}
                                    </code>
                                </span>
                            </>
                        )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Boton variante="primario" icono={PencilSimple} onClick={() => setEditando(true)}>
                            Editar
                        </Boton>
                        <Boton variante="secundario" icono={X} onClick={onCerrar}>
                            Cerrar
                        </Boton>
                    </div>
                </>
            ) : (
                <>
                    <p className="body-6 mb-3 text-muted">Toca una casilla para marcarla o quitarla.</p>
                    <GrillaDisponibilidad slots={slots} editable onAlternar={alternar} />

                    <div className={`${RESUMEN} mt-4`}>
                        <span className="title-4 text-ink">Atributos del conductor</span>
                        <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
                            <div className="min-w-0">
                                <label className={ETIQUETA}>Grupo</label>
                                <Desplegable
                                    variante="campo"
                                    rotulo="Grupo"
                                    valor={atributos.grupo}
                                    onCambiar={(v) => cambiarAtributo({ grupo: /** @type {Atributos['grupo']} */ (v) })}
                                    opciones={OPCIONES_GRUPO.map((g) => ({ valor: g.valor, etiqueta: g.texto }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className={ETIQUETA}>Ubicación Casa (lat,lng)</label>
                                <input
                                    type="text"
                                    className={CAMPO}
                                    placeholder="-12.0464,-77.0428"
                                    value={atributos.ubicacion_casa || ''}
                                    onChange={(e) => cambiarAtributo({ ubicacion_casa: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <label className={CASILLA}>
                                <input
                                    type="checkbox"
                                    checked={atributos.tiene_pc}
                                    onChange={(e) => cambiarAtributo({ tiene_pc: e.target.checked })}
                                />
                                Tiene PC (Zoom)
                            </label>
                            <label className={CASILLA}>
                                <input
                                    type="checkbox"
                                    checked={atributos.poca_movilidad}
                                    onChange={(e) => cambiarAtributo({ poca_movilidad: e.target.checked })}
                                />
                                Poca Movilidad
                            </label>
                            <label className={CASILLA}>
                                <input
                                    type="checkbox"
                                    checked={atributos.solo_parque}
                                    onChange={(e) => cambiarAtributo({ solo_parque: e.target.checked })}
                                />
                                Solo Parque
                            </label>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <Boton variante="primario" icono={FloppyDisk} onClick={guardar}>
                            {textoGuardar}
                        </Boton>
                        <Boton variante="secundario" icono={X} onClick={onCancelarEdicion}>
                            Cancelar
                        </Boton>
                    </div>
                </>
            )}
        </div>
    );
}
