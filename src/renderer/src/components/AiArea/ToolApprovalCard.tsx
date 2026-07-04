import { Icon } from '@/components/Icon'
import { useCallback, useState } from 'react'

interface ToolApprovalCardProps {
  toolName: string
  params: Record<string, unknown>
  reason: string
  onApprove: () => void
  onReject: () => void
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
      return (s(params.command) || '').slice(0, 80) || null
    default:
      return null
  }
}

export const ToolApprovalCard: React.FC<ToolApprovalCardProps> = ({
  toolName,
  params,
  reason,
  onApprove,
  onReject
}) => {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const displayLabel = toolName === 'unknown' ? '工具调用' : toolName
  const meta = TOOL_META[toolName] ?? { icon: 'zap', label: displayLabel }
  const keyParam = extractKeyParam(toolName, params)
  const paramsJson = JSON.stringify(params, null, 2)

  const handleCopy = useCallback((): void => {
    navigator.clipboard.writeText(paramsJson).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = paramsJson
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [paramsJson])

  return (
    <div className="border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-3 animate-[fadeIn_200ms_ease-out]">
      <div className="w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] border-l-[2px] border-l-[var(--color-warning,#f59e0b)] overflow-hidden">
        {/* 头部 — 始终可见 */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
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
          <span className="text-[11px] font-medium text-[var(--color-warning,#f59e0b)] px-1.5 py-0 rounded-[var(--radius-sm)] bg-[var(--color-warning,#f59e0b)]/10 flex-shrink-0">
            需要批准
          </span>
          <span className="flex-1" />
          <Icon
            name="alert-triangle"
            size="sm"
            className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-warning,#f59e0b)] animate-pulse"
          />
        </button>

        {/* 关键参数 — 始终可见 */}
        {keyParam && (
          <p className="px-2 pb-0.5 text-[13px] text-[var(--color-text-tertiary)] truncate font-[var(--font-mono)]">
            {keyParam}
          </p>
        )}

        {/* 原因 */}
        <p className="px-2 pb-1 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          {reason}
        </p>

        {/* 可折叠参数区 */}
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: expanded ? '320px' : '0px' }}
        >
          <div className="px-2 pb-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[13px] font-semibold text-[var(--color-text-tertiary)]">参数</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopy()
                }}
                className="flex items-center gap-0.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors px-1 py-0.5 rounded hover:bg-[var(--color-bg-primary)]"
                title="复制参数"
              >
                <Icon
                  name={copied ? 'check' : 'copy'}
                  size="sm"
                  className={`w-3 h-3 ${copied ? 'text-[var(--color-success)]' : ''}`}
                />
              </button>
            </div>
            <pre className="can-select text-[13px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
              {paramsJson}
            </pre>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 px-2 pb-2">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] bg-[var(--color-success)] hover:brightness-110 text-white transition-all active:scale-[0.98]"
          >
            <Icon name="check" size="sm" className="w-3.5 h-3.5" />
            批准
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[var(--radius-sm)] bg-[var(--color-error)] hover:brightness-110 text-white transition-all active:scale-[0.98]"
          >
            <Icon name="x" size="sm" className="w-3.5 h-3.5" />
            拒绝
          </button>
        </div>
      </div>
    </div>
  )
}
