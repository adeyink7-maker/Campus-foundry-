import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { chatWebSocketPlugin } from './src/server/chatPlugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    chatWebSocketPlugin(),
  ],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-screen-capture': path.resolve(__dirname, './src/shims/react-native-screen-capture.ts'),
      'react-native-fs': path.resolve(__dirname, './src/shims/react-native-fs.ts'),
      'react-native-background-fetch': path.resolve(__dirname, './src/shims/react-native-background-fetch.ts'),
      'better-sqlite3': path.resolve(__dirname, './src/shims/better-sqlite3.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
});

