import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',   // Firebase에 배포되는 폴더
    emptyOutDir: true // 빌드 전에 dist 폴더 비우기
  }
})
