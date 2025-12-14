import { AiConfig, AiProviderConfig } from '../models'

/**
 * AI 配置管理 IPC 方法（独立加密存储）
 */

// 获取 AI 配置
export type GetAiConfig = () => Promise<AiConfig>

// 保存 AI 配置
export type SaveAiConfig = (config: AiConfig) => Promise<void>

// 更新 AI 配置字段
export type UpdateAiConfigField = (path: string, value: any) => Promise<void>

// 重置 AI 配置为默认值
export type ResetAiConfig = () => Promise<void>

/**
 * AI 供应商管理 IPC 方法
 */

// 获取所有供应商配置
export type GetProviders = () => Promise<AiProviderConfig[]>

// 获取当前激活的供应商
export type GetActiveProvider = () => Promise<AiProviderConfig | null>

// 添加新的供应商配置
export type AddProvider = (provider: AiProviderConfig) => Promise<void>

// 更新供应商配置
export type UpdateProvider = (
  providerId: string,
  updates: Partial<AiProviderConfig>
) => Promise<void>

// 删除供应商配置
export type RemoveProvider = (providerId: string) => Promise<void>

// 设置激活的供应商
export type SetActiveProvider = (providerId: string) => Promise<void>
