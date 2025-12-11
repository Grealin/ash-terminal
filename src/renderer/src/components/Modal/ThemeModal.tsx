import { useConfig, useModalTheme, useThemeConfig } from '@/hooks'
import { useEffect, useState } from 'react'
import { GeneralModal } from './GeneralModal'

export const ThemeModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalTheme()
  const { config, loading } = useConfig()
  const { updateThemeConfig } = useThemeConfig()
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light')
  const [saving, setSaving] = useState(false)

  // 当配置加载完成时，设置选中的主题
  useEffect(() => {
    if (config && !loading) {
      setSelectedTheme(config.theme.defaultDarkMode ? 'dark' : 'light')
    }
  }, [config, loading])

  // 处理保存
  const handleSave = async (): Promise<void> => {
    if (!config || saving) return

    try {
      setSaving(true)
      const isDarkMode = selectedTheme === 'dark'
      await updateThemeConfig(isDarkMode)
      closeModal()
    } catch (error) {
      console.error('Failed to save theme config:', error)
      alert('保存主题设置失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理取消
  const handleCancel = (): void => {
    // 重置为原始值
    if (config) {
      setSelectedTheme(config.theme.defaultDarkMode ? 'dark' : 'light')
    }
    closeModal()
  }

  if (loading) {
    return (
      <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="默认主题设置" width="lg">
        <div className="flex justify-center items-center h-32">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </GeneralModal>
    )
  }

  return (
    <GeneralModal isOpen={isModalOpen} onClose={handleCancel} title="默认主题设置" width="lg">
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium mb-4 dark:text-gray-100">选择默认主题</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            此设置决定应用启动时使用的默认主题，不影响手动切换主题的功能。
          </p>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={selectedTheme === 'light'}
                onChange={(e) => setSelectedTheme(e.target.value as 'light')}
                className="radio radio-primary"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-300 dark:border-gray-500 rounded"></div>
                <span className="dark:text-gray-200">亮色主题</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={selectedTheme === 'dark'}
                onChange={(e) => setSelectedTheme(e.target.value as 'dark')}
                className="radio radio-primary"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-800 border-2 border-gray-600 dark:border-gray-400 rounded"></div>
                <span className="dark:text-gray-200">暗色主题</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-600">
          <button type="button" onClick={handleCancel} className="btn" disabled={saving}>
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary dark:btn-primary-dark"
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                保存中...
              </>
            ) : (
              '保存'
            )}
          </button>
        </div>
      </div>
    </GeneralModal>
  )
}
