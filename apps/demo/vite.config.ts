import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vlvethund/boardgame-kit': resolve(__dirname, '../../packages/boardgame-kit/src'),
    },
  },
});
