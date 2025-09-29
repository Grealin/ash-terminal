import { useSSHConnection } from '@/hooks'
import {
  SSHService,
  activeTerminalSessionsAtom,
  currentSessionIdAtom,
  sessionsAtom
} from '@/services'
import { darkStateAtom } from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

export const TerminalListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={twMerge('flex-2', className)} {...props}>
      {children}
    </div>
  )
}

export const TerminalListContent: React.FC = () => {
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const [activeTerminalSessions, setActiveTerminalSessions] = useAtom(activeTerminalSessionsAtom)
  const sessions = useAtomValue(sessionsAtom)
  const isDark = useAtomValue(darkStateAtom)
  const {
    connectionStatus,
    setDisconnected,
    isConnecting,
    isConnected: sshConnected
  } = useSSHConnection()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [currentPath, setCurrentPath] = useState('~')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentCommand, setCurrentCommand] = useState('')
  const [isTerminalReady, setIsTerminalReady] = useState(false)

  // 用于优化尺寸调整的状态
  const resizeRequestRef = useRef<number | null>(null)
  const lastResizeTimeRef = useRef<number>(0)

  // 获取当前会话名称
  const currentSessionName =
    sessions.find((session) => session.id === currentSessionId)?.name || '未知会话'

  // 高性能的节流 fit 方法
  const throttledFitTerminal = useRef<() => boolean>(() => false)

  throttledFitTerminal.current = () => {
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
        throttledFitTerminal.current?.()
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

      return true
    } catch (error) {
      console.warn('Terminal fit error:', error)
      return false
    }
  }

  // 安全调用 fit 方法的辅助函数
  const safeFitTerminal = () => {
    return throttledFitTerminal.current?.() || false
  }

  // 初始化终端
  useEffect(() => {
    if (!terminalRef.current) return

    // 根据主题状态设置终端配色
    const terminalTheme = isDark
      ? {
          background: '#111827', // gray-900
          foreground: '#f9fafb', // gray-50
          cursor: '#f9fafb',
          black: '#000000',
          red: '#ef4444', // red-500
          green: '#10b981', // emerald-500
          yellow: '#f59e0b', // amber-500
          blue: '#3b82f6', // blue-500
          magenta: '#8b5cf6', // violet-500
          cyan: '#06b6d4', // cyan-500
          white: '#e5e7eb', // gray-200
          brightBlack: '#6b7280', // gray-500
          brightRed: '#f87171', // red-400
          brightGreen: '#34d399', // emerald-400
          brightYellow: '#fbbf24', // amber-400
          brightBlue: '#60a5fa', // blue-400
          brightMagenta: '#a78bfa', // violet-400
          brightCyan: '#22d3ee', // cyan-400
          brightWhite: '#f3f4f6' // gray-100
        }
      : {
          background: '#111827',
          foreground: '#ffffff',
          cursor: '#ffffff',
          black: '#000000',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#bd93f9',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#bfbfbf',
          brightBlack: '#4d4d4d',
          brightRed: '#ff6e67',
          brightGreen: '#5af78e',
          brightYellow: '#f4f99d',
          brightBlue: '#caa9fa',
          brightMagenta: '#ff92d0',
          brightCyan: '#9aedfe',
          brightWhite: '#e6e6e6'
        }

    const terminal = new Terminal({
      theme: terminalTheme,
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      rows: 30,
      cols: 100,
      cursorBlink: true,
      convertEol: true
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    // 确保容器已渲染后再打开终端
    terminal.open(terminalRef.current)

    terminalInstanceRef.current = terminal
    fitAddonRef.current = fitAddon

    // 使用 requestAnimationFrame 来确保在下一帧进行初始化，更流畅
    let timeoutId: NodeJS.Timeout | null = null
    let rafId: number | null = null

    rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => {
        if (safeFitTerminal()) {
          setIsTerminalReady(true)
        } else {
          // 如果首次失败，使用更快的重试间隔
          let retryCount = 0
          const retryFit = () => {
            if (retryCount < 5 && !safeFitTerminal()) {
              retryCount++
              // 使用 requestAnimationFrame 进行重试，确保与浏览器刷新率同步
              requestAnimationFrame(() => {
                setTimeout(retryFit, 50)
              })
            } else {
              setIsTerminalReady(true)
            }
          }
          retryFit()
        }
      }, 50) // 减少初始延迟
    })

    // 显示欢迎信息
    terminal.writeln('ASH Terminal - SSH 客户端')
    terminal.writeln('连接到会话开始使用...')
    terminal.writeln('')

    // 处理用户输入
    let currentLine = ''
    terminal.onData((data) => {
      if (!sshConnected) return

      const char = data.charCodeAt(0)

      if (char === 13) {
        // Enter
        if (currentLine.trim()) {
          // 添加到命令历史
          setCommandHistory((prev) => [...prev, currentLine.trim()])
          setHistoryIndex(-1)

          // 执行命令
          executeCommand(currentLine.trim())
          currentLine = ''
        }
        terminal.write('\r\n')
        showPrompt()
      } else if (char === 127 || char === 8) {
        // Backspace/Delete
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          terminal.write('\b \b')
        }
      } else if (char === 27) {
        // Escape sequences (arrows)
        // 处理方向键等
        handleEscapeSequence(data)
      } else if (char >= 32) {
        // Printable characters
        currentLine += data
        terminal.write(data)
      }
    })

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setIsTerminalReady(false)
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
  }, [sshConnected, isDark])

  // 处理方向键
  const handleEscapeSequence = (data: string) => {
    if (data === '\u001b[A') {
      // Up arrow
      if (historyIndex < commandHistory.length - 1) {
        setHistoryIndex((prev) => prev + 1)
        const command = commandHistory[commandHistory.length - 1 - (historyIndex + 1)]
        if (command && terminalInstanceRef.current) {
          // 清除当前行并显示历史命令
          terminalInstanceRef.current.write('\r\x1b[K')
          showPrompt()
          terminalInstanceRef.current.write(command)
          setCurrentCommand(command)
        }
      }
    } else if (data === '\u001b[B') {
      // Down arrow
      if (historyIndex > 0) {
        setHistoryIndex((prev) => prev - 1)
        const command = commandHistory[commandHistory.length - 1 - (historyIndex - 1)]
        if (command && terminalInstanceRef.current) {
          terminalInstanceRef.current.write('\r\x1b[K')
          showPrompt()
          terminalInstanceRef.current.write(command)
          setCurrentCommand(command)
        }
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write('\r\x1b[K')
          showPrompt()
        }
        setCurrentCommand('')
      }
    }
  }

  // 显示命令提示符
  const showPrompt = () => {
    if (terminalInstanceRef.current) {
      const prompt = `\x1b[32m${currentPath}\x1b[0m $ `
      terminalInstanceRef.current.write(prompt)
    }
  }

  // 执行SSH命令
  const executeCommand = async (command: string) => {
    if (!currentSessionId || !terminalInstanceRef.current) return

    try {
      const result = await SSHService.executeCommand(currentSessionId, command)

      // 输出结果
      if (result.stdout) {
        terminalInstanceRef.current.writeln(result.stdout)
      }
      if (result.stderr) {
        terminalInstanceRef.current.writeln(`\x1b[31m${result.stderr}\x1b[0m`)
      }

      // 如果是cd命令，更新当前路径
      if (command.startsWith('cd ') || command === 'cd') {
        const pathResult = await SSHService.executeCommand(currentSessionId, 'pwd')
        if (pathResult.stdout) {
          setCurrentPath(pathResult.stdout.trim())
        }
      }
    } catch (error) {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.writeln(`\x1b[31mError: ${error}\x1b[0m`)
      }
    }
  }

  // 当会话连接时初始化终端
  useEffect(() => {
    if (currentSessionId && terminalInstanceRef.current && sshConnected) {
      terminalInstanceRef.current.clear()
      terminalInstanceRef.current.writeln(`已连接到会话：${currentSessionId}`)
      terminalInstanceRef.current.writeln('') // 获取初始路径
      SSHService.executeCommand(currentSessionId, 'pwd')
        .then((result) => {
          if (result.stdout) {
            setCurrentPath(result.stdout.trim())
            showPrompt()
          }
        })
        .catch(() => {
          setCurrentPath('~')
          showPrompt()
        })
    } else if (!sshConnected && terminalInstanceRef.current) {
      terminalInstanceRef.current.clear()
      terminalInstanceRef.current.writeln('ASH Terminal - SSH 客户端')
      terminalInstanceRef.current.writeln('连接到会话开始使用...')
      terminalInstanceRef.current.writeln('')
    }
  }, [currentSessionId, sshConnected])

  // 监听容器大小变化并调整终端大小
  useEffect(() => {
    if (!terminalRef.current || !isTerminalReady) return

    let resizeTimeoutId: NodeJS.Timeout | null = null
    let lastWidth = 0
    let lastHeight = 0

    const handleResize = (entries?: ResizeObserverEntry[]) => {
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId)
      }

      // 获取当前尺寸
      let currentWidth = 0
      let currentHeight = 0

      if (entries && entries[0]) {
        // 从 ResizeObserver 获取尺寸
        const { width, height } = entries[0].contentRect
        currentWidth = width
        currentHeight = height
      } else {
        // 从元素获取尺寸（window resize 事件）
        const rect = terminalRef.current?.getBoundingClientRect()
        if (rect) {
          currentWidth = rect.width
          currentHeight = rect.height
        }
      }

      // 只有当尺寸真正改变时才进行调整，避免不必要的重绘
      if (Math.abs(currentWidth - lastWidth) < 2 && Math.abs(currentHeight - lastHeight) < 2) {
        return
      }

      lastWidth = currentWidth
      lastHeight = currentHeight

      // 减少防抖延迟，使调整更响应
      resizeTimeoutId = setTimeout(() => {
        safeFitTerminal()
      }, 16) // 约一帧的时间（60fps）
    }

    // 使用 ResizeObserver 监听容器大小变化（更精确且更平滑）
    const resizeObserver = new ResizeObserver((entries) => {
      handleResize(entries)
    })
    resizeObserver.observe(terminalRef.current)

    // 同时监听窗口大小变化作为备用
    const windowResizeHandler = () => handleResize()
    window.addEventListener('resize', windowResizeHandler, { passive: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', windowResizeHandler)
      if (resizeTimeoutId) {
        clearTimeout(resizeTimeoutId)
      }
    }
  }, [isTerminalReady])

  const handleDisconnect = async () => {
    if (currentSessionId) {
      try {
        await SSHService.disconnectSSH(currentSessionId)
        setDisconnected()
        setCurrentSessionId(null)
        setCurrentPath('~')
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.clear()
          terminalInstanceRef.current.writeln('已与 SSH 会话断开连接')
          terminalInstanceRef.current.writeln('')
        }
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
    }
  }

  const handleReconnect = async () => {
    if (currentSessionId && terminalInstanceRef.current) {
      try {
        // 这里需要获取会话配置并重新连接
        // 暂时显示重连消息
        terminalInstanceRef.current.writeln('尝试重新连接...')
        // TODO: 实现重连逻辑
      } catch (error) {
        console.error('Failed to reconnect:', error)
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
      <div className="flex-1 relative">
        <div
          ref={terminalRef}
          className="h-full w-full transition-all duration-75 ease-out"
          style={{
            minHeight: '400px',
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
