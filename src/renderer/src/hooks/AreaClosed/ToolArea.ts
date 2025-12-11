import { useConfig } from '@/hooks/Config'
import {
  aiInterfaceVisibleAtom,
  commandListVisibleAtom,
  fileListVisibleAtom,
  monitorListVisibleAtom,
  sessionListVisibleAtom
} from '@/store/AreaAtom'
import { useAtom } from 'jotai'
import { useCallback, useEffect } from 'react'

// AI界面控制Hook
export const useAiInterface = () => {
  const [visible, setVisible] = useAtom(aiInterfaceVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.components?.aiInterfaceVisible !== undefined) {
      setVisible(config.layout.components.aiInterfaceVisible)
    }
  }, [config, setVisible])

  // 切换显示状态并保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.components.aiInterfaceVisible', newVisible)
    } catch (error) {
      console.error('Failed to save AI interface config:', error)
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态并保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.components.aiInterfaceVisible', newVisible)
      } catch (error) {
        console.error('Failed to save AI interface config:', error)
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

// 会话列表控制Hook
export const useSessionList = () => {
  const [visible, setVisible] = useAtom(sessionListVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.components?.sessionListVisible !== undefined) {
      setVisible(config.layout.components.sessionListVisible)
    }
  }, [config, setVisible])

  // 切换显示状态带保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.components.sessionListVisible', newVisible)
    } catch (error) {
      console.error('Failed to save session list config:', error)
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态带保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.components.sessionListVisible', newVisible)
      } catch (error) {
        console.error('Failed to save session list config:', error)
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

// 文件列表控制Hook
export const useFileList = () => {
  const [visible, setVisible] = useAtom(fileListVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.components?.fileListVisible !== undefined) {
      setVisible(config.layout.components.fileListVisible)
    }
  }, [config, setVisible])

  // 切换显示状态带保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.components.fileListVisible', newVisible)
    } catch (error) {
      console.error('Failed to save file list config:', error)
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态带保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.components.fileListVisible', newVisible)
      } catch (error) {
        console.error('Failed to save file list config:', error)
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

// 监控列表控制Hook
export const useMonitorList = () => {
  const [visible, setVisible] = useAtom(monitorListVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.components?.monitorListVisible !== undefined) {
      setVisible(config.layout.components.monitorListVisible)
    }
  }, [config, setVisible])

  // 切换显示状态带保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.components.monitorListVisible', newVisible)
    } catch (error) {
      console.error('Failed to save monitor list config:', error)
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态带保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.components.monitorListVisible', newVisible)
      } catch (error) {
        console.error('Failed to save monitor list config:', error)
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

// 命令列表控制Hook
export const useCommandList = () => {
  const [visible, setVisible] = useAtom(commandListVisibleAtom)
  const { config, updateConfigField } = useConfig()

  // 从配置加载初始状态
  useEffect(() => {
    if (config?.layout?.components?.commandListVisible !== undefined) {
      setVisible(config.layout.components.commandListVisible)
    }
  }, [config, setVisible])

  // 切换显示状态带保存到配置
  const toggleVisible = useCallback(async (): Promise<void> => {
    const newVisible = !visible
    setVisible(newVisible)

    try {
      await updateConfigField('layout.components.commandListVisible', newVisible)
    } catch (error) {
      console.error('Failed to save command list config:', error)
      setVisible(visible)
    }
  }, [visible, setVisible, updateConfigField])

  // 设置显示状态并保存到配置
  const setVisibleAndSave = useCallback(
    async (newVisible: boolean): Promise<void> => {
      setVisible(newVisible)

      try {
        await updateConfigField('layout.components.commandListVisible', newVisible)
      } catch (error) {
        console.error('Failed to save command list config:', error)
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
