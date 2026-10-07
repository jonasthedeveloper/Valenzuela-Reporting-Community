import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Vite does not expose .env values to process.env inside this file,
  // so load them explicitly and fall back to the API origin from .env.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiOrigin = env.VITE_API_ORIGIN || 'http://localhost:5050';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Listen on all interfaces so the app is reachable via localhost,
      // 127.0.0.1, and this machine's LAN IP (needed to open it on a phone).
      host: true,
      proxy: {
        // Uploaded photos and videos are served by the API.
        '/uploads': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
