// 主题配置
export interface ThemeConfig {
  defaultDarkMode: boolean // 默认是否为暗色主题
}

// 应用配置
export interface AppConfig {
  theme: ThemeConfig
}
