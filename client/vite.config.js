import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Express sirve el build (client/dist) en la raíz; en desarrollo Vite redirige /api a Express (ADR-019).
export default defineConfig({
    base: '/',
    plugins: [react()],
    server: {
        port: 5173,
        proxy: { '/api': 'http://localhost:3005' }
    }
});
