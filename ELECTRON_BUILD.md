# MOKE Vision One — Tauri 2 桌面打包指南

当前桌面应用主框架已经切换为 Tauri 2 + Rust。本文件保留原路径，仅作为新的桌面打包说明。

## 环境准备

确保本机已安装：

- Node.js 18+
- Rust stable toolchain
- 对应平台的 Tauri 构建依赖

应用图标继续放在 `build/` 目录：

- `build/icon.png`
- `build/icon.icns`
- `build/icon.ico`

## 开发命令

```bash
npm install
npm run tauri:dev
```

`tauri:dev` 会先启动 Vite 开发服务器，再由 Tauri 2 加载桌面窗口。

## 构建命令

```bash
npm run tauri:build:win:x64
npm run tauri:build:mac:x64
npm run tauri:build:mac:arm64
```

说明：

- Windows x64 对应目标三元组：`x86_64-pc-windows-msvc`
- macOS Intel 对应目标三元组：`x86_64-apple-darwin`
- macOS Apple Silicon 对应目标三元组：`aarch64-apple-darwin`

## 发布整理

Tauri 原始 bundle 输出位于：

```text
src-tauri/target/<target-triple>/release/bundle/
```

执行下面命令会把当前机器已经构建好的可用安装包复制到 `release/`，并统一命名、生成源码 zip 与 SHA256 文件：

```bash
npm run release:artifacts:partial
```

目标产物命名格式：

- `moke-vision-one-windows-x64-<version>-release.exe`
- `moke-vision-one-darwin-x64-<version>-release.dmg`
- `moke-vision-one-darwin-arm64-<version>-release.dmg`

附加产物：

- `moke-vision-one-source-<version>.zip`
- `moke-vision-one-checksums-<version>.txt`

若要严格校验 issue #3 要求的三类桌面安装包是否都已到位，并生成完整发布集：

```bash
npm run release:artifacts
```

如果希望自动在对应平台上产出三套正式版制品，执行或复用仓库中的 GitHub Actions 工作流：`.github/workflows/tauri-release-artifacts.yml`

## 兼容说明

- `electron/` 目录当前仅保留为历史实现参考，不再参与主打包流程。
- 前端仍沿用原有 `window.electronAPI` 形状，但在 Tauri 运行时会由兼容桥接层接管。
