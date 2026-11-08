// @ts-check
import { useState } from 'react';
import { FloppyDisk } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import Desplegable from '../../components/ui/Desplegable.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PestanasLocales from '../../components/ui/PestanasLocales.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { CAMPO, CASILLA, ETIQUETA } from '../../components/ui/estilos.js';
import { mensajeError } from '../../utils/errores.js';
import { crearConductor, guardarDisponibilidad } from './api.js';
import GrillaDisponibilidad from './GrillaDisponibilidad.jsx';
import { OPCIONES_GRUPO } from './grupos.js';

/**
 * @typedef {import('./api.js').DatosConductor} DatosConductor
 * @typedef {import('./api.js').Disponibilidad} Disponibilidad
 * @typedef {import('../../types/models').Dia} Dia
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

const PESTANAS = [
    { id: 'datos', titulo: 'Datos' },
    { id: 'disponibilidad', titulo: 'Disponibilidad' }
];

/**
 * Alta de conductor en una ventana con dos pestañas: datos y disponibilidad. Se guarda todo junto: primero el
 * conductor y luego sus horarios. El nombre es obligatorio (RN-COND-01); si falta, se vuelve a Datos.
 * @param {{
 *   onCerrar: () => void,
 *   onCreado: (id: string) => void
 * }} props
 */
export default function ModalNuevoConductor({ onCerrar, onCreado }) {
    const toast = useToast();
    const [pestana, setPestana] = useState('datos');
    const [datos, setDatos] = useState(VACIO);
    const [slots, setSlots] = useState(/** @type {Disponibilidad[]} */ ([]));
    const [guardando, setGuardando] = useState(false);

    /** @param {Partial<DatosConductor>} cambio */
    const cambiar = (cambio) => setDatos((d) => ({ ...d, ...cambio }));

    /** @param {Dia} dia @param {string} hora @param {boolean} disponible */
    const marcar = (dia, hora, disponible) =>
        setSlots((lista) => {
            const existe = lista.some((s) => s.dia === dia && s.hora === hora);
            return existe
                ? lista.map((s) => (s.dia === dia && s.hora === hora ? { ...s, disponible } : s))
                : [...lista, { dia, hora, disponible }];
        });

    const horarios = slots.filter((s) => s.disponible).length;

    const guardar = async () => {
        if (!datos.nombre.trim()) {
            setPestana('datos');
            toast('Ingresa el nombre completo', 'warning');
            return;
        }
        setGuardando(true);
        let conductor;
        try {
            conductor = await crearConductor({
                ...datos,
                nombre: datos.nombre.trim(),
                ubicacion_casa: datos.ubicacion_casa || null
            });
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
            setGuardando(false);
            return;
        }
        const activos = slots.filter((s) => s.disponible);
        try {
            if (activos.length) await guardarDisponibilidad(conductor.id, activos);
            toast('Conductor creado', 'success');
        } catch (err) {
            // El conductor ya existe: se abre igual para completar la disponibilidad
            toast(
                `Conductor creado, pero no se guardó la disponibilidad: ${mensajeError(err, 'error')}`,
                'error',
                8000
            );
        }
        onCreado(conductor.id);
    };

    return (
        <Modal
            titulo="Nuevo conductor"
            onCerrar={onCerrar}
            pie={
                <div className="flex flex-wrap justify-end gap-2">
                    <Boton variante="secundario" onClick={onCerrar}>
                        Cancelar
                    </Boton>
                    <Boton variante="primario" icono={FloppyDisk} disabled={guardando} onClick={guardar}>
                        {guardando ? 'Guardando…' : 'Guardar conductor'}
                    </Boton>
                </div>
            }
        >
            <PestanasLocales
                etiqueta="Secciones del nuevo conductor"
                opciones={PESTANAS}
                valor={pestana}
                onCambiar={setPestana}
            />

            <div className="mt-4">
                {pestana === 'datos' ? (
                    <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                            <label htmlFor="nuevo-nombre" className={ETIQUETA}>
                                Nombre completo
                            </label>
                            <input
                                id="nuevo-nombre"
                                type="text"
                                className={CAMPO}
                                placeholder="Juan Pérez"
                                autoFocus
                                value={datos.nombre}
                                onChange={(e) => cambiar({ nombre: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
                                <span className={ETIQUETA}>Grupo</span>
                                <Desplegable
                                    variante="campo"
                                    rotulo="Grupo"
                                    valor={datos.grupo}
                                    onCambiar={(v) => cambiar({ grupo: /** @type {DatosConductor['grupo']} */ (v) })}
                                    opciones={OPCIONES_GRUPO.map((g) => ({ valor: g.valor, etiqueta: g.texto }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="nuevo-ubicacion" className={ETIQUETA}>
                                    Ubicación de casa (lat,lng), opcional
                                </label>
                                <input
                                    id="nuevo-ubicacion"
                                    type="text"
                                    className={CAMPO}
                                    placeholder="-12.0464,-77.0428"
                                    value={datos.ubicacion_casa || ''}
                                    onChange={(e) => cambiar({ ubicacion_casa: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className={ETIQUETA}>Atributos</span>
                            <div className="flex flex-wrap gap-2">
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
                                    Poca movilidad
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
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <p className="body-6 text-muted">
                            Marca los horarios en los que puede predicar. Si no sabes todavía, puedes dejarlos vacíos y
                            completarlos después.
                        </p>
                        <GrillaDisponibilidad slots={slots} editable onMarcar={marcar} />
                        <p className="caption-1 text-muted">
                            {horarios === 1 ? '1 horario marcado' : `${horarios} horarios marcados`}
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
