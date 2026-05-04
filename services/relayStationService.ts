// 文件路径: services/relayStationService.ts
// 功能说明: API 中转站（Relay Station）数据管理服务（自包含独立模块）
// -------------------------------------------------------------------
// 作用:
//   1. 定义中转站数据模型（主页 / API 基地址 / Chat 接口 / 默认模型 / API Key）
//   2. 提供 增 / 删 / 改 / 查 / 导出当前应用配置 的工具函数
//   3. 通过 localStorage 持久化（独立 key，与 moke_vision_api_config 互不干扰）
//   4. 内置默认条目：云雾（YunWu）
// -------------------------------------------------------------------
// 兼容性保证:
//   - "应用到当前配置"动作只回写 ApiConfig 的 { baseUrl, apiKey, model } 三个字段
//   - 通过现有 ApiConfigContext.updateConfig 进入应用，确保所有功能（图片/聊天/导演/卫星/Seedance）
//     都能读取到新的 baseUrl，无需改动业务代码
// -------------------------------------------------------------------

/**
 * 单条中转站记录
 */
export interface RelayStation {
  /** 唯一 ID（自动生成） */
  id: string;
  /** 显示名称（如"云雾"） */
  name: string;
  /** 主页地址（用户访问获取 Key 的页面） */
  homepage: string;
  /** API 基地址（写入 ApiConfig.baseUrl，所有 SDK 调用复用） */
  baseUrl: string;
  /** Chat 接口地址（OpenAI 兼容格式 v1/chat/completions，仅供展示与测试） */
  chatEndpoint: string;
  /**
   * @deprecated 旧字段：单一默认模型（仅用于读取旧 localStorage 数据）
   * 新代码请使用 imageModel / textModel
   */
  defaultModel?: string;
  /** 图片模式默认模型（用于图像生成、卫星、Seedance 等图像类功能） */
  imageModel: string;
  /** 文本模式默认模型（用于聊天对话、提示词增强等纯文本功能） */
  textModel: string;
  /** 用户保存的 API Key（应用时写入 ApiConfig.apiKey） */
  apiKey: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 是否为预置内置条目（不允许删除，但允许编辑 Key） */
  builtin?: boolean;
  /** 备注 */
  note?: string;
}

/** localStorage 持久化键 */
const STORAGE_KEY = 'moke_vision_relay_stations';

/** 当前激活的中转站 ID（用于高亮显示） */
const ACTIVE_KEY = 'moke_vision_relay_active_id';

/** 内置预设：云雾 */
const BUILTIN_YUNWU: RelayStation = {
  id: 'builtin_yunwu',
  name: '云雾',
  homepage: 'https://yunwu.ai',
  baseUrl: 'https://yunwu.ai/v1',
  chatEndpoint: 'https://yunwu.ai/v1/chat/completions',
  imageModel: 'gemini-3.1-flash-image-preview',
  textModel: 'gemini-3-flash-preview',
  apiKey: '',
  createdAt: 0,
  builtin: true,
  note: 'OpenAI 协议兼容中转站',
};

/**
 * 内置预设：Google 官方直连（已弃用，保留类型兼容）
 * 之前版本会默认注入此条目，现改为不自动加入默认列表，
 * 但仍保留引用以兼容老数据 migration（避免重启后残留条目丢失标记）
 */
const BUILTIN_GOOGLE_OFFICIAL: RelayStation = {
  id: 'builtin_google_official',
  name: 'Google 官方直连',
  homepage: 'https://aistudio.google.com/apikey',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  chatEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  imageModel: 'gemini-3-pro-image-preview',
  textModel: 'gemini-3-flash-preview',
  apiKey: '',
  createdAt: 0,
  builtin: true,
  note: 'Google 官方 API（google-genai SDK 直连，Key 从 aistudio.google.com 免费获取）',
};

/** 默认列表（仅在 localStorage 为空时使用）
 *  只保留"云雾"作为唯一内置预置条目；Google 官方直连不再默认注入
 *  如需 Google 直连，用户可通过"+ 新增"手动创建 */
const DEFAULT_LIST: RelayStation[] = [BUILTIN_YUNWU];

/**
 * 把可能存在的旧字段 defaultModel 迁移为 imageModel / textModel
 * 兼容历史 localStorage 数据，确保升级后不丢失用户配置
 */
function migrateStation(s: any): RelayStation {
  const fallbackImage = 'gemini-3.1-flash-image-preview';
  const fallbackText = 'gemini-3-flash-preview';
  // 强制：id 为云雾内置 ID 的条目，始终标记 builtin = true（防止旧数据丢失标记）
  const isBuiltinYunwu = s.id === 'builtin_yunwu';
  // Google 官方直连已从预置列表移除：老数据保留为普通可删除条目
  const isLegacyGoogle = s.id === 'builtin_google_official';
  return {
    id: s.id || `relay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: s.name || (isBuiltinYunwu ? '云雾' : isLegacyGoogle ? 'Google 官方直连' : ''),
    homepage: s.homepage || '',
    baseUrl: s.baseUrl || '',
    chatEndpoint: s.chatEndpoint || '',
    imageModel: s.imageModel || s.defaultModel || fallbackImage,
    textModel: s.textModel || s.defaultModel || fallbackText,
    apiKey: s.apiKey || '',
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
    // 仅云雾保持 builtin；Google 条目不再锁定，用户可自由删除
    builtin: isBuiltinYunwu ? true : isLegacyGoogle ? false : !!s.builtin,
    note: s.note || '',
  };
}

/**
 * 加载所有中转站
 * - 自动合并预置条目（确保用户即使删了 localStorage，云雾仍存在）
 * - 容错：解析失败回退到默认列表
 */
export function loadRelayStations(): RelayStation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_LIST];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_LIST];

    // 迁移旧数据：defaultModel → imageModel/textModel
    const migrated = parsed.map(migrateStation);

    // 只保证"云雾"始终存在（唯一内置条目）
    // Google 官方直连已从预置列表移除：存在则保留为普通条目，不存在也不强制加回
    const hasYunwu = migrated.some((s: RelayStation) => s.id === 'builtin_yunwu');
    return hasYunwu ? migrated : [BUILTIN_YUNWU, ...migrated];
  } catch (e) {
    console.error('[RelayStation] 加载失败:', e);
    return [...DEFAULT_LIST];
  }
}

/** 保存全部列表 */
export function saveRelayStations(list: RelayStation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[RelayStation] 保存失败:', e);
  }
}

/** 加载当前激活的中转站 ID */
export function loadActiveStationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** 保存当前激活的中转站 ID */
export function saveActiveStationId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, id);
  } catch (e) {
    console.error('[RelayStation] 保存激活 ID 失败:', e);
  }
}

/** 生成新条目（含默认值） */
export function createBlankStation(): RelayStation {
  return {
    id: `relay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    homepage: '',
    baseUrl: '',
    chatEndpoint: '',
    imageModel: 'gemini-3.1-flash-image-preview',
    textModel: 'gemini-3-flash-preview',
    apiKey: '',
    createdAt: Date.now(),
    builtin: false,
    note: '',
  };
}

/** 添加一条新中转站，返回新列表 */
export function addStation(list: RelayStation[], station: RelayStation): RelayStation[] {
  return [...list, station];
}

/** 更新一条中转站，返回新列表 */
export function updateStation(
  list: RelayStation[],
  id: string,
  patch: Partial<RelayStation>,
): RelayStation[] {
  return list.map((s) => (s.id === id ? { ...s, ...patch, id: s.id } : s));
}

/** 删除一条中转站（builtin 会保留并仅清空 key/note） */
export function removeStation(list: RelayStation[], id: string): RelayStation[] {
  const target = list.find((s) => s.id === id);
  if (!target) return list;
  if (target.builtin) {
    // 内置条目不能真正删除，仅重置为出厂值
    // 当前唯一内置条目为云雾
    return list.map((s) => (s.id === id ? { ...BUILTIN_YUNWU } : s));
  }
  return list.filter((s) => s.id !== id);
}

// 保留 BUILTIN_GOOGLE_OFFICIAL 引用防止 TS 未使用变量警告
// （供将来重新启用或用户手动恢复参考模板使用）
void BUILTIN_GOOGLE_OFFICIAL;

/** URL 简单合法性校验（防御性） */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 推导 chat 接口地址（baseUrl + /chat/completions，去重斜杠）
 * 用户没填 chatEndpoint 时可作为默认建议值
 */
export function deriveChatEndpoint(baseUrl: string): string {
  if (!baseUrl) return '';
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return `${trimmed}/chat/completions`;
}
