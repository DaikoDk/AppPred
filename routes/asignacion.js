"use strict";

const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');
const { generarDistanciaHaversine } = require('../utils/geolib');
const { exportAsignacionToSheets } = require('../utils/googleSheets');

function calcularScore(c, turno, programa, yaAsignadosSemana, histTotales, ultimaAsignacion, puntosMap, dispCounts) {
    const modalidad = turno.modalidad || 'FISICO';
    const esZoom = turno.punto_reunion === 'ZOOM';
    const esParqueLV = turno.punto_reunion === 'PARQUE LAS VEGAS';
    let s = 0;
    const yaAsig = yaAsignadosSemana[c.id] || 0;
    if (yaAsig > 0) s -= 5000;
    s -= (histTotales[c.id] || 0) * 2;
    const ultima = ultimaAsignacion[c.id];
    if (ultima) {
        const diff = Math.floor((new Date(programa.semana_inicio) - new Date(ultima)) / (1000 * 60 * 60 * 24));
        if (diff <= 7 && diff >= 0) s -= 200;
        else if (diff > 7) s += 50;
    } else {
        s += 50;
    }
    if ((modalidad === 'CARTAS' || esParqueLV) && c.poca_movilidad) s += 200;
    if ((modalidad === 'FISICO' && !esParqueLV) && c.poca_movilidad) s -= 200;
    if (esParqueLV && c.solo_parque) s += 200;
    if (c.ubicacion_casa && turno.punto_reunion && puntosMap[turno.punto_reunion]) {
        const dist = generarDistanciaHaversine(c.ubicacion_casa, puntosMap[turno.punto_reunion]);
        if (dist !== null) s += Math.max(0, 10 - dist * 0.5);
    }
    // Prioritize conductors with fewer availability slots (they have fewer chances)
    const totalDisp = dispCounts?.[c.id] || 0;
    s += Math.max(0, 100 - totalDisp * 3);
    return s;
}

router.post('/asignar', async (req, res) => {
    try {
        const { semana_id } = req.body;
        if (!semana_id) return res.status(400).json({ error: 'semana_id requerido' });

        const { data: programa, error: progError } = await supabase
            .from('programa_semanal')
            .select(`id, semana_inicio, semana_fin, programa_semanal_turnos (*)`)
            .eq('id', semana_id)
            .single();
        if (progError || !programa) return res.status(404).json({ error: 'Programa no encontrado' });
        const turnos = programa.programa_semanal_turnos;
        if (!turnos || turnos.length === 0) return res.status(400).json({ error: 'El programa no tiene turnos' });

        // Sort: GRUPO A > GRUPO B > TODA, then by dia/hora
        const grupoPeso = { 'GRUPO A': 0, 'GRUPO B': 1, 'TODA LA CONGREGACION': 2 };
        const franjaOrden = { 'Madrugada (6:30 AM)': 0, 'Mañana (8:20 AM)': 1, 'Mañana (8:50 AM)': 2, 'Tarde (6:20 PM)': 3, 'Domingo (10:20 AM)': 4 };
        const ordenDia = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
        turnos.sort((a, b) => {
            const ga = grupoPeso[a.grupo] ?? 2;
            const gb = grupoPeso[b.grupo] ?? 2;
            if (ga !== gb) return ga - gb;
            const da = ordenDia[a.dia] ?? 99;
            const db = ordenDia[b.dia] ?? 99;
            if (da !== db) return da - db;
            return (franjaOrden[a.hora] ?? 99) - (franjaOrden[b.hora] ?? 99);
        });

        const { data: conductores, error: condError } = await supabase
            .from('conductores')
            .select('id, nombre, ubicacion_casa, grupo, tiene_pc, poca_movilidad, solo_parque')
            .eq('activo', true);
        if (condError) throw condError;

        const { data: disponibilidad } = await supabase
            .from('disponibilidad_conductor')
            .select('*');
        const dispMap = {};
        (disponibilidad || []).forEach(d => {
            const key = `${d.conductor_id}|${d.dia}|${d.hora}`;
            dispMap[key] = d.disponible;
        });

        // Count total disponibilidad slots per conductor
        const dispCounts = {};
        Object.keys(dispMap).forEach(key => {
            if (dispMap[key] === true) {
                const cId = key.split('|')[0];
                dispCounts[cId] = (dispCounts[cId] || 0) + 1;
            }
        });

        // Only consider history from the last 4 weeks
        const cuatroSemanasAtras = new Date();
        cuatroSemanasAtras.setDate(cuatroSemanasAtras.getDate() - 28);
        const fechaCorte = cuatroSemanasAtras.toISOString().split('T')[0];

        const { data: historial } = await supabase
            .from('asignaciones_historial')
            .select('conductor_id, cantidad_turnos, ultima_asignacion')
            .gte('ultima_asignacion', fechaCorte);
        const histTotales = {};
        const ultimaAsignacion = {};
        (historial || []).forEach(h => {
            histTotales[h.conductor_id] = (histTotales[h.conductor_id] || 0) + (h.cantidad_turnos || 0);
            if (h.ultima_asignacion && (!ultimaAsignacion[h.conductor_id] || h.ultima_asignacion > ultimaAsignacion[h.conductor_id])) {
                ultimaAsignacion[h.conductor_id] = h.ultima_asignacion;
            }
        });

        const { data: puntosDB } = await supabase
            .from('puntos_reunion')
            .select('nombre, ubicacion')
            .eq('activo', true);
        const puntosMap = {};
        (puntosDB || []).forEach(p => {
            if (p.ubicacion) puntosMap[p.nombre] = p.ubicacion;
        });

        const resultados = [];
        const yaAsignadosSemana = {};

        for (const turno of turnos) {
            const modalidad = turno.modalidad || 'FISICO';
            const esZoom = turno.punto_reunion === 'ZOOM';
            const esParqueLV = turno.punto_reunion === 'PARQUE LAS VEGAS';
            const candidatos = (conductores || []).filter(c => {
                if (c.grupo !== 'C') {
                    if (turno.grupo === 'GRUPO A' && c.grupo !== 'A') return false;
                    if (turno.grupo === 'GRUPO B' && c.grupo !== 'B') return false;
                }
                if (c.solo_parque && !esParqueLV) return false;
                if (modalidad === 'ZOOM' && !c.tiene_pc) return false;
                if (esZoom && !c.tiene_pc) return false;
                const key = `${c.id}|${turno.dia}|${turno.hora}`;
                return dispMap[key] === true;
            });

            if (candidatos.length === 0) {
                resultados.push({
                    turno_id: turno.id,
                    dia: turno.dia,
                    hora: turno.hora,
                    grupo: turno.grupo,
                    territorio: turno.territorio,
                    punto_reunion: turno.punto_reunion,
                    asignado: false,
                    razon: 'No hay conductores disponibles'
                });
                continue;
            }

            const scored = candidatos.map(c => ({
                conductor: c,
                score: calcularScore(c, turno, programa, yaAsignadosSemana, histTotales, ultimaAsignacion, puntosMap, dispCounts),
                yaAsignadoEstaSemana: (yaAsignadosSemana[c.id] || 0) > 0
            }));
            scored.sort((a, b) => b.score - a.score);
            const mejor = scored[0];

            yaAsignadosSemana[mejor.conductor.id] = (yaAsignadosSemana[mejor.conductor.id] || 0) + 1;

            resultados.push({
                turno_id: turno.id,
                dia: turno.dia,
                hora: turno.hora,
                grupo: turno.grupo,
                territorio: turno.territorio,
                punto_reunion: turno.punto_reunion,
                conductor_asignado: { id: mejor.conductor.id, nombre: mejor.conductor.nombre, grupo: mejor.conductor.grupo },
                score: mejor.score,
                yaAsignadoEstaSemana: mejor.yaAsignadoEstaSemana,
                asignado: true
            });
        }

        const exitosos = resultados.filter(r => r.asignado);
        const ids = [...new Set(exitosos.map(r => r.conductor_asignado?.id).filter(Boolean))];
        res.json({
            mensaje: 'Previsualización completada',
            semana_id,
            disponibilidad: Object.keys(dispMap).filter(k => dispMap[k] === true),
            resumen: {
                total_turnos: resultados.length,
                asignados: exitosos.length,
                sin_asignar: resultados.length - exitosos.length,
                conductores_utilizados: ids.length
            },
            resultados
        });
    } catch (error) {
        console.error('Error en /api/asignar:', error);
        res.status(500).json({ error: 'Error ejecutando asignación', detalles: error.message });
    }
});

router.post('/confirmar', async (req, res) => {
    try {
        const { semana_id, asignaciones } = req.body;
        if (!semana_id || !Array.isArray(asignaciones)) {
            return res.status(400).json({ error: 'semana_id y asignaciones requeridos' });
        }

        const { data: programa } = await supabase
            .from('programa_semanal')
            .select('id, semana_inicio')
            .eq('id', semana_id)
            .single();
        if (!programa) return res.status(404).json({ error: 'Programa no encontrado' });

        const { data: conductores } = await supabase
            .from('conductores')
            .select('id, nombre, ubicacion_casa, grupo, tiene_pc, poca_movilidad, solo_parque')
            .eq('activo', true);

        const { data: puntosDB } = await supabase
            .from('puntos_reunion')
            .select('nombre, ubicacion')
            .eq('activo', true);
        const puntosMap = {};
        (puntosDB || []).forEach(p => { if (p.ubicacion) puntosMap[p.nombre] = p.ubicacion; });

        const { data: historial } = await supabase
            .from('asignaciones_historial')
            .select('conductor_id, cantidad_turnos, ultima_asignacion');

        const hoy = new Date().toISOString().split('T')[0];

        for (const a of asignaciones) {
            const conductor = (conductores || []).find(c => c.id === a.conductor_id);
            if (!conductor) continue;

            const { data: turno } = await supabase
                .from('programa_semanal_turnos')
                .select('*')
                .eq('id', a.turno_id)
                .single();
            if (!turno) continue;

            const histTotales = {};
            const ultimaAsignacion = {};
            (historial || []).forEach(h => {
                if (h.conductor_id === conductor.id) {
                    histTotales[h.conductor_id] = (histTotales[h.conductor_id] || 0) + (h.cantidad_turnos || 0);
                    if (h.ultima_asignacion && (!ultimaAsignacion[h.conductor_id] || h.ultima_asignacion > ultimaAsignacion[h.conductor_id])) {
                        ultimaAsignacion[h.conductor_id] = h.ultima_asignacion;
                    }
                }
            });

            const score = calcularScore(conductor, turno, programa, {}, histTotales, ultimaAsignacion, puntosMap, null);

            await supabase
                .from('programa_semanal_turnos')
                .update({ conductor_id: conductor.id, score })
                .eq('id', a.turno_id);

            await supabase
                .from('asignaciones_historial')
                .upsert({
                    semana_id,
                    conductor_id: conductor.id,
                    cantidad_turnos: a.cantidad_semanal || 1,
                    ultima_asignacion: hoy
                }, { onConflict: 'semana_id,conductor_id' });
        }

        res.json({ mensaje: 'Asignaciones guardadas correctamente' });
    } catch (error) {
        console.error('Error en /api/asignacion/confirmar:', error);
        res.status(500).json({ error: 'Error al confirmar asignaciones', detalles: error.message });
    }
});

router.get('/asignaciones/semana/:semana_id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('programa_semanal_turnos')
            .select(`id, dia, hora, grupo, territorio, punto_reunion, conductor_id, score, conductores (id, nombre, grupo)`)
            .eq('semana_id', req.params.semana_id)
            .order('dia')
            .order('hora')
            .order('grupo');
        if (error) throw error;
        res.json({ asignaciones: data || [] });
    } catch (error) {
        console.error('Error GET asignaciones/semana/:semana_id:', error);
        res.status(500).json({ error: 'Error al obtener asignaciones' });
    }
});

router.post('/exportar-sheets', async (req, res) => {
    try {
        const { semana_id } = req.body;
        if (!semana_id) return res.status(400).json({ error: 'semana_id requerido' });

        const { data: programa, error: progError } = await supabase
            .from('programa_semanal')
            .select(`id, semana_inicio, semana_fin, programa_semanal_turnos (*)`)
            .eq('id', semana_id)
            .single();
        if (progError || !programa) return res.status(404).json({ error: 'Programa no encontrado' });

        const { data: asignaciones, error: asigError } = await supabase
            .from('programa_semanal_turnos')
            .select(`id, dia, hora, grupo, territorio, punto_reunion, conductor_id, score, conductores (id, nombre, grupo)`)
            .eq('semana_id', semana_id)
            .order('dia')
            .order('hora')
            .order('grupo');
        if (asigError) throw asigError;

        const { data: filasExtra } = await supabase
            .from('programa_semanal_extra_filas')
            .select('*')
            .eq('semana_id', semana_id)
            .order('dia')
            .order('orden');

        const resultados = (asignaciones || []).map(t => ({
            turno_id: t.id,
            dia: t.dia,
            hora: t.hora,
            grupo: t.grupo,
            territorio: t.territorio,
            punto_reunion: t.punto_reunion,
            es_extra: false,
            asignado: !!t.conductor_id,
            conductor_asignado: t.conductores ? { id: t.conductores.id, nombre: t.conductores.nombre, grupo: t.conductores.grupo } : null
        }));

        (filasExtra || []).forEach(f => {
            resultados.push({
                turno_id: null,
                dia: f.dia,
                hora: f.hora,
                grupo: f.grupo || '',
                territorio: f.territorio || '',
                punto_reunion: f.punto_reunion || '',
                conductor_extra: f.conductor || '',
                es_extra: true,
                asignado: false,
                conductor_asignado: null,
                orden: f.orden ?? 0
            });
        });

        const result = await exportAsignacionToSheets(resultados, programa);
        res.json({
            mensaje: `Nueva pestaña creada: ${result.sheetName}`,
            url: result.url,
            sheetName: result.sheetName
        });
    } catch (error) {
        console.error('Error en POST /asignacion/exportar-sheets:', error);
        res.status(500).json({ error: `Error al exportar: ${error.message}`, detalles: error.message });
    }
});

router.delete('/semana/:semana_id', async (req, res) => {
    try {
        const { semana_id } = req.params;
        const { error: err1 } = await supabase
            .from('programa_semanal_turnos')
            .update({ conductor_id: null, score: null })
            .eq('semana_id', semana_id);
        if (err1) throw err1;
        const { error: err2 } = await supabase
            .from('asignaciones_historial')
            .delete()
            .eq('semana_id', semana_id);
        if (err2) throw err2;
        res.json({ mensaje: 'Asignaciones eliminadas' });
    } catch (error) {
        console.error('Error DELETE /asignacion/semana/:semana_id:', error);
        res.status(500).json({ error: 'Error al eliminar asignaciones', detalles: error.message });
    }
});

module.exports = router;
