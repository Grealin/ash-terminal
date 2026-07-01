# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

AshTerminal 是一款基于 Electron + React + TypeScript 的现代化智能 SSH 终端，集成 AI 助手。技术栈：Electron 37、React 19、TypeScript 6.0、xterm.js、ssh2、Jotai、DaisyUI 5 + TailwindCSS 4、Better-SQLite3、electron-vite。

## 开发命令

```bash
yarn dev              # 开发模式（HMR，自动开启 DevTools）
yarn build            # 生产构建（先 typecheck 再 build）
yarn build:win        # 构建 Windows 安装包
yarn build:mac        # 构建 macOS 安装包
yarn build:linux      # 构建 Linux 安装包
yarn typecheck        # TypeScript 类型检查（node + web 两个 tsconfig）
yarn typecheck:node   # 仅检查 main/preload 进程
yarn typecheck:web    # 仅检查 renderer 进程
yarn lint             # ESLint 检查
yarn format           # Prettier 格式化
```

**环境要求**：Node.js >= 18，Yarn >= 1.22。

**开发前必须**：创建 `.env` 文件，设置 `SECRET_KEY`（至少 32 位随机字符串），用于 AI 配置（API Key 等）的 AES-256-CBC 加密存储。`.env` 中的值在编译时注入，编译后无需 `.env` 文件。`.env.local` 优先级高于 `.env`。

## 三层进程架构

本项目是标准的 Electron 多进程应用：

```
Renderer (React 19 + Jotai)   →   Preload (contextBridge)   →   Main Process (Node.js)
       ↓                                 ↓                              ↓
  src/renderer/src/              src/preload/                   src/main/
  UI 组件 + 状态管理            暴露类型安全的 API            业务逻辑 + IPC handlers
```

### Main Process（`src/main/`）

- `index.ts` — 应用入口，初始化顺序：`initConfigStore()` → `initSessionStore()` → `initAiConfigStore()` → `initDatabase()` → `registerIpcHandlers()` → `createWindow()`。窗口使用无边框模式（`frame: false`），自定义 TopBar 处理拖拽和窗口控制。
- `ipc/index.ts` — 统一注册所有 IPC handler 模块（`window`, `config`, `session`, `file`, `shell`, `dialog`, `monitor`, `aiConfig`, `ai`, `toolApproval`）。
- `lib/SSHPool.ts` — 全局 SSH 连接池（`Map<sessionId, SSH2Wrapper>`），通过 `getSSH(sessionId)` 获取连接，操作前必须检查连接是否存在。
- `lib/SSH2Wrapper.ts` — 封装 ssh2 库的 EventEmitter 子类，管理单个 SSH 连接和交互式 Shell。通过 `data`/`close`/`error` 事件传输终端输出。通过进程快照对比静默捕获 PTY Shell PID，用于追踪终端工作目录。
- `lib/ConfigManager.ts` — 基于 `electron-store` 的应用配置（明文），存储主题、布局、字体大小等。
- `lib/AiConfigStore.ts` — 基于 `electron-store` 的 AI 配置（加密），存储 Provider 列表、API Key、自动批准规则等。需 `SECRET_KEY` 环境变量。
- `lib/database/` — Better-SQLite3（WAL 模式 + 外键约束），存储 AI 任务历史（`app.db`），使用 Repository 模式访问（`TaskRepository`）。

### Preload（`src/preload/`）

通过 `contextBridge.exposeInMainWorld` 暴露六个命名空间到 `window` 对象：

- `window.electron` — 窗口控制（最小化、最大化、关闭）
- `window.context` — 应用配置读写
- `window.ssh` — SSH 操作（连接、命令执行、文件传输、Shell 交互、系统监控）
- `window.aiConfig` — AI 配置管理（Provider CRUD、工具列表）
- `window.ai` — AI 任务管理（创建任务、提问、历史查询、事件监听）
- `window.toolApproval` — 工具批准（批准请求监听、响应）

**安全要求**：`contextIsolation: true` + `sandbox: true`，所有 API 必须通过 `contextBridge` 暴露，禁止直接暴露 Node.js API。Shell/AI 事件监听器必须返回清理函数，IPC 侧通过 `event.sender.on('destroyed', cleanup)` 避免内存泄漏。

### Renderer（`src/renderer/src/`）

- 状态管理使用 Jotai，原子按功能分文件（`store/SessionStore.ts`、`store/TaskStore.ts` 等）。原子命名以 `Atom` 结尾，用 `useAtomValue`/`useSetAtom` 拆分读写避免不必要重渲染。
- 组件模式：复杂组件拆分为 `*Main`（容器组件，处理布局和数据获取）和 `*Content`（内容组件，处理业务逻辑），可复用组件独立子目录（`Button/`、`Modal/`、`Dropdown/`）。
- UI：DaisyUI 5 + TailwindCSS 4（Vite 原生 `@tailwindcss/vite` 插件），终端使用 `react-xterm` + `xterm`。
- 布局：左侧 AI 助手区 + 中央终端区 + 右侧功能面板（SSH 会话/文件管理/系统监控），左右侧栏可独立显示/隐藏。

## 添加新 IPC 功能的完整步骤

这是最关键的开发约定，必须按顺序进行以保证类型安全：

1. **`src/shared/types/`** — 定义类型签名（函数参数和返回值类型）
2. **`src/main/lib/`** — 实现业务逻辑（通常调用 `getSSH(sessionId)` 执行 SSH 操作）
3. **`src/main/ipc/`** — 注册 `ipcMain.handle('channelName', ...)`
4. **`src/preload/index.ts`** — 在对应命名空间对象中添加方法，使用 `ipcRenderer.invoke`
5. **`src/preload/index.d.ts`** — 更新 Window 接口的类型声明

IPC 通道名使用与类型相同的小驼峰命名（如 `getDirectoryFiles`）。

## 路径别名

Main Process 和 Renderer 使用不同的别名配置（定义在 `electron.vite.config.ts`）：

| 别名           | Main Process   | Renderer Process              |
| -------------- | -------------- | ----------------------------- |
| `@shared`      | `src/shared`   | `src/shared`                  |
| `@/lib`        | `src/main/lib` | —                             |
| `@/components` | —              | `src/renderer/src/components` |
| `@/hooks`      | —              | `src/renderer/src/hooks`      |
| `@/store`      | —              | `src/renderer/src/store`      |
| `@/services`   | —              | `src/renderer/src/services`   |

**注意**：Main Process 和 Renderer 的别名不可混用。

## SSH 连接管理

```
SSHPool (Map<sessionId, SSH2Wrapper>)
    └── SSH2Wrapper (EventEmitter) — 单个 SSH 连接
         ├── execCommand() — 执行命令，返回 {stdout, stderr, code}
         ├── createShell() — 创建交互式 PTY（xterm-256color）
         ├── writeToShell() / resizeShell()
         ├── getSftp() — 获取 SFTP 客户端用于文件操作
         ├── testConnection() — 健康检查
         └── getShellPid() — 获取 PTY Shell PID（用于追踪工作目录）
```

- `connectSSH(config)` 创建连接后自动加入 `sshConnections` Map，`config.id` 作为 `sessionId`
- `disconnectSSH(sessionId)` 调用 `ssh.dispose()` 并从 Map 删除
- 调用 SSH 操作前必须先 `getSSH(sessionId)` 检查连接是否存在
- 身份验证支持密码和私钥两种方式，私钥自动检测是文件路径还是私钥内容

## AI 助手架构

### Agent 生命周期

```
AgentPool (Map<sessionId, Agent>)
    └── Agent (EventEmitter) — 单个 SSH 会话的 AI 对话
         ├── ask(question, mode) — 发起对话
         ├── 模式: AiMode.AGENT（可使用工具）/ AiMode.ASK（仅回答）
         └── 事件: STREAM, THOUGHT, TOOL_CALL, TOOL_RESULT, ANSWER, ERROR, DONE
```

### Task 与 Agent 的关系

- `TaskManager`（`src/main/lib/ai/TaskManager.ts`）是面向前端的顶层接口，遵循"前端操作任务，Agent 作为内部实现自动管理"的设计原则
- 一个任务（Task） = 一组对话消息 + 对应的 Agent 执行上下文，通过 `TaskStore`（`src/main/lib/ai/storage/TaskStore.ts`）持久化到 SQLite
- 任务创建是隐式的：用户首次发送消息时自动创建，前端通过 `prepareNewTask` 只清空状态不创建数据库记录
- `TaskStoreManager` 维护 `Map<sessionId, TaskStore>` 单例

### AI 工具系统（`src/main/lib/ai/tools/`）

所有工具继承 `BaseTool`，需实现 `getDefinition()`（返回 `ToolDefinition`，含 name/description/parameters JSON Schema）和 `execute(context, params)`（返回 `ToolResult`，含 success/data/error）。

已注册工具（在 `ToolManager` 构造函数中注册）：

| 工具              | 功能                   |
| ----------------- | ---------------------- |
| `FileReadTool`    | 读取远程文件内容       |
| `FileCreateTool`  | 创建远程文件           |
| `FileModifyTool`  | 修改远程文件（带备份） |
| `FileSearchTool`  | 搜索文件内容（grep）   |
| `DirectoryTool`   | 浏览目录结构           |
| `CommandTool`     | 执行普通命令           |
| `SudoCommandTool` | 执行 sudo 命令         |

`ToolContext` 包含 `sessionId` 和 `workingDirectory`（Agent 在工具执行前从 PTY Shell 注入）。

### 工具批准机制

`ToolManager` 在执行工具前检查是否需要批准，规则优先级：黑名单 > 白名单 > 默认需要批准。若 `autoApproval.enabled` 为 false，所有工具都需批准。批准请求通过 EventEmitter 事件经 IPC 传至前端，前端响应后继续执行，60 秒超时自动拒绝。

### 工具调用协议

支持两种协议模式（由 Provider 的 `toolCallProtocol` 字段控制）：

- **Native JSON** — 使用 OpenAI 标准的 function calling（`tools` 参数），通过 `tool_calls` 字段交互
- **XML** — 使用文本格式的工具调用，格式为 `<action><name>tool_name</name><params>json</params></action>`，结果通过 `<observation>` 返回。Agent 支持 10 次最大迭代防止死循环

### 添加新 AI 工具的步骤

1. 在 `src/main/lib/ai/tools/` 创建工具类，继承 `BaseTool`
2. 实现 `getDefinition()` 和 `execute(context, params)`
3. 在 `src/main/lib/ai/tools/index.ts` 导出
4. 在 `ToolManager` 构造函数中调用 `this.registerTool(new MyTool())`

## 存储架构

- **electron-store** — 应用配置（`ConfigManager`，明文 `config.json`）+ AI 配置（`AiConfigStore`，加密 `ai-config.json`）
- **Better-SQLite3** — AI 任务和消息历史（`app.db`，Repository 模式，WAL 模式 + 外键约束）
- 敏感配置（API Key）必须用 `AiConfigStore`（加密），非敏感配置用 `ConfigManager`（明文）
- 数据库必须先 `initDatabase()` 再 `getDB()`，app 退出时调用 `closeDatabase()`

## 类型定义位置

- **数据模型**：`src/shared/models/`（`Session.ts`、`AI.ts`、`Config.ts`、`Task.ts`、`Monitor.ts`、`OpenAICompatible.ts` 等）
- **API 签名（函数类型）**：`src/shared/types/`（`SSH.ts`、`Context.ts`、`Electron.ts`、`AiConfig.ts`、`Task.ts`、`ToolApproval.ts`）
- **Preload Window 类型**：`src/preload/index.d.ts`

## 注意事项

- `contextIsolation: true` + `sandbox: true` 是强制性安全要求，不可放宽
- 所有 EventEmitter 监听器必须在适当时机清理，组件卸载时须取消 IPC 事件订阅
- Shell 事件监听返回清理函数（`return () => ssh.off('data', callback)`）
- xterm 组件卸载时必须 `terminal.dispose()`
- SSH 连接断开后必须从 `sshConnections` Map 中删除
- 批量数据库写操作使用 `db.transaction()` 包裹
- `.github/copilot-instructions.md` 包含更详细的开发指南和故障排查清单，遇到问题时可以参考
