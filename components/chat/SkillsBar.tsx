// 文件路径: components/chat/SkillsBar.tsx
// 技能选择栏 — 横向可滚动的技能徽章列表
import React from 'react';
import { getAllSkills, ChatSkill } from '../../services/chatSkills';

interface SkillsBarProps {
  currentSkillId: string;
  onSelect: (skillId: string) => void;
  isDark: boolean;
}

export const SkillsBar: React.FC<SkillsBarProps> = ({ currentSkillId, onSelect, isDark }) => {
  const skills = getAllSkills();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1">
      {skills.map((skill: ChatSkill) => {
        const active = currentSkillId === skill.id;
        return (
          <button
            key={skill.id}
            onClick={() => onSelect(skill.id)}
            title={skill.description}
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
          </button>
        );
      })}
    </div>
  );
};
