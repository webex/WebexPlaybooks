import { defineConfig } from "vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
    build:{
        rollupOptions:{
            output:{
                format: 'iife',
                entryFileNames:"[name].js",
                chunkFileNames:"[name].js",
                assetFileNames:"[name].[ext]"
            }
        }
    },
    plugins: [
    nodePolyfills({
    // Whether to polyfill `node:` protocol imports.
    protocolImports: true,
    }),
]
})