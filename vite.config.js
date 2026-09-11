import { defineConfig } from 'vite';

export default defineConfig({
  // 'base: "./"' garantit que les chemins des ressources (CSS, JS) sont relatifs
  // et fonctionnent quel que soit le nom du dépôt GitHub Pages
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
