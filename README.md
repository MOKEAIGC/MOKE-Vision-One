# MOKE Vision One
小红书：https://www.xiaohongshu.com/user/profile/599e5be55e87e741c05a6bff

微信公众号：https://mp.weixin.qq.com/s/YZZt-BUuOm-npJsGd7nlJQ

e-mail:yu8231593@gmail.com

MOKE Vision One 是一个基于 React + Vite 的 AI 图像生成桌面应用，当前桌面打包运行时已经切换到 Tauri 2 + Rust。

## 🎨 Infinite-Canvas 集成

本项目已整合 [Infinite-Canvas](https://github.com/hero8152/Infinite-Canvas) 全部功能：

### 新增功能
- **多平台 AI 图片生成**：支持 OpenAI / Gemini / APIMart / ModelScope / 火山引擎 / RunningHub 六大平台
- **视频生成**：支持 Veo3 / Sora / 通义万相 / 豆包 Seedance 等视频模型
- **ComfyUI 工作流**：连接本地 ComfyUI 实例，支持自定义工作流和负载均衡
- **ModelScope 免费生图**：集成阿里魔搭平台免费模型（Z-Image-Turbo 等）
- **素材库管理**：分类管理图片/视频素材，画布节点直接引用
- **实时协作**：WebSocket 实时连接，多用户在线计数
- **智能画布 Composer**：一站式多引擎、多模式智能生成控制
- **画布后端持久化**：服务端画布存储，支持回收站和恢复

### 新增画布节点
| 节点 | 功能 |
|------|------|
| ComfyUI | 连接 ComfyUI 后端执行工作流 |
| Composer | 智能生成控制器（API/ModelScope/ComfyUI 多引擎切换） |
| Asset | 素材库节点，从素材库选择图片/视频 |

### 启动方式

```bash
# 1. 启动后端服务（Infinite-Canvas 功能）
./start-server.sh

# 2. 启动前端（另开终端）
npm run dev

# 3. 访问 http://localhost:3000
```

### 后端配置

编辑 `server/.env` 文件：

```env
# API 平台配置
API_BASE_URL=https://api.openai.com
API_KEY=sk-xxx
API_PROTOCOL=openai

# Gemini
GEMINI_API_KEY=xxx

# ModelScope（阿里魔搭免费生图）
MODELSCOPE_TOKEN=xxx

# ComfyUI 实例
COMFYUI_INSTANCES=[{"url":"http://127.0.0.1:8188","name":"Local"}]
```

### 项目结构

```
├── server/                  # Python 后端（FastAPI）
│   ├── main.py              # 主服务文件
│   ├── requirements.txt     # Python 依赖
│   ├── .env.example         # 环境变量模板
│   ├── workflows/           # ComfyUI 工作流
│   ├── data/                # 画布/对话数据存储
│   ├── output/              # 生成图片/视频输出
│   └── assets/              # 上传素材
├── services/
│   └── canvasBackendService.ts  # 前端与后端通信层
├── components/canvas/
│   ├── nodes/ComfyUINode.tsx    # ComfyUI 节点
│   ├── nodes/SmartComposerNode.tsx  # 智能 Composer 节点
│   ├── nodes/AssetNode.tsx      # 素材库节点
│   ├── CanvasProviderPanel.tsx  # Provider 配置面板
│   ├── CanvasAssetPanel.tsx     # 素材库管理面板
│   └── CanvasWorkflowPanel.tsx  # 工作流管理面板
└── start-server.sh          # 一键启动后端
```

<img width="1377" height="857" alt="image" src="https://github.com/user-attachments/assets/7764ffc0-dac8-40e7-b955-1235c82a181e" />
<img width="1440" height="664" alt="3c7e62b118b1d0d901bae1fe3528570e" src="https://github.com/user-attachments/assets/eb35f20c-b96d-46d2-a39b-5ad4a1c1d15d" />
<img width="1440" height="776" alt="cb3fe4ace9c8a454f46a79272a95f58f" src="https://github.com/user-attachments/assets/c63966ad-32a8-4a92-8a46-9ba74bf12c5a" />
<img width="1440" height="702" alt="f9d9e703177d94ad15ba72f618ebee2d" src="https://github.com/user-attachments/assets/4e582162-ecc4-4f3e-ae02-5ef55faa2afb" />
<img width="1440" height="897" alt="0037c0c376c33dc21413bf465ac5aceb" src="https://github.com/user-attachments/assets/5047dcd9-b02f-4bce-b3bc-4da5df4682ed" />
<img width="1370" height="849" alt="image" src="https://github.com/user-attachments/assets/90e985e6-de50-44c2-ad96-75d7a563f856" />
生成双语版本

2026-05-12 07:53
answerRole
ima
引用 7 篇资料作为参考
logo-0
好的，我已经阅读了你提供的所有搜索结果。根据你的要求，我将为你生成MOKE Vision One介绍文本的双语版本（中文+英文）。我会在适当位置引用我参考的搜索结果原文。

MOKE Vision One：你的桌面AI摄影师已上线！
MOKE Vision One: Your Desktop AI Photographer Is Live!
定位：极限物理·计算摄影终端
Positioning: Ultimate Physical·Computational Photography Terminal

设计理念：“光即数据，无形之像”
Design Philosophy: "Light is Data, The Formless Image"

🔥 5分钟快速上手 / 5-Minute Quick Start
安装超级简单 / Installation Made Easy
无论你是Mac用户还是Windows用户，安装过程都像喝水一样简单：

平台 Platform	安装方式 Installation Method
macOS	下载DMG → 拖进Applications Download DMG → Drag to Applications
Windows	双击EXE → 选择安装路径 → 完成 Double-click EXE → Choose install path → Done
小提示 / Tips：
Mac首次打开可能会被系统拦截，右键点击App选择“打开”即可。Windows用户遇到SmartScreen告警，点击“更多信息”→“仍要运行”就OK啦~

On Mac, if blocked, right-click the App and select "Open". Windows users click "More Info" → "Run Anyway" when SmartScreen appears.

配置API：唯一需要动脑的一步 / Configuring API: The Only Brain-Intensive Step
启动App后，点击右上角的⚙齿轮图标，进入API设置：

Launch the App, click the ⚙ gear icon in the top-right corner, and enter API settings.

去Google AI Studio获取你的Gemini API Key

Go to Google AI Studio to get your Gemini API Key

填入Key，其他保持默认

Enter the Key, leave others as default

点击“测试连接”看到绿色勾号就搞定！

Click "Test Connection" and see a green checkmark — done!

放心使用 / Privacy Guaranteed：
你的Key会被系统级加密存储，不会泄露。

Your Key is encrypted at the system level (macOS Keychain / Windows DPAPI) and will not leak.

📷 主界面：像专业相机一样优雅 / Main Interface: As Elegant as a Professional Camera
中央取景器 / Central Viewfinder： 就像相机的取景框，在这里输入你的创意提示词。

Just like a camera's viewfinder — input your creative prompts here.

底部Dock / Bottom Dock： 切换模式、按快门拍照。
Switch modes, press the shutter to capture.

左侧侧栏 / Left Sidebar： 调整相机参数、浏览画廊、AI对话。
Adjust camera parameters, browse gallery, AI conversation.

📸 三种拍摄模式 / Three Shooting Modes
模式 Mode	说明 Description
T2I（文生图 / Text-to-Image）	纯文字变图片 / Transform pure text into images
I2I（图生图 / Image-to-Image）	参考图+文字生成新图 / Reference image + text generates new image
🎯 相机参数：不只是噱头 / Camera Parameters: Not Just Gimmicks
你以为这些参数只是摆设？不，它们能让你的AI摄影更有灵魂！

You think these parameters are just for show? No, they give your AI photography more soul!

参数 Parameter	范围 Range	效果 Effect
焦段 Focal Length	24mm–200mm	广角or长焦氛围 / Wide-angle or telephoto atmosphere
光圈 Aperture	f/1.0–f/16	虚化or全清晰 / Blur or full clarity
ISO	100–6400	暗光/颗粒感 / Low light/graininess
画幅 Aspect Ratio	多种比例 / Multiple ratios	横屏/竖屏/方形 / Landscape/Portrait/Square
温馨提示 / Friendly Reminder：
这些参数会以文字形式注入到提示词中，影响生成风格。真正决定质量的是你的提示词和参考图噢~

These parameters are injected as text into your prompt, influencing the generated style. The real quality depends on your prompt and reference image!

🎬 高级工具：专业创作必备 / Advanced Tools: Professional Creativity Essentials
导演甲板 / Director's Deck
多镜头分镜创作工作台，适合短视频创作者、广告设计师。把一组图片排列成“镜头列表”，批量生成分镜稿，支持导出导入工程文件。

Multi-shot storyboard creation workspace, perfect for short video creators and ad designers. Arrange images into a "shot list," batch-generate storyboards, with export/import support for project files.

Seedance舞动提示词 / Seedance Dancing Prompts
专为视频模型生成结构化的提示词，内置镜头运动、转场、人物动作、光线等词库，输出可一键复制到视频平台。

Generates structured prompts specifically for video models, with built-in lexicons for camera movements, transitions, character actions, lighting, etc. Output can be copied to video platforms with one click.

胶片系统 / Film System
柯达、富士、哈苏等多种风格一键添加，自定义风格还可以跨会话复用。

Instantly add Kodak, Fuji, Hasselblad, and many other film styles. Custom styles can be reused across sessions.

AI对话窗口 / AI Chat Window
与Gemini对话，AI回复中的prompt代码块可一键添加到主取景器。超级适合灵感枯竭时找找灵感！

Chat with Gemini — AI response prompt code blocks can be added to the main viewfinder with one click. Perfect for when you're out of inspiration!

💾 自动化与批量生成 / Automation & Batch Generation
自动保存 / Auto-Save： 开启后每次生成自动保存PNG图片和提示词文本，再也不怕忘记保存！

When enabled, automatically saves PNG images and prompt text after each generation — never worry about forgetting to save again!

批量生成 / Batch Generation： 选择1/2/4张，串行执行防限流。某张失败不会中断整批，最后会告诉你失败详情。

Select 1/2/4 images, executed serially to prevent rate limiting. A single failure won't interrupt the entire batch, and you'll be informed of failure details at the end.

⌨️ 快捷键一览（效率党必看）/ Shortcuts Overview (For Efficiency Enthusiasts)
操作 Action	快捷键 Shortcut
拍照 / Capture	Enter
换行 / New Line	Shift+Enter
关闭浮层 / Close Overlay	Esc
清空提示词 / Clear Prompt	Ctrl/⌘+K
字号放大/缩小 / Zoom In/Out	Ctrl/⌘+ +/-
唤出参考图 / Invoke Reference Image	@
🔧 常见问题快速解决 / Quick FAQ
问题 Problem	解决方法 Solution
生成失败，提示API key not valid	API Key过期或错误，重新获取一个。 The API Key has expired or is incorrect — get a new one.
总是timeout	地区或网络问题，填Base URL走中转站。 Regional or network issue — fill in a Base URL for a proxy.
生成黑图 / Black images generated	触发安全拦截，去掉敏感词试试。 Triggered safety filters — try removing sensitive words.
批量生成失败 / Batch generation failed	速率限制，降到1张或换更高配额的Key。 Rate limited — reduce to 1 image or switch to a higher-quota Key.
🔒 隐私安全有保障 / Privacy & Security Guaranteed
API Key： 系统级加密（macOS Keychain/Windows DPAPI）
System-level encryption (macOS Keychain / Windows DPAPI)

所有AI请求直连Google Gemini，不会回传给MOKE服务器
All AI requests go directly to Google Gemini — no data is sent back to MOKE servers.

画廊图片仅存内存，关闭即销毁
Gallery images are stored only in memory — destroyed upon closure.

想要永久保存？开启自动保存！
Want to save permanently? Enable auto-save!

💡 总结 / Summary
MOKE Vision One不是传统意义上的“AI绘图软件”，它更像是一台有灵魂的虚拟量子相机。从界面设计到交互逻辑，都在营造真实的摄影体验。

MOKE Vision One is not a traditional "AI drawing software" — it's more like a soulful virtual quantum camera. From interface design to interaction logic, everything creates an authentic photography experience.

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

