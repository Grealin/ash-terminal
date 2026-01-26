import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// 声明全局注入的环境变量（编译时由 Vite define 注入）
declare const __ENV_SECRET_KEY__: string | undefined

/**
 * 加载 .env 配置文件（仅在开发环境使用）
 */
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

/**
 * 获取环境变量值
 * 优先级：编译时注入的全局变量 > process.env
 * @param key 环境变量名
 * @returns 环境变量值，不存在则返回 undefined
 */
export const getEnv = (key: string): string | undefined => {
  // 在生产环境（编译后），优先使用编译时注入的全局变量
  if (key === 'SECRET_KEY' && typeof __ENV_SECRET_KEY__ !== 'undefined') {
    return __ENV_SECRET_KEY__
  }

  // 否则从 process.env 中读取（开发环境）
  return process.env[key]
}

// 在开发环境下立即加载环境变量
if (process.env.NODE_ENV !== 'production') {
  loadEnvConfig()
}
