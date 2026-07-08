"use strict";

const jwt = require('jsonwebtoken');
const router = require('express').Router();
const { supabase } = require('../supabase/client');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

function genToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

router.get('/google', async (req, res) => {
    try {
        const redirectUrl = process.env.SUPABASE_AUTH_REDIRECT_URL ||
            `${req.protocol}://${req.get('host')}/`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) return res.status(500).json({ error: 'Error iniciando OAuth' });
        return res.redirect(data.url);
    } catch (error) {
        console.error('Error en /api/auth/google:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

router.post('/google/callback', async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) return res.status(400).json({ error: 'Token requerido' });

        const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'apikey': process.env.SUPABASE_ANON_KEY
            }
        });
        const userData = await userResp.json();
        if (!userResp.ok || !userData.id) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const email = (userData.email || '').toLowerCase();
        const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        if (!allowed.includes(email)) {
            return res.status(403).json({ error: 'Email no autorizado' });
        }

        const token = genToken(userData.id);
        res.json({
            token,
            usuario: {
                id: userData.id,
                nombre: userData.user_metadata?.full_name || userData.user_metadata?.name || email.split('@')[0],
                email
            }
        });
    } catch (error) {
        console.error('Error en callback Google OAuth:', error);
        res.status(500).json({ error: 'Error interno en autenticación' });
    }
});

router.get('/validate', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token requerido' });
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valido: true, usuarioId: decoded.userId });
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
});

module.exports = router;
