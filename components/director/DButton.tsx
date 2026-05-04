// 文件路径: components/director/DButton.tsx
// DirectorDeck 通用按钮组件 — 量子相机风格

import React from 'react';

interface DButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isActive?: boolean;
}

export const DButton: React.FC<DButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isActive = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-mono font-bold transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed select-none rounded-sm";
  
  const variants = {
    primary: "bg-[#111] text-gray-200 hover:bg-[#1a1a1a] border border-gray-800 shadow-sm",
    secondary: "bg-[#0A0A0A] text-gray-300 hover:bg-[#151515] border border-gray-800",
    ghost: "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5",
    gradient: "bg-gradient-to-r from-moke-red to-[#900000] text-white shadow-[0_0_20px_rgba(208,0,0,0.2)] hover:shadow-[0_0_30px_rgba(208,0,0,0.3)] border border-transparent",
    icon: "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
  };

  const activeStyles = isActive ? "bg-[#1a1a1a] text-white ring-1 ring-moke-red/30" : "";
  
  const sizes = {
    sm: "text-[10px] px-2.5 py-1.5 tracking-widest",
    md: "text-[11px] px-4 py-2 tracking-wider",
    lg: "text-[12px] px-5 py-3 tracking-widest",
    icon: "p-2"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
