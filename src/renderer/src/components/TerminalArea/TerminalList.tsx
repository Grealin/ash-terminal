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
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [activeTerminalSessions, setActiveTerminalSessions] = useAtom(activeTerminalSessionsAtom)
  const sessions = useAtomValue(sessionsAtom)
  const isDark = useAtomValue(darkStateAtom)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentPath, setCurrentPath] = useState('~')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [currentCommand, setCurrentCommand] = useState('')

  // 获取当前会话名称
  const currentSessionName =
    sessions.find((session) => session.id === currentSessionId)?.name || '未知会话'

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

    terminal.open(terminalRef.current)
    fitAddon.fit()

    terminalInstanceRef.current = terminal
    fitAddonRef.current = fitAddon

    // 显示欢迎信息
    terminal.writeln('ASH Terminal - SSH 客户端')
    terminal.writeln('连接到会话开始使用...')
    terminal.writeln('')

    // 处理用户输入
    let currentLine = ''
    terminal.onData((data) => {
      if (!isConnected) return

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
      terminal.dispose()
    }
  }, [isConnected, isDark])

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
    if (currentSessionId && terminalInstanceRef.current) {
      setIsConnected(true)
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
    } else {
      setIsConnected(false)
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.clear()
        terminalInstanceRef.current.writeln('ASH Terminal - SSH 客户端')
        terminalInstanceRef.current.writeln('连接到会话开始使用...')
        terminalInstanceRef.current.writeln('')
      }
    }
  }, [currentSessionId])

  // 窗口大小变化时调整终端大小
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleDisconnect = async () => {
    if (currentSessionId) {
      try {
        await SSHService.disconnectSSH(currentSessionId)
        setIsConnected(false)
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
              isConnected
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {isConnected ? `已连接：${currentSessionName}` : '未连接'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isConnected && (
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
        </div>
      </div>

      {/* 终端区域 */}
      <div className="flex-1">
        <div ref={terminalRef} className="h-full w-full" style={{ minHeight: '400px' }} />
      </div>
    </div>
  )
}
