# AshTerminal Copilot Instructions

## 项目概述

AshTerminal 是一个基于 Electron + React + TypeScript 的智能远程 SSH 终端应用，支持多会话管理、文件传输、系统监控和 AI 助手集成。

## 架构要点

### 三层进程架构

- **Main Process** (`src/main/`): Electron 主进程，处理系统级操作
  - `lib/` 包含核心业务逻辑（SSH连接池、Shell管理、配置存储）
  - `ipc/` 包含所有 IPC handler 注册，按功能模块拆分
- **Preload** (`src/preload/`): 安全桥接层，暴露 `window.electron`、`window.context`、`window.ssh` API
- **Renderer** (`src/renderer/`): React UI 层，使用 Jotai 进行状态管理

### IPC 通信模式

```
Renderer → Preload (contextBridge) → Main (ipcMain.handle)
```

- 类型定义在 `src/shared/types/` 中集中管理
- 每个 IPC 方法需要在三处同步：`shared/types`、`preload/index.ts`、`main/ipc/*.ts`

### SSH 连接管理

- `SSH2Wrapper` (`src/main/lib/SSH2Wrapper.ts`): 封装 ssh2 库，提供连接、Shell、SFTP 操作
- `sshPool` (`src/main/lib/sshPool.ts`): 全局 SSH 连接池，通过 sessionId 管理连接生命周期
- 交互式 Shell 通过事件机制（`data`/`close`/`error`）与渲染进程通信

## 开发命令

```bash
yarn dev          # 启动开发模式（支持 HMR）
yarn build:win    # 构建 Windows 安装包
yarn typecheck    # 运行 TypeScript 类型检查
yarn lint         # ESLint 检查
```

## 关键约定

### 路径别名

在 `electron.vite.config.ts` 中定义：

- Main: `@/lib` → `src/main/lib`, `@shared` → `src/shared`
- Renderer: `@/components`, `@/hooks`, `@/store`, `@/services`, `@shared`

### 状态管理

使用 Jotai atoms，按功能分文件存放在 `src/renderer/src/store/`：

- `SessionStore.ts`: SSH 会话和连接状态
- `AreaAtom.ts`: UI 区域展开/折叠状态
- `ModalAtom.ts`: 模态框开关状态

### 组件结构

组件按功能模块组织在 `src/renderer/src/components/`：

- 每个模块目录导出 `*Main`（容器）和 `*Content`（内容）组件
- 使用 DaisyUI + TailwindCSS 进行样式设计

### 类型定义位置

- 数据模型: `src/shared/models/` (如 `SSHConfig`, `FileInfo`, `AppConfig`)
- API 类型: `src/shared/types/` (如 `SSH.ts` 定义所有 SSH 相关方法签名)
- Preload 类型声明: `src/preload/index.d.ts` 扩展 `Window` 接口

### 添加新 IPC 功能

1. 在 `src/shared/types/` 添加类型定义
2. 在 `src/main/lib/` 实现业务逻辑
3. 在 `src/main/ipc/` 注册 handler
4. 在 `src/preload/index.ts` 暴露给渲染进程
5. 更新 `src/preload/index.d.ts` 类型声明

## 注意事项

- 窗口使用 `frame: false` 无边框模式，自定义 `DraggableTopBar` 处理拖拽
- 配置持久化使用 `electron-store`，需要通过 `initConfigStore()` 初始化后使用
- SSH 连接支持密码和私钥两种认证方式
