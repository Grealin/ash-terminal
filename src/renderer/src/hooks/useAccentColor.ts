import { ACCENT_COLOR_PRESETS } from '@shared/models'
import { darkStateAtom, accentColorAtom } from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect } from 'react'

export function applyAccentCss(accentId: string, isDark?: boolean): void {
  const dark = isDark !== undefined ? isDark : document.documentElement.classList.contains('dark')
  const preset = ACCENT_COLOR_PRESETS.find((p) => p.id === accentId)
  if (!preset) return
  const colors = dark ? preset.dark : preset.light
  const root = document.documentElement
  root.style.setProperty('--ash-accent', colors.accent)
  root.style.setProperty('--ash-accent-hover', colors.accentHover)
  root.style.setProperty('--ash-accent-subtle', colors.accentSubtle)
}

export function useAccentColor(): {
  accentColor: string
  setAccentColor: (id: string) => Promise<void>
  presets: typeof ACCENT_COLOR_PRESETS
} {
  const [accentColor, setAccentColorAtom] = useAtom(accentColorAtom)
  const isDark = useAtomValue(darkStateAtom) ?? false

  useEffect(() => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    applyAccentCss(accentColor, isDark)
  }, [isDark, accentColor])

  const setAccentColor = useCallback(
    async (id: string): Promise<void> => {
      setAccentColorAtom(id)
      applyAccentCss(id)
      try {
        await window.context.updateConfigField('theme.accentColor', id)
      } catch (err) {
        console.error('[setAccentColor] persist failed:', err)
      }
    },
    [setAccentColorAtom]
  )

  return { accentColor, setAccentColor, presets: ACCENT_COLOR_PRESETS }
}
