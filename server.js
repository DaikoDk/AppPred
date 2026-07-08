"use strict";

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            connectSrc: ["'self'", "https://xyhdjexiqxromvewpsfc.supabase.co"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"]
        }
    }
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 60000, max: 200, message: { error: 'Demasiadas solicitudes' } });
app.use('/api/', limiter);

app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile('index.html', { root: 'public' }));

app.use('/api/auth', require('./routes/auth'));

const { authenticateToken } = require('./middleware/auth');
app.use('/api/conductores', authenticateToken, require('./routes/conductores'));
app.use('/api/programa-semanal', authenticateToken, require('./routes/programa'));
app.use('/api/asignacion', authenticateToken, require('./routes/asignacion'));
app.use('/api/puntos-reunion', authenticateToken, require('./routes/puntos-reunion'));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Error interno' : err.message });
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
});
