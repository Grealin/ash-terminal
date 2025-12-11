import { useConfig, useSSHConnection } from '@/hooks'
import { SSHService } from '@/services'
import { currentSessionIdAtom, darkStateAtom, sessionsAtom } from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

export const TerminalListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'flex-[2] min-h-0 overflow-hidden border-b border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const TerminalListContent: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const sessions = useAtomValue(sessionsAtom)
  const isDark = useAtomValue(darkStateAtom)
  const { config } = useConfig()
  const { setDisconnected, isConnecting, isConnected: sshConnected } = useSSHConnection()

  const terminalRef = useRef<HTMLDivElement>(null)
  // 终端外层容器（用于观察布局变化）
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isTerminalReady, setIsTerminalReady] = useState(false)
  const [isShellActive, setIsShellActive] = useState(false)
  // 避免 onData 闭包拿到旧值
  const currentSessionIdRef = useRef<string | null>(null)
  const isShellActiveRef = useRef(false)
  const onDataDisposableRef = useRef<ReturnType<Terminal['onData']> | null>(null)
  const prevConnectedRef = useRef<boolean | null>(null)
  const shellDataCleanupRef = useRef<(() => void) | null>(null)
  const shellCloseCleanupRef = useRef<(() => void) | null>(null)
  const shellErrorCleanupRef = useRef<(() => void) | null>(null)

  // 用于优化尺寸调整的状态
  const resizeRequestRef = useRef<number | null>(null)
  const lastResizeTimeRef = useRef<number>(0)
  const finalResizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 获取当前会话名称
  const currentSessionName =
    sessions.find((session) => session.id === currentSessionId)?.name || '未知会话'

  // 高性能的节流 fit 方法
  const throttledFitTerminal = useCallback((): boolean => {
    if (!fitAddonRef.current || !terminalInstanceRef.current) return false

    const now = performance.now()
    const timeSinceLastResize = now - lastResizeTimeRef.current

    // 如果距离上次调整时间太短，取消之前的请求并安排新的
    if (timeSinceLastResize < 16) {
      // 约60fps的间隔
      if (resizeRequestRef.current) {
        cancelAnimationFrame(resizeRequestRef.current)
      }

      resizeRequestRef.current = requestAnimationFrame(() => {
        throttledFitTerminal()
      })
      return true
    }

    try {
      const terminal = terminalInstanceRef.current
      const element = terminal.element

      // 检查终端元素是否存在且有有效尺寸
      if (!element || !element.offsetParent) return false

      const containerRect = terminalRef.current?.getBoundingClientRect()
      if (!containerRect || containerRect.width === 0 || containerRect.height === 0) {
        return false
      }

      // 执行实际的 fit 操作
      fitAddonRef.current.fit()
      lastResizeTimeRef.current = now

      // 通知SSH调整终端尺寸
      if (currentSessionId && isShellActive) {
        const { cols, rows } = terminalInstanceRef.current
        SSHService.resizeShell(currentSessionId, cols, rows)
      }

      return true
    } catch (error) {
      console.warn('Terminal fit error:', error)
      return false
    }
  }, [currentSessionId, isShellActive])

  // 初始化终端（仅挂载时执行，不输出欢迎信息，避免重复）
  useEffect(() => {
    if (!terminalRef.current) return

    // 获取终端初始配置
    const terminalConfig = config?.terminal || {
      fontSize: 14
    }

    // 初始主题
    const terminalTheme = isDark
      ? {
          background: '#0f172a', // slate-900
          foreground: '#e2e8f0', // slate-200
          cursor: '#f1f5f9', // slate-100
          black: '#1e293b', // slate-800
          red: '#ef4444', // red-500
          green: '#22c55e', // green-500
          yellow: '#eab308', // yellow-500
          blue: '#3b82f6', // blue-500
          magenta: '#a855f7', // purple-500
          cyan: '#06b6d4', // cyan-500
          white: '#cbd5e1', // slate-300
          brightBlack: '#64748b', // slate-500
          brightRed: '#f87171', // red-400
          brightGreen: '#4ade80', // green-400
          brightYellow: '#facc15', // yellow-400
          brightBlue: '#60a5fa', // blue-400
          brightMagenta: '#c084fc', // purple-400
          brightCyan: '#22d3ee', // cyan-400
          brightWhite: '#f1f5f9' // slate-100
        }
      : {
          background: '#ffffff',
          foreground: '#1e293b', // slate-800
          cursor: '#475569', // slate-600
          black: '#1e293b',
          red: '#dc2626', // red-600
          green: '#16a34a', // green-600
          yellow: '#ca8a04', // yellow-600
          blue: '#2563eb', // blue-600
          magenta: '#9333ea', // purple-600
          cyan: '#0891b2', // cyan-600
          white: '#475569', // slate-600
          brightBlack: '#64748b', // slate-500
          brightRed: '#ef4444', // red-500
          brightGreen: '#22c55e', // green-500
          brightYellow: '#eab308', // yellow-500
          brightBlue: '#3b82f6' // blue-500
        }

    const terminal = new Terminal({
      theme: terminalTheme,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "DejaVu Sans Mono", "Courier New", monospace',
      fontSize: terminalConfig.fontSize,
      lineHeight: 1.2,
      rows: 30,
      cols: 100,
      cursorBlink: true,
      convertEol: true,
      allowTransparency: false,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    // 打开终端
    terminal.open(terminalRef.current)

    terminalInstanceRef.current = terminal
    fitAddonRef.current = fitAddon

    // 处理用户输入 - 使用 ref 防止闭包拿到旧值
    onDataDisposableRef.current = terminal.onData((data) => {
      if (currentSessionIdRef.current && isShellActiveRef.current) {
        SSHService.writeToShell(currentSessionIdRef.current, data)
      }
    })

    // 初始化调整大小
    const rafId = requestAnimationFrame(() => {
      setTimeout(() => {
        if (throttledFitTerminal()) {
          setIsTerminalReady(true)
        }
      }, 50)
    })

    // 初始化欢迎信息（仅此处一次）
    terminalInstanceRef.current.clear()
    terminal.writeln(`ASH Terminal - SSH客户端`)
    terminal.writeln(`请选择一个会话进行连接...`)

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      setIsTerminalReady(false)
      if (onDataDisposableRef.current) {
        try {
          onDataDisposableRef.current.dispose()
        } catch (error) {
          console.warn('Terminal onData dispose error:', error)
        }
        onDataDisposableRef.current = null
      }
      if (terminal) {
        try {
          terminal.dispose()
        } catch (error) {
          console.warn('Terminal dispose error:', error)
        }
      }
      terminalInstanceRef.current = null
      fitAddonRef.current = null
    }
  }, [])

  // 同步 ref 以避免 onData 使用旧的闭包数据
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    isShellActiveRef.current = isShellActive
  }, [isShellActive])

  // 主题/字体变化时，仅更新终端选项，不重建实例，避免欢迎信息重复
  useEffect(() => {
    if (!terminalInstanceRef.current) return

    const terminalConfig = config?.terminal || {
      fontSize: 14
    }

    const terminalTheme = isDark
      ? {
          background: '#0f172a',
          foreground: '#e2e8f0',
          cursor: '#f1f5f9',
          black: '#1e293b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#cbd5e1',
          brightBlack: '#64748b',
          brightRed: '#f87171',
          brightGreen: '#4ade80',
          brightYellow: '#facc15',
          brightBlue: '#60a5fa',
          brightMagenta: '#c084fc',
          brightCyan: '#22d3ee',
          brightWhite: '#f1f5f9'
        }
      : {
          background: '#ffffff',
          foreground: '#1e293b',
          cursor: '#475569',
          black: '#1e293b',
          red: '#dc2626',
          green: '#16a34a',
          yellow: '#ca8a04',
          blue: '#2563eb',
          magenta: '#9333ea',
          cyan: '#0891b2',
          white: '#475569',
          brightBlack: '#64748b',
          brightRed: '#ef4444',
          brightGreen: '#22c55e',
          brightYellow: '#eab308',
          brightBlue: '#3b82f6',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#1e293b'
        }

    try {
      terminalInstanceRef.current.options.theme = terminalTheme as any
      terminalInstanceRef.current.options.fontFamily =
        'Monaco, Menlo, "Ubuntu Mono", "DejaVu Sans Mono", "Courier New", monospace'
      terminalInstanceRef.current.options.fontSize = terminalConfig.fontSize as number
      // 字体或主题变化后适配尺寸
      throttledFitTerminal()
    } catch (e) {
      console.warn('Update terminal options error:', e)
    }
  }, [isDark, config?.terminal?.fontSize, throttledFitTerminal])

  // 创建交互式Shell
  const createShell = useCallback(async (): Promise<void> => {
    if (!currentSessionId || !terminalInstanceRef.current) return

    try {
      await SSHService.createInteractiveShell(currentSessionId)
      setIsShellActive(true)

      // 设置Shell数据监听
      const dataCleanup = SSHService.onShellData(currentSessionId, (data) => {
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write(data)
        }
      })
      shellDataCleanupRef.current = dataCleanup

      // 设置Shell关闭监听
      const closeCleanup = SSHService.onShellClose(currentSessionId, () => {
        setIsShellActive(false)
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\r\nShell连接已关闭`)
        }
      })
      shellCloseCleanupRef.current = closeCleanup

      // 设置Shell错误监听
      const errorCleanup = SSHService.onShellError(currentSessionId, (error) => {
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\r\n\x1b[31mShell错误: ${error}\x1b[0m`)
        }
      })
      shellErrorCleanupRef.current = errorCleanup
    } catch (error) {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.writeln(`\x1b[31m创建Shell失败: ${error}\x1b[0m`)
      }
    }
  }, [currentSessionId])

  // 清理Shell监听器
  const cleanupShellListeners = useCallback((): void => {
    if (shellDataCleanupRef.current) {
      shellDataCleanupRef.current()
      shellDataCleanupRef.current = null
    }
    if (shellCloseCleanupRef.current) {
      shellCloseCleanupRef.current()
      shellCloseCleanupRef.current = null
    }
    if (shellErrorCleanupRef.current) {
      shellErrorCleanupRef.current()
      shellErrorCleanupRef.current = null
    }
  }, [])

  // 当会话连接时创建Shell
  useEffect(() => {
    if (currentSessionId && sshConnected && terminalInstanceRef.current) {
      // 清理之前的监听器
      cleanupShellListeners()

      // 清空终端并显示连接信息
      terminalInstanceRef.current.clear()
      terminalInstanceRef.current.writeln(`已连接到会话：${currentSessionName}`)
      terminalInstanceRef.current.writeln(`正在创建交互式Shell...`)

      // 创建交互式Shell
      createShell()
    } else if (!sshConnected && terminalInstanceRef.current) {
      // 断开连接时清理
      cleanupShellListeners()
      setIsShellActive(false)

      // 仅在曾经连接过后再显示欢迎信息，避免与初始化重复
      if (prevConnectedRef.current === true) {
        terminalInstanceRef.current.clear()
        terminalInstanceRef.current.writeln(`ASH Terminal - SSH客户端`)
        terminalInstanceRef.current.writeln(`请选择一个会话进行连接...`)
      }
    }

    return () => {
      cleanupShellListeners()
    }
  }, [currentSessionId, sshConnected, currentSessionName, createShell, cleanupShellListeners])

  // 跟踪连接状态，用于控制断开时是否打印欢迎信息
  useEffect(() => {
    prevConnectedRef.current = sshConnected
  }, [sshConnected])

  // 监听容器大小变化并调整终端大小
  useEffect(() => {
    if (!containerRef.current || !isTerminalReady) return

    const resizeTimeoutId: NodeJS.Timeout | null = null
    let lastWidth = 0
    let lastHeight = 0

    const handleResize = (entries?: ResizeObserverEntry[]): void => {
      // 获取当前尺寸
      let currentWidth = 0
      let currentHeight = 0

      if (entries && entries[0]) {
        const { width, height } = entries[0].contentRect
        currentWidth = width
        currentHeight = height
      } else {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          currentWidth = rect.width
          currentHeight = rect.height
        }
      }

      // 只有当尺寸真正改变时才进行调整
      if (Math.abs(currentWidth - lastWidth) < 2 && Math.abs(currentHeight - lastHeight) < 2) {
        return
      }

      lastWidth = currentWidth
      lastHeight = currentHeight
      // 在变更过程中以 ~60fps 节流执行 fit
      throttledFitTerminal()
      // 变更结束后再做一次最终 fit，保证精确对齐
      if (finalResizeTimeoutRef.current) clearTimeout(finalResizeTimeoutRef.current)
      finalResizeTimeoutRef.current = setTimeout(() => {
        throttledFitTerminal()
      }, 120)
    }

    const resizeObserver = new ResizeObserver((entries) => {
      handleResize(entries)
    })
    resizeObserver.observe(containerRef.current)

    const windowResizeHandler = (): void => handleResize()
    window.addEventListener('resize', windowResizeHandler, { passive: true })

    // 某些浏览器/系统在拖拽窗口时用 visualViewport 提供更及时的回调
    const vv = (window as any).visualViewport as VisualViewport | undefined
    const viewportResizeHandler = (): void => handleResize()
    vv?.addEventListener('resize', viewportResizeHandler, { passive: true } as any)

    // 容器宽高过渡结束时再执行一次最终 fit，避免过渡中测量不准
    const transitionEndHandler = (e: TransitionEvent): void => {
      if (!containerRef.current) return
      // 仅在尺寸相关过渡结束时处理
      if (
        e.propertyName === 'width' ||
        e.propertyName === 'height' ||
        e.propertyName === 'flex' ||
        e.propertyName === 'max-width' ||
        e.propertyName === 'max-height'
      ) {
        throttledFitTerminal()
      }
    }
    containerRef.current.addEventListener('transitionend', transitionEndHandler)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', windowResizeHandler)
      vv?.removeEventListener('resize', viewportResizeHandler as any)
      containerRef.current?.removeEventListener('transitionend', transitionEndHandler)
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId)
      }
      if (finalResizeTimeoutRef.current) {
        clearTimeout(finalResizeTimeoutRef.current)
        finalResizeTimeoutRef.current = null
      }
    }
  }, [isTerminalReady, throttledFitTerminal])

  const handleDisconnect = async (): Promise<void> => {
    if (currentSessionId) {
      try {
        await SSHService.disconnectSSH(currentSessionId)
        setDisconnected()
        setCurrentSessionId(null)
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.clear()
          terminalInstanceRef.current.writeln(`已与 SSH 会话断开连接`)
          terminalInstanceRef.current.writeln('')
        }
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }

  const handleReconnect = async (): Promise<void> => {
    if (currentSessionId) {
      const session = sessions.find((s) => s.id === currentSessionId)
      if (session && terminalInstanceRef.current) {
        try {
          // 清空终端并尝试重连
          terminalInstanceRef.current.clear()
          terminalInstanceRef.current.writeln(`\n尝试重新连接到 ${session.name}...`)

          // 在重连前清理旧的 Shell 监听并标记为未激活，避免期间输入写入不存在的 Shell
          cleanupShellListeners()
          setIsShellActive(false)

          const result = await SSHService.connectSSH(session)
          if (result.success) {
            terminalInstanceRef.current.writeln(`重新连接成功`)
            // 重新创建交互式 Shell（由于连接状态可能未变化，这里主动创建）
            terminalInstanceRef.current.writeln(`正在创建交互式Shell...`)
            await createShell()
          } else {
            terminalInstanceRef.current.writeln(`\x1b[31m重新连接失败: ${result.error}\x1b[0m`)
          }
        } catch (error) {
          console.error('Failed to reconnect:', error)
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 终端工具栏 */}
      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">终端</h3>
          <span
            className={twMerge(
              'text-xs px-2 py-1 rounded-full',
              sshConnected
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : isConnecting
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {sshConnected ? `已连接：${currentSessionName}` : isConnecting ? '连接中...' : '未连接'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {sshConnected && (
            <>
              <button
                onClick={handleReconnect}
                className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                title="重新连接"
              >
                重连
              </button>
              <button
                onClick={handleDisconnect}
                className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="断开连接"
              >
                断开
              </button>
            </>
          )}
          {isConnecting && (
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xs text-blue-600 dark:text-blue-400">正在连接...</span>
            </div>
          )}
        </div>
      </div>

      {/* 终端区域 */}
      <div className="flex-1 relative min-h-0" ref={containerRef}>
        <div
          ref={terminalRef}
          className="h-full w-full"
          style={{
            // 允许随容器收缩，避免在出现 CommandList 时撑高页面
            minHeight: 0,
            // 添加硬件加速，提升渲染性能
            transform: 'translateZ(0)',
            willChange: isTerminalReady ? 'auto' : 'transform'
          }}
        />

        {/* 终端加载指示器 */}
        {!isTerminalReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200">
            <div className="flex items-center space-x-2 text-white">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">正在初始化终端...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
