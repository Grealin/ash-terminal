import { Icon } from '@/components/Icon'
import { useCallback, useEffect, useState } from 'react'

interface ToolCallGroupPosition {
  current: number // 1-based index within the group
  total: number // Total cards in this group
}

interface ToolCallCardProps {
  toolName: string
  params: Record<string, unknown>
  result?: unknown
  status: 'calling' | 'completed'
  /** 原始 TOOL 角色消息内容，仅当与解析后的 result 展示不同时才显示 */
  toolMessageContent?: string | null
  /** 外部折叠控制：undefined=内部状态管理，true/false=受控模式 */
  collapsed?: boolean
  /** 位置标签（如 1/3），仅在组内 >1 张卡片时传入 */
  groupPosition?: ToolCallGroupPosition
  /** 是否在左侧显示组连接点 */
  showGroupConnector?: boolean
}

const TOOL_META: Record<string, { icon: string; label: string }> = {
  read_file: { icon: 'file-text', label: '读取文件' },
  create_file: { icon: 'file-plus', label: '创建文件' },
  modify_file: { icon: 'pencil', label: '修改文件' },
  search_files: { icon: 'search', label: '搜索文件' },
  list_directory: { icon: 'folder', label: '浏览目录' },
  execute_command: { icon: 'terminal', label: '执行命令' },
  execute_sudo_command: { icon: 'shield', label: 'Sudo 命令' }
}

function extractKeyParam(name: string, params: Record<string, unknown>): string | null {
  const s = (v: unknown): string => String(v ?? '')
  switch (name) {
    case 'read_file':
      return s(params.file_path) || null
    case 'create_file':
      return s(params.file_path) || null
    case 'modify_file':
      return `${s(params.file_path)} (${s(params.operation)})`
    case 'search_files':
      return `"${s(params.keyword)}" in ${s(params.directory) || '.'}`
    case 'list_directory':
      return s(params.directory) || s(params.path) || '.'
    case 'execute_command':
    case 'execute_sudo_command':
      return (s(params.command) || '').slice(0, 60) || null
    default:
      return null
  }
}

function getResultText(result: unknown): string {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (r.message) return String(r.message)
    if (r.data !== undefined)
      return typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)
    if (r.error) return String(r.error)
    return JSON.stringify(r, null, 2)
  }
  return String(result ?? '')
}

function isResultSuccess(result: unknown): boolean {
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    return r.success !== false
  }
  return true
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolName,
  params,
  result,
  status,
  toolMessageContent,
  collapsed: controlledCollapsed,
  groupPosition,
  showGroupConnector
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [userToggled, setUserToggled] = useState(false)
  const [copiedTarget, setCopiedTarget] = useState<string | null>(null)

  const handleCopy = useCallback((text: string, target: string): void => {
    navigator.clipboard.writeText(text).catch(() => {
      // 回退方案：创建临时 textarea
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopiedTarget(target)
    setTimeout(() => setCopiedTarget(null), 1500)
  }, [])

  // 外部 collapsed 值变化时重置用户手动切换
  useEffect(() => {
    setUserToggled(false)
  }, [controlledCollapsed])

  // 计算实际展开状态
  const isExpanded = userToggled
    ? internalExpanded
    : controlledCollapsed !== undefined
      ? !controlledCollapsed
      : internalExpanded

  const handleToggle = (): void => {
    if (controlledCollapsed !== undefined) {
      // 受控模式：记录用户手动切换
      setUserToggled(true)
      setInternalExpanded(!isExpanded)
    } else {
      // 非受控模式：原有行为
      setInternalExpanded(!internalExpanded)
    }
  }

  const meta = TOOL_META[toolName] ?? { icon: 'zap', label: toolName }
  const keyParam = extractKeyParam(toolName, params)
  const success = status === 'completed' ? isResultSuccess(result) : null
  const resultText = result !== undefined ? getResultText(result) : null

  // "原始输出"仅在有效且与格式化 result 展示不重复时显示
  const showToolMessageContent: boolean =
    toolMessageContent != null && toolMessageContent.length > 0 && toolMessageContent !== resultText

  const borderColor =
    status === 'calling'
      ? 'border-l-[var(--ash-accent)]'
      : success
        ? 'border-l-[var(--color-success)]'
        : 'border-l-[var(--color-error)]'

  return (
    <div className="flex justify-start mb-1.5 animate-[fadeIn_200ms_ease-out] relative">
      {/* 组连接点 — 定位在 ToolCallGroup 的垂直连接线上 */}
      {showGroupConnector && (
        <div className="absolute -left-[17px] top-[14px] w-[6px] h-[6px] rounded-full bg-[var(--color-border-primary)]" />
      )}

      <div
        className={`w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] border-l-[2px] transition-colors duration-500 ${borderColor}`}
      >
        {/* 头部 — 始终可见 */}
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5 w-full text-left"
        >
          <Icon
            name={meta.icon}
            size="sm"
            className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-secondary)]"
          />
          <span className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
            {meta.label}
          </span>
          {/* 位置标签 — 仅在组内 >1 张卡片时显示 */}
          {groupPosition && groupPosition.total > 1 && (
            <span className="text-[13px] text-[var(--color-text-tertiary)] font-[var(--font-mono)] opacity-70">
              {groupPosition.current}/{groupPosition.total}
            </span>
          )}
          {/* 关键参数预览 — 始终在头部可见 */}
          {keyParam && !isExpanded && (
            <span className="text-[13px] text-[var(--color-text-tertiary)] truncate font-[var(--font-mono)] ml-0.5 flex-1 min-w-0">
              {keyParam}
            </span>
          )}
          <span className="flex-1" />
          {/* 状态指示器：双图标叠加透明度过渡 */}
          <div className="relative w-3 h-3 flex-shrink-0">
            {/* Spinner — 始终在 DOM，completed 时淡出 */}
            <Icon
              name="loader-2"
              size="sm"
              className={`absolute inset-0 w-3 h-3 animate-spin text-[var(--ash-accent)] transition-opacity duration-300 ${status === 'calling' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            />
            {/* 结果图标 — completed 时挂载，带 fadeIn 入场 */}
            {status !== 'calling' && (
              <Icon
                name={success ? 'check-circle' : 'x-circle'}
                size="sm"
                className={`absolute inset-0 w-3 h-3 animate-[fadeIn_300ms_ease-out] ${success ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}
              />
            )}
          </div>
        </button>

        {/* 关键参数 — 展开时在头部下方显示（带更多空间） */}
        {keyParam && isExpanded && (
          <p className="px-2 pb-0.5 text-[13px] text-[var(--color-text-tertiary)] truncate font-[var(--font-mono)]">
            {keyParam}
          </p>
        )}

        {/* 可折叠内容区 */}
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: isExpanded ? '400px' : '0px' }}
        >
          {/* 参数区 — 始终存在 */}
          <div className="px-2 pb-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[13px] font-semibold text-[var(--color-text-tertiary)]">参数</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy(JSON.stringify(params, null, 2), 'params')
                }}
                className="flex items-center gap-0.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-1 py-0.5 rounded hover:bg-[var(--color-bg-primary)]"
                title="复制参数"
              >
                <Icon
                  name={copiedTarget === 'params' ? 'check' : 'copy'}
                  size="sm"
                  className={`w-3 h-3 ${copiedTarget === 'params' ? 'text-[var(--color-success)]' : ''}`}
                />
              </button>
            </div>
            <pre className="can-select text-[13px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>

          {/* 结果区 — 有 result 时显示 */}
          {resultText && (
            <div
              className={`px-2 pb-2 ${status === 'completed' ? 'animate-[fadeIn_400ms_ease-out]' : ''}`}
            >
              <p className="text-[13px] font-semibold text-[var(--color-text-tertiary)] mb-0.5">
                {success ? '结果' : '错误'}
              </p>
              <pre className="can-select text-[13px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {resultText}
              </pre>
            </div>
          )}

          {/* 原始输出区 — 仅当有原始消息内容且与格式化结果不重复时显示 */}
          {showToolMessageContent && (
            <div className="px-2 pb-2">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[13px] font-semibold text-[var(--color-text-tertiary)]">
                  原始输出
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(toolMessageContent!, 'output')
                  }}
                  className="flex items-center gap-0.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-1 py-0.5 rounded hover:bg-[var(--color-bg-primary)]"
                  title="复制原始输出"
                >
                  <Icon
                    name={copiedTarget === 'output' ? 'check' : 'copy'}
                    size="sm"
                    className={`w-3 h-3 ${copiedTarget === 'output' ? 'text-[var(--color-success)]' : ''}`}
                  />
                </button>
              </div>
              <pre className="can-select text-[13px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {toolMessageContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
