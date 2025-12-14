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
  id: string // 唯一标识
  name: string // 显示名称（用户自定义，如 "OpenAI GPT-4"、"DeepSeek" 等）
  type: 'openai' // 当前仅支持 OpenAI Compatible 接口
  baseUrl: string // API 基础 URL
  apiKey: string // API 密钥
  model: string // 使用的模型名称
  temperature?: number // 温度参数（0-2），默认 0.7
  maxTokens?: number // 最大输出 token 数
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
    }
    // 上下文配置
    context: {
      maxMessages: number // 最大保留消息数量
      maxTokens: number // 最大上下文 token 数
    }
    // 用户提示词
    userPrompt: string // 用户额外添加的提示词
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
