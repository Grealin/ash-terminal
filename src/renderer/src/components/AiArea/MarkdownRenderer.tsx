import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  /** 流式输出时设为 true，使用纯文本渲染避免 Markdown 断裂 */
  isStreaming?: boolean
}

const components: Components = {
  // 表格 — 外层包裹 overflow-x-auto 防止撑开气泡
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto max-w-full my-1">
      <table className="w-max min-w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  // 图片 — 限制最大宽度
  img: ({ src, alt, ...props }) => (
    <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-1" {...props} />
  ),
  // 链接 — 断词防止长 URL 溢出
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--ash-accent)] underline underline-offset-2 hover:opacity-80 transition-colors break-all"
      {...props}
    >
      {children}
    </a>
  ),
  // 多选任务列表
  input: ({ type, checked, ...props }) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-1.5 align-middle accent-[var(--ash-accent)]"
          {...props}
        />
      )
    }
    return <input type={type} {...props} />
  }
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming = false }) => {
  if (!content) {
    return null
  }

  // 流式输出：纯文本渲染，避免不完整 Markdown 导致的断裂闪烁
  if (isStreaming) {
    return (
      <p className="can-select text-xs whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-[var(--color-text-primary)]">
        {content}
      </p>
    )
  }

  return (
    <div className="markdown-body can-select text-xs leading-relaxed text-gray-800 dark:text-[var(--color-text-primary)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
