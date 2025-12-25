// 主题配置
export interface ThemeConfig {
  defaultDarkMode: boolean // 默认是否为暗色主题
}

// 终端配置
export interface TerminalConfig {
  fontSize: number // 终端字体大小
}

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

// 功能组件配置
export interface ComponentConfig {
  // 左侧栏功能组件
  aiInterfaceVisible: boolean // AI界面是否可见
  // 右侧栏功能组件
  sessionListVisible: boolean // 会话列表是否可见
  fileListVisible: boolean // 文件列表是否可见
  monitorListVisible: boolean // 监控列表是否可见
  // 中央区域功能组件
  commandListVisible: boolean // 命令列表是否可见
}

// 布局配置
export interface LayoutConfig {
  leftSideBarVisible: boolean // 左侧边栏是否可见
  rightSideBarVisible: boolean // 右侧边栏是否可见
  components: ComponentConfig // 功能组件配置
}

// 应用配置（不包含 AI 配置，AI 配置独立加密存储）
export interface AppConfig {
  theme: ThemeConfig
  layout: LayoutConfig
  terminal: TerminalConfig
}
