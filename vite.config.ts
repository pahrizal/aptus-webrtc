import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from "@vitejs/plugin-legacy";
// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    legacy({
      targets: ["Chrome >= 33"],
      modernPolyfills: ["es/global-this"],
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 5001,
    proxy: {
      "/webrtc": {
        target: "http://localhost:5100",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist/ui",
    emptyOutDir: true,
  },
});
