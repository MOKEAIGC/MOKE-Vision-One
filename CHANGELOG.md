# 更新日志 · Changelog

本项目所有重要变更都会记录在此文件中。

---

## v4.0.0 — MOKE Vision One

> 发布日期：2026-06-14 · 上一版本：v3.8.0
> 完整对比：https://github.com/MOKEAIGC/MOKE-Vision-One/compare/v3.8.0...v4.0.0

这是一次**重大版本升级**，新增三大核心创作模块、全新后端服务与 AI 技能体系，整体应用架构同步重构。本次共改动 70 个文件，新增约 13,000 行代码。

### 重点新功能

#### 1. 无限画布 · Infinite Canvas（全新）
节点式可视化创作工作流，支持自由拖拽、连线编排与时间线管理。
- 无限画布主窗口、缩略图导航（Minimap）、连线层（ConnectionLayer）
- 画布工具栏、素材库（CanvasLibrary）、时间线（CanvasTimeline）
- 丰富的节点类型：
  - `ComfyUINode`（ComfyUI 工作流）
  - `GeneratorNode` / `SmartComposerNode`（生成与智能编排）
  - `ImageNode` / `VideoNode`（图像、视频）
  - `LLMNode`（大模型）
  - `PromptNode`（提示词）
  - `LoopNode`（循环）
  - `OutputNode`（输出）
- 画布引擎与状态管理（`useCanvasEngine`、`canvasStore`）
- 配套后端服务对接（`services/canvasBackendService.ts`）

#### 2. 3D 导演台 · Director 3D（全新）
面向分镜与运镜的三维场景编排工具。
- 场景编辑（Scene）、调度板（BlockingBoard）、视口控制（ViewportControls）
- 相机辅助叠层（CameraOverlay）、坐标辅助叠层（CoordinateOverlay）
- 侧边栏 / 右侧属性面板（Sidebar、RightPanel）
- 场景导出（exporter）与截图（screenshot）、与主程序的捕获桥接（captureBridge）
- 内置 3D 角色模型 `public/models/xbot.glb`
- 角色模型按场景比例归一化缩放，脚底贴地、水平居中

#### 3. AI 技能系统 · Skills（全新）
为对话窗口引入可加载的技能体系。
- 技能加载器（`SkillLoader`）、技能栏（`SkillsBar`）
- 技能服务与注册（`services/chatSkills.ts`）
- 对话窗口（ChatWindow）集成技能调用

#### 4. 后端服务 · Server（全新）
- 全新 Python 服务 `server/main.py`，提供画布/生成相关后端能力
- 内置多套 ComfyUI 工作流：
  - `Flux2-Klein`、`LTXDirectorv2-API`、`Z-Image`、`Z-Image-Enhance`、`upscale`、`2511`
- 依赖清单 `server/requirements.txt`、环境样例 `server/.env.example`
- 一键启动脚本 `start-server.sh`

### 架构与体验优化
- 新增应用外壳 `AppShell`，重构 `App.tsx` 入口与窗口组织
- 底部坞栏（BottomDock）、侧边导轨（SideRail）等交互细节优化
- 交互式粒子（InteractiveParticles）等视觉组件微调

### 维护性变更
- 版本号升级：`package.json` / `package-lock.json` / `src-tauri/Cargo.toml` 由 `3.8.0` → `4.0.0`（`tauri.conf.json` 自动继承）
- 更新 `.gitignore`，补充后端环境与凭证忽略规则
- 移除旧的 `.github/workflows/tauri-release-artifacts.yml` 发布工作流
- 完善 `README.md` 说明

### 升级提示
- 使用无限画布 / 3D 导演台的生成能力前，需启动后端服务：
  ```bash
  ./start-server.sh
  ```
  并参考 `server/.env.example` 配置环境变量（API 密钥等）。
- 后端依赖：`pip install -r server/requirements.txt`。
