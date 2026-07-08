"use strict";

const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('conductores')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        res.json({ conductores: data || [] });
    } catch (error) {
        console.error('Error GET /conductores:', error);
        res.status(500).json({ error: 'Error al obtener conductores' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, ubicacion_casa, grupo, tiene_pc, poca_movilidad, solo_parque } = req.body;
        if (!nombre || !grupo) {
            return res.status(400).json({ error: 'nombre y grupo son requeridos' });
        }
        if (!['A', 'B', 'C'].includes(grupo)) {
            return res.status(400).json({ error: 'grupo debe ser A, B o C' });
        }
        const { data, error } = await supabase
            .from('conductores')
            .insert([{ nombre, ubicacion_casa: ubicacion_casa || null, grupo, tiene_pc: tiene_pc || false, poca_movilidad: poca_movilidad || false, solo_parque: solo_parque || false }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ mensaje: 'Conductor creado', conductor: data });
    } catch (error) {
        console.error('Error POST /conductores:', error);
        res.status(500).json({ error: 'Error al crear conductor' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { nombre, ubicacion_casa, grupo, activo, tiene_pc, poca_movilidad, solo_parque } = req.body;
        const updates = {};
        if (nombre !== undefined) updates.nombre = nombre;
        if (ubicacion_casa !== undefined) updates.ubicacion_casa = ubicacion_casa;
        if (grupo !== undefined) updates.grupo = grupo;
        if (activo !== undefined) updates.activo = activo;
        if (tiene_pc !== undefined) updates.tiene_pc = tiene_pc;
        if (poca_movilidad !== undefined) updates.poca_movilidad = poca_movilidad;
        if (solo_parque !== undefined) updates.solo_parque = solo_parque;
        const { data, error } = await supabase.from('conductores').update(updates).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ mensaje: 'Conductor actualizado', conductor: data });
    } catch (error) {
        console.error('Error PUT /conductores/:id:', error);
        res.status(500).json({ error: 'Error al actualizar conductor' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('conductores').update({ activo: false }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ mensaje: 'Conductor desactivado' });
    } catch (error) {
        console.error('Error DELETE /conductores/:id:', error);
        res.status(500).json({ error: 'Error al eliminar conductor' });
    }
});

router.get('/:id/disponibilidad', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('disponibilidad_conductor')
            .select('*')
            .eq('conductor_id', req.params.id)
            .order('dia')
            .order('hora');
        if (error) throw error;
        res.json({ disponibilidad: data || [] });
    } catch (error) {
        console.error('Error GET /conductores/:id/disponibilidad:', error);
        res.status(500).json({ error: 'Error al obtener disponibilidad' });
    }
});

router.put('/:id/disponibilidad', async (req, res) => {
    try {
        const { disponibilidad } = req.body;
        if (!Array.isArray(disponibilidad)) {
            return res.status(400).json({ error: 'disponibilidad debe ser un array' });
        }
        const records = disponibilidad.map(d => ({
            conductor_id: req.params.id,
            dia: d.dia,
            hora: d.hora,
            disponible: d.disponible === true
        }));
        if (records.length > 0) {
            const { error: upsertError } = await supabase
                .from('disponibilidad_conductor')
                .upsert(records, { onConflict: 'conductor_id, dia, hora' });
            if (upsertError) throw upsertError;
        }
        res.json({ mensaje: 'Disponibilidad actualizada', total: records.length });
    } catch (error) {
        console.error('Error PUT /conductores/:id/disponibilidad:', error);
        res.status(500).json({ error: 'Error al guardar disponibilidad' });
    }
});

module.exports = router;
