import icon from '@/assets/images/icon.png'
import { useDarkTheme } from '@renderer/hooks'
import { ComponentProps, useEffect, useState } from 'react'

export const DraggableTopBar: React.FC<ComponentProps<'header'>> = () => {
  const { isDark, toggleTheme } = useDarkTheme()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // 获取初始窗口状态
    const getInitialState = async () => {
      const maximized = await window.electron.isWindowMaximized()
      setIsMaximized(maximized)
    }
    getInitialState()

    // 监听窗口状态变化
    const unsubscribe = window.electron.onWindowMaximizeChanged(setIsMaximized)

    return unsubscribe
  }, [])

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm p-0 dark:bg-slate-900/80 dark:border-slate-700/60">
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center space-x-1">
          {/* 应用图标 */}
          <div className="flex items-center justify-center px-3">
            <img src={icon} alt="ASH Terminal Icon" className="w-5 h-5" />
          </div>

          {/* 选项按钮 */}
          <button className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded transition-all duration-150 dark:text-slate-300 dark:hover:bg-slate-800/50">
            会话
          </button>
          <button className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded transition-all duration-150 dark:text-slate-300 dark:hover:bg-slate-800/50">
            编辑
          </button>
          <button className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded transition-all duration-150 dark:text-slate-300 dark:hover:bg-slate-800/50">
            搜索
          </button>
          <button className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded transition-all duration-150 dark:text-slate-300 dark:hover:bg-slate-800/50">
            查看
          </button>
          <button className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded transition-all duration-150 dark:text-slate-300 dark:hover:bg-slate-800/50">
            布局
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {/* 主题切换按钮 */}
          <button
            className="w-8 h-8 rounded-md text-slate-600 hover:text-slate-700 hover:bg-gray-200  transition-all duration-200 flex items-center justify-center group dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-gray-700"
            onClick={toggleTheme}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? (
              // 太阳图标（亮色模式）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // 月亮图标（暗色模式）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          <button
            className="w-8 h-8 rounded-md text-yellow-600 hover:text-yellow-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => window.electron.minimizeFocusedWindow()}
            title="最小化窗口"
          >
            <svg
              className="w-4 h-4 group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            className="w-8 h-8 rounded-md text-green-600 hover:text-green-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => window.electron.toggleMaximizeFocusedWindow()}
            title={isMaximized ? '恢复窗口' : '最大化窗口'}
          >
            {isMaximized ? (
              // 恢复图标（双重方块）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8 2a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2h2a2 2 0 002-2V4a2 2 0 00-2-2H8zm0 2h6v6h-2V6a2 2 0 00-2-2H8V4zm2 4v8H4V8h6z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // 最大化图标（四个角的箭头）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <button
            className="w-8 h-8 mr-3 rounded-md text-red-600 hover:text-red-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => window.electron.closeFocusedWindow()}
            title="关闭窗口"
          >
            <svg
              className="w-4 h-4 group-hover:scale-110 transition-transform"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
