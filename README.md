# MOKE Vision One

MOKE Vision One 是一个基于 React + Vite 的 AI 图像生成桌面应用，当前桌面打包运行时已经切换到 Tauri 2 + Rust。

## 开发

前置要求：Node.js 18+，Rust 工具链（用于 Tauri 桌面运行时）。

1. 安装依赖：`npm install`
2. 纯前端调试：`npm run dev`
3. 桌面端调试：`npm run tauri:dev`

## 构建

- 前端静态资源：`npm run build`
- Windows x64 安装包：`npm run tauri:build:win:x64`
- macOS x64 安装包：`npm run tauri:build:mac:x64`
- macOS arm64 安装包：`npm run tauri:build:mac:arm64`

## 发布产物整理

如果只是把当前机器已经构建好的单平台安装包整理到 `release/`，执行：`npm run release:artifacts:partial`

如果要严格生成 issue #3 要求的完整发布集，执行：`npm run release:artifacts`

该脚本会把 Tauri 输出的安装包复制到 `release/` 并统一重命名为：

- `moke-vision-one-windows-x64-<version>-release.exe`
- `moke-vision-one-darwin-x64-<version>-release.dmg`
- `moke-vision-one-darwin-arm64-<version>-release.dmg`

同时生成：

- `moke-vision-one-source-<version>.zip`
- `moke-vision-one-checksums-<version>.txt`

`npm run release:artifacts` / `npm run release:verify` 会强制要求以下三类桌面安装包都已存在，否则直接失败：

- Windows x64
- macOS x64
- macOS arm64

如果需要一键产出三平台完整制品，使用仓库内的 GitHub Actions 工作流：`.github/workflows/tauri-release-artifacts.yml`

当推送 `v*` tag 时，该工作流还会把最终的 `.exe`、`.dmg`、源码 zip 和 checksum 文件自动上传到 GitHub Release。

Tauri 打包使用的图标资源位于 `src-tauri/icons/`，避免被通用的 `build/` 忽略规则漏掉。

## 疑难排错 / FAQ

下面整理了第一次跑这个项目时最常遇到的几个问题。

### 1. 端口 3000 被占用怎么办？

Vite 默认监听 `3000`。如果该端口已被其他进程占用，可在启动时显式指定一个空闲端口：

```bash
npm run dev -- --port 3001
```

也可以先排查谁在占用 3000：

```bash
# macOS / Linux
lsof -i :3000
# Windows (PowerShell)
netstat -ano | findstr :3000
```

### 2. 第一次运行 `npm run tauri:dev` 为什么这么慢？

`tauri:dev` 会先编译 Rust 端代码以及大量原生依赖。**首次启动通常需要 5–15 分钟**（取决于网络与机器性能），属于正常现象。后续启动会用增量编译缓存，秒级即可。

如果中途看起来"卡住"，可以打开另一个终端观察：

```bash
ls -lh src-tauri/target/debug 2>/dev/null
```

只要文件还在持续生成，就说明编译仍在进行。强烈建议第一次编译时保持网络畅通，并不要中途强杀进程。

### 3. Gemini / 云雾 / OpenAI 等 API Key 在哪里填？

应用运行时**直接在 UI 内的「设置」面板里填写并保存**，无需修改 `.env`。`.env.example` 里的字段仅用于 CI / 自动化测试 / 开发自托管场景，普通用户和日常开发都可以忽略。

### 4. 启动后页面白屏 / 报错怎么排查？

按以下顺序排查通常就能定位问题：

1. **看浏览器控制台**：F12 / Cmd+Option+I，重点看红色报错。最常见的是 API Key 未配置或网络被拦截。
2. **硬刷新**：Cmd+Shift+R（macOS）或 Ctrl+F5（Windows），跳过浏览器缓存。
3. **清理 Vite 缓存后重启**：

   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```
4. **彻底重装依赖**（极少需要）：

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 5. 如何完全停止 dev 进程？

如果 dev server 是在前台运行的，直接按 `Ctrl+C` 即可。如果通过 `nohup` / `&` 等方式放到了后台，可以这样停掉：

```bash
# 按进程名批量结束（推荐）
pkill -f "vite"

# 或者先查 PID 再 kill
ps aux | grep vite | grep -v grep
kill <PID>
```

Tauri 桌面端调试同理：

```bash
pkill -f "tauri"
```

