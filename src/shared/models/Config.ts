// 主题配置
export interface ThemeConfig {
  defaultDarkMode: boolean // 默认是否为暗色主题
}

// 终端配置
export interface TerminalConfig {
  fontSize: number // 终端字体大小
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

// 应用配置
export interface AppConfig {
  theme: ThemeConfig
  layout: LayoutConfig
  terminal: TerminalConfig
}
