import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

export const loadEnvConfig = (): void => {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envPath = path.join(process.cwd(), '.env')

  if (fs.existsSync(envLocalPath)) {
    config({ path: envLocalPath })
  } else if (fs.existsSync(envPath)) {
    config({ path: envPath })
  }
}

// 立即加载环境变量（保持与原逻辑一致的副作用）
loadEnvConfig()
