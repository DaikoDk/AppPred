"use strict";

const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

const TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';
const TEMPLATE_INICIO = '2000-01-03';
const TEMPLATE_FIN = '2000-01-09';

const DEFAULT_TURNOS = [
    { dia: 'LUNES', hora: 'Mañana (8:20 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'LUNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'JUEVES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'VIERNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
];

const DEFAULT_EXTRA_FILAS = [
    { dia: 'MARTES', orden: 0 },
    { dia: 'SABADO', orden: 0 },
    { dia: 'SABADO', orden: 1 },
    { dia: 'DOMINGO', orden: -1 },
];

async function asegurarPlantilla() {
    const { data } = await supabase.from('programa_semanal').select('id').eq('id', TEMPLATE_ID).single();
    if (!data) {
        await supabase.from('programa_semanal').insert([{ id: TEMPLATE_ID, semana_inicio: TEMPLATE_INICIO, semana_fin: TEMPLATE_FIN }]);
    }
    const { count } = await supabase.from('programa_semanal_turnos').select('*', { count: 'exact', head: true }).eq('semana_id', TEMPLATE_ID);
    if (!count || count === 0) {
        const turnos = DEFAULT_TURNOS.map(t => ({ semana_id: TEMPLATE_ID, ...t }));
        await supabase.from('programa_semanal_turnos').insert(turnos);
    }
    const { count: extraCount } = await supabase.from('programa_semanal_extra_filas').select('*', { count: 'exact', head: true }).eq('semana_id', TEMPLATE_ID);
    if (!extraCount || extraCount === 0) {
        const extras = DEFAULT_EXTRA_FILAS.map(e => ({ semana_id: TEMPLATE_ID, hora: '', grupo: '', territorio: '', punto_reunion: '', conductor: '', ...e }));
        for (const e of extras) {
            await supabase.from('programa_semanal_extra_filas').insert(e);
        }
    }
}

async function obtenerPlantilla() {
    const { data: prog } = await supabase
        .from('programa_semanal')
        .select(`id, semana_inicio, semana_fin, creado, programa_semanal_turnos (id, dia, hora, grupo, territorio, punto_reunion, modalidad, conductor_id, creado)`)
        .eq('id', TEMPLATE_ID)
        .single();
    if (!prog) return null;
    const { data: extras } = await supabase
        .from('programa_semanal_extra_filas')
        .select('*')
        .eq('semana_id', TEMPLATE_ID)
        .order('dia')
        .order('orden');
    return { ...prog, filas_extra: extras || [] };
}

router.post('/', async (req, res) => {
    try {
        const { semana_inicio, semana_fin, turnos, filasExtra } = req.body;
        if (!semana_inicio || !semana_fin || !Array.isArray(turnos)) {
            return res.status(400).json({ error: 'semana_inicio, semana_fin y turnos son requeridos' });
        }
        const { data: programa, error: progError } = await supabase
            .from('programa_semanal')
            .insert([{ semana_inicio, semana_fin }])
            .select()
            .single();
        if (progError) throw progError;

        const turnosData = turnos.map(t => ({
            semana_id: programa.id,
            dia: t.dia,
            hora: t.hora,
            grupo: t.grupo,
            territorio: t.territorio || null,
            punto_reunion: t.punto_reunion || null,
            modalidad: t.modalidad || 'FISICO'
        }));
        const { error: turnosError } = await supabase.from('programa_semanal_turnos').insert(turnosData);
        if (turnosError) {
            await supabase.from('programa_semanal').delete().eq('id', programa.id);
            throw turnosError;
        }

        if (Array.isArray(filasExtra) && filasExtra.length > 0) {
            const extraData = filasExtra.map(f => ({
                semana_id: programa.id,
                dia: f.dia,
                hora: f.hora || '',
                grupo: f.grupo || '',
                territorio: f.territorio || '',
                punto_reunion: f.punto_reunion || '',
                conductor: f.conductor || '',
                orden: f.orden || 0
            }));
            const { error: extraError } = await supabase.from('programa_semanal_extra_filas').insert(extraData);
            if (extraError) throw extraError;
        }

        // Keep only the last 10 programs (delete oldest, exclude template)
        const { data: todos } = await supabase
            .from('programa_semanal')
            .select('id')
            .order('semana_inicio', { ascending: false });
        const reales = (todos || []).filter(p => p.id !== TEMPLATE_ID);
        if (reales.length > 10) {
            const idsToDelete = reales.slice(10).map(p => p.id);
            await supabase.from('programa_semanal').delete().in('id', idsToDelete);
        }

        res.status(201).json({ mensaje: 'Programa creado', programa, total_turnos: turnos.length });
    } catch (error) {
        console.error('Error POST /programa-semanal:', error);
        const msg = error.code === '23505' ? 'Ya existe un programa con esas fechas' : (error.message || 'Error al crear programa');
        res.status(500).json({ error: msg });
    }
});

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('programa_semanal')
            .select(`
                id, semana_inicio, semana_fin, creado,
                programa_semanal_turnos (id, dia, hora, grupo, territorio, punto_reunion, modalidad, conductor_id, creado)
            `)
            .order('semana_inicio', { ascending: false });
        if (error) throw error;

        const filtrados = (data || []).filter(p => p.id !== TEMPLATE_ID);

        for (const p of filtrados) {
            const { data: extras } = await supabase
                .from('programa_semanal_extra_filas')
                .select('*')
                .eq('semana_id', p.id)
                .order('dia')
                .order('orden');
            p.filas_extra = extras || [];
        }

        res.json({ programas: filtrados });
    } catch (error) {
        console.error('Error GET /programa-semanal:', error);
        res.status(500).json({ error: 'Error al obtener programas' });
    }
});

router.get('/con-estado', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('programa_semanal')
            .select(`
                id, semana_inicio, semana_fin,
                programa_semanal_turnos (conductor_id)
            `)
            .order('semana_inicio', { ascending: false });
        if (error) throw error;

        const programas = (data || []).filter(p => p.id !== TEMPLATE_ID).map(p => {
            const turnos = p.programa_semanal_turnos || [];
            const asignados = turnos.filter(t => t.conductor_id).length;
            return {
                id: p.id,
                semana_inicio: p.semana_inicio,
                semana_fin: p.semana_fin,
                total_turnos: turnos.length,
                asignados
            };
        });
        res.json({ programas });
    } catch (error) {
        console.error('Error GET /programa-semanal/con-estado:', error);
        res.status(500).json({ error: 'Error al obtener estado' });
    }
});

router.get('/plantilla', async (req, res) => {
    try {
        await asegurarPlantilla();
        const prog = await obtenerPlantilla();
        if (!prog) return res.status(500).json({ error: 'No se pudo crear la plantilla' });
        res.json({ programa: prog });
    } catch (error) {
        console.error('Error GET /programa-semanal/plantilla:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/plantilla', async (req, res) => {
    try {
        await supabase.from('programa_semanal_turnos').delete().eq('semana_id', TEMPLATE_ID);
        await supabase.from('programa_semanal_extra_filas').delete().eq('semana_id', TEMPLATE_ID);
        const turnos = DEFAULT_TURNOS.map(t => ({ semana_id: TEMPLATE_ID, ...t }));
        await supabase.from('programa_semanal_turnos').insert(turnos);
        const extras = DEFAULT_EXTRA_FILAS.map(e => ({ semana_id: TEMPLATE_ID, hora: '', grupo: '', territorio: '', punto_reunion: '', conductor: '', ...e }));
        for (const e of extras) {
            await supabase.from('programa_semanal_extra_filas').insert(e);
        }
        res.json({ mensaje: 'Plantilla restablecida' });
    } catch (error) {
        console.error('Error POST /programa-semanal/plantilla:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('programa_semanal')
            .select(`
                id, semana_inicio, semana_fin, creado,
                programa_semanal_turnos (id, dia, hora, grupo, territorio, punto_reunion, modalidad, conductor_id, creado)
            `)
            .eq('id', req.params.id)
            .single();
        if (error || !data) return res.status(404).json({ error: 'Programa no encontrado' });

        const { data: extras } = await supabase
            .from('programa_semanal_extra_filas')
            .select('*')
            .eq('semana_id', req.params.id)
            .order('dia')
            .order('orden');

        res.json({ programa: { ...data, filas_extra: extras || [] } });
    } catch (error) {
        console.error('Error GET /programa-semanal/:id:', error);
        res.status(500).json({ error: 'Error al obtener programa' });
    }
});

router.get('/:id/extras', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('programa_semanal_extra_filas')
            .select('*')
            .eq('semana_id', req.params.id)
            .order('dia')
            .order('orden');
        if (error) throw error;
        res.json({ filas: data || [] });
    } catch (error) {
        console.error('Error GET /programa-semanal/:id/extras:', error);
        res.status(500).json({ error: 'Error al obtener filas extra' });
    }
});

router.post('/:id/extras', async (req, res) => {
    try {
        const { dia, hora, grupo, territorio, punto_reunion, conductor, orden } = req.body;
        if (!dia) return res.status(400).json({ error: 'dia requerido' });
        const { data, error } = await supabase
            .from('programa_semanal_extra_filas')
            .insert([{ semana_id: req.params.id, dia, hora: hora || '', grupo: grupo || '', territorio: territorio || '', punto_reunion: punto_reunion || '', conductor: conductor || '', orden: orden || 0 }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ mensaje: 'Fila extra creada', fila: data });
    } catch (error) {
        console.error('Error POST /programa-semanal/:id/extras:', error);
        res.status(500).json({ error: 'Error al crear fila extra' });
    }
});

router.put('/extras/:id', async (req, res) => {
    try {
        const { dia, hora, grupo, territorio, punto_reunion, conductor, orden } = req.body;
        const updates = {};
        if (dia !== undefined) updates.dia = dia;
        if (hora !== undefined) updates.hora = hora;
        if (grupo !== undefined) updates.grupo = grupo;
        if (territorio !== undefined) updates.territorio = territorio;
        if (punto_reunion !== undefined) updates.punto_reunion = punto_reunion;
        if (conductor !== undefined) updates.conductor = conductor;
        if (orden !== undefined) updates.orden = orden;
        const { data, error } = await supabase
            .from('programa_semanal_extra_filas')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();
        if (error) throw error;
        res.json({ mensaje: 'Fila extra actualizada', fila: data });
    } catch (error) {
        console.error('Error PUT /programa-semanal/extras/:id:', error);
        res.status(500).json({ error: 'Error al actualizar fila extra' });
    }
});

router.delete('/extras/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('programa_semanal_extra_filas').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ mensaje: 'Fila extra eliminada' });
    } catch (error) {
        console.error('Error DELETE /programa-semanal/extras/:id:', error);
        res.status(500).json({ error: 'Error al eliminar fila extra' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { turnos, filasExtra, semana_inicio, semana_fin } = req.body;
        console.log('[DEBUG PUT] filasExtra=%j', filasExtra);
        if (!Array.isArray(turnos)) return res.status(400).json({ error: 'turnos requerido' });

        if (semana_inicio && semana_fin) {
            const { error: updError } = await supabase.from('programa_semanal').update({ semana_inicio, semana_fin }).eq('id', req.params.id);
            if (updError) throw updError;
        }

        const { error: delError } = await supabase.from('programa_semanal_turnos').delete().eq('semana_id', req.params.id);
        if (delError) throw delError;

        const turnosData = turnos.map(t => ({
            semana_id: req.params.id,
            dia: t.dia,
            hora: t.hora,
            grupo: t.grupo,
            territorio: t.territorio || null,
            punto_reunion: t.punto_reunion || null,
            modalidad: t.modalidad || 'FISICO'
        }));
        const { error: insError } = await supabase.from('programa_semanal_turnos').insert(turnosData);
        if (insError) throw insError;

        if (Array.isArray(filasExtra)) {
            await supabase.from('programa_semanal_extra_filas').delete().eq('semana_id', req.params.id);
            const extraData = filasExtra.map(f => ({
                semana_id: req.params.id,
                dia: f.dia,
                hora: f.hora || '',
                grupo: f.grupo || '',
                territorio: f.territorio || '',
                punto_reunion: f.punto_reunion || '',
                conductor: f.conductor || '',
                orden: f.orden || 0
            }));
            if (extraData.length > 0) {
                const { error: extraError } = await supabase.from('programa_semanal_extra_filas').insert(extraData);
                if (extraError) throw extraError;
            }
        }

        res.json({ mensaje: 'Programa actualizado', total_turnos: turnos.length });
    } catch (error) {
        console.error('Error PUT /programa-semanal/:id:', error);
        const msg = error.code === '23505' ? 'Ya existe un programa con esas fechas' : (error.message || 'Error al actualizar programa');
        res.status(500).json({ error: msg });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (req.params.id === TEMPLATE_ID) return res.status(403).json({ error: 'No se puede eliminar la plantilla' });
        await supabase.from('programa_semanal_turnos').delete().eq('semana_id', req.params.id);
        const { error } = await supabase.from('programa_semanal').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ mensaje: 'Programa eliminado' });
    } catch (error) {
        console.error('Error DELETE /programa-semanal/:id:', error);
        res.status(500).json({ error: 'Error al eliminar programa' });
    }
});

module.exports = router;
