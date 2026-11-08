// @ts-check
import { useCallback, useEffect, useState } from 'react';
import { ArrowSquareOut, FloppyDisk, GearSix } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { RAIZ } from '../../components/ui/estilos.js';
import { mensajeError } from '../../utils/errores.js';
import { extraerSpreadsheetId, guardarSpreadsheetId, obtenerConfiguracion } from './api.js';

/**
 * Pestaña Configuración de Hoja de Predicación (solo super admins, RN-AUTH-04).
 * Guarda el ID del spreadsheet al que se exporta el programa (RN-SHEET-*).
 */
export default function Configuracion() {
    const toast = useToast();
    const [spreadsheet, setSpreadsheet] = useState('');
    const [spreadsheetUrl, setSpreadsheetUrl] = useState('');

    const cargarConfig = useCallback(async () => {
        try {
            const cfg = await obtenerConfiguracion();
            setSpreadsheet(cfg.spreadsheet_id || '');
            setSpreadsheetUrl(cfg.spreadsheet_url || '');
        } catch {
            // sin permiso: la ruta ya está protegida para super admins
        }
    }, []);

    useEffect(() => {
        cargarConfig();
    }, [cargarConfig]);

    const guardar = async () => {
        const entrada = spreadsheet.trim();
        if (!entrada) {
            toast('Ingresa el ID o URL del spreadsheet', 'warning');
            return;
        }
        try {
            await guardarSpreadsheetId(extraerSpreadsheetId(entrada));
            toast('Spreadsheet ID guardado', 'success');
            cargarConfig();
        } catch (err) {
            toast(mensajeError(err, 'Error al guardar'), 'error');
        }
    };

    return (
        <div className={RAIZ}>
            <section className="tw rounded-3xl border border-line bg-surface">
                <EncabezadoTarjeta icono={GearSix} titulo="Configuración" subtitulo="Dónde se exporta el programa" />
                <div className="p-4">
                    <label htmlFor="config-spreadsheet" className="button-sm mb-2 block text-ink">
                        ID del Spreadsheet de Google Sheets
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <input
                            id="config-spreadsheet"
                            type="text"
                            placeholder="ID o URL del spreadsheet"
                            value={spreadsheet}
                            onChange={(e) => setSpreadsheet(e.target.value)}
                            className="body-6 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-soft hover:border-ink/30 focus:border-primary"
                        />
                        <Boton variante="primario" icono={FloppyDisk} onClick={guardar}>
                            Guardar
                        </Boton>
                    </div>
                    <div className="body-6 mt-3">
                        {spreadsheetUrl ? (
                            <a
                                href={spreadsheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                                <ArrowSquareOut size={16} aria-hidden="true" />
                                Abrir spreadsheet
                            </a>
                        ) : (
                            <span className="text-muted">No configurado</span>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
