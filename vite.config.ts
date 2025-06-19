import { defineConfig } from 'vite';

// Vite configuration
// - Sets base path for GitHub Pages deployment
// - Outputs build to `docs` folder
// - Marks optional heavy/commercial libraries as external so Rollup doesn't try to bundle them
export default defineConfig({
    base: '/barcode-reader-demo/',   // repo name
    build: {
        outDir: 'docs',                // ← GitHub Pages can use this
        rollupOptions: {
            external: [
            ]
        }
    }
});