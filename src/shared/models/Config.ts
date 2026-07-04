// AI 供应商配置（单个）
export interface AiProviderConfig {
  id: string // 唯一标识使用uuid
  configName: string // 显示名称（用户自定义，如 "MyAi"、"OtherAi" 等）
  providerType: 'OpenAI Compatible' // 当前仅支持 OpenAI Compatible
  baseUrl: string // API 基础 URL
  apiKey: string // API 密钥（加密存储）
  model: string // 模型名称
  streaming: boolean // 是否启用流式响应
  temperature?: number // 温度参数
  maxContextTokens: number // 最大上下文 token 数
  toolCallProtocol: 'XML' | 'Native JSON' // 工具调用协议：XML或者原生JSON
}

// AI 助手配置（独立加密存储）
export interface AiConfig {
  // API 供应商配置列表
  providers: AiProviderConfig[]
  // 当前激活的供应商 ID
  activeProviderId: string
  // 用户配置项
  userSettings: {
    // 自动批准配置
    autoApproval: {
      enabled: boolean // 是否启用自动批准
      allowedTools: string[] // 自动批准的工具名称列表（白名单）
      commandFilter: {
        allowedCommandPrefixes: string[] // 允许的命令前缀
        deniedCommandPrefixes: string[] // 禁止的命令前缀
      }
    }
    // 用户额外提示词
    userExtraPrompt: string
  }
}

// 主题配置
export interface ThemeConfig {
  defaultDarkMode: boolean // 默认是否为暗色主题
  accentColor: string // 主题强调色标识（如 'coral', 'blue', 'mint' 等），默认 'coral'
}

// 主题色预设定义
export interface AccentColorPreset {
  id: string
  name: string
  light: { accent: string; accentHover: string; accentSubtle: string }
  dark: { accent: string; accentHover: string; accentSubtle: string }
}

// 可选主题色列表
export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  {
    id: 'blue',
    name: '深海蓝',
    light: { accent: '#5B8DEF', accentHover: '#4A7DE0', accentSubtle: '#EEF3FD' },
    dark: { accent: '#79A0F0', accentHover: '#8DB4FF', accentSubtle: '#1A2540' }
  },
  {
    id: 'coral',
    name: '珊瑚橙',
    light: { accent: '#FF7F6B', accentHover: '#FF6A52', accentSubtle: '#FFF0ED' },
    dark: { accent: '#FF8A78', accentHover: '#FF9E8F', accentSubtle: '#2D1F1B' }
  },
  {
    id: 'mint',
    name: '薄荷绿',
    light: { accent: '#2EA88B', accentHover: '#269478', accentSubtle: '#EDF8F4' },
    dark: { accent: '#3EC9A4', accentHover: '#52D4B3', accentSubtle: '#1A2E28' }
  },
  {
    id: 'purple',
    name: '鸢尾紫',
    light: { accent: '#8B5CF6', accentHover: '#7C3FED', accentSubtle: '#F3F0FE' },
    dark: { accent: '#A78BFA', accentHover: '#BBA6FB', accentSubtle: '#252040' }
  },
  {
    id: 'amber',
    name: '琥珀金',
    light: { accent: '#F59E0B', accentHover: '#D97706', accentSubtle: '#FFF9EB' },
    dark: { accent: '#FBBF24', accentHover: '#FCD34D', accentSubtle: '#2D2408' }
  },
  {
    id: 'rose',
    name: '玫瑰红',
    light: { accent: '#F43F5E', accentHover: '#E11D48', accentSubtle: '#FFF0F3' },
    dark: { accent: '#FB7185', accentHover: '#FDA4AF', accentSubtle: '#2D1820' }
  }
]

// 终端配置
export interface TerminalConfig {
  fontSize: number // 终端字体大小
}

// 监控配置
export interface MonitorConfig {
  refreshInterval: number // 监控刷新间隔（毫秒），最小值为3000
}

// 布局配置
export interface LayoutConfig {
  leftSideBarVisible: boolean // 左侧边栏是否可见
  rightSideBarVisible: boolean // 右侧边栏是否可见
}

// 文件管理配置
export interface FileConfig {
  backupOnAiModify: boolean // AI 修改文件后是否保留 .bak 备份
  backupOnManualEdit: boolean // 手动编辑文件时是否创建 .old 备份
}

// 应用配置（不包含 AI 配置，AI 配置独立加密存储）
export interface AppConfig {
  theme: ThemeConfig
  layout: LayoutConfig
  terminal: TerminalConfig
  monitor: MonitorConfig
  file: FileConfig
}
