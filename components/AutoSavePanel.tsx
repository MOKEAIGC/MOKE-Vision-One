// 文件路径: components/AutoSavePanel.tsx
// 自动保存设置面板 — 可嵌入 SettingsPanel 或独立显示

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  AutoSaveSettings,
  loadAutoSaveSettings,
  saveAutoSaveSettings,
  selectSaveFolder,
  openSaveFolder,
  isElectronEnv,
} from '../services/autoSaveService';

interface AutoSavePanelProps {
  /** 设置变更时的回调，父组件可通过此获取最新设置 */
  onSettingsChange?: (settings: AutoSaveSettings) => void;
}

export const AutoSavePanel: React.FC<AutoSavePanelProps> = ({ onSettingsChange }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const isCN = lang === 'CN';
  const [settings, setSettings] = useState<AutoSaveSettings>({
    enabled: false,
    folderPath: '',
    saveImages: true,
    savePrompts: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [lastSavedMsg, setLastSavedMsg] = useState('');

  // 加载设置
  useEffect(() => {
    loadAutoSaveSettings().then(s => {
      setSettings(s);
      setLoaded(true);
      onSettingsChange?.(s);
    });
  }, []);

  // 保存设置
  const updateSettings = async (patch: Partial<AutoSaveSettings>) => {
    const newSettings = { ...settings, ...patch };
    setSettings(newSettings);
    await saveAutoSaveSettings(newSettings);
    onSettingsChange?.(newSettings);
    setLastSavedMsg('✅ 已保存');
    setTimeout(() => setLastSavedMsg(''), 2000);
  };

  // 选择文件夹
  const handleSelectFolder = async () => {
    const folder = await selectSaveFolder();
    if (folder) {
      await updateSettings({ folderPath: folder });
    }
  };

  // 打开文件夹
  const handleOpenFolder = async () => {
    if (settings.folderPath) {
      await openSaveFolder(settings.folderPath);
    }
  };

  const isElectron = isElectronEnv();
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const cardBg = isDark ? 'bg-[#111]' : 'bg-white';
  const textP = isDark ? 'text-gray-200' : 'text-gray-900';
  const textS = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-[#0A0A0A]' : 'bg-gray-100';

  if (!loaded) return null;

  return (
    <div className={`rounded-sm border ${border} ${cardBg} overflow-hidden`}>
      {/* 标题栏 */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
        <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${textS}`}>
          💾 自动保存设置
        </span>
        {lastSavedMsg && (
          <span className="font-mono text-[8px] text-emerald-400">{lastSavedMsg}</span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* 启用开关 */}
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[10px] font-bold ${textP}`}>启用自动保存</span>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.enabled ? 'bg-emerald-600' : isDark ? 'bg-gray-700' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* 保存路径 */}
            <div className="space-y-1.5">
              <span className={`font-mono text-[8px] font-bold ${textS}`}>{isCN ? '保存路径' : 'Save Path'}</span>
              <div className="flex gap-1.5">
                <div
                  className={`flex-1 ${inputBg} border ${border} rounded-sm px-2 py-1.5 font-mono text-[10px] ${textP} truncate`}
                  title={settings.folderPath || '未选择'}
                >
                  {settings.folderPath || (isElectron ? '点击右侧按钮选择文件夹' : '浏览器模式：自动下载到默认目录')}
                </div>
                {isElectron && (
                  <>
                    <button
                      onClick={handleSelectFolder}
                      className={`shrink-0 font-mono text-[8px] font-bold px-2 py-1.5 rounded-sm border transition-all ${
                        isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'
                      }`}
                    >
                      📂 选择
                    </button>
                    {settings.folderPath && (
                      <button
                        onClick={handleOpenFolder}
                        className={`shrink-0 font-mono text-[8px] font-bold px-2 py-1.5 rounded-sm border transition-all ${
                          isDark ? 'border-gray-700 text-gray-400 hover:border-emerald-500 hover:text-emerald-400' : 'border-gray-300 text-gray-500 hover:border-emerald-500'
                        }`}
                        title="在文件管理器中打开"
                      >
                        📁
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 保存选项 */}
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.saveImages}
                  onChange={e => updateSettings({ saveImages: e.target.checked })}
                  className="w-3 h-3 accent-moke-red"
                />
                <span className={`font-mono text-[9px] font-bold ${textP}`}>保存图片</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.savePrompts}
                  onChange={e => updateSettings({ savePrompts: e.target.checked })}
                  className="w-3 h-3 accent-moke-red"
                />
                <span className={`font-mono text-[9px] font-bold ${textP}`}>保存提示词</span>
              </label>
            </div>

            {/* 提示 */}
            <div className={`font-mono text-[8px] ${textS} leading-relaxed`}>
              {isElectron
                ? '✅ Electron 桌面模式 — 生成内容将自动保存到指定文件夹'
                : '⚠️ 浏览器模式 — 功能受限，保存时会触发下载弹窗'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
