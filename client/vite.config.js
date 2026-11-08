import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La app nueva convive con la actual: se sirve en /nuevo hasta el corte (ver docs/ADR.md, ADR-013).
export default defineConfig({
    base: '/nuevo/',
    plugins: [react()],
    server: {
        port: 5173,
        proxy: { '/api': 'http://localhost:3005' }
    }
});
