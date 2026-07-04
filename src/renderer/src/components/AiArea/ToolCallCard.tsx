import { Icon } from '@/components/Icon'
import { useState } from 'react'

interface ToolCallCardProps {
  toolName: string
  params: Record<string, unknown>
  result?: unknown
  status: 'calling' | 'completed'
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

export const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolName, params, result, status }) => {
  const [expanded, setExpanded] = useState(false)
  const meta = TOOL_META[toolName] ?? { icon: 'zap', label: toolName }
  const keyParam = extractKeyParam(toolName, params)
  const success = status === 'completed' ? isResultSuccess(result) : null
  const resultText = result !== undefined ? getResultText(result) : null

  const borderColor =
    status === 'calling'
      ? 'border-l-[var(--ash-accent)]'
      : success
        ? 'border-l-[var(--color-success)]'
        : 'border-l-[var(--color-error)]'

  return (
    <div className="flex justify-start mb-1.5 animate-[fadeIn_200ms_ease-out]">
      <div
        className={`w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] border-l-[2px] transition-colors duration-300 ${borderColor}`}
      >
        {/* Header */}
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
          <span className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">
            {meta.label}
          </span>
          <span className="flex-1" />
          {status === 'calling' ? (
            <Icon
              name="loader-2"
              size="sm"
              className="w-3 h-3 flex-shrink-0 animate-spin text-[var(--ash-accent)]"
            />
          ) : success ? (
            <Icon
              name="check-circle"
              size="sm"
              className="w-3 h-3 flex-shrink-0 text-[var(--color-success)]"
            />
          ) : (
            <Icon
              name="x-circle"
              size="sm"
              className="w-3 h-3 flex-shrink-0 text-[var(--color-error)]"
            />
          )}
        </button>

        {/* Key param */}
        {keyParam && (
          <p className="px-2 pb-0.5 text-[10px] text-[var(--color-text-tertiary)] truncate font-[var(--font-mono)]">
            {keyParam}
          </p>
        )}

        {/* Expandable details */}
        <div
          className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: expanded ? '400px' : '0px' }}
        >
          <div className="px-2 pb-1.5">
            <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] mb-0.5">
              参数
            </p>
            <pre className="text-[10px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(params, null, 2)}
            </pre>
          </div>
          {resultText && (
            <div className="px-2 pb-2">
              <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] mb-0.5">
                {success ? '结果' : '错误'}
              </p>
              <pre className="text-[10px] bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] p-1.5 border border-[var(--color-border-primary)] font-[var(--font-mono)] whitespace-pre-wrap overflow-x-auto max-h-32 overflow-y-auto">
                {resultText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
