import { useState } from 'react';
import { FloppyDisk, UserPlus } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { CAMPO, CASILLA, CUERPO, ETIQUETA, TARJETA } from '../../components/ui/estilos.js';
import Desplegable from '../../components/ui/Desplegable.jsx';
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
        <section className={TARJETA}>
            <EncabezadoTarjeta icono={UserPlus} titulo="Nuevo Conductor" />
            <div className={CUERPO}>
                <form onSubmit={enviar} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                        <div className="min-w-0">
                            <label className={ETIQUETA}>Nombre Completo</label>
                            <input
                                type="text"
                                className={CAMPO}
                                required
                                placeholder="Juan Pérez"
                                value={datos.nombre}
                                onChange={(e) => cambiar({ nombre: e.target.value })}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className={ETIQUETA}>Grupo</label>
                            <Desplegable
                                variante="campo"
                                rotulo="Grupo"
                                valor={datos.grupo}
                                onCambiar={(v) => cambiar({ grupo: /** @type {DatosConductor['grupo']} */ (v) })}
                                opciones={OPCIONES_GRUPO.map((g) => ({ valor: g.valor, etiqueta: g.texto }))}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                        <label className={CASILLA}>
                            <input
                                type="checkbox"
                                checked={datos.tiene_pc}
                                onChange={(e) => cambiar({ tiene_pc: e.target.checked })}
                            />
                            Tiene PC (Zoom)
                        </label>
                        <label className={CASILLA}>
                            <input
                                type="checkbox"
                                checked={datos.poca_movilidad}
                                onChange={(e) => cambiar({ poca_movilidad: e.target.checked })}
                            />
                            Poca Movilidad
                        </label>
                        <label className={CASILLA}>
                            <input
                                type="checkbox"
                                checked={datos.solo_parque}
                                onChange={(e) => cambiar({ solo_parque: e.target.checked })}
                            />
                            Solo Parque Las Vegas
                        </label>
                    </div>
                    <div className="min-w-0">
                        <label className={ETIQUETA}>Ubicación Casa (lat,lng) — opcional</label>
                        <input
                            type="text"
                            className={CAMPO}
                            placeholder="-12.0464,-77.0428"
                            value={datos.ubicacion_casa || ''}
                            onChange={(e) => cambiar({ ubicacion_casa: e.target.value })}
                        />
                    </div>
                    <div>
                        <Boton type="submit" variante="primario" icono={FloppyDisk} disabled={guardando}>
                            Guardar Conductor
                        </Boton>
                    </div>
                </form>
            </div>
        </section>
    );
}
