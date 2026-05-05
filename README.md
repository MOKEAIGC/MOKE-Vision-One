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
