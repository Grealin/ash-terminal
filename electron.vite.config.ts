import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import * as fs from 'fs'
import { resolve } from 'path'

// 加载环境变量（优先 .env.local，其次 .env）
const envPath = resolve(__dirname, '.env')
const envLocalPath = resolve(__dirname, '.env.local')

let envVars: Record<string, string> = {}

if (fs.existsSync(envPath)) {
  const result = config({ path: envPath })
  if (result.parsed) {
    envVars = { ...envVars, ...result.parsed }
  }
}

if (fs.existsSync(envLocalPath)) {
  const result = config({ path: envLocalPath })
  if (result.parsed) {
    envVars = { ...envVars, ...result.parsed }
  }
}

// 构建注入的环境变量对象
const injectedEnv: Record<string, string> = {}
for (const [key, value] of Object.entries(envVars)) {
  injectedEnv[`__ENV_${key}__`] = JSON.stringify(value)
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@/lib': resolve('src/main/lib'),
        '@shared': resolve('src/shared')
      }
    },
    define: injectedEnv
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@/hooks': resolve('src/renderer/src/hooks'),
        '@/assets': resolve('src/renderer/src/assets'),
        '@/store': resolve('src/renderer/src/store'),
        '@/components': resolve('src/renderer/src/components'),
        '@/services': resolve('src/renderer/src/services'),
        '@/mocks': resolve('src/renderer/src/mocks')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
