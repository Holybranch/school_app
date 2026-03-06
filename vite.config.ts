import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  base: './' // 이걸 추가하면 dist/index.html에서 상대 경로로 JS/CSS를 찾음
})
