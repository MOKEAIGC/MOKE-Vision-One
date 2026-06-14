// 文件路径: components/chat/SkillLoader.tsx
// Skill 加载器 — 支持从 ZIP 文件或直接文本输入加载自定义技能
// ZIP 格式要求：包含 skill.json 文件，格式 { id, label, icon, description, systemPrompt, temperature? }
// 文本模式：直接输入 systemPrompt，自动创建技能

import React, { useState, useRef, useCallback } from 'react';
import { registerSkill, unregisterSkill, getCustomSkills, ChatSkill } from '../../services/chatSkills';

interface SkillLoaderProps {
  isDark: boolean;
  onClose: () => void;
  onSkillLoaded?: (skillId: string) => void;
}

type LoadMode = 'menu' | 'zip' | 'text';

export const SkillLoader: React.FC<SkillLoaderProps> = ({ isDark, onClose, onSkillLoaded }) => {
  const [mode, setMode] = useState<LoadMode>('menu');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文本模式字段
  const [textLabel, setTextLabel] = useState('');
  const [textIcon, setTextIcon] = useState('🔧');
  const [textDesc, setTextDesc] = useState('');
  const [textPrompt, setTextPrompt] = useState('');
  const [textTemp, setTextTemp] = useState(0.7);

  // 自定义技能列表
  const customSkills = getCustomSkills();

  // ZIP 加载
  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    try {
      // 动态导入 JSZip（如果可用）或手动解析
      const arrayBuffer = await file.arrayBuffer();

      // 尝试使用简单 ZIP 解析：查找 skill.json 或 .txt 文件
      const textContent = await tryExtractFromZip(arrayBuffer, file.name);

      if (textContent) {
        // 尝试解析为 JSON skill 配置
        try {
          const skillConfig = JSON.parse(textContent);
          if (!skillConfig.id || !skillConfig.systemPrompt) {
            setError('skill.json 缺少必填字段 (id, systemPrompt)');
            return;
          }
          const skill: ChatSkill = {
            id: skillConfig.id,
            label: skillConfig.label || skillConfig.id,
            icon: skillConfig.icon || '📦',
            description: skillConfig.description || '自定义加载的技能',
            systemPrompt: skillConfig.systemPrompt,
            temperature: skillConfig.temperature || 0.7,
            builtin: false,
          };
          registerSkill(skill);
          setSuccess(`技能 "${skill.label}" 加载成功！`);
          onSkillLoaded?.(skill.id);
        } catch {
          // 不是 JSON，当作纯文本 systemPrompt
          const id = `custom_${Date.now()}`;
          const skill: ChatSkill = {
            id,
            label: file.name.replace(/\.(zip|txt|json)$/i, ''),
            icon: '📄',
            description: `从 ${file.name} 加载`,
            systemPrompt: textContent,
            temperature: 0.7,
            builtin: false,
          };
          registerSkill(skill);
          setSuccess(`技能 "${skill.label}" 加载成功！`);
          onSkillLoaded?.(skill.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'ZIP 文件解析失败');
    }

    // 重置 input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [onSkillLoaded]);

  // 文本创建技能
  const handleTextCreate = useCallback(() => {
    setError('');
    setSuccess('');

    if (!textLabel.trim()) { setError('请输入技能名称'); return; }
    if (!textPrompt.trim()) { setError('请输入 System Prompt'); return; }

    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const skill: ChatSkill = {
      id,
      label: textLabel.trim(),
      icon: textIcon || '🔧',
      description: textDesc.trim() || '自定义技能',
      systemPrompt: textPrompt.trim(),
      temperature: textTemp,
      builtin: false,
    };

    registerSkill(skill);
    setSuccess(`技能 "${skill.label}" 创建成功！`);
    onSkillLoaded?.(skill.id);

    // 重置表单
    setTextLabel('');
    setTextDesc('');
    setTextPrompt('');
  }, [textLabel, textIcon, textDesc, textPrompt, textTemp, onSkillLoaded]);

  // 删除自定义技能
  const handleDelete = (id: string) => {
    unregisterSkill(id);
    setSuccess('已删除');
    setTimeout(() => setSuccess(''), 1500);
  };

  const borderCls = isDark ? 'border-white/10' : 'border-black/10';
  const bgCard = isDark ? 'bg-[#111]' : 'bg-[#f9f9f9]';

  return (
    <div className={`flex flex-col h-full ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* 头部 */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderCls}`}>
        <div className="flex items-center gap-2">
          {mode !== 'menu' && (
            <button
              onClick={() => { setMode('menu'); setError(''); setSuccess(''); }}
              className={`text-[11px] font-mono ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              ←
            </button>
          )}
          <span className={`text-[10px] font-mono font-bold tracking-[0.15em] uppercase ${
            isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
          }`}>
            {mode === 'menu' ? 'SKILL LOADER' : mode === 'zip' ? 'ZIP 导入' : '文本创建'}
          </span>
        </div>
        <button
          onClick={onClose}
          className={`text-[14px] leading-none ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}
        >×</button>
      </div>

      {/* 状态消息 */}
      {error && (
        <div className={`mx-3 mt-2 px-3 py-1.5 text-[10px] font-mono border ${
          isDark ? 'bg-red-900/20 border-red-700/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
        }`}>{error}</div>
      )}
      {success && (
        <div className={`mx-3 mt-2 px-3 py-1.5 text-[10px] font-mono border ${
          isDark ? 'bg-green-900/20 border-green-700/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600'
        }`}>{success}</div>
      )}

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {mode === 'menu' && (
          <>
            {/* 两种加载方式 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode('zip'); setError(''); setSuccess(''); }}
                className={`flex flex-col items-center gap-2 p-4 border transition-colors ${borderCls} ${bgCard} ${
                  isDark ? 'hover:border-[#cc2222]/50' : 'hover:border-[#dc2626]/50'
                }`}
              >
                <span className="text-2xl">📦</span>
                <span className="text-[10px] font-mono font-bold">ZIP 导入</span>
                <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  从 ZIP/JSON/TXT 文件
                </span>
              </button>
              <button
                onClick={() => { setMode('text'); setError(''); setSuccess(''); }}
                className={`flex flex-col items-center gap-2 p-4 border transition-colors ${borderCls} ${bgCard} ${
                  isDark ? 'hover:border-[#cc2222]/50' : 'hover:border-[#dc2626]/50'
                }`}
              >
                <span className="text-2xl">✏️</span>
                <span className="text-[10px] font-mono font-bold">文本创建</span>
                <span className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  直接输入 Prompt
                </span>
              </button>
            </div>

            {/* 已加载的自定义技能列表 */}
            {customSkills.length > 0 && (
              <div>
                <div className={`text-[9px] font-mono font-bold tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  已加载的自定义技能 ({customSkills.length})
                </div>
                <div className="space-y-1.5">
                  {customSkills.map(skill => (
                    <div key={skill.id} className={`flex items-center justify-between px-3 py-2 border ${borderCls} ${bgCard}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{skill.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-[11px] font-mono font-bold truncate ${isDark ? 'text-white' : 'text-black'}`}>{skill.label}</div>
                          <div className={`text-[9px] font-mono truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{skill.description}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(skill.id)}
                        className={`shrink-0 text-[9px] font-mono px-2 py-1 transition-colors ${
                          isDark ? 'text-red-400 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'
                        }`}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'zip' && (
          <div className="space-y-3">
            <div className={`text-[10px] font-mono leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              支持格式：
              <br />• <strong>.zip</strong> — 包含 skill.json 配置文件
              <br />• <strong>.json</strong> — 直接 skill 配置
              <br />• <strong>.txt</strong> — 纯文本 System Prompt
            </div>

            <div className={`text-[9px] font-mono p-2 border ${borderCls} ${bgCard} leading-relaxed`}>
              <span className={isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'}>skill.json 格式：</span>
              <pre className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{`{
  "id": "my-skill",
  "label": "我的技能",
  "icon": "🎯",
  "description": "技能描述",
  "systemPrompt": "你是...",
  "temperature": 0.7
}`}</pre>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-4 border-2 border-dashed flex flex-col items-center gap-2 transition-colors ${
                isDark ? 'border-[#333] hover:border-[#cc2222]/50 text-gray-400' : 'border-[#ddd] hover:border-[#dc2626]/50 text-gray-500'
              }`}
            >
              <span className="text-2xl">📂</span>
              <span className="text-[11px] font-mono font-bold">点击选择文件</span>
              <span className={`text-[9px] font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>.zip / .json / .txt</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.json,.txt"
              className="hidden"
              onChange={handleZipUpload}
            />
          </div>
        )}

        {mode === 'text' && (
          <div className="space-y-3">
            {/* 名称和图标 */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={`text-[9px] font-mono block mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>技能名称 *</label>
                <input
                  value={textLabel}
                  onChange={(e) => setTextLabel(e.target.value)}
                  placeholder="例如：短剧导演"
                  className={`w-full px-2.5 py-1.5 text-[11px] font-mono outline-none border ${
                    isDark ? 'bg-[#111] border-[#222] text-white placeholder:text-[#555]' : 'bg-white border-[#ddd] text-black placeholder:text-[#bbb]'
                  }`}
                />
              </div>
              <div className="w-16">
                <label className={`text-[9px] font-mono block mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>图标</label>
                <input
                  value={textIcon}
                  onChange={(e) => setTextIcon(e.target.value)}
                  className={`w-full px-2 py-1.5 text-center text-[14px] outline-none border ${
                    isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-[#ddd]'
                  }`}
                />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className={`text-[9px] font-mono block mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>描述（可选）</label>
              <input
                value={textDesc}
                onChange={(e) => setTextDesc(e.target.value)}
                placeholder="简短描述技能用途"
                className={`w-full px-2.5 py-1.5 text-[11px] font-mono outline-none border ${
                  isDark ? 'bg-[#111] border-[#222] text-white placeholder:text-[#555]' : 'bg-white border-[#ddd] text-black placeholder:text-[#bbb]'
                }`}
              />
            </div>

            {/* 温度 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>温度 Temperature</label>
                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`}>{textTemp}</span>
              </div>
              <input
                type="range" min="0" max="2" step="0.1"
                value={textTemp}
                onChange={(e) => setTextTemp(Number(e.target.value))}
                className="w-full h-1 appearance-none bg-[#222] rounded cursor-pointer accent-[#cc2222]"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className={`text-[9px] font-mono block mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>System Prompt *</label>
              <textarea
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="输入完整的 System Prompt 内容...&#10;&#10;支持多行文本，Markdown 格式等"
                rows={8}
                className={`w-full px-2.5 py-2 text-[11px] font-mono outline-none border resize-none ${
                  isDark ? 'bg-[#111] border-[#222] text-white placeholder:text-[#444]' : 'bg-white border-[#ddd] text-black placeholder:text-[#bbb]'
                }`}
              />
              <div className={`text-[9px] font-mono mt-1 text-right ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {textPrompt.length} 字符
              </div>
            </div>

            {/* 创建按钮 */}
            <button
              onClick={handleTextCreate}
              disabled={!textLabel.trim() || !textPrompt.trim()}
              className={`w-full py-2.5 text-[11px] font-mono font-bold tracking-wider transition-colors border ${
                textLabel.trim() && textPrompt.trim()
                  ? isDark ? 'bg-[#1a0808] border-[#331111] text-[#cc2222] hover:bg-[#220e0e]' : 'bg-[#fff5f5] border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2]'
                  : isDark ? 'bg-[#111] border-[#222] text-[#444] cursor-not-allowed' : 'bg-[#f5f5f5] border-[#ddd] text-[#bbb] cursor-not-allowed'
              }`}
            >
              创建技能
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== 辅助：尝试从 ZIP/JSON/TXT 文件中提取文本内容 =====
async function tryExtractFromZip(buffer: ArrayBuffer, fileName: string): Promise<string | null> {
  // 如果是 .json 或 .txt，直接解码
  if (fileName.endsWith('.json') || fileName.endsWith('.txt')) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }

  // 如果是 .zip，尝试简单解析
  try {
    const bytes = new Uint8Array(buffer);
    // ZIP magic number check
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
      throw new Error('不是有效的 ZIP 文件');
    }

    // 简易 ZIP 解析 — 查找 Local File Header 并提取第一个 JSON/TXT 文件
    let offset = 0;
    while (offset < bytes.length - 30) {
      // Local file header signature
      if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4B && bytes[offset + 2] === 0x03 && bytes[offset + 3] === 0x04) {
        const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
        const compressedSize = bytes[offset + 18] | (bytes[offset + 19] << 8) | (bytes[offset + 20] << 16) | (bytes[offset + 21] << 24);
        const fileNameLen = bytes[offset + 26] | (bytes[offset + 27] << 8);
        const extraLen = bytes[offset + 28] | (bytes[offset + 29] << 8);

        const entryNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
        const entryName = new TextDecoder().decode(entryNameBytes);
        const dataStart = offset + 30 + fileNameLen + extraLen;

        // 只处理未压缩的文件（Store method = 0）
        if (compressionMethod === 0 && (entryName.endsWith('.json') || entryName.endsWith('.txt') || entryName === 'skill.json')) {
          const fileData = bytes.slice(dataStart, dataStart + compressedSize);
          return new TextDecoder('utf-8').decode(fileData);
        }

        // 如果是 Deflate 压缩，尝试使用 DecompressionStream
        if (compressionMethod === 8 && (entryName.endsWith('.json') || entryName.endsWith('.txt') || entryName === 'skill.json')) {
          try {
            const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
            // 使用 DecompressionStream API（现代浏览器支持）
            const ds = new DecompressionStream('raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            const result = new Uint8Array(totalLen);
            let pos = 0;
            for (const chunk of chunks) {
              result.set(chunk, pos);
              pos += chunk.length;
            }
            return new TextDecoder('utf-8').decode(result);
          } catch {
            // Fallback: skip this entry
          }
        }

        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }

    throw new Error('ZIP 中未找到 skill.json 或 .txt/.json 文件');
  } catch (err: any) {
    throw new Error(err.message || 'ZIP 解析失败');
  }
}
