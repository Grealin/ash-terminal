import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

export const loadEnvConfig = (): void => {
  const envPath = path.join(process.cwd(), '.env')
  const envLocalPath = path.join(process.cwd(), '.env.local')

  // 先加载 .env（默认配置）
  if (fs.existsSync(envPath)) {
    config({ path: envPath })
  }

  // 再加载 .env.local（本地配置，会覆盖 .env 中的同名变量）
  if (fs.existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true })
  }
}

// 立即加载环境变量（保持与原逻辑一致的副作用）
loadEnvConfig()
