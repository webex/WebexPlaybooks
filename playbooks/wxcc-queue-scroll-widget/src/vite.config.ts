import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rolldownOptions: {
            output: {
                format: 'iife',
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                assetFileNames: "[name].[ext]"
            }
        }
    }
})