import { ToolCallCard } from './ToolCallCard'

interface ToolExecutionRecord {
  id: string
  name: string
  params: Record<string, unknown>
  result?: unknown
  timestamp: number
  status: 'calling' | 'completed'
  roundId: number
}

interface ToolCallGroupProps {
  executions: ToolExecutionRecord[]
  roundId: number
}

/**
 * 工具调用分组容器。
 * 将同一轮 Agent 推理的连续工具调用卡片用垂直连接线串联，
 * 显示组头和位置编号，自动折叠除最后一张外的所有卡片。
 */
export const ToolCallGroup: React.FC<ToolCallGroupProps> = ({ executions }) => {
  if (executions.length === 0) return null

  // 单张卡片：直接渲染，无组头无连接线
  if (executions.length === 1) {
    const exec = executions[0]
    return (
      <ToolCallCard
        key={exec.id}
        toolName={exec.name}
        params={exec.params}
        result={exec.result}
        status={exec.status}
      />
    )
  }

  return (
    <div className="mb-3 animate-[fadeIn_200ms_ease-out]">
      {/* 组头标识 */}
      <div className="flex items-center gap-1.5 mb-1.5 ml-[11px]">
        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium tracking-wide uppercase">
          Tools
        </span>
        <span className="text-[13px] text-[var(--color-text-tertiary)] opacity-70">
          {executions.length} calls
        </span>
      </div>

      {/* 带垂直连接线的卡片列表 */}
      <div className="border-l-2 border-[var(--color-border-primary)] ml-2 pl-3">
        {executions.map((exec, index) => {
          const isLast = index === executions.length - 1

          return (
            <ToolCallCard
              key={exec.id}
              toolName={exec.name}
              params={exec.params}
              result={exec.result}
              status={exec.status}
              collapsed={true}
              groupPosition={{ current: index + 1, total: executions.length }}
              showGroupConnector={!isLast}
            />
          )
        })}
      </div>
    </div>
  )
}
