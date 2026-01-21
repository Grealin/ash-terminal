# AshTerminal Copilot Instructions

## 项目概览

基于 Electron + React + TypeScript 的智能 SSH 终端，支持多会话、文件传输、系统监控和 AI 助手集成。

**技术栈**：ssh2、ssh2-sftp-client、node-pty、Jotai、DaisyUI、TailwindCSS 4、Better-SQLite3、OpenAI SDK

## 核心架构

### 三层进程模型

**Main Process** (`src/main/`)：

- `lib/SSHPool.ts`：全局 SSH 连接池，通过 `sessionId` 索引 `SSH2Wrapper` 实例（`Map<sessionId, SSH2Wrapper>`）
- `lib/SSH2Wrapper.ts`：EventEmitter 子类，封装 ssh2 库，管理单个 SSH 连接和交互式 Shell，通过 `data`/`close`/`error` 事件传输终端输出
- `lib/ConfigManager.ts` / `lib/AiConfigStore.ts`：使用 `electron-store` 持久化配置，AI 配置通过 `SECRET_KEY` 环境变量加密（**开发时需配置 `.env` 文件**）
- `lib/database/`：Better-SQLite3 数据库，存储 AI 任务历史（`app.db`，WAL 模式，外键约束启用）
- `ipc/`：按功能模块拆分 IPC handlers（`session.ts`, `shell.ts`, `file.ts`, `ai.ts` 等），通过 `ipc/index.ts` 统一注册

**Preload** (`src/preload/`)：

- 使用 `contextBridge` 暴露四个命名空间：`window.electron`（窗口控制）、`window.context`（应用配置）、`window.ssh`（SSH 操作）、`window.aiConfig`（AI 配置）
- **关键约定**：必须先在 `src/preload/index.d.ts` 扩展 `Window` 接口，再在 `index.ts` 中实现（类型安全）
- **安全要求**：`contextIsolation: true` + `sandbox: true`，所有 API 必须通过 `contextBridge` 暴露

**Renderer** (`src/renderer/`)：

- Jotai 管理全局状态（`src/renderer/src/store/`），原子按功能分文件（`SessionStore.ts`、`ModalAtom.ts`、`TaskStore.ts`）
- 组件模式：`*Main`（容器组件处理布局）+ `*Content`（内容组件处理逻辑），复用组件放独立子目录（`Button/`、`Modal/`）
- UI：DaisyUI 5 + TailwindCSS 4（使用 Vite 原生 `@tailwindcss/vite` 插件）
- 使用 `react-xterm` + `xterm` 实现终端仿真器

### IPC 通信流程

```
Renderer → window.ssh.method() → ipcRenderer.invoke()
  → Main ipcMain.handle() → lib/*.ts 业务逻辑
```

**添加新 IPC 功能的完整步骤**（强制顺序，保证类型安全）：

1. **定义类型签名**（`src/shared/types/*.ts`）

   ```typescript
   // 示例：src/shared/types/SSH.ts
   export type GetDirectoryFiles = (sessionId: string, path: string) => Promise<FileInfo[]>
   ```

2. **实现业务逻辑**（`src/main/lib/*.ts`）

   ```typescript
   // 示例：src/main/lib/Files.ts
   export async function getDirectoryFiles(sessionId: string, path: string): Promise<FileInfo[]> {
     const ssh = getSSH(sessionId)
     if (!ssh) throw new Error('SSH connection not found')
     return ssh.getDirectoryFiles(path)
   }
   ```

3. **注册 IPC handler**（`src/main/ipc/*.ts`）

   ```typescript
   // 示例：src/main/ipc/file.ts
   ipcMain.handle('getDirectoryFiles', async (_, sessionId: string, path: string) => {
     return await getDirectoryFiles(sessionId, path)
   })
   ```

4. **暴露 Preload API**（`src/preload/index.ts`）

   ```typescript
   const ssh = {
     getDirectoryFiles: (...args: Parameters<GetDirectoryFiles>) =>
       ipcRenderer.invoke('getDirectoryFiles', ...args)
     // ...其他方法
   }
   ```

5. **更新类型声明**（`src/preload/index.d.ts`）
   ```typescript
   interface SSH {
     getDirectoryFiles: GetDirectoryFiles
     // ...其他方法
   }
   ```

**关键约定**：IPC 通道名称与类型名称使用相同的小驼峰命名（如 `getDirectoryFiles`）

### SSH 连接管理

**连接池模式**：

```typescript
// SSHPool.ts - 单例 Map
const sshConnections: Map<string, SSH2Wrapper> = new Map()

// 获取连接（业务逻辑中最常用）
const ssh = getSSH(sessionId)
if (!ssh) throw new Error('SSH connection not found')

// 创建连接（自动加入连接池）
await connectSSH(config) // config.id 作为 sessionId

// 断开连接（自动清理）
disconnectSSH(sessionId) // 调用 ssh.dispose() 并从 Map 删除
```

**Shell 事件系统**（基于 EventEmitter）：

```typescript
// SSH2Wrapper 发出事件
this.emit('data', data) // 终端输出
this.emit('close') // Shell 关闭
this.emit('error', error) // 错误

// IPC handler 中监听事件（src/main/ipc/shell.ts）
ssh.on('data', (data: string) => {
  event.sender.send('shell-data', sessionId, data)
})

// 前端监听（必须返回清理函数）
const cleanup = window.ssh.onShellData((sessId, data) => {
  // 处理终端输出
})
return () => cleanup() // 组件卸载时清理
```

**身份验证**：支持密码和私钥两种方式

```typescript
// 密码认证
{ username: 'user', password: 'pass', ... }

// 私钥认证（自动检测文件路径或私钥内容）
{ username: 'user', privateKey: '/path/to/key 或 -----BEGIN...', ... }
```

### 存储架构

**electron-store**（配置持久化）：

- `ConfigManager.ts`：主题、布局等应用配置（明文存储）
- `AiConfigStore.ts`：AI 配置（加密存储，需 `.env` 中 `SECRET_KEY`）
- 初始化顺序：`initConfigStore()` → `initSessionStore()` → `initAiConfigStore()`

**Better-SQLite3**（结构化数据）：

- `database/core/Database.ts`：初始化 `app.db`（WAL 模式 + 外键约束）
- `database/repositories/`：Repository 模式访问数据（如 `TaskRepository.ts`）
- 使用示例：

  ```typescript
  // 初始化（在 app.whenReady() 中）
  initDatabase()

  // 访问
  const db = getDB()
  db.prepare('SELECT * FROM tasks WHERE session_id = ?').all(sessionId)

  // 关闭（在 app.quit() 中）
  closeDatabase()
  ```

**关键约定**：

- 敏感配置（API Key）必须用 `AiConfigStore`，非敏感配置用 `ConfigManager`
- 数据库必须先 `initDatabase()` 再调用 `getDB()`
- App 退出时必须调用 `closeDatabase()` 确保数据完整性

### AI 助手集成

**工具系统**（位于 `src/main/lib/ai/tools/`）：

```typescript
// 工具类继承 BaseTool，实现两个方法
class CommandTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'execute_command',
      description: '在远程服务器执行命令',
      parameters: {
        /* JSON Schema */
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const ssh = getSSH(context.sessionId)
    // 执行逻辑...
    return { success: true, data: result }
  }
}
```

**可用工具类型**：

- `CommandTool`：执行普通命令
- `SudoCommandTool`：执行需要 sudo 权限的命令
- `FileReadTool`、`FileModifyTool`、`FileCreateTool`：文件操作
- `DirectoryTool`：目录结构查看
- `FileSearchTool`：文件内容搜索

**AI 模式**：

- `AiMode.AGENT`：可使用工具（function calling）
- `AiMode.ASK`：仅回答问题（无工具调用）

**工具批准机制**（`ToolManager` + EventEmitter）：

```typescript
// ToolManager 发出批准请求
this.emit('approval-request', { requestId, sessionId, toolName, params })

// IPC 传递到前端（src/main/ipc/toolApproval.ts）
toolManager.on('approval-request', (request) => {
  event.sender.send('tool-approval-request', sessionId, request)
})

// 前端响应批准结果
toolManager.handleApprovalResponse({ requestId, approved: true })
```

**自动批准规则**（`aiConfigStore.userSettings.autoApproval`）：

- `allowedTools`：工具白名单（如 `['read_file', 'list_directory']`）
- `commandFilter.allowedCommandPrefixes`：命令白名单（如 `['ls', 'cat']`）
- `commandFilter.deniedCommandPrefixes`：命令黑名单（如 `['rm -rf', 'dd if=']`）
- 黑名单优先级最高，其次白名单，最后默认需要用户批准

**配置管理**：

- 多 Provider 支持（OpenAI Compatible API）
- 配置存储在加密的 `ai-config.json`（需 `.env` 中的 `SECRET_KEY`）
- 前端通过 `window.aiConfig.*` API 管理

**Agent 生命周期**（`AgentManager` + `AgentPool`）：

```typescript
// 创建 Agent（自动获取系统信息）
const agent = await agentPool.createAgent({ sessionId, mode: AiMode.AGENT })

// 发送消息
agent.sendMessage(prompt)

// 监听事件
agent.on('message', (data) => {
  /* AI 回复消息 */
})
agent.on('tool-call', (data) => {
  /* 工具调用 */
})
agent.on('error', (error) => {
  /* 错误处理 */
})

// 停止并清理
agentPool.removeAgent(sessionId)
```

## 开发约定

### 路径别名（`electron.vite.config.ts`）

**Main Process**:

- `@/lib` → `src/main/lib`
- `@shared` → `src/shared`

**Renderer Process**:

- `@/components` → `src/renderer/src/components`
- `@/hooks` → `src/renderer/src/hooks`
- `@/store` → `src/renderer/src/store`
- `@/services` → `src/renderer/src/services`
- `@shared` → `src/shared`

### 组件组织

```
src/renderer/src/components/
├── TerminalArea/           # 功能模块目录
│   ├── index.ts           # 导出 *Main 和 *Content
│   ├── TerminalList.tsx   # 具体组件
├── SessionManager/
├── FileManager/
├── Button/                # 可复用组件
├── Modal/
└── Dropdown/
```

**组件命名规范**：

- `*Main.tsx`：容器组件，处理布局和数据获取
- `*Content.tsx`：内容组件，处理具体业务逻辑
- 可复用组件独立成目录（如 `Button/`、`Modal/`）

### 类型定义位置

- **数据模型**：`src/shared/models/`（SSHConfig, FileInfo, AppConfig, AI.ts 等）
- **API 签名**：`src/shared/types/`（SSH.ts, Context.ts, Electron.ts, AiConfig.ts）
- **Preload 类型**：`src/preload/index.d.ts` 扩展 Window 接口

### 状态管理（Jotai）

```typescript
// 定义原子（src/renderer/src/store/SessionStore.ts）
export const sessionsAtom = atom<SSHConfig[]>([])
export const currentSessionIdAtom = atom<string | null>(null)

// 组件中使用
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
const [sessions, setSessions] = useAtom(sessionsAtom) // 读写
const currentId = useAtomValue(currentSessionIdAtom) // 只读
const setCurrentId = useSetAtom(currentSessionIdAtom) // 只写
```

### 关键常量

- 窗口尺寸：`src/shared/constants.ts` 定义 `WINDOW_INITIAL_WIDTH/HEIGHT`
- 使用无边框窗口 (`frame: false`)，自定义 `TopBar.tsx` 处理拖拽和窗口控制
- 监控采样间隔：`MONITOR_SAMPLING_INTERVAL = 1000`（1 秒）

## 开发命令

```bash
yarn dev          # 开发模式（HMR，自动打开 DevTools）
yarn build:win    # 构建 Windows 安装包（需先 typecheck）
yarn build:mac    # 构建 macOS 安装包
yarn build:linux  # 构建 Linux 安装包
yarn typecheck    # TS 类型检查（node + web）
yarn lint         # ESLint 检查
yarn format       # Prettier 格式化
```

**注意**：

- `yarn build:*` 会先执行 `typecheck`，确保类型安全
- 开发模式会自动开启 DevTools（`src/main/index.ts` 中 `is.dev` 判断）
- 使用 `lint-staged` + `husky` 确保提交前代码质量

## 常见任务

### 添加新的 SSH 操作

1. 在 `src/shared/types/SSH.ts` 添加类型（如 `export type MyOperation = (sessionId: string) => Promise<void>`）
2. 在 `src/main/lib/` 实现逻辑（通常调用 `getSSH(sessionId)`）
3. 在 `src/main/ipc/session.ts` 或相关文件注册 handler
4. 在 `src/preload/index.ts` 的 `ssh` 对象添加方法
5. 更新 `src/preload/index.d.ts` 中 `SSH` 接口

### 添加新的 AI 工具

1. 在 `src/main/lib/ai/tools/` 创建新工具类（继承 `BaseTool`）
2. 实现 `getDefinition()` 返回 `ToolDefinition`（名称、描述、参数 schema）
3. 实现 `execute(context, params)` 处理工具逻辑
4. 在 `src/main/lib/ai/tools/index.ts` 导出新工具
5. 在 `ToolManager` 构造函数中注册工具实例（`registerTool(new MyTool())`）

### 修改 AI 助手行为

**修改系统提示词**：编辑 `src/main/lib/ai/core/Agent.ts` 中的 `buildSystemPrompt()` 方法

**添加工具执行前后钩子**：在 `ToolManager.executeTool()` 中添加逻辑（工具批准检查在此处理）

**自定义工具批准规则**：修改 `ToolManager.shouldAutoApprove()` 方法

### 调试技巧

**IPC 通信调试**：

- Main Process 错误：查看启动 Electron 的终端输出
- Renderer Process 错误：查看 Electron 窗口的 DevTools Console
- IPC 调用追踪：在 `src/main/ipc/*.ts` handler 中添加 console.log

**Shell 事件调试**：

```typescript
// 在 SSH2Wrapper 中添加日志
this.emit('data', data)
console.log('[SSH2Wrapper] Data emitted:', data.substring(0, 50))
```

**数据库调试**：

```typescript
// 查看数据库文件位置
const dbPath = join(app.getPath('userData'), 'app.db')
console.log('Database path:', dbPath)

// 直接查询（仅开发环境）
const db = getDB()
console.log(db.prepare('SELECT * FROM tasks').all())
```

### 修改 UI 主题

- DaisyUI 主题切换：修改 `src/shared/models/Config.ts` 中 `theme.defaultDarkMode`
- Tailwind 配置：项目使用 Vite 原生 TailwindCSS 4.1+ 插件（`@tailwindcss/vite`），配置在 `electron.vite.config.ts` renderer 部分

### 管理 AI 任务历史

- 任务存储：使用 Better-SQLite3 的 `tasks` 表（见 `src/main/lib/database/repositories/TaskRepository.ts`）
- 任务字段：`id`、`session_id`、`prompt`、`response`、`tool_calls`（JSON）、`status`、`created_at`、`updated_at`
- 查询示例：`taskRepo.getTasksBySession(sessionId)` 获取会话所有任务
- 任务管理器：`TaskManager` 提供任务创建、更新、查询和统计接口（如 `getTaskStats()`）

### 调试 AI Agent

**查看 Agent 日志**：

```typescript
// 在 Agent.ts 中启用详细日志
console.log('[Agent] Message:', message)
console.log('[Agent] Tool calls:', toolCalls)
```

**追踪工具执行**：

```typescript
// 在 ToolManager.executeTool() 中添加日志
console.log(`[Tool] Executing ${toolName} with params:`, params)
```

**检查批准队列**：查看 `ToolManager.pendingApprovals` Map 状态（Main Process 控制台）

## 注意事项

- **安全**：`contextIsolation: true`，preload 必须用 `contextBridge` 暴露 API
- **Shell 事件清理**：监听 Shell 事件时，返回取消监听函数（`return () => ssh.off('data', callback)`）
- **连接生命周期**：断开 SSH 时调用 `ssh.dispose()` 并从 `sshConnections` Map 中删除
- **数据库**：必须先 `initDatabase()` 再调用 `getDB()`，app 退出时调用 `closeDatabase()`
- **环境变量**：AI 配置加密需要 `.env` 文件中设置 `SECRET_KEY`（通过 `dotenv` 加载）
- **EventEmitter 清理**：所有 EventEmitter 监听器必须在适当时机清理（使用 `off()` 或 `removeAllListeners()`）
- **IPC 订阅清理**：IPC 事件订阅时要在 `event.sender.on('destroyed', cleanup)` 中清理（避免内存泄漏）
- **工具批准超时**：批准请求有 5 分钟超时（`ToolManager.APPROVAL_TIMEOUT = 5 * 60 * 1000`），超时自动拒绝

## 快速参考

### 常用文件路径

- **IPC 注册**：`src/main/ipc/index.ts`（统一入口）
- **类型定义**：`src/shared/types/` + `src/shared/models/`
- **AI 工具**：`src/main/lib/ai/tools/`
- **数据库 Schema**：`src/main/lib/database/core/Database.ts`（`initializeSchema()` 方法）
- **Preload API**：`src/preload/index.ts` + `index.d.ts`

### 重要文档

- **AI 工具使用**：`docs/AI_TOOLS_GUIDE.md`
- **工具批准机制**：`docs/TOOL_APPROVAL_MECHANISM.md`
- **任务存储**：`docs/TASK_STORAGE_GUIDE.md`
- **AI Agent 使用**：`docs/AI_AGENT_USAGE.md`
