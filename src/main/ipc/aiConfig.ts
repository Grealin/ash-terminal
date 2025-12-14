import {
  addProvider,
  getActiveProvider,
  getAiConfig,
  getProviders,
  removeProvider,
  resetAiConfig,
  saveAiConfig,
  setActiveProvider,
  updateAiConfigField,
  updateProvider
} from '@/lib/aiConfigStore'
import { ipcMain } from 'electron'

/**
 * 注册 AI 配置相关的 IPC handlers（加密存储）
 */
export function registerAiConfigHandlers(): void {
  // 获取 AI 配置
  ipcMain.handle('getAiConfig', async () => {
    try {
      return getAiConfig()
    } catch (error) {
      console.error('Failed to get AI config:', error)
      throw error
    }
  })

  // 保存 AI 配置
  ipcMain.handle('saveAiConfig', async (_event, config) => {
    try {
      saveAiConfig(config)
    } catch (error) {
      console.error('Failed to save AI config:', error)
      throw error
    }
  })

  // 更新 AI 配置字段
  ipcMain.handle('updateAiConfigField', async (_event, path, value) => {
    try {
      updateAiConfigField(path, value)
    } catch (error) {
      console.error('Failed to update AI config field:', error)
      throw error
    }
  })

  // 重置 AI 配置
  ipcMain.handle('resetAiConfig', async () => {
    try {
      resetAiConfig()
    } catch (error) {
      console.error('Failed to reset AI config:', error)
      throw error
    }
  })

  // 获取所有供应商配置
  ipcMain.handle('getProviders', async () => {
    try {
      return getProviders()
    } catch (error) {
      console.error('Failed to get providers:', error)
      throw error
    }
  })

  // 获取当前激活的供应商
  ipcMain.handle('getActiveProvider', async () => {
    try {
      return getActiveProvider()
    } catch (error) {
      console.error('Failed to get active provider:', error)
      throw error
    }
  })

  // 添加新的供应商配置
  ipcMain.handle('addProvider', async (_event, provider) => {
    try {
      addProvider(provider)
    } catch (error) {
      console.error('Failed to add provider:', error)
      throw error
    }
  })

  // 更新供应商配置
  ipcMain.handle('updateProvider', async (_event, providerId, updates) => {
    try {
      updateProvider(providerId, updates)
    } catch (error) {
      console.error('Failed to update provider:', error)
      throw error
    }
  })

  // 删除供应商配置
  ipcMain.handle('removeProvider', async (_event, providerId) => {
    try {
      removeProvider(providerId)
    } catch (error) {
      console.error('Failed to remove provider:', error)
      throw error
    }
  })

  // 设置激活的供应商
  ipcMain.handle('setActiveProvider', async (_event, providerId) => {
    try {
      setActiveProvider(providerId)
    } catch (error) {
      console.error('Failed to set active provider:', error)
      throw error
    }
  })
}
