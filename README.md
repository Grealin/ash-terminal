# AshTerminal

<div align="center">

一款现代化的智能 SSH 终端管理工具，集成 AI 助手，让服务器管理更高效、更智能。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-31-47848f.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)

</div>

## ✨ 特性

### 核心功能

- 🔌 **多会话管理** - 同时管理多个 SSH 连接，支持密码和私钥认证
- 🖥️ **终端仿真** - 基于 xterm.js，完整支持 ANSI 转义序列和颜色
- 📁 **文件管理** - 内置 SFTP 客户端，支持文件上传、下载和远程编辑
- 📊 **系统监控** - 实时监控远程服务器的 CPU、内存、磁盘和网络状态
- 🚀 **批量执行** - 在会话中批量执行多个命令

### AI 智能助手

- 🤖 **AI Agent 模式** - 支持工具调用（Function Calling），可自动执行命令和操作文件
- 💬 **AI Ask 模式** - 纯问答模式，提供技术咨询和建议
- 🔧 **丰富的工具集** - 命令执行、文件读写、目录浏览、文件搜索等
- ✅ **工具批准机制** - 可配置自动批准规则，确保操作安全
- 📝 **任务历史** - 自动记录 AI 任务和工具调用历史

### 用户体验

- 🎨 **主题切换** - 支持多种 DaisyUI 主题，明暗模式自由切换
- 💾 **配置持久化** - 自动保存会话配置和应用设置
- 🔒 **安全加密** - 敏感配置（API Key）采用 AES-256-CBC 加密存储
- 🌍 **跨平台** - 支持 Windows、macOS 和 Linux

## 🛠️ 技术栈

### 前端

- **框架**: React 19 + TypeScript 5.7
- **状态管理**: Jotai - 原子化状态管理
- **UI 库**: DaisyUI 5 + TailwindCSS 4
- **终端**: xterm.js + react-xterm

### 后端（Main Process）

- **运行时**: Electron 31 + Node.js
- **SSH**: ssh2 + ssh2-sftp-client
- **PTY**: node-pty
- **数据库**: Better-SQLite3（WAL 模式）
- **配置**: electron-store + dotenv
- **AI**: OpenAI SDK（支持兼容接口）

## 📦 安装

### 环境要求

- Node.js >= 18
- Yarn >= 1.22

### 克隆仓库

```bash
git clone https://github.com/Grealin/ash-terminal.git
cd ash-terminal
```

### 安装依赖

```bash
yarn install
```

### 配置环境变量

创建 `.env` 文件（用于 AI 配置加密）：

```env
SECRET_KEY=your-character-secret-key
```

> **注意**: `SECRET_KEY` 用于加密存储 AI API Key。建议使用随机生成的字符串。

## 🚀 快速开始

### 开发模式

```bash
yarn dev
```

启动后会自动打开 DevTools，支持热重载（HMR）。

### 构建生产版本

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux
```

构建产物位于 `dist/` 目录。

### 代码质量检查

```bash
# TypeScript 类型检查
yarn typecheck

# ESLint 检查
yarn lint

# Prettier 格式化
yarn format
```

## 📖 使用指南

### 1. 创建 SSH 连接

1. 点击右侧 **SSH 会话** 的 **+** 按钮
2. 填写连接信息：
   - **名称**: 自定义会话名称
   - **主机**: SSH 服务器地址
   - **端口**: 默认 22
   - **用户名**: SSH 用户名
   - **密码**: 填写密码
3. 点击 **连接** 按钮

### 2. 配置 AI 助手

1. 点击右侧 **设置** 按钮
2. 进入 **AI 配置** 标签
3. 添加 Provider：
   - **Base URL**: `https://api.openai.com/v1` 或其他兼容接口
   - **API Key**: 你的 API Key
   - **Model**: 模型名称（如 `gpt-4`）
4. 配置工具批准规则（可选）：
   - 允许的工具：如 `read_file`, `list_directory`
   - 允许的命令前缀：如 `ls`, `cat`, `pwd`
   - 禁止的命令前缀：如 `rm -rf`, `dd if=`

### 3. 使用 AI 助手

1. 链接一个SSH会话
2. Agent切换到 **聊天** 组件
3. 选择模式：
   - **Agent 模式**: 可执行命令和文件操作
   - **Ask 模式**: 仅回答问题
4. 输入问题或任务，AI 会自动分析并执行

### 4. 文件管理

1. 刷新文件列表
2. 浏览远程文件系统
3. 支持操作：
   - 上传文件（点击上传按钮）
   - 下载文件（点击文件右侧下载按钮）
   - 删除文件（需确认）

### 5. 系统监控

1. 刷新系统监控信息
2. 查看实时监控数据：
   - CPU 使用率
   - 内存使用情况
   - 运行时间

## 🏗️ 项目结构

```
ash-terminal/
├── src/
│   ├── main/                 # Main Process
│   │   ├── index.ts         # 入口文件
│   │   ├── ipc/             # IPC handlers
│   │   │   ├── session.ts   # SSH 会话管理
│   │   │   ├── shell.ts     # Shell 操作
│   │   │   ├── file.ts      # 文件操作
│   │   │   ├── ai.ts        # AI 功能
│   │   │   └── ...
│   │   └── lib/             # 业务逻辑
│   │       ├── SSHPool.ts   # SSH 连接池
│   │       ├── SSH2Wrapper.ts # SSH 连接封装
│   │       ├── ConfigManager.ts # 配置管理
│   │       ├── ai/          # AI 相关
│   │       │   ├── AgentManager.ts
│   │       │   ├── TaskManager.ts
│   │       │   ├── tools/   # AI 工具集
│   │       │   └── core/    # Agent 核心
│   │       └── database/    # 数据库
│   ├── preload/             # Preload Script
│   │   ├── index.ts         # API 暴露
│   │   └── index.d.ts       # 类型定义
│   ├── renderer/            # Renderer Process
│   │   └── src/
│   │       ├── App.tsx      # 应用入口
│   │       ├── components/  # React 组件
│   │       ├── store/       # Jotai 状态
│   │       ├── hooks/       # React Hooks
│   │       └── services/    # 服务层
│   └── shared/              # 共享代码
│       ├── models/          # 数据模型
│       ├── types/           # 类型定义
│       └── constants.ts     # 常量
├── docs/                    # 文档
├── build/                   # 构建资源
└── resources/               # 应用资源
```

## 🔧 开发指南

### 添加新的 IPC 功能

1. 在 `src/shared/types/` 定义类型签名
2. 在 `src/main/lib/` 实现业务逻辑
3. 在 `src/main/ipc/` 注册 IPC handler
4. 在 `src/preload/index.ts` 暴露 API
5. 更新 `src/preload/index.d.ts` 类型声明

详见 [Copilot Instructions](.github/copilot-instructions.md)。

### 添加新的 AI 工具

1. 在 `src/main/lib/ai/tools/` 创建工具类（继承 `BaseTool`）
2. 实现 `getDefinition()` 和 `execute()` 方法
3. 在 `ToolManager` 中注册工具

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 提交规范

项目使用 husky + lint-staged 确保代码质量：

- 提交前自动运行 ESLint 和 Prettier
- 提交信息建议完整明确

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🙏 致谢

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [xterm.js](https://xtermjs.org/)
- [ssh2](https://github.com/mscdex/ssh2)
- [OpenAI](https://openai.com/)

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/Grealin/ash-terminal/issues)
- 作者: LinFeng

---

<div align="center">
Made with ❤️ by LinFeng
</div>
