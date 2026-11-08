import { useState } from 'react';
import { useConfirmar } from '../components/ui/Confirmar.jsx';
import { useCargando } from '../components/ui/Cargando.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import DiaBadge from '../components/ui/DiaBadge.jsx';
import MenuFlotante from '../components/ui/MenuFlotante.jsx';
import SelectRecortable from '../components/ui/SelectRecortable.jsx';
import { DIAS } from '../utils/dias.js';
import { fechaDelDia } from '../utils/fechas.js';

// Vitrina de componentes comunes. Solo existe en desarrollo (`pnpm dev`): no entra al build.
export default function DevComponentes() {
    const confirmar = useConfirmar();
    const cargando = useCargando();
    const toast = useToast();
    const [resultado, setResultado] = useState('');

    /** @param {import('../components/ui/Confirmar.jsx').OpcionesConfirmar} opciones */
    const probar = async (opciones) => setResultado(String(await confirmar(opciones)));

    return (
        <div className="page-content">
            <div className="card">
                <div className="card-header">
                    <h3>Componentes comunes</h3>
                </div>
                <div className="card-body">
                    <p id="dev-resultado">Resultado: {resultado}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
                        <button
                            id="dev-confirmar"
                            className="btn btn-primary"
                            onClick={() =>
                                probar({
                                    titulo: '¿Guardar la asignación?',
                                    mensaje: 'Se guardarán 12 asignaciones.',
                                    textoConfirmar: 'Guardar y exportar',
                                    icono: 'fa-floppy-disk',
                                    advertencia: {
                                        titulo: '2 turnos tienen el Territorio vacío:',
                                        items: ['Lunes 10 nov · 8:20', 'Martes 11 nov · 6:30']
                                    }
                                })
                            }
                        >
                            Confirmar con aviso
                        </button>
                        <button
                            id="dev-peligro"
                            className="btn btn-danger"
                            onClick={() =>
                                probar({
                                    titulo: '¿Eliminar el programa?',
                                    mensaje: 'Esta acción no se puede deshacer.',
                                    textoConfirmar: 'Eliminar',
                                    peligro: true,
                                    icono: 'fa-trash',
                                    espera: 3,
                                    alternativa: { texto: 'Editar', icono: 'fa-edit' }
                                })
                            }
                        >
                            Peligro con espera
                        </button>
                        <button
                            id="dev-exito"
                            className="btn btn-success"
                            onClick={() =>
                                probar({
                                    titulo: 'Asignación guardada',
                                    mensaje: 'Se creó la hoja "9 nov - 15 nov (1)" en Google Sheets.',
                                    textoConfirmar: 'Ir a la hoja',
                                    icono: 'fa-table',
                                    exito: true,
                                    cerrable: true,
                                    alternativa: {
                                        texto: 'Ir al Sheet',
                                        icono: 'fa-arrow-up-right-from-square',
                                        secundario: true
                                    }
                                })
                            }
                        >
                            Éxito
                        </button>
                        <button
                            id="dev-cargando"
                            className="btn btn-secondary"
                            onClick={() => {
                                cargando.mostrar('Guardando asignación…');
                                setTimeout(cargando.ocultar, 1500);
                            }}
                        >
                            Carga 1,5 s
                        </button>
                        <button
                            id="dev-toast"
                            className="btn btn-secondary"
                            onClick={() => toast('Formato aplicado', 'success')}
                        >
                            Toast
                        </button>
                        <MenuFlotante
                            opciones={[
                                {
                                    texto: 'Actualizar con la plantilla',
                                    icono: 'fa-file-import',
                                    onClick: () => setResultado('menú')
                                }
                            ]}
                        />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {DIAS.map((d) => (
                            <DiaBadge key={d} dia={d} fecha={fechaDelDia('2026-11-09', d)} />
                        ))}
                    </div>
                    <div style={{ maxWidth: 160, marginTop: 12 }}>
                        <SelectRecortable className="form-control" defaultValue="b">
                            <option value="a">Corto</option>
                            <option value="b">Un texto bastante largo que debería recortarse</option>
                        </SelectRecortable>
                    </div>
                </div>
            </div>
        </div>
    );
}
