import { defineConfig } from 'vite';

export default defineConfig({
    base: '/barcode-reader-demo/',   // repo name
    build: {
        outDir: 'docs',                // ← GitHub Pages can use this
    },
});