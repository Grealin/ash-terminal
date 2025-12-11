import { useConfig } from '@/hooks/Config'
import { leftSideBarVisibleAtom, rightSideBarVisibleAtom } from '@/store/AreaAtom'
import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

// 左侧边栏控制Hook
export const useLeftSideBar = (): {
  visible: boolean
  toggleVisible: () => Promise<void>
  setVisible: (newVisible: boolean) => Promise<void>
} => {
  const [visible, setVisible] = useAtom(leftSideBarVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.leftSideBarVisible !== undefined) {
      setVisible(config.layout.leftSideBarVisible)
    }
  }, [config, setVisible])

  // 切换显示状态并保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.leftSideBarVisible', newVisible)
    } catch (error) {
      console.error('Failed to save left sidebar config:', error)
      // 回滚状态
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态并保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.leftSideBarVisible', newVisible)
      } catch (error) {
        console.error('Failed to save left sidebar config:', error)
        // 回滚状态
        setVisible(visible)
      }
    },
    [visible, setVisible, updateConfigField]
  )

  return {
    visible,
    toggleVisible,
    setVisible: setVisibleAndSave
  }
}

// 右侧边栏控制Hook
export const useRightSideBar = (): {
  visible: boolean
  toggleVisible: () => Promise<void>
  setVisible: (newVisible: boolean) => Promise<void>
} => {
  const [visible, setVisible] = useAtom(rightSideBarVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.rightSideBarVisible !== undefined) {
      setVisible(config.layout.rightSideBarVisible)
    }
  }, [config, setVisible])

  // 切换显示状态并保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.rightSideBarVisible', newVisible)
    } catch (error) {
      console.error('Failed to save right sidebar config:', error)
      // 回滚状态
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态并保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.rightSideBarVisible', newVisible)
      } catch (error) {
        console.error('Failed to save right sidebar config:', error)
        // 回滚状态
        setVisible(visible)
      }
    },
    [visible, setVisible, updateConfigField]
  )

  return {
    visible,
    toggleVisible,
    setVisible: setVisibleAndSave
  }
}
