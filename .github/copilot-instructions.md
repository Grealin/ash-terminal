# AshTerminal Copilot Instructions

## 项目概览

基于 Electron + React + TypeScript 的智能 SSH 终端，支持多会话、文件传输、系统监控和 AI 助手集成。技术栈：ssh2、node-pty、Jotai、DaisyUI、Better-SQLite3。

## 核心架构

### 三层进程模型

**Main Process** (`src/main/`)：

- `lib/SSHPool.ts`：全局 SSH 连接池，通过 `sessionId` 索引 `SSH2Wrapper` 实例
- `lib/SSH2Wrapper.ts`：EventEmitter 子类，封装 ssh2 库，管理单个 SSH 连接和交互式 Shell
- `lib/ConfigManager.ts` / `lib/AiConfigStore.ts`：使用 `electron-store` 持久化配置，AI 配置通过 `SECRET_KEY` 环境变量加密
- `lib/database/`：Better-SQLite3 数据库，存储任务历史（`app.db`，WAL 模式）
- `ipc/`：按功能模块拆分 IPC handlers（`session.ts`, `shell.ts`, `file.ts` 等），通过 `ipc/index.ts` 统一注册

**Preload** (`src/preload/`)：

- 使用 `contextBridge` 暴露三个命名空间：`window.electron`（窗口控制）、`window.context`（应用配置）、`window.ssh`（SSH 操作）
- 必须先在 `src/preload/index.d.ts` 扩展 `Window` 接口，再在 `index.ts` 中实现

**Renderer** (`src/renderer/`)：

- Jotai 管理状态（`src/renderer/src/store/`），原子按功能分文件（`SessionStore.ts`、`ModalAtom.ts`）
- 组件模式：`*Main`（容器组件处理布局）+ `*Content`（内容组件处理逻辑）
- UI：DaisyUI + TailwindCSS（Vite 4.1+ 原生支持）

### IPC 通信流程

```
Renderer → window.ssh.method() → ipcRenderer.invoke()
  → Main ipcMain.handle() → lib/*.ts 业务逻辑
```

**添加新 IPC 功能的完整步骤**：

1. `src/shared/types/*.ts`：定义类型（如 `export type MyMethod = (arg: string) => Promise<Result>`）
2. `src/main/lib/*.ts`：实现业务逻辑函数
3. `src/main/ipc/*.ts`：注册 handler（`ipcMain.handle('myMethod', async (_, arg) => {...})`）
4. `src/preload/index.ts`：暴露 API（`myMethod: (...args) => ipcRenderer.invoke('myMethod', ...args)`）
5. `src/preload/index.d.ts`：更新类型声明（`myMethod: MyMethod`）

### SSH 连接管理

- **连接池**：`SSHPool.ts` 维护 `Map<sessionId, SSH2Wrapper>`，单例模式
- **Shell 事件**：`SSH2Wrapper` 继承 EventEmitter，通过 `data`/`close`/`error` 事件向渲染进程传输终端输出
- **身份验证**：支持密码 (`password`) 和私钥 (`privateKey`) 两种方式，配置存储在 `electron-store`

示例：获取 SSH 连接并写入 Shell

```typescript
const ssh = getSSH(sessionId) // 从连接池获取
if (!ssh) throw new Error('SSH connection not found')
ssh.writeToShell(data)
```

### 存储架构

- **electron-store**：`ConfigManager.ts` 存储主题/布局，`AiConfigStore.ts` 存储 AI 配置（**加密**，需 `.env` 中 `SECRET_KEY`）
- **Better-SQLite3**：`database/core/Database.ts` 初始化 `app.db`，仓库模式访问（`repositories/TaskRepository.ts`）
- **初始化顺序**：`src/main/index.ts` 中 `app.whenReady()` 后依次调用 `initConfigStore()` → `initSessionStore()` → `initAiConfigStore()` → `initDatabase()`

### AI 助手集成

- **工具系统**：`src/main/lib/ai/tools/` 下的工具类继承 `BaseTool`，实现 `getDefinition()` 和 `execute()` 方法
- **工具类型**：`CommandTool`（执行命令）、`SudoCommandTool`（需 sudo）、`FileReadTool`、`FileWriteTool`、`DirectoryTool`、`FileSearchTool`
- **模式**：`AiMode.AGENT`（可使用工具）vs `AiMode.ASK`（仅回答问题）
- **配置**：多 Provider 支持（OpenAI Compatible），存储在加密的 `ai-config.json`

## 开发约定

### 路径别名（`electron.vite.config.ts`）

- Main: `@/lib` → `src/main/lib`, `@shared` → `src/shared`
- Renderer: `@/components`, `@/hooks`, `@/store`, `@/services`, `@shared`

### 组件组织

- `src/renderer/src/components/`：功能模块目录（如 `TerminalArea/`、`SessionManager/`）
- 每个模块导出 `*Main` 和 `*Content` 组件
- 可复用组件放 `Button/`、`Modal/`、`Dropdown/` 等子目录

### 类型定义位置

- 数据模型：`src/shared/models/` (SSHConfig, FileInfo, AppConfig, AI.ts 等)
- API 签名：`src/shared/types/` (SSH.ts, Context.ts, Electron.ts)
- Preload 类型：`src/preload/index.d.ts` 扩展 Window 接口

### 关键常量

- 窗口尺寸：`src/shared/constants.ts` 定义 `WINDOW_INITIAL_WIDTH/HEIGHT`
- 使用无边框窗口 (`frame: false`)，自定义 `TopBar.tsx` 处理拖拽和窗口控制

## 开发命令

```bash
yarn dev          # 开发模式（HMR，自动打开 DevTools）
yarn build:win    # 构建 Windows 安装包（需先 typecheck）
yarn typecheck    # TS 类型检查（node + web）
yarn lint         # ESLint 检查
yarn format       # Prettier 格式化
```

## 常见任务

### 添加新的 SSH 操作

1. 在 `src/shared/types/SSH.ts` 添加类型（如 `export type MyOperation = (sessionId: string) => Promise<void>`）
2. 在 `src/main/lib/` 实现逻辑（通常调用 `getSSH(sessionId)`）
3. 在 `src/main/ipc/session.ts` 或相关文件注册 handler
4. 在 `src/preload/index.ts` 的 `ssh` 对象添加方法
5. 更新 `src/preload/index.d.ts` 中 `SSH` 接口

### 调试 IPC 通信

- 在 `src/main/ipc/*.ts` handler 中打断点或 console.log
- 渲染进程错误会显示在 Electron 窗口的 DevTools 中
- 主进程错误显示在启动 Electron 的终端

### 修改 UI 主题

- DaisyUI 主题切换：修改 `src/shared/models/Config.ts` 中 `theme.defaultDarkMode`
- Tailwind 配置：项目使用 Vite 原生 TailwindCSS 4.1+ 插件（`@tailwindcss/vite`）

### 扩展 AI 工具

1. 在 `src/main/lib/ai/tools/` 创建新工具类（继承 `BaseTool`）
2. 实现 `getDefinition()` 返回 `ToolDefinition`（名称、描述、参数 schema）
3. 实现 `execute(context, params)` 处理工具逻辑
4. 在 `src/main/lib/ai/tools/index.ts` 导出新工具

## 注意事项

- **安全**：`contextIsolation: true`，preload 必须用 `contextBridge` 暴露 API
- **Shell 事件清理**：监听 Shell 事件时，返回取消监听函数（`return () => ssh.off('data', callback)`）
- **连接生命周期**：断开 SSH 时调用 `ssh.dispose()` 并从 `sshConnections` Map 中删除
- **数据库**：必须先 `initDatabase()` 再调用 `getDB()`，app 退出时调用 `closeDatabase()`
- **环境变量**：AI 配置加密需要 `.env` 文件中设置 `SECRET_KEY`（通过 `dotenv` 加载）
