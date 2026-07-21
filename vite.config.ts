import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './shared'),
        '@components': path.resolve(__dirname, './src/components'),
        '@views': path.resolve(__dirname, './src/views'),
        '@layouts': path.resolve(__dirname, './src/layouts'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@services': path.resolve(__dirname, './src/services'),
        '@controllers': path.resolve(__dirname, './src/controllers'),
        '@ipc': path.resolve(__dirname, './src/ipc'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@animations': path.resolve(__dirname, './src/animations'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@backend': path.resolve(__dirname, './backend'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          dashboard: path.resolve(__dirname, 'dashboard.html'),
          settings: path.resolve(__dirname, 'settings.html'),
          overlay: path.resolve(__dirname, 'overlay.html'),
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
