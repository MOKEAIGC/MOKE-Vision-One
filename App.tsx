// 文件路径: App.tsx
// 重构为垂直滚动区块布局 — 工业时尚风格
import React, { useState, useEffect, useCallback } from 'react';
import { CameraMode, CameraSettings, CapturedImage } from './types';
import { Viewfinder } from './components/Viewfinder';
import { SettingsPanel } from './components/SettingsPanel';
import { Gallery } from './components/Gallery';
import { IntroPage } from './components/IntroPage';
import { ImageLightbox } from './components/ImageLightbox';
import { EarthView } from './components/EarthView';
import { FilmSystem } from './components/FilmSystem';
import { ApiConfigPanel } from './components/ApiConfigPanel';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ensureApiKey } from './services/geminiService';
import { generateModelImage } from './services/imageGenerationService';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ApiConfigProvider, resolveActiveImageRuntimeConfig, useApiConfig } from './contexts/ApiConfigContext';
import { DirectorDeckWindow } from './components/director/DirectorDeckWindow';
import { SatelliteLinkWindow } from './components/satellite/SatelliteLinkWindow';
import { ModelRegistryPanel } from './components/ModelRegistryPanel';
import { SeedancePromptWindow } from './components/seedance/SeedancePromptWindow';
import { GlobalAssetProvider } from './contexts/GlobalAssetContext';
import { AutoSavePanel } from './components/AutoSavePanel';
import { AutoSaveSettings, loadAutoSaveSettings, autoSaveImage, autoSaveText } from './services/autoSaveService';
import { AttachedImage } from './components/PromptInput';
import { InteractiveParticles } from './components/effects/InteractiveParticles';
import { IndustrialDecorBundle } from './components/effects/IndustrialDecorBundle';
import { HeaderBar } from './components/HeaderBar';
import { BottomDock } from './components/BottomDock';
import { SideRail } from './components/SideRail';
import { ChatProvider } from './contexts/ChatContext';
import { ChatWindow } from './components/chat/ChatWindow';
import { PromptAppendProvider, usePromptAppendRegistrar } from './contexts/PromptAppendContext';
import { ApiSettingsFab } from './components/ApiSettingsFab';
// IntroPage 退出过渡协调器：消除进入 Vision One 时 Logo 延时消失的卡顿
import { useIntroExitTransition } from './components/IntroExitTransition';
// 全局字体大小调节 —— 以 html 根字号为锚点，配合 Tailwind rem 体系实现全站等比缩放
import { FontSizeProvider } from './contexts/FontSizeContext';
import { FontSizeControl } from './components/FontSizeControl';
// 单次生成数量类型（1 / 2 / 4）
import type { BatchCount } from './components/BatchCountSelector';

interface QuantumCameraProps {
  onBack: () => void;
}

// Internal component to use context
const QuantumCamera: React.FC<QuantumCameraProps> = ({ onBack }) => {
  const { lang, toggleLang } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const { config, isConfigured } = useApiConfig();
  
  const [mode, setMode] = useState<CameraMode>(CameraMode.TEXT_TO_IMAGE);
  const [prompt, setPrompt] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<CapturedImage[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [showFilmSystem, setShowFilmSystem] = useState<boolean>(false);
  const [lockedFilmStyle, setLockedFilmStyle] = useState<string>("");
  const [showApiConfig, setShowApiConfig] = useState<boolean>(false);
  const [showModelRegistry, setShowModelRegistry] = useState<boolean>(false);
  const [showDirector, setShowDirector] = useState<boolean>(false);
  // 首次打开后保持挂载，后续切换只控制 visibility，不丢失状态
  const [directorMounted, setDirectorMounted] = useState<boolean>(false);
  const [satelliteMounted, setSatelliteMounted] = useState<boolean>(false);
  const [seedanceMounted, setSeedanceMounted] = useState<boolean>(false);
  const [showSeedance, setShowSeedance] = useState<boolean>(false);
  // AI 对话窗口
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMounted, setChatMounted] = useState<boolean>(false);
  // 卫星模式内部子页签：'earth' = 地球视图，'link' = 卫星链路窗口
  type SatelliteSubTab = 'earth' | 'link';
  const [satelliteSubTab, setSatelliteSubTab] = useState<SatelliteSubTab>('earth');

  // ====== 自动保存 ======
  const [autoSaveSettings, setAutoSaveSettings] = useState<AutoSaveSettings>({
    enabled: false, folderPath: '', saveImages: true, savePrompts: true,
  });
  useEffect(() => {
    loadAutoSaveSettings().then(setAutoSaveSettings);
  }, []);

  // 安全退出：关闭所有子窗口/模态后再返回 IntroPage
  const handleExit = () => {
    setShowDirector(false);
    setShowSeedance(false);
    setShowFilmSystem(false);
    setShowApiConfig(false);
    setShowModelRegistry(false);
    setZoomImage(null);
    onBack();
  };

  // 注册 prompt state 到 PromptAppendContext，让聊天窗口中的提示词卡片能"添加到 CMD"
  usePromptAppendRegistrar(
    React.useCallback(() => prompt, [prompt]),
    React.useCallback((v: string) => setPrompt(v), [setPrompt])
  );

  // 相机参数设置状态
  const [settings, setSettings] = useState<CameraSettings>({
    focalLength: 50,
    aperture: 2.8,
    iso: 800,
    shutterSpeed: '1/200',
    focusDistance: 50,
    aspectRatio: '4:3',
    resolution: '2K',
    lensType: 'STANDARD'
  });

  // 新增：单次生成数量（1 / 2 / 4），默认 1 张，不改动 CameraSettings 结构
  const [batchCount, setBatchCount] = useState<BatchCount>(1);

  const handleCapture = async () => {
    const imageRuntime = resolveActiveImageRuntimeConfig(config);
    const hasKey = imageRuntime.protocol === 'gemini'
      ? await ensureApiKey()
      : !!imageRuntime.apiKey;

    if (!hasKey) {
      // 没有 API Key 时自动弹出配置面板，而不是弹 alert
      setShowApiConfig(true);
      return;
    }
    if (mode === CameraMode.TEXT_TO_IMAGE && !prompt.trim()) {
      alert("INPUT PROMPT // DATA REQUIRED");
      return;
    }

    setIsProcessing(true);
    try {
      const finalPrompt = lockedFilmStyle ? `${prompt}, ${lockedFilmStyle}` : prompt;
      // 如果有 @ 引用的参考图，提取 base64 传给 API
      const refImagesBase64 = attachedImages.length > 0 ? attachedImages.map(img => img.base64) : undefined;

      // 新增：批量生成 —— 按 batchCount 串行生成 1 / 2 / 4 张
      // 串行而非并行：避免触发 Gemini API 的并发限制与速率限制
      // 任一张失败不影响其它张的成果（已生成的会保留在 gallery）
      const count = Math.max(1, Math.min(4, batchCount)) as BatchCount;
      const generatedErrors: string[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const imageUrl = await generateModelImage({
            prompt: finalPrompt,
            settings,
            referenceImagesBase64: refImagesBase64,
          });
          const newImage: CapturedImage = {
            id: `${Date.now()}_${i}`,
            url: imageUrl,
            timestamp: Date.now(),
            settings: { ...settings },
            prompt: finalPrompt
          };
          setLastCapturedImage(imageUrl);
          setGallery(prev => [newImage, ...prev]);
          // 自动保存到本地（每张独立保存，带批次序号）
          autoSaveImage(autoSaveSettings, imageUrl, count > 1 ? `MOKE_CAPTURE_${i + 1}of${count}` : 'MOKE_CAPTURE');
          autoSaveText(autoSaveSettings, `提示词: ${finalPrompt}\n模式: ${mode}\n批次: ${i + 1}/${count}\n时间: ${new Date().toLocaleString()}`, count > 1 ? `MOKE_CAPTURE_${i + 1}of${count}` : 'MOKE_CAPTURE');
        } catch (innerErr: any) {
          // 单张失败记录但继续生成剩余张数（防御性编程：部分失败不阻断整批）
          console.error(`[批量生成] 第 ${i + 1}/${count} 张失败:`, innerErr);
          generatedErrors.push(`第 ${i + 1} 张: ${innerErr?.message || '未知错误'}`);
        }
      }

      // 如果有失败张数，提示用户（但不 throw，不影响成功的张数）
      if (generatedErrors.length > 0 && generatedErrors.length < count) {
        alert(`批量生成部分失败（${count - generatedErrors.length}/${count} 张成功）\n\n失败详情:\n${generatedErrors.join('\n')}`);
      } else if (generatedErrors.length === count) {
        // 全部失败，抛出触发外层 catch 的统一错误提示
        throw new Error(generatedErrors.join('\n'));
      }
    } catch (error: any) {
      console.error(error);
      // 提取具体错误信息，帮助用户定位问题
      const errMsg = error?.message || '未知错误';
      alert(`生成失败\n\n${errMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 主题样式
  const bgMain = isDark ? 'bg-moke-black' : 'bg-moke-white';
  const textMain = isDark ? 'text-gray-200' : 'text-gray-900';

  return (
    <div className={`relative w-full h-screen overflow-hidden ${bgMain} ${textMain} selection:bg-moke-red selection:text-white transition-colors duration-500`}>
      {/* ========== 全局装饰背景层（pointer-events:none，不阻挡交互） ========== */}
      <InteractiveParticles isDark={isDark} zIndex={0} opacity={0.3} />
      <IndustrialDecorBundle
        isDark={isDark}
        imageCount={gallery.length}
        modeLabel={mode === CameraMode.EARTH_TO_IMAGE ? 'EARTH' : 'T2I'}
      />

      {/* ========== 取景器 — 全屏占满（相机核心） ========== */}
      <div className="absolute inset-0 z-10">
        {/* 地球视图（卫星模式-地球） */}
        <div
          className="absolute inset-0"
          style={{
            visibility: mode === CameraMode.EARTH_TO_IMAGE && satelliteSubTab === 'earth' ? 'visible' : 'hidden',
            zIndex: mode === CameraMode.EARTH_TO_IMAGE && satelliteSubTab === 'earth' ? 10 : 1,
          }}
        >
          <EarthView
            isDark={isDark}
            onCapture={(dataUrl) => {
              const newImage: CapturedImage = {
                id: Date.now().toString(),
                url: dataUrl,
                timestamp: Date.now(),
                settings: { ...settings },
                prompt: 'SATELLITE CAPTURE',
              };
              setGallery(prev => [newImage, ...prev]);
              setLastCapturedImage(dataUrl);
              setAttachedImages([{
                id: `sat_${Date.now()}`,
                base64: dataUrl,
                thumbnail: dataUrl,
                name: '@卫星截图',
              }]);
              autoSaveImage(autoSaveSettings, dataUrl, 'MOKE_SATELLITE');
            }}
          />
        </div>

        {/* 卫星链路窗口（卫星模式-链路） */}
        {satelliteMounted && (
          <div
            className="absolute inset-0"
            style={{
              visibility: mode === CameraMode.EARTH_TO_IMAGE && satelliteSubTab === 'link' ? 'visible' : 'hidden',
              zIndex: mode === CameraMode.EARTH_TO_IMAGE && satelliteSubTab === 'link' ? 10 : 1,
            }}
          >
            <SatelliteLinkWindow onBack={() => setSatelliteSubTab('earth')} />
          </div>
        )}

        {/* 文生图取景器（T2I 模式） */}
        <div
          className="absolute inset-0"
          style={{
            visibility: mode === CameraMode.EARTH_TO_IMAGE ? 'hidden' : 'visible',
            zIndex: mode === CameraMode.EARTH_TO_IMAGE ? 1 : 10,
          }}
        >
          <Viewfinder
            mode={mode}
            isProcessing={isProcessing}
            prompt={prompt}
            setPrompt={setPrompt}
            attachedImages={attachedImages}
            onAttachedImagesChange={setAttachedImages}
            galleryImages={gallery.map(img => ({ id: img.id, url: img.url }))}
            lastCapturedImage={lastCapturedImage}
            onZoom={setZoomImage}
            onOpenFilmSystem={() => setShowFilmSystem(true)}
            lockedFilmStyle={lockedFilmStyle}
            onClearLockedFilm={() => setLockedFilmStyle('')}
            onCapture={handleCapture}
          />
        </div>
      </div>

      {/* ========== 顶部导航栏（fixed，半透明覆盖在取景器上方） ========== */}
      <HeaderBar
        onExit={handleExit}
        onShowModelRegistry={() => setShowModelRegistry(true)}
        onShowApiConfig={() => setShowApiConfig(true)}
        toggleTheme={toggleTheme}
        toggleLang={toggleLang}
        isDark={isDark}
        lang={lang}
        isConfigured={isConfigured}
      />

      {/* ========== 左侧工具栏 + 抽屉（参数/画廊/自动保存） ========== */}
      <SideRail
        isDark={isDark}
        lang={lang}
        settings={settings}
        updateSettings={(newS) => setSettings(prev => ({ ...prev, ...newS }))}
        gallery={gallery}
        onGallerySelect={(img) => {
          setLastCapturedImage(img.url);
          setPrompt(img.prompt);
          setSettings(img.settings);
        }}
        onAutoSaveChange={setAutoSaveSettings}
        onOpenChat={() => { setShowChat(true); setChatMounted(true); }}
        isChatActive={showChat}
        batchCount={batchCount}
        onBatchCountChange={setBatchCount}
        isProcessing={isProcessing}
      />

      {/* ========== 底部快门 Dock（模式切换 + 超大快门 + 功能入口） ========== */}
      <BottomDock
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          if (m === CameraMode.EARTH_TO_IMAGE) setSatelliteMounted(true);
        }}
        onCapture={handleCapture}
        isProcessing={isProcessing}
        isDark={isDark}
        lang={lang}
        satelliteSubTab={satelliteSubTab}
        onSatelliteSubTabChange={(tab) => {
          setSatelliteSubTab(tab);
          if (tab === 'link') setSatelliteMounted(true);
        }}
        onShowDirector={() => { setShowDirector(true); setDirectorMounted(true); }}
        onShowSeedance={() => { setShowSeedance(true); setSeedanceMounted(true); }}
        isDirectorActive={showDirector}
        isSeedanceActive={showSeedance}
      />

      {/* ====== 模态弹窗层（保留全部原有逻辑） ====== */}

      {/* 胶片系统 */}
      {showFilmSystem && (
        <FilmSystem
          onClose={() => setShowFilmSystem(false)}
          currentPrompt={prompt}
          onApplyPrompt={(newPrompt) => {
            setPrompt(newPrompt);
          }}
          onLockStyle={(style) => setLockedFilmStyle(style)}
        />
      )}

      {/* API 配置 — 统一使用新版 ApiSettingsModal，与其他子页面保持一致 */}
      {showApiConfig && (
        <ApiSettingsModal onClose={() => setShowApiConfig(false)} />
      )}

      {/* 模型总览 */}
      {showModelRegistry && (
        <ModelRegistryPanel
          onClose={() => setShowModelRegistry(false)}
          onOpenApiConfig={() => { setShowModelRegistry(false); setShowApiConfig(true); }}
        />
      )}

      {/* 图片放大 */}
      {zoomImage && (
        <ImageLightbox src={zoomImage} onClose={() => setZoomImage(null)} />
      )}

      {/* 导演面板 — 首次打开后保持挂载，切换仅控制可见性 */}
      {directorMounted && (
        <div className="fixed inset-0 z-[9998]" style={{ visibility: showDirector ? 'visible' : 'hidden', pointerEvents: showDirector ? 'auto' : 'none' }}>
          <DirectorDeckWindow onBack={() => setShowDirector(false)} />
        </div>
      )}

      {/* Seedance 提示词生成 — 首次打开后保持挂载 */}
      {seedanceMounted && (
        <div className="fixed inset-0 z-[9998]" style={{ visibility: showSeedance ? 'visible' : 'hidden', pointerEvents: showSeedance ? 'auto' : 'none' }}>
          <SeedancePromptWindow onBack={() => setShowSeedance(false)} />
        </div>
      )}

      {/* AI 对话窗口 — 浮层式，首次打开后保持挂载（保留会话状态） */}
      {chatMounted && (
        <div style={{ display: showChat ? 'block' : 'none' }}>
          <ChatWindow
            onClose={() => setShowChat(false)}
            onLockPrompt={(content) => setLockedFilmStyle(content)}
          />
        </div>
      )}

      {/* 全局字体大小调节 —— 悬浮于右下角，折叠态为胶囊按钮，点开后展开滑块面板
          支持 ⌘/Ctrl + / - / 0 快捷键，自动持久化到 localStorage */}
      <FontSizeControl isDark={isDark} lang={lang} position="bottom-right" />

    </div>
  );
};

// Main App Wrapper
const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);

  // 退出过渡协调：点击 ENTER 后 IntroPage 先淡出，下一帧再切换 state，
  // 让 QuantumCamera 有时间完成首次渲染，消除 "Logo 延时消失" 的突兀感
  const { wrapEnter, overlayStyle, isExiting, phase, resetExit } = useIntroExitTransition(
    () => setShowIntro(false),
    { fadeDurationMs: 450, warmupMs: 16 },
  );

  // 从 Vision One 返回 IntroPage 时重置过渡状态机，恢复 Intro 显示与动画
  const handleBackToIntro = useCallback(() => {
    resetExit();
    setShowIntro(true);
  }, [resetExit]);

  return (
    <FontSizeProvider>
    <ThemeProvider>
      <LanguageProvider>
        <ApiConfigProvider>
          <GlobalAssetProvider>
          <PromptAppendProvider>
          <ChatProvider>
          {/* QuantumCamera — 相机全屏体验，fixed 占满视口
              新增 opacity transition：在 Intro 淡出的同时完成淡入，消除黑屏定格 */}
          <div
            style={{
              visibility: showIntro && !isExiting ? 'hidden' : 'visible',
              opacity: showIntro ? 0 : 1,
              transition: 'opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'opacity',
              pointerEvents: showIntro ? 'none' : 'auto',
              height: '100%',
              width: '100%',
              position: 'fixed',
              inset: 0,
              zIndex: 1,
            }}
          >
            <QuantumCamera onBack={handleBackToIntro} />
          </div>
          {/* IntroPage — 始终挂载，用 visibility + opacity 过渡切换
              进入 Vision One 时 opacity 即时开始淡出（CSS transition），
              同时 showIntro 会在下一帧切换，避免下层未绘制就让上层消失
              finished 阶段使用 display:none 彻底卸载渲染树，停止 Canvas RAF 与视频解码 */}
          <div
            className="fixed inset-0 bg-black"
            style={{
              zIndex: 9999,
              display: !showIntro && phase === 'finished' ? 'none' : 'block',
              visibility: showIntro || isExiting ? 'visible' : 'hidden',
              ...overlayStyle,
            }}
          >
            <IntroPage onEnter={wrapEnter} />
          </div>
          {/* [v3] 全局 API 设置浮动按钮已下线 —— 入口归并至 HeaderBar 右上角，
              与模型总览/主题/语言按钮对齐展示。保留 import 作为兼容，但不再渲染。 */}
          {/* {!showIntro && <ApiSettingsFab />} */}
          </ChatProvider>
          </PromptAppendProvider>
          </GlobalAssetProvider>
        </ApiConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
    </FontSizeProvider>
  );
};

export default App;