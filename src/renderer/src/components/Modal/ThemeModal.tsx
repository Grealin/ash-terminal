import { Icon } from '@/components/Icon'
import { useConfig, useModalTheme, useThemeConfig } from '@/hooks'
import { useAccentColor } from '@/hooks/useAccentColor'
import { useEffect, useState } from 'react'
import { SheetModal } from '@/components/SheetModal'
import { twMerge } from 'tailwind-merge'

export const ThemeModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalTheme()
  const { config, loading } = useConfig()
  const { updateThemeConfig } = useThemeConfig()
  const { accentColor, setAccentColor, presets } = useAccentColor()
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light')
  const [selectedAccent, setSelectedAccent] = useState(accentColor)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config && !loading) {
      setSelectedTheme(config.theme.defaultDarkMode ? 'dark' : 'light')
      setSelectedAccent(config.theme.accentColor ?? 'coral')
    }
  }, [config, loading])

  const handleSave = async (): Promise<void> => {
    if (!config || saving) return
    try {
      setSaving(true)
      const isDarkMode = selectedTheme === 'dark'
      await updateThemeConfig(isDarkMode)
      await setAccentColor(selectedAccent)
      closeModal()
    } catch (error) {
      console.error('Failed to save theme config:', error)
      alert('保存主题设置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = (): void => {
    if (config) {
      setSelectedTheme(config.theme.defaultDarkMode ? 'dark' : 'light')
      setSelectedAccent(config.theme.accentColor ?? 'coral')
    }
    closeModal()
  }

  if (loading) {
    return (
      <SheetModal isOpen={isModalOpen} onClose={closeModal} title="默认主题设置" width="sm">
        <div className="flex justify-center items-center h-32">
          <Icon name="loader-2" size="lg" className="animate-spin text-[var(--ash-accent)]" />
        </div>
      </SheetModal>
    )
  }

  return (
    <SheetModal
      isOpen={isModalOpen}
      onClose={handleCancel}
      title="默认主题设置"
      width="sm"
      footer={
        <>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] rounded-[var(--radius-md)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-[13px] rounded-[var(--radius-md)] bg-[var(--ash-accent)] text-white hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* 亮色/暗色主题选择 */}
        <div>
          <h3 className="text-[14px] font-medium mb-3 text-[var(--color-text-primary)]">
            默认主题模式
          </h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
            此设置决定应用启动时使用的默认主题，不影响手动切换。
          </p>

          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={selectedTheme === 'light'}
                onChange={(e) => setSelectedTheme(e.target.value as 'light')}
                className="accent-[var(--ash-accent)]"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-white border border-[var(--color-border-primary)] rounded-[var(--radius-sm)]" />
                <span className="text-[13px] text-[var(--color-text-primary)]">亮色主题</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={selectedTheme === 'dark'}
                onChange={(e) => setSelectedTheme(e.target.value as 'dark')}
                className="accent-[var(--ash-accent)]"
              />
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#1A1D23] border border-[var(--color-border-primary)] rounded-[var(--radius-sm)]" />
                <span className="text-[13px] text-[var(--color-text-primary)]">暗色主题</span>
              </div>
            </label>
          </div>
        </div>

        {/* 强调色选择 */}
        <div>
          <h3 className="text-[14px] font-medium mb-3 text-[var(--color-text-primary)]">强调色</h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
            选择应用的主题强调色，应用于按钮、链接和高亮元素。
          </p>

          <div className="grid grid-cols-6 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedAccent(preset.id)}
                title={preset.name}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={twMerge(
                    'w-8 h-8 rounded-full transition-all duration-150',
                    selectedAccent === preset.id
                      ? 'ring-2 ring-offset-2 ring-[var(--ash-accent)] scale-110'
                      : 'hover:scale-105'
                  )}
                  style={{
                    backgroundColor: preset.light.accent,
                    // 当前选中态的 ring 色需要跟随切换，用 CSS 变量不够灵活，用 inline
                    ...(selectedAccent === preset.id
                      ? {
                          boxShadow: `0 0 0 2px ${preset.light.accent}`,
                          outline: '2px solid var(--color-bg-primary)',
                          outlineOffset: '-4px'
                        }
                      : {})
                  }}
                />
                <span
                  className={twMerge(
                    'text-[11px]',
                    selectedAccent === preset.id
                      ? 'text-[var(--ash-accent)] font-medium'
                      : 'text-[var(--color-text-tertiary)]'
                  )}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetModal>
  )
}
