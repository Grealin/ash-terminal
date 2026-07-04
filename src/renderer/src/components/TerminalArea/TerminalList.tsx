import { Icon } from '@/components/Icon'
import { useConfig, useSSHConnection, useToast } from '@/hooks'
import { AIService, SSHService } from '@/services'
import { currentSessionIdAtom, darkStateAtom, sessionsAtom } from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
        'flex-[2] min-h-0 overflow-hidden border-b border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const TerminalListContent: React.FC = () => {
  const toast = useToast()
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const sessions = useAtomValue(sessionsAtom)
  const isDark = useAtomValue(darkStateAtom)
  const { config } = useConfig()
  const {
    setConnected,
    setConnecting,
    setDisconnected,
    isConnecting,
    isConnected: sshConnected
  } = useSSHConnection()

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
  const shellDataCleanupRef = useRef<(() => void) | null>(null)
  const shellCloseCleanupRef = useRef<(() => void) | null>(null)
  const shellErrorCleanupRef = useRef<(() => void) | null>(null)

  // 用于优化尺寸调整的状态
  const resizeRequestRef = useRef<number | null>(null)
  const lastResizeTimeRef = useRef<number>(0)
  const finalResizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 用于存储清理函数的 ref
  const cleanupRef = useRef<(() => void) | null>(null)

  // 获取当前会话名称
  const currentSessionName =
    sessions.find((session) => session.id === currentSessionId)?.name || '未知会话'

  // 终端主题配置 - 使用 useMemo 缓存避免重复创建
  const terminalTheme = useMemo(
    () =>
      isDark
        ? {
            background: '#16181D',
            foreground: '#ECEEF0',
            cursor: '#ECEEF0',
            selectionBackground: 'rgba(236, 238, 240, 0.25)',
            selectionForeground: '#16181D',
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
            background: '#FFFFFF',
            foreground: '#1A1D23',
            cursor: '#1A1D23',
            selectionBackground: 'rgba(26, 29, 35, 0.2)',
            selectionForeground: '#ffffff',
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
            brightBlue: '#3b82f6', // blue-500
            brightMagenta: '#a855f7', // purple-500
            brightCyan: '#06b6d4', // cyan-500
            brightWhite: '#1e293b' // slate-800
          },
    [isDark]
  )

  // 终端字体大小配置
  const terminalFontSize = useMemo(
    () => config?.terminal?.fontSize ?? 14,
    [config?.terminal?.fontSize]
  )

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

      const containerRect = element.getBoundingClientRect()
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

  // 使用 callback ref 初始化终端 - 当 DOM 元素挂载/卸载时自动调用
  const terminalRef = useCallback(
    (element: HTMLDivElement | null) => {
      // 元素卸载时执行清理
      if (!element) {
        if (cleanupRef.current) {
          cleanupRef.current()
          cleanupRef.current = null
        }
        return
      }

      // 如果已经初始化过，跳过
      if (terminalInstanceRef.current) return

      // 用于清理的标志位
      let isDisposed = false
      let rafId: number | null = null
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const terminal = new Terminal({
        theme: terminalTheme,
        fontSize: terminalFontSize,
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
      terminal.open(element)

      terminalInstanceRef.current = terminal
      fitAddonRef.current = fitAddon

      // 处理用户输入 - 使用 ref 防止闭包拿到旧值
      onDataDisposableRef.current = terminal.onData((data) => {
        if (currentSessionIdRef.current && isShellActiveRef.current) {
          SSHService.writeToShell(currentSessionIdRef.current, data)
        }
      })

      // 处理键盘快捷键（仅处理 xterm.js 未内置的功能）
      terminal.attachCustomKeyEventHandler((event: KeyboardEvent) => {
        // Ctrl+Shift+C: 复制选中的文本（xterm.js 可能已内置，但这里显式处理以确保兼容性）
        if (event.ctrlKey && event.shiftKey && event.key === 'C') {
          const selection = terminal.getSelection()
          if (selection) {
            navigator.clipboard.writeText(selection).catch((err) => {
              console.warn('Failed to copy to clipboard:', err)
            })
          }
          return false // 阻止事件传播
        }

        // 注意：Ctrl+Shift+V 粘贴功能由 xterm.js 内置支持，无需自定义处理

        // Ctrl+Shift+A: 全选终端内容（xterm.js 未内置此功能）
        if (event.ctrlKey && event.shiftKey && event.key === 'A') {
          terminal.selectAll()
          return false // 阻止事件传播
        }

        // 允许其他按键正常处理（包括 xterm.js 内置的 Ctrl+Shift+V 粘贴）
        return true
      })

      // 初始化调整大小
      rafId = requestAnimationFrame(() => {
        if (isDisposed) return
        timeoutId = setTimeout(() => {
          if (isDisposed) return
          if (throttledFitTerminal()) {
            setIsTerminalReady(true)
          }
        }, 50)
      })

      // 初始化欢迎信息
      showWelcomeMessage()

      // 存储清理函数
      cleanupRef.current = () => {
        isDisposed = true

        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
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

        try {
          terminal.dispose()
        } catch (error) {
          console.warn('Terminal dispose error:', error)
        }

        terminalInstanceRef.current = null
        fitAddonRef.current = null
      }
    },
    // 依赖初始主题和字体大小，后续变化由单独的 useEffect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // 同步 ref 以避免 onData 使用旧的闭包数据
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  useEffect(() => {
    isShellActiveRef.current = isShellActive
  }, [isShellActive])

  // 主题/字体变化时，仅更新终端选项，不重建实例，避免欢迎信息重复
  useEffect(() => {
    const terminal = terminalInstanceRef.current
    if (!terminal) return

    try {
      terminal.options.theme = terminalTheme
      terminal.options.fontSize = terminalFontSize
      // 字体或主题变化后适配尺寸
      throttledFitTerminal()
    } catch (e) {
      console.warn('Update terminal options error:', e)
    }
  }, [terminalTheme, terminalFontSize, throttledFitTerminal])

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

  // 显示终端欢迎信息（未连接状态）
  const showWelcomeMessage = useCallback((prefix?: string): void => {
    const terminal = terminalInstanceRef.current
    if (!terminal) return
    terminal.clear()
    // xterm.js 的 clear() 会保留当前光标行的内容并提升为第一行，
    // 需通过 ANSI 转义序列清除该行并将光标移至行首
    terminal.write('\x1b[2K\r')
    if (prefix) {
      terminal.writeln(prefix)
      terminal.writeln('')
    }
    terminal.writeln('ASH Terminal - SSH客户端')
    terminal.writeln('请选择一个会话进行连接...')
  }, [])

  // 当会话连接时创建Shell
  useEffect(() => {
    if (currentSessionId && terminalInstanceRef.current) {
      // 清理之前的监听器
      cleanupShellListeners()

      // 清空终端并显示连接信息
      terminalInstanceRef.current.clear()
      terminalInstanceRef.current.writeln(`已连接到会话：${currentSessionName}`)

      // 创建交互式Shell
      createShell()
    } else if (!currentSessionId && terminalInstanceRef.current) {
      // 断开连接时清理
      cleanupShellListeners()
      setIsShellActive(false)
    }

    return () => {
      cleanupShellListeners()
    }
  }, [currentSessionId, currentSessionName, createShell, cleanupShellListeners])

  // 监听容器大小变化并调整终端大小
  useEffect(() => {
    // 在 effect 开始时捕获 ref 值，确保清理函数使用相同的引用
    const container = containerRef.current
    if (!container || !isTerminalReady) return

    const resizeTimeoutId: ReturnType<typeof setTimeout> | null = null
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
        const rect = container.getBoundingClientRect()
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
    resizeObserver.observe(container)

    const windowResizeHandler = (): void => handleResize()
    window.addEventListener('resize', windowResizeHandler, { passive: true })

    // 某些浏览器/系统在拖拽窗口时用 visualViewport 提供更及时的回调
    const vv = (window as any).visualViewport as VisualViewport | undefined
    const viewportResizeHandler = (): void => handleResize()
    vv?.addEventListener('resize', viewportResizeHandler, { passive: true } as any)

    // 容器宽高过渡结束时再执行一次最终 fit，避免过渡中测量不准
    const transitionEndHandler = (e: TransitionEvent): void => {
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
    container.addEventListener('transitionend', transitionEndHandler)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', windowResizeHandler)
      vv?.removeEventListener('resize', viewportResizeHandler as any)
      // 使用捕获的 container 变量，确保移除正确元素上的监听器
      container.removeEventListener('transitionend', transitionEndHandler)
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
        // 先关闭 AI 会话，清理 Agent 和任务资源
        await AIService.closeTaskSession(currentSessionId)
        // 再断开 SSH 连接
        await SSHService.disconnectSSH(currentSessionId)

        // 立即清理 Shell 监听器，防止残留数据在终端重置后写入
        cleanupShellListeners()
        setIsShellActive(false)

        setDisconnected()
        setCurrentSessionId(null)
        toast.simple('连接已断开', { type: 'success' })
        showWelcomeMessage()
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
          toast.simple(`正在重新连接到 ${session.name}...`, { type: 'info' })

          // 在重连前清理 AI 会话和旧的 Shell 监听
          await AIService.closeTaskSession(currentSessionId)
          await SSHService.disconnectSSH(currentSessionId)
          cleanupShellListeners()
          setIsShellActive(false)
          setConnecting()

          const result = await SSHService.connectSSH(session)
          if (result.success) {
            setConnected()
            terminalInstanceRef.current.writeln(`重新连接成功`)
            await createShell()
          } else {
            setDisconnected()
            setCurrentSessionId(null)
            toast.simple(`重新连接失败: ${result.error}`, { type: 'error' })
            showWelcomeMessage(`\x1b[31m重新连接失败: ${result.error}\x1b[0m`)
          }
        } catch (error) {
          setDisconnected()
          setCurrentSessionId(null)
          toast.simple('重新连接时发生未知错误', { type: 'error' })
          showWelcomeMessage()
          console.error('Failed to reconnect:', error)
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 终端工具栏 */}
      <div className="flex items-center justify-between h-9 px-3 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)]">
        <div className="flex items-center space-x-2">
          <h3 className="text-[13px] font-medium text-[var(--color-text-primary)]">终端</h3>
          <span
            className={twMerge(
              'text-[11px] px-2 py-0.5 rounded-[var(--radius-full)]',
              sshConnected
                ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
                : isConnecting
                  ? 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)]'
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
                className="px-2 py-0.5 text-[11px] bg-[var(--ash-accent)] hover:opacity-90 text-white rounded-[var(--radius-md)] transition-colors"
                title="重新连接"
              >
                重连
              </button>
              <button
                onClick={handleDisconnect}
                className="px-2 py-0.5 text-[11px] bg-[var(--ash-accent)] hover:opacity-90 text-white rounded-[var(--radius-md)] transition-colors"
                title="断开连接"
              >
                断开
              </button>
            </>
          )}
          {isConnecting && (
            <div className="flex items-center space-x-2">
              <Icon name="loader-2" size="sm" className="animate-spin text-[var(--ash-accent)]" />
              <span className="text-[11px] text-[var(--color-text-secondary)]">正在连接...</span>
            </div>
          )}
        </div>
      </div>

      {/* 终端区域 */}
      <div
        className="flex-1 relative min-h-0 xterm-text-selectable bg-[var(--color-terminal-bg)]"
        ref={containerRef}
      >
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
              <Icon name="loader-2" size="md" className="animate-spin" />
              <span className="text-sm">正在初始化终端...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
