import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    electron([
      {
        // Main process entry file
        entry: 'main.js',
      },
      {
        // Preload script
        entry: 'preload.js',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload();
        },
      },
    ]),
    renderer(),
  ],
  server: {
    port: 5173,
    hmr: {
      overlay: true
    },
    watch: {
      include: ['**/*.{js,ts,html,css}']
    }
  },
  build: {
    outDir: 'dist-vite',
  },
});
