import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ui/Toast.jsx';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import FormConductor from './FormConductor.jsx';
import ListaConductores from './ListaConductores.jsx';
import Disponibilidad from './Disponibilidad.jsx';
import { mensajeError } from '../../utils/errores.js';
import {
    actualizarConductor,
    crearConductor,
    desactivarConductor,
    guardarDisponibilidad,
    listarConductores,
    obtenerDisponibilidad
} from './api.js';

/**
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('./api.js').Disponibilidad} DisponibilidadSlot
 */

// Pestaña Conductores. Reglas: RN-COND-01..05 en docs/REGLAS-NEGOCIO.md
export default function Conductores() {
    const toast = useToast();
    const confirmar = useConfirmar();
    const [conductores, setConductores] = useState(/** @type {Conductor[]} */ ([]));
    const [errorLista, setErrorLista] = useState(false);
    // Panel de disponibilidad abierto; `version` fuerza a recargar el panel desde el servidor
    const [panel, setPanel] = useState(
        /** @type {{ conductor: Conductor, slots: DisponibilidadSlot[], version: number } | null} */ (null)
    );

    const recargar = useCallback(async () => {
        try {
            const lista = await listarConductores();
            setConductores(lista);
            setErrorLista(false);
            return lista;
        } catch {
            setErrorLista(true);
            return [];
        }
    }, []);

    useEffect(() => {
        recargar();
    }, [recargar]);

    /** @param {string} id @param {Conductor[]} [lista] */
    const abrirDisponibilidad = async (id, lista) => {
        try {
            const [slots, actuales] = await Promise.all([obtenerDisponibilidad(id), lista ?? listarConductores()]);
            const conductor = actuales.find((c) => c.id === id);
            if (!conductor) return;
            setPanel((p) => ({ conductor, slots, version: (p?.version ?? 0) + 1 }));
        } catch {
            toast('Error cargando disponibilidad', 'error');
        }
    };

    /** @param {import('./api.js').DatosConductor} datos */
    const crear = async (datos) => {
        try {
            const nuevo = await crearConductor(datos);
            toast('Conductor creado', 'success');
            const lista = await recargar();
            await abrirDisponibilidad(nuevo.id, lista);
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
            throw err;
        }
    };

    /** @param {Conductor} c */
    const desactivar = async (c) => {
        const ok = await confirmar({
            titulo: '¿Desactivar este conductor?',
            mensaje: `${c.nombre} dejará de aparecer en las listas y en la asignación. Sus asignaciones pasadas se conservan.`,
            textoConfirmar: 'Desactivar',
            peligro: true,
            icono: 'fa-user-slash'
        });
        if (ok !== true) return;
        try {
            await desactivarConductor(c.id);
            toast('Conductor desactivado', 'success');
            if (panel?.conductor.id === c.id) setPanel(null);
            recargar();
        } catch (err) {
            toast(mensajeError(err, 'Error'), 'error');
        }
    };

    /** @param {DisponibilidadSlot[]} slots @param {import('./Disponibilidad.jsx').Atributos} atributos */
    const guardarPanel = async (slots, atributos) => {
        if (!panel) return;
        const id = panel.conductor.id;
        try {
            await Promise.all([guardarDisponibilidad(id, slots), actualizarConductor(id, atributos)]);
            toast('Disponibilidad y atributos guardados', 'success');
            const lista = await recargar();
            await abrirDisponibilidad(id, lista);
        } catch (err) {
            toast(mensajeError(err, 'Error guardando'), 'error');
            throw err;
        }
    };

    return (
        <>
            <FormConductor onGuardar={crear} />

            <div className="card">
                <div className="card-header">
                    <h3>
                        <i className="fas fa-table"></i> Disponibilidad por Conductor
                    </h3>
                </div>
                <div className="card-body">
                    {panel ? (
                        <Disponibilidad
                            key={`${panel.conductor.id}-${panel.version}`}
                            conductor={panel.conductor}
                            inicial={panel.slots}
                            onGuardar={guardarPanel}
                            onCancelarEdicion={() => abrirDisponibilidad(panel.conductor.id)}
                            onCerrar={() => setPanel(null)}
                        />
                    ) : (
                        <p className="text-muted">
                            Selecciona un conductor y haz clic en &quot;Disponibilidad&quot; para editar sus slots.
                        </p>
                    )}
                </div>
            </div>

            <ListaConductores
                conductores={conductores}
                error={errorLista}
                onDisponibilidad={(id) => abrirDisponibilidad(id)}
                onDesactivar={desactivar}
            />
        </>
    );
}
