// 文件路径: components/chat/SkillsBar.tsx
// 技能选择栏 — 横向可滚动的技能徽章列表 + 加载自定义技能入口
import React from 'react';
import { getAllSkills, ChatSkill, unregisterSkill } from '../../services/chatSkills';

interface SkillsBarProps {
  currentSkillId: string;
  onSelect: (skillId: string) => void;
  isDark: boolean;
  onOpenLoader?: () => void;
}

export const SkillsBar: React.FC<SkillsBarProps> = ({ currentSkillId, onSelect, isDark, onOpenLoader }) => {
  const skills = getAllSkills();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1">
      {skills.map((skill: ChatSkill) => {
        const active = currentSkillId === skill.id;
        return (
          <button
            key={skill.id}
            onClick={() => onSelect(skill.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!skill.builtin) {
                if (confirm(`删除技能 "${skill.label}"？`)) {
                  unregisterSkill(skill.id);
                  if (active) onSelect('default');
                }
              }
            }}
            title={skill.builtin ? skill.description : `${skill.description}\n(右键删除)`}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-mono font-bold transition-all ${
              active
                ? 'border-moke-red bg-moke-red/15 text-moke-red shadow-[0_0_10px_rgba(208,0,0,0.3)]'
                : isDark
                ? 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-moke-red/60 hover:text-moke-red'
                : 'border-black/10 bg-black/[0.02] text-gray-600 hover:border-moke-red/60 hover:text-moke-red'
            }`}
          >
            <span className="text-sm leading-none">{skill.icon}</span>
            <span className="whitespace-nowrap">{skill.label}</span>
            {!skill.builtin && (
              <span className={`text-[8px] px-1 py-0 rounded-sm ${isDark ? 'bg-white/10 text-gray-500' : 'bg-black/5 text-gray-400'}`}>自定义</span>
            )}
          </button>
        );
      })}
      {/* 加载技能按钮 */}
      {onOpenLoader && (
        <button
          onClick={onOpenLoader}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-mono font-bold transition-all ${
            isDark
              ? 'border-white/10 border-dashed bg-white/[0.02] text-gray-500 hover:border-moke-red/50 hover:text-moke-red'
              : 'border-black/10 border-dashed bg-black/[0.01] text-gray-400 hover:border-moke-red/50 hover:text-moke-red'
          }`}
          title="加载自定义技能"
        >
          <span className="text-sm leading-none">＋</span>
          <span className="whitespace-nowrap">加载</span>
        </button>
      )}
    </div>
  );
};
