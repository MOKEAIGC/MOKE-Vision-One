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

构建完成后执行：`npm run release:artifacts`

该脚本会把 Tauri 输出的安装包复制到 `release/` 并统一重命名为：

- `moke-vision-one-windows-x64-<version>-release.exe`
- `moke-vision-one-darwin-x64-<version>-release.dmg`
- `moke-vision-one-darwin-arm64-<version>-release.dmg`

同时生成：

- `moke-vision-one-source-<version>.zip`
- `moke-vision-one-checksums-<version>.txt`

如果需要校验三类桌面安装包是否都已准备齐全，执行：`npm run release:verify`
