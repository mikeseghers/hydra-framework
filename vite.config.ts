import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Hydra',
      fileName: (format) => `hydra.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['rxjs'],
      output: {
        globals: {
          rxjs: 'rxjs'
        }
      }
    }
  }
});