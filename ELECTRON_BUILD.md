# MOKE Vision One — 桌面应用打包指南

## 📦 环境准备

确保已安装 Node.js 18+ 和 npm。

### 1. 安装依赖

```bash
npm install
```

### 2. 准备应用图标

将应用图标放入 `build/` 目录：

| 文件 | 平台 | 说明 |
|---|---|---|
| `build/icon.png` | 通用 | 至少 512x512 PNG |
| `build/icon.icns` | macOS | macOS 图标格式 |
| `build/icon.ico` | Windows | Windows 图标格式 |

> 💡 如果没有 .icns 和 .ico，electron-builder 会尝试从 icon.png 自动转换。

---

## 🚀 打包命令

### 开发调试（Electron + Vite 热更新）

```bash
npm run electron:dev
```

### 打包 macOS 应用（.dmg）

```bash
npm run electron:build:mac
```

### 打包 Windows 应用（.exe 安装包）

```bash
npm run electron:build:win
```

### 同时打包 macOS + Windows

```bash
npm run electron:build:all
```

---

## 📁 输出目录

打包后的安装文件在 `release/` 目录：

```
release/
├── MOKE Vision One-1.0.0.dmg          # macOS 安装镜像
├── MOKE Vision One Setup 1.0.0.exe    # Windows 安装包
└── ...
```

---

## ⚠️ 注意事项

1. **跨平台打包限制**：
   - macOS 应用（.dmg）只能在 **macOS** 上打包
   - Windows 应用（.exe）可以在 macOS / Windows / Linux 上打包
   
2. **macOS 签名**（可选）：
   如需分发给其他用户，需要 Apple Developer 证书签名。自用可跳过。

3. **Tailwind CSS**：
   当前使用 CDN 版 Tailwind（需联网）。如需完全离线，后续可改为 PostCSS + 本地 Tailwind。

4. **Google Fonts**：
   字体通过 CDN 加载。首次启动需联网加载字体，之后浏览器会缓存。

---

## 🔧 项目结构

```
├── electron/
│   ├── main.cjs          # Electron 主进程
│   └── preload.cjs       # Preload 桥接脚本
├── build/
│   ├── icon.png           # 应用图标
│   ├── icon.icns          # macOS 图标
│   └── icon.ico           # Windows 图标
├── dist/                  # Vite 构建输出（自动生成）
├── release/               # Electron 打包输出（自动生成）
└── package.json           # 含 electron-builder 配置
```
