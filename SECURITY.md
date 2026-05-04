# 安全策略与密钥管理

## 1. 凭证存储架构

本项目不在任何打包产物或源代码中内嵌 API 密钥。所有用户凭证均在运行时由用户通过设置面板输入，并按以下优先级持久化：

| 平台 | 存储后端 | 加密方式 | 路径 |
|---|---|---|---|
| **macOS**（Electron） | Electron `safeStorage` | **Keychain** 托管密钥（AES） | `~/Library/Application Support/MOKE Vision One/secure-credentials.bin` |
| **Windows**（Electron） | Electron `safeStorage` | **DPAPI** 用户级加密 | `%APPDATA%\MOKE Vision One\secure-credentials.bin` |
| **Linux**（Electron） | Electron `safeStorage` | `libsecret` / kwallet | `~/.config/MOKE Vision One/secure-credentials.bin` |
| **浏览器 / 加密不可用** | `localStorage`（明文回退） | 无 | 浏览器 IndexedDB/LocalStorage |

### 关键实现文件

- `electron/main.cjs` — `safeStorage.encryptString()` 加解密；IPC handler：`secure-is-available`、`secure-get`、`secure-set`、`secure-delete`
- `electron/preload.cjs` — 通过 `contextBridge` 仅暴露 4 个受限接口
- `services/secureStorage.ts` — 渲染进程统一适配器（自动检测 + 降级）
- `contexts/ApiConfigContext.tsx` — 消费侧，自动迁移旧 `localStorage` 数据到加密存储

### 迁移逻辑

首次启动新版本时：
1. 优先从加密存储读取 `api-config` 键
2. 若为空且 `localStorage.moke_vision_api_config` 有旧数据，自动搬迁
3. 若成功切换到加密存储，删除 `localStorage` 明文副本
4. 若系统加密不可用，保留 `localStorage` 数据直到用户环境可用

## 2. 仓库卫生

### `.gitignore` 已屏蔽

- `.env` / `.env.*`（保留 `.env.example`）
- `secure-credentials.bin`（运行时文件，不应出现在代码目录）
- 私钥：`*.pem` `*.key` `*.keystore` `*.jks` `*.p12` `*.p8` `*.mobileprovision`
- 签名证书目录：`certs/` `.certificates/`
- 构建产物：`dist/` `build/` `release/`

### 已清洗的第三方文档

- `默认模块.openapi.json` 中示例的 AWS AccessKeyId、Bearer Token、签名值已全部替换为 `REDACTED` 占位符（JSON 仍合法）。

## 3. 代码规范

### 必须

- 任何 API 密钥只能通过 `useApiConfig()` 上下文读取
- 日志/控制台禁止打印完整密钥，仅输出前 4 位 + 长度，例如：
  ```ts
  const keyMask = key ? `${key.slice(0, 4)}…(${key.length})` : '(empty)';
  ```
- 网络请求 Header 里的密钥由 `geminiService.ts` / `chatService.ts` 在发出瞬间注入，不保留到外层作用域
- IPC 调用密钥时使用 **固定的少量 channel**（`secure-get` / `secure-set` / `secure-delete`），不要开放通用 eval / exec 通道

### 禁止

- ❌ `hardcoded apiKey = "sk-..."` 直接写入源码
- ❌ 密钥通过 URL query string 传递
- ❌ 密钥写入 `localStorage` / `sessionStorage`（除非 Keychain 不可用且用户同意降级）
- ❌ 把 `.env` 文件 commit 到 Git
- ❌ `webPreferences.nodeIntegration: true`（当前已是 `false`）
- ❌ `webPreferences.contextIsolation: false`（当前已是 `true`）

## 4. Electron 打包安全

`package.json` 中 `build` 配置确认：

- `files` 白名单仅包含 `dist/**/*` 和 `electron/**/*`，不会误打包 `.env` / `build/icon*`（除图标外）/ 源码
- `mac.hardenedRuntime` / `notarize` 建议在正式发布时开启（当前为 ad-hoc 签名，首次打开需用户手动授权）
- `asar` 默认启用（代码被打包在 `app.asar`，阻止简单篡改）

## 5. 发现漏洞的披露方式

请通过私有渠道报告安全问题，不要在公开 Issue 中披露细节。

---

_最后更新：2026-05-02_
