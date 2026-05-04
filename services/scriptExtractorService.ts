// 文件路径: services/scriptExtractorService.ts
// 剧本资产提取 AI 服务层 — 场景双联画 & 角色设计图提取

import { GoogleGenAI } from "@google/genai";

// ==================== 运行时 API 配置 ====================
// 复用 directorGeminiService 的配置注入模式
let scriptApiKey: string = '';
let scriptBaseUrl: string = '';

export const setScriptApiConfig = (apiKey: string, baseUrl: string) => {
  scriptApiKey = apiKey;
  scriptBaseUrl = baseUrl;
};

const getEffectiveApiKey = (): string => {
  if (scriptApiKey && scriptApiKey.trim()) return scriptApiKey.trim();
  return '';
};

const getClient = (): GoogleGenAI => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) throw new Error('请先在 API 配置面板中设置 API Key');
  const options: any = { apiKey };
  if (scriptBaseUrl && scriptBaseUrl.trim()) {
    options.httpOptions = { baseUrl: scriptBaseUrl.trim().replace(/\/+$/, '') };
  }
  return new GoogleGenAI(options);
};

// ==================== 提取结果类型 ====================
export interface SceneDiptychResult {
  scene_name: string;
  view_logic: string;
  prompt: string;
}

export interface CharacterSheetResult {
  character_name: string;
  visual_analysis: string;
  common_tags: string;
  concept_art_prompt: string;
  character_sheet_prompt: string;
}

// ==================== JSON 解析容错 ====================
const extractJSON = (text: string): any => {
  // 尝试直接解析
  try { return JSON.parse(text); } catch {}
  // 尝试提取 ```json ... ``` 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }
  // 尝试正则提取 {...} 或 [...]
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1]); } catch {}
  }
  throw new Error('无法从 AI 响应中解析 JSON 数据');
};

// ==================== 场景双联画提取 ====================
export const extractSceneDiptych = async (scriptText: string): Promise<SceneDiptychResult> => {
  const ai = getClient();

  const systemPrompt = `你是一位专业的电影分镜师和场景设计专家。你需要从剧本/小说文本中识别核心场景，并为 AI 图片生成创建"场景双联画"（Scene Diptych）提示词。

双联画规则：
- 左面板：场景的正前方视图（Primary POV），即主角/摄影机视角正对的方向
- 右面板：场景的反向180度视图（Reverse POV），即转身后看到的景象
- 两个面板必须属于同一个统一环境，光照、时间、天气保持一致
- 使用电影级构图原则：三分法、引导线、前景深度层次

输出格式为严格的 JSON（不要输出任何额外文字）：
{
  "scene_name": "场景名称（中文）",
  "view_logic": "视角逻辑分析（中文）：解释为什么选择这个正反视角，它如何服务于叙事",
  "prompt": "英文提示词，格式为: diptych, split screen, left panel: [正前方视图描述], right panel: [反向180度视图描述], [统一的风格/环境/灯光描述], cinematic composition, 8k, photorealistic, absolutely no text no letters no words no captions no labels no watermarks no symbols of any kind"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `${systemPrompt}\n\n以下是剧本/小说文本：\n\n${scriptText}`,
  });

  const text = response.text || '';
  return extractJSON(text) as SceneDiptychResult;
};

// ==================== 角色设计图提取 ====================
export const extractCharacterSheet = async (
  scriptText: string,
  characterName: string
): Promise<CharacterSheetResult> => {
  const ai = getClient();

  const systemPrompt = `你是一位专业的角色设计师和概念艺术家。你需要从剧本/小说文本中提取指定角色的视觉特征，并生成两组 AI 图片生成提示词。

角色视觉分析规则：
- 提取所有明确描述的外貌特征：年龄、性别、发型发色、面部特征、体型、肤色
- 提取服饰和配件描述
- 对于文本未明确描述的细节，根据角色的性格、职业、时代背景和文化环境进行合理补全
- 确保补全的内容逻辑自洽

输出格式为严格的 JSON（不要输出任何额外文字）：
{
  "character_name": "角色名称（中文）",
  "visual_analysis": "视觉特征分析（中文）：列出从文本提取的特征和补全的特征",
  "common_tags": "通用外貌标签（英文）：如 young woman, long black hair, pale skin, wearing a red qipao 等",
  "concept_art_prompt": "角色概念图英文提示词，包含：角色完整描述 + 一个符合剧情的动态动作/场景 + 电影级灯光 + 艺术风格，格式: character concept art, [角色描述], [动作/场景], cinematic lighting, detailed illustration, 8k",
  "character_sheet_prompt": "角色三视图英文提示词，格式: character design sheet, [角色描述], front view, side view, back view, A-pose, white background, clean design, full body, reference sheet, concept art, detailed illustration"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `${systemPrompt}\n\n目标角色名：${characterName}\n\n以下是剧本/小说文本：\n\n${scriptText}`,
  });

  const text = response.text || '';
  return extractJSON(text) as CharacterSheetResult;
};
