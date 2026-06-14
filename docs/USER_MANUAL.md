# MOKE Vision One 用户手册

> 版本：v4.0.0 · 适用平台：macOS / Windows · 设计理念：光即数据，无形之像
>
> MOKE Vision One 不是传统意义上的"AI 绘图软件"，它更像是一台**有灵魂的虚拟量子相机**。从界面设计到交互逻辑，都在营造真实的摄影创作体验。

---

## 目录

1. [产品简介](#1-产品简介)
2. [安装](#2-安装)
3. [API 配置（必做）](#3-api-配置必做)
4. [界面总览](#4-界面总览)
5. [核心功能详解](#5-核心功能详解)
   - 5.1 [虚拟量子相机（主取景器）](#51-虚拟量子相机主取景器)
   - 5.2 [相机参数](#52-相机参数)
   - 5.3 [无限画布 Infinite Canvas](#53-无限画布-infinite-canvas)
   - 5.4 [3D 导演台 Director 3D](#54-3d-导演台-director-3d)
   - 5.5 [导演甲板 Director Deck](#55-导演甲板-director-deck)
   - 5.6 [AI 技能系统 & 对话窗口](#56-ai-技能系统--对话窗口)
   - 5.7 [胶片系统 Film System](#57-胶片系统-film-system)
   - 5.8 [Seedance 舞动提示词](#58-seedance-舞动提示词)
   - 5.9 [视频生成](#59-视频生成)
   - 5.10 [卫星 / 地球视图](#510-卫星--地球视图)
   - 5.11 [自动保存与批量生成](#511-自动保存与批量生成)
6. [后端服务（画布持久化）](#6-后端服务画布持久化)
7. [快捷键一览](#7-快捷键一览)
8. [隐私与安全](#8-隐私与安全)
9. [常见问题 FAQ](#9-常见问题-faq)
10. [开发与构建](#10-开发与构建)

---

## 1. 产品简介

MOKE Vision One 是一款基于 **React + Vite** 构建、桌面运行时采用 **Tauri 2 + Rust** 的 AI 图像 / 视频生成创作终端。

它把 AI 创作抽象成"摄影"：你在取景器里输入创意，调节焦段、光圈、ISO 等相机参数，按下快门完成"拍摄"。v4.0.0 在此基础上引入了三大专业创作工作台。

**核心能力一览：**

| 能力 | 说明 |
|------|------|
| 多平台 AI 生图 | OpenAI / Gemini / APIMart / ModelScope / 火山引擎 |
| 视频生成 | Veo3 / Sora / 通义万相 / 豆包 Seedance |
| 无限画布 | 节点式可视化创作工作流 |
| 3D 导演台 | 三维分镜与运镜编排 |
| AI 技能系统 | 对话窗口可加载技能模块 |
| 胶片系统 | 柯达 / 富士 / 哈苏等胶片风格 |
| 自动化 | 自动保存、批量生成 |

---

## 2. 安装

无论 macOS 还是 Windows，安装都非常简单。

| 平台 | 安装方式 |
|------|----------|
| **macOS** | 下载 `.dmg` → 拖入 Applications |
| **Windows** | 双击 `.exe` → 选择安装路径 → 完成 |

下载地址：<https://github.com/MOKEAIGC/MOKE-Vision-One/releases/tag/v4.0.0>

安装包命名规则：

- `moke-vision-one-windows-x64-<version>-release.exe`
- `moke-vision-one-darwin-x64-<version>-release.dmg`（Intel 芯片 Mac）
- `moke-vision-one-darwin-arm64-<version>-release.dmg`（Apple Silicon / M 系列）

> **首次打开提示**
> - **macOS**：若被系统拦截，**右键点击 App → 选择"打开"**即可。
> - **Windows**：遇到 SmartScreen 告警，点击**"更多信息" → "仍要运行"**。

---

## 3. API 配置（必做）

这是唯一需要"动脑"的一步。应用运行时**直接在 UI 内的「设置」面板填写并保存**，无需修改任何文件。

**步骤：**

1. 启动应用后，点击右上角的 **⚙ 齿轮图标** 进入 API 设置。
2. 选择平台（如 Gemini），填入对应的 **API Key**。
   - Gemini Key 获取：前往 [Google AI Studio](https://aistudio.google.com/)。
3. 其余选项保持默认即可。
4. 点击 **「测试连接」**，看到绿色勾号 ✅ 即配置成功。

**进阶配置：**

- **Base URL（中转站）**：若直连超时或所在地区受限，可填入中转站地址走代理。
- **多平台并存**：可同时配置多个平台密钥，在生成时自由切换。

> **关于 `.env`**：`server/.env.example` 里的字段仅用于 CI / 自动化测试 / 开发自托管场景。普通用户和日常使用都可以忽略，**只在 UI 设置面板配置即可**。

---

## 4. 界面总览

| 区域 | 位置 | 作用 |
|------|------|------|
| **中央取景器（Viewfinder）** | 屏幕中央 | 输入创意提示词、查看生成结果 |
| **底部 Dock（BottomDock）** | 屏幕底部 | 切换拍摄模式、按下快门 |
| **左侧侧栏 / 侧导轨（SideRail）** | 屏幕左侧 | 调整相机参数、浏览画廊、AI 对话 |
| **顶部工具栏（HeaderBar）** | 屏幕顶部 | 设置入口、主题 / 语言切换、字号调节 |

应用支持**中英双语**与**明暗主题**切换，并提供全局字号调节（以根字号为锚点等比缩放整站）。

---

## 5. 核心功能详解

### 5.1 虚拟量子相机（主取景器）

主取景器是应用的核心。把它想象成相机的取景框。

**两种拍摄模式：**

| 模式 | 全称 | 说明 |
|------|------|------|
| **T2I** | Text-to-Image（文生图） | 纯文字描述生成图片 |
| **I2I** | Image-to-Image（图生图） | 参考图 + 文字生成新图 |

**操作流程：**

1. 在底部 Dock 选择模式（T2I / I2I）。
2. 在取景器输入提示词；I2I 模式下用 `@` 唤出 / 添加参考图。
3. 按 **`Enter`**（快门）开始生成。
4. 生成结果显示在取景器中，可放大查看、保存或加入画廊。

> 真正决定画面质量的是**你的提示词和参考图**，相机参数则负责注入风格氛围。

---

### 5.2 相机参数

相机参数会以文字形式**注入提示词**，从而影响生成风格。它们不是摆设，而是让 AI 摄影更有灵魂的关键。

| 参数 | 范围 | 效果 |
|------|------|------|
| 焦段 Focal Length | 24mm – 200mm | 广角张力 / 长焦压缩氛围 |
| 光圈 Aperture | f/1.0 – f/16 | 背景虚化 / 全画面清晰 |
| ISO 感光度 | 100 – 6400 | 暗光表现 / 胶片颗粒感 |
| 画幅 Aspect Ratio | 多种比例 | 横屏 / 竖屏 / 方形构图 |

在左侧侧栏的控制面板（ControlPanel）中调节这些参数。

---

### 5.3 无限画布 Infinite Canvas

节点式可视化创作工作流。把每个生成步骤抽象成节点，自由拖拽连线，构建可复用的自动化流水线。

**节点类型：**

| 节点 | 功能 |
|------|------|
| Generator | 通用生成器节点 |
| SmartComposer | 智能编排控制器（API / ModelScope 多引擎切换） |
| Image / Video | 图像、视频素材节点 |
| LLM | 大模型对话节点 |
| Prompt | 提示词节点 |
| Loop | 循环节点（批量 / 迭代） |
| Output | 输出节点 |
| Asset | 从素材库选择图片 / 视频 |

**核心特性：**

- **Minimap 缩略图导航**：快速定位大画布中的节点。
- **时间线（CanvasTimeline）**：管理生成节点的时序。
- **素材库（CanvasLibrary）**：分类管理图片 / 视频，画布节点直接引用。
- **画布持久化**：服务端存储，支持**回收站与一键恢复**。
- **实时协作**：WebSocket 实时连接，多用户在线计数。

> 使用无限画布的生成能力前，需要先启动后端服务（见 [第 6 节](#6-后端服务画布持久化)）。

---

### 5.4 3D 导演台 Director 3D

面向分镜与运镜的三维场景编排工具。在三维空间里放置角色、规划走位、控制相机轨迹，用真实的镜头语言指导 AI 创作。

**功能组成：**

- **场景编辑（Scene）**：在三维场景中布置角色与道具。
- **调度板（BlockingBoard）**：规划角色走位与镜头调度。
- **视口控制（ViewportControls）**：旋转、缩放、平移视角。
- **相机辅助叠层（CameraOverlay）** / **坐标辅助叠层（CoordinateOverlay）**：可视化相机参数与空间坐标。
- **导出（exporter）与截图（screenshot）**：导出场景或截图，并可桥接到主程序作为生成参考。

**关于角色模型：** 内置 3D 角色模型 `xbot.glb`，已按场景真实比例**归一化到 180cm**（脚底贴地、水平居中），确保与场景比例严格对应。

---

### 5.5 导演甲板 Director Deck

多镜头分镜创作工作台，适合短视频创作者、广告设计师。

- 把一组图片排列成**"镜头列表"**。
- **批量生成**分镜稿。
- 支持**导出 / 导入工程文件**，方便存档与协作。

---

### 5.6 AI 技能系统 & 对话窗口

**AI 对话窗口（ChatWindow）：**

- 与 AI（如 Gemini）对话获取创作灵感。
- AI 回复中的 **prompt 代码块可一键添加到主取景器**，灵感枯竭时尤其好用。

**AI 技能系统（Skills）：**

- 对话窗口顶部的**技能栏（SkillsBar）**可动态加载技能模块。
- 通过**技能加载器（SkillLoader）**为 AI 助手赋予专项能力。
- 加载后，对话即可调用对应技能完成更专业的任务。

---

### 5.7 胶片系统 Film System

为画面注入真实胶片质感。

- 内置 **柯达（Kodak）、富士（Fuji）、哈苏（Hasselblad）** 等多种胶片风格，一键添加。
- 支持**自定义风格**，并可**跨会话复用**。
- 可锁定某个胶片风格，使其持续作用于后续生成。

---

### 5.8 Seedance 舞动提示词

专为视频模型生成结构化提示词的工具。

- 内置**镜头运动、转场、人物动作、光线**等词库。
- 通过可视化选择组合出结构化提示词。
- 输出可**一键复制**到视频生成平台使用。

---

### 5.9 视频生成

支持主流视频模型：**Veo3 / Sora / 通义万相 / 豆包 Seedance**。

- 在画布的 Video 节点或对应面板中调用。
- 结合 Seedance 舞动提示词可获得更可控的运镜与动作效果。

---

### 5.10 卫星 / 地球视图

内置地球 / 卫星视图（EarthView / SatelliteLink），基于地图能力为创作提供真实地理参考，适合需要地点 / 地貌素材的场景创作。

---

### 5.11 自动保存与批量生成

**自动保存（AutoSave）：**

- 开启后，每次生成会自动保存 **PNG 图片**和**提示词文本**到指定目录。
- 在自动保存面板（AutoSavePanel）中配置保存路径与开关。

**批量生成（Batch Generation）：**

- 可选择单次生成 **1 / 2 / 4 张**。
- **串行执行**以防触发平台限流。
- 某一张失败**不会中断整批**，结束后会汇总告知失败详情。

---

## 6. 后端服务（画布持久化）

无限画布、画布持久化等功能依赖本地 Python 后端服务。

**启动步骤：**

```bash
# 1. 安装依赖（首次）
pip install -r server/requirements.txt

# 2. 一键启动后端
./start-server.sh

# 3. 启动前端（另开终端）
npm run dev

# 4. 访问 http://localhost:3000
```

**后端环境配置（`server/.env`）：**

```env
# API 平台配置
API_BASE_URL=https://api.openai.com
API_KEY=sk-xxx
API_PROTOCOL=openai

# Gemini
GEMINI_API_KEY=xxx

# ModelScope（阿里魔搭免费生图）
MODELSCOPE_TOKEN=xxx
```

**后端目录结构：**

```
server/
├── main.py              # 主服务文件（FastAPI）
├── requirements.txt     # Python 依赖
├── .env.example         # 环境变量模板
├── workflows/           # 生成工作流配置
├── data/                # 画布 / 对话数据存储
├── output/              # 生成图片 / 视频输出
└── assets/              # 上传素材
```

---

## 7. 快捷键一览

| 操作 | 快捷键 |
|------|--------|
| 拍照 / 生成 | `Enter` |
| 提示词换行 | `Shift + Enter` |
| 关闭浮层 | `Esc` |
| 清空提示词 | `Ctrl / ⌘ + K` |
| 字号放大 / 缩小 | `Ctrl / ⌘ + +` / `Ctrl / ⌘ + -` |
| 唤出参考图 | `@` |

---

## 8. 隐私与安全

- **API Key 系统级加密存储**：macOS Keychain / Windows DPAPI，不会泄露。
- **直连模型平台**：AI 请求直连对应平台（如 Google Gemini），**不会回传给 MOKE 服务器**。
- **画廊图片仅存内存**：默认关闭即销毁；想永久保存请开启**自动保存**。

---

## 9. 常见问题 FAQ

### 生成相关

| 问题 | 解决方法 |
|------|----------|
| 提示 `API key not valid` | API Key 过期或错误，重新获取一个填入。 |
| 总是 timeout | 地区或网络问题，在设置里填 Base URL 走中转站。 |
| 生成黑图 | 触发了安全拦截，去掉敏感词重试。 |
| 批量生成失败 | 速率限制，降到 1 张或更换更高配额的 Key。 |

### 启动 / 运行相关

**Q：端口 3000 被占用怎么办？**

```bash
npm run dev -- --port 3001
```

排查占用：

```bash
# macOS / Linux
lsof -i :3000
# Windows (PowerShell)
netstat -ano | findstr :3000
```

**Q：第一次运行 `npm run tauri:dev` 为什么这么慢？**

首次会编译 Rust 端代码与大量原生依赖，**通常需要 5–15 分钟**，属于正常现象。后续启动有增量缓存，秒级即可。请保持网络畅通，不要中途强杀进程。可在另一终端观察编译进度：

```bash
ls -lh src-tauri/target/debug 2>/dev/null
```

**Q：启动后白屏 / 报错怎么排查？**

1. **看控制台**：`F12` / `Cmd+Option+I`，重点看红色报错（最常见是 API Key 未配置或网络被拦截）。
2. **硬刷新**：`Cmd+Shift+R`（macOS）/ `Ctrl+F5`（Windows）。
3. **清理 Vite 缓存**：
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```
4. **彻底重装依赖**（极少需要）：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Q：如何完全停止 dev 进程？**

前台运行直接 `Ctrl+C`。后台运行：

```bash
pkill -f "vite"      # 前端
pkill -f "tauri"     # 桌面端
```

---

## 10. 开发与构建

**前置要求：** Node.js 18+、Rust 工具链（Tauri 桌面运行时）、Python 3（后端服务）。

**开发：**

```bash
npm install            # 安装依赖
npm run dev            # 纯前端调试
npm run tauri:dev      # 桌面端调试
npm run dev:full       # 同时启动后端 + 前端
```

**构建：**

```bash
npm run build                    # 前端静态资源
npm run tauri:build:win:x64      # Windows x64 安装包
npm run tauri:build:mac:x64      # macOS x64 安装包
npm run tauri:build:mac:arm64    # macOS arm64 安装包
```

**发布产物整理：**

```bash
npm run release:artifacts:partial   # 整理当前平台已构建的安装包到 release/
npm run release:artifacts           # 严格生成完整三平台发布集
```

完整三平台一键产出可使用 GitHub Actions 工作流；推送 `v*` tag 时会自动把 `.exe` / `.dmg` / 源码 zip / checksum 上传到 GitHub Release。

---

## 联系与关注

- **GitHub**：<https://github.com/MOKEAIGC/MOKE-Vision-One>
- **小红书**：<https://www.xiaohongshu.com/user/profile/599e5be55e87e741c05a6bff>
- **微信公众号**：<https://mp.weixin.qq.com/s/YZZt-BUuOm-npJsGd7nlJQ>
- **邮箱**：yu8231593@gmail.com

---

> MOKE Vision One v4.0.0 · Built with React + Vite + Tauri 2 · © 2026 MOKE
