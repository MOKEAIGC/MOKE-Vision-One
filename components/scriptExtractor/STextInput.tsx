// 文件路径: components/scriptExtractor/STextInput.tsx
// 剧本文本输入面板 — 输入剧本片段 + 角色名 + 提取操作

import React, { useState } from 'react';
import { Sparkles, Loader2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { SceneDiptychResult, CharacterSheetResult } from '../../services/scriptExtractorService';
import { useTextShortcuts } from '../useTextShortcuts';

interface STextInputProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  characterName: string;
  setCharacterName: (name: string) => void;
  onExtractScene: () => void;
  onExtractCharacter: () => void;
  isExtracting: boolean;
  extractType: 'scene' | 'character' | null;
  sceneResult: SceneDiptychResult | null;
  characterResult: CharacterSheetResult | null;
  onEditScenePrompt: (prompt: string) => void;
  onEditConceptPrompt: (prompt: string) => void;
  onEditSheetPrompt: (prompt: string) => void;
}

export const STextInput: React.FC<STextInputProps> = ({
  scriptText, setScriptText,
  characterName, setCharacterName,
  onExtractScene, onExtractCharacter,
  isExtracting, extractType,
  sceneResult, characterResult,
  onEditScenePrompt, onEditConceptPrompt, onEditSheetPrompt,
}) => {
  const [showResult, setShowResult] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const textareaShortcuts = useTextShortcuts({ isTextarea: true });
  const inputShortcuts = useTextShortcuts();

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-thin pr-1">
      {/* 区块1 — 剧本输入区 */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
          剧本文本输入
        </label>
        <textarea
          value={scriptText}
          onChange={(e) => setScriptText(e.target.value)}
          placeholder="粘贴剧本或小说片段..."
          className="w-full min-h-[200px] max-h-[400px] bg-moke-black border border-gray-800 rounded-sm p-3 text-xs font-mono text-gray-300 placeholder-gray-700 resize-y focus:outline-none focus:border-moke-red/50 transition-colors scrollbar-thin"
        />
        <div className="flex justify-end">
          <span className="text-[10px] font-mono text-gray-700">{scriptText.length} 字符</span>
        </div>
      </div>

      {/* 区块2 — 角色名输入 */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase">
          目标角色名
        </label>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          onKeyDown={inputShortcuts.onKeyDown}
          placeholder="目标角色名（可选，用于角色提取）"
          className="w-full bg-moke-black border border-gray-800 rounded-sm px-3 py-2 text-xs font-mono text-gray-300 placeholder-gray-700 focus:outline-none focus:border-moke-red/50 transition-colors"
        />
      </div>

      {/* 区块3 — 提取操作区 */}
      <div className="flex gap-3">
        <button
          onClick={onExtractScene}
          disabled={isExtracting || !scriptText.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-gray-800 rounded-sm text-xs font-mono font-bold text-gray-400 hover:text-white hover:border-moke-red/50 hover:bg-moke-red/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isExtracting && extractType === 'scene' ? (
            <Loader2 size={14} className="animate-spin text-moke-red" />
          ) : (
            <Sparkles size={14} className="text-moke-red" />
          )}
          提取场景
        </button>
        <button
          onClick={onExtractCharacter}
          disabled={isExtracting || !scriptText.trim() || !characterName.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-gray-800 rounded-sm text-xs font-mono font-bold text-gray-400 hover:text-white hover:border-moke-red/50 hover:bg-moke-red/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isExtracting && extractType === 'character' ? (
            <Loader2 size={14} className="animate-spin text-moke-red" />
          ) : (
            <Sparkles size={14} className="text-moke-red" />
          )}
          提取角色
        </button>
      </div>

      {/* 区块4 — AI 分析结果预览 */}
      {(sceneResult || characterResult) && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowResult(!showResult)}
            className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase hover:text-white transition-colors"
          >
            AI 分析结果
            {showResult ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showResult && (
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-sm p-3 space-y-3">
              {sceneResult && (
                <>
                  <div>
                    <span className="text-[10px] font-mono text-moke-red font-bold">场景名称</span>
                    <p className="text-xs font-mono text-gray-300 mt-1">{sceneResult.scene_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-moke-red font-bold">视角逻辑</span>
                    <p className="text-xs font-mono text-gray-400 mt-1 leading-relaxed">{sceneResult.view_logic}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-moke-red font-bold">生成提示词</span>
                      <button
                        onClick={() => setEditingField(editingField === 'scene_prompt' ? null : 'scene_prompt')}
                        className="text-gray-600 hover:text-white transition-colors"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                    {editingField === 'scene_prompt' ? (
                      <textarea
                        value={sceneResult.prompt}
                        onChange={(e) => onEditScenePrompt(e.target.value)}
                        onKeyDown={textareaShortcuts.onKeyDown}
                        className="w-full mt-1 bg-moke-black border border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-300 resize-y min-h-[60px] focus:outline-none focus:border-moke-red/50"
                      />
                    ) : (
                      <p className="text-[11px] font-mono text-gray-500 mt-1 leading-relaxed break-all">{sceneResult.prompt}</p>
                    )}
                  </div>
                </>
              )}

              {characterResult && (
                <>
                  <div>
                    <span className="text-[10px] font-mono text-moke-red font-bold">角色名称</span>
                    <p className="text-xs font-mono text-gray-300 mt-1">{characterResult.character_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-moke-red font-bold">视觉分析</span>
                    <p className="text-xs font-mono text-gray-400 mt-1 leading-relaxed">{characterResult.visual_analysis}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-moke-red font-bold">通用标签</span>
                    <p className="text-[11px] font-mono text-gray-500 mt-1">{characterResult.common_tags}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-moke-red font-bold">概念图 Prompt</span>
                      <button
                        onClick={() => setEditingField(editingField === 'concept_prompt' ? null : 'concept_prompt')}
                        className="text-gray-600 hover:text-white transition-colors"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                    {editingField === 'concept_prompt' ? (
                      <textarea
                        value={characterResult.concept_art_prompt}
                        onChange={(e) => onEditConceptPrompt(e.target.value)}
                        className="w-full mt-1 bg-moke-black border border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-300 resize-y min-h-[60px] focus:outline-none focus:border-moke-red/50"
                      />
                    ) : (
                      <p className="text-[11px] font-mono text-gray-500 mt-1 leading-relaxed break-all">{characterResult.concept_art_prompt}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-moke-red font-bold">三视图 Prompt</span>
                      <button
                        onClick={() => setEditingField(editingField === 'sheet_prompt' ? null : 'sheet_prompt')}
                        className="text-gray-600 hover:text-white transition-colors"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                    {editingField === 'sheet_prompt' ? (
                      <textarea
                        value={characterResult.character_sheet_prompt}
                        onChange={(e) => onEditSheetPrompt(e.target.value)}
                        className="w-full mt-1 bg-moke-black border border-gray-700 rounded-sm p-2 text-xs font-mono text-gray-300 resize-y min-h-[60px] focus:outline-none focus:border-moke-red/50"
                      />
                    ) : (
                      <p className="text-[11px] font-mono text-gray-500 mt-1 leading-relaxed break-all">{characterResult.character_sheet_prompt}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
