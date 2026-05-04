// 文件路径: services/promptBlockParser.ts
// 从 Markdown 文本中提取代码块 — 用于识别 AI 输出的"可复制提示词段"
export interface PromptBlockSegment {
  /** 是否为可复制代码块 */
  isBlock: boolean;
  /** 正文 */
  content: string;
  /** 代码块语言标识（如 "markdown" / 空） */
  lang?: string;
}

/**
 * 解析 Markdown 文本，返回交替的文本段和代码块段
 * 规则：匹配 ```lang\n...\n``` 作为代码块，其他部分作为普通文本
 *
 * 示例：
 * "前言文字\n```markdown\nPrompt 1\n```\n中间文字\n```\nPrompt 2\n```\n结尾"
 * →
 * [
 *   { isBlock: false, content: "前言文字\n" },
 *   { isBlock: true, content: "Prompt 1", lang: "markdown" },
 *   { isBlock: false, content: "\n中间文字\n" },
 *   { isBlock: true, content: "Prompt 2", lang: "" },
 *   { isBlock: false, content: "\n结尾" },
 * ]
 */
export const parsePromptBlocks = (text: string): PromptBlockSegment[] => {
  if (!text) return [];
  const segments: PromptBlockSegment[] = [];
  // 匹配 ```lang\n ... \n``` 或 ```lang ... ```（容错）
  const regex = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // 上一段普通文本
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index);
      if (plain) segments.push({ isBlock: false, content: plain });
    }
    // 代码块
    segments.push({
      isBlock: true,
      content: match[2].trim(),
      lang: (match[1] || '').trim(),
    });
    lastIndex = regex.lastIndex;
  }
  // 结尾普通文本
  if (lastIndex < text.length) {
    segments.push({ isBlock: false, content: text.slice(lastIndex) });
  }

  // 没有代码块时，整段作为文本返回
  if (segments.length === 0) {
    segments.push({ isBlock: false, content: text });
  }

  return segments;
};

/** 获取所有代码块的合并内容（用于"全部复制"） */
export const getAllBlocksText = (text: string): string => {
  const segments = parsePromptBlocks(text);
  const blocks = segments.filter(s => s.isBlock).map(s => s.content);
  return blocks.join('\n\n---\n\n');
};

/** 统计代码块数量 */
export const countBlocks = (text: string): number => {
  return parsePromptBlocks(text).filter(s => s.isBlock).length;
};
