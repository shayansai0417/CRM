import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allows other devices on the same Wi-Fi network to open it (e.g. http://192.168.x.x:5173)
  },
});
