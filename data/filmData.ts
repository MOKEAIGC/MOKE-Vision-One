// 文件路径: data/filmData.ts
// 胶片系统完整数据 - MOKE Vision One 虚拟量子相机

// ===== 类型定义 =====
export interface FilmPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  promptSnippet: string;
}

export interface PresetOption {
  name: string;
  snippet: string;
}

// ===== 胶片预设 =====
export const filmPresets: FilmPreset[] = [
  // --- 经典彩色负片 ---
  {
    id: 'portra-400',
    name: 'Kodak Portra 400',
    description: '柔和肤色、低饱和、奶油质感，人像胶片之王',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Portra 400, soft pastel tones, creamy skin tones, natural warm colors, fine film grain',
  },
  {
    id: 'portra-160',
    name: 'Kodak Portra 160',
    description: '精细颗粒、自然色彩、低对比，适合明亮光线',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Portra 160, ultra-fine grain, natural color rendition, low contrast, smooth tonal transitions',
  },
  {
    id: 'portra-800',
    name: 'Kodak Portra 800',
    description: '高感光、颗粒感、温暖偏色，暗光人像利器',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Portra 800, visible film grain, warm color cast, slightly desaturated, good for low light',
  },
  {
    id: 'gold-200',
    name: 'Kodak Gold 200',
    description: '暖色调、高饱和、怀旧感，日常记录首选',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Gold 200, warm golden tones, saturated colors, nostalgic vintage feel, consumer film look',
  },
  {
    id: 'ultramax-400',
    name: 'Kodak Ultramax 400',
    description: '鲜艳色彩、蓝调偏冷、活力十足',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Ultramax 400, vivid saturated colors, slightly cool blue tones, punchy contrast',
  },
  {
    id: 'ektar-100',
    name: 'Kodak Ektar 100',
    description: '超细颗粒、极高饱和、色彩浓郁鲜艳',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak Ektar 100, extremely fine grain, hyper-saturated vivid colors, deep reds and blues, high contrast',
  },
  {
    id: 'superia-400',
    name: 'Fuji Superia 400',
    description: '绿色偏移、冷调清新，日系经典',
    category: '经典彩色负片',
    promptSnippet: 'shot on Fuji Superia 400, cool green-blue tones, slightly muted, clean and fresh look, moderate grain',
  },
  {
    id: 'pro-400h',
    name: 'Fuji Pro 400H',
    description: '柔和过曝、低饱和、仙气飘飘',
    category: '经典彩色负片',
    promptSnippet: 'shot on Fuji Pro 400H, soft pastel overexposed look, low saturation, delicate skin tones, ethereal dreamy quality',
  },
  {
    id: 'colorplus-200',
    name: 'Kodak ColorPlus 200',
    description: '偏暖日常感、经济实惠的街拍卷',
    category: '经典彩色负片',
    promptSnippet: 'shot on Kodak ColorPlus 200, warm tones, everyday casual look, moderate grain, slightly saturated',
  },

  // --- 反转片 / 正片 ---
  {
    id: 'velvia-50',
    name: 'Fuji Velvia 50',
    description: '极高饱和、浓郁色彩，风光摄影之王',
    category: '反转片 / 正片',
    promptSnippet: 'shot on Fuji Velvia 50, ultra-saturated colors, deep rich greens and reds, high contrast, extremely fine grain, landscape film',
  },
  {
    id: 'velvia-100',
    name: 'Fuji Velvia 100',
    description: '高饱和但比 Velvia 50 更柔和',
    category: '反转片 / 正片',
    promptSnippet: 'shot on Fuji Velvia 100, saturated vibrant colors, slightly softer than Velvia 50, rich tones, fine grain',
  },
  {
    id: 'provia-100f',
    name: 'Fuji Provia 100F',
    description: '自然色彩、中性平衡、万用型反转片',
    category: '反转片 / 正片',
    promptSnippet: 'shot on Fuji Provia 100F, natural accurate colors, neutral tone, fine grain, versatile slide film',
  },
  {
    id: 'ektachrome-e100',
    name: 'Kodak Ektachrome E100',
    description: '精细颗粒、冷蓝色调、高对比透明感',
    category: '反转片 / 正片',
    promptSnippet: 'shot on Kodak Ektachrome E100, cool blue tones, fine grain, high contrast, vivid but natural colors, slide film transparency',
  },

  // --- 电影胶片 ---
  {
    id: 'cinestill-800t',
    name: 'Cinestill 800T',
    description: '霓虹光晕、红移、城市夜景电影质感',
    category: '电影胶片',
    promptSnippet: 'shot on Cinestill 800T, halation around highlights, warm red-orange glow on lights, cinematic tungsten-balanced, neon light halos, urban night atmosphere',
  },
  {
    id: 'cinestill-50d',
    name: 'Cinestill 50D',
    description: '日光型电影卷、细腻温润',
    category: '电影胶片',
    promptSnippet: 'shot on Cinestill 50D, daylight-balanced cinema film, fine grain, natural colors, soft cinematic quality',
  },
  {
    id: 'vision3-500t',
    name: 'Kodak Vision3 500T',
    description: '电影工业级、钨丝灯平衡、丰富暗部细节',
    category: '电影胶片',
    promptSnippet: 'shot on Kodak Vision3 500T, cinema film stock, tungsten balanced, rich shadow detail, cinematic color science',
  },
  {
    id: 'vision3-250d',
    name: 'Kodak Vision3 250D',
    description: '电影日光卷、自然还原、细腻画质',
    category: '电影胶片',
    promptSnippet: 'shot on Kodak Vision3 250D, cinema daylight film, natural color rendition, fine grain, motion picture quality',
  },

  // --- 黑白胶片 ---
  {
    id: 'tri-x-400',
    name: 'Kodak Tri-X 400',
    description: '经典黑白、高对比、明显颗粒，新闻摄影传奇',
    category: '黑白胶片',
    promptSnippet: 'shot on Kodak Tri-X 400, classic black and white, high contrast, visible grain, rich blacks, timeless photojournalistic look',
  },
  {
    id: 'hp5-plus-400',
    name: 'Ilford HP5 Plus 400',
    description: '宽容度高、中等对比，百搭黑白卷',
    category: '黑白胶片',
    promptSnippet: 'shot on Ilford HP5 Plus 400, black and white, wide exposure latitude, medium contrast, versatile grain structure',
  },
  {
    id: 'delta-3200',
    name: 'Ilford Delta 3200',
    description: '极高感光、粗颗粒、暗光戏剧感',
    category: '黑白胶片',
    promptSnippet: 'shot on Ilford Delta 3200, black and white, pronounced grain, high ISO low light capability, gritty dramatic look',
  },
  {
    id: 'tmax-400',
    name: 'Kodak T-Max 400',
    description: '细颗粒黑白、现代感、平滑过渡',
    category: '黑白胶片',
    promptSnippet: 'shot on Kodak T-Max 400, black and white, fine grain for its speed, modern tonal range, smooth gradations',
  },
  {
    id: 'fp4-plus-125',
    name: 'Ilford FP4 Plus 125',
    description: '极细颗粒、经典影调、优美高光细节',
    category: '黑白胶片',
    promptSnippet: 'shot on Ilford FP4 Plus 125, black and white, extremely fine grain, classic tonal range, beautiful highlight detail',
  },
  {
    id: 'pan-f-plus-50',
    name: 'Ilford Pan F Plus 50',
    description: '超细颗粒、极高解析力，黑白艺术之选',
    category: '黑白胶片',
    promptSnippet: 'shot on Ilford Pan F Plus 50, black and white, ultra-fine grain, extraordinary sharpness, rich tonal gradation',
  },

  // --- 特殊 / 即时成像 ---
  {
    id: 'lomo-400',
    name: 'Lomography Color 400',
    description: '交叉冲洗、偏色、实验 Lo-Fi 美学',
    category: '特殊 / 即时成像',
    promptSnippet: 'shot on Lomography Color 400, cross-processed colors, color shifts, experimental lo-fi aesthetic, unpredictable tones',
  },
  {
    id: 'aerochrome',
    name: 'Kodak Aerochrome',
    description: '红外彩色、植物变粉红、超现实梦境',
    category: '特殊 / 即时成像',
    promptSnippet: 'shot on Kodak Aerochrome infrared film, false color, pink-magenta foliage, surreal dreamlike landscape, infrared photography',
  },
  {
    id: 'polaroid-600',
    name: 'Polaroid 600',
    description: '即时成像、方形画幅、褪色复古感',
    category: '特殊 / 即时成像',
    promptSnippet: 'shot on Polaroid 600 instant film, square format, slightly faded colors, soft vintage look, white border frame',
  },
  {
    id: 'instax',
    name: 'Fujifilm Instax',
    description: '即时成像、鲜艳活泼、小画幅',
    category: '特殊 / 即时成像',
    promptSnippet: 'shot on Fujifilm Instax, instant film, bright cheerful colors, small format, casual snapshot aesthetic',
  },
];

// ===== 相机预设 =====
export const cameraPresets: PresetOption[] = [
  // 35mm 经典相机
  { name: 'Canon AE-1 (35mm SLR)', snippet: 'Canon AE-1, 35mm SLR, manual focus' },
  { name: 'Nikon FM2 (全机械)', snippet: 'Nikon FM2, mechanical 35mm SLR, precise metering' },
  { name: 'Nikon F3 (专业级)', snippet: 'Nikon F3, professional 35mm SLR' },
  { name: 'Leica M6 (旁轴传奇)', snippet: 'Leica M6 rangefinder, precise manual focus, minimalist design' },
  { name: 'Leica M3 (经典传奇)', snippet: 'Leica M3, legendary rangefinder, classic photography' },
  { name: 'Contax T2 (钛机身)', snippet: 'Contax T2, titanium compact camera, Carl Zeiss Sonnar 38mm f/2.8 lens' },
  { name: 'Contax G2 (自动旁轴)', snippet: 'Contax G2 rangefinder, Carl Zeiss lens, autofocus film camera' },
  { name: 'Olympus OM-1 (轻巧)', snippet: 'Olympus OM-1, compact lightweight SLR' },
  { name: 'Pentax K1000 (经典学生机)', snippet: 'Pentax K1000, simple reliable SLR, fully manual' },
  { name: 'Yashica T4 (蔡司便携)', snippet: 'Yashica T4, Carl Zeiss Tessar 35mm f/3.5, compact point-and-shoot' },
  // 中画幅相机
  { name: 'Hasselblad 500CM (6×6)', snippet: 'Hasselblad 500CM, medium format 6x6, square format, Carl Zeiss Planar 80mm' },
  { name: 'Mamiya RZ67 (6×7)', snippet: 'Mamiya RZ67, medium format 6x7, extremely detailed, shallow depth of field' },
  { name: 'Pentax 67 (6×7)', snippet: 'Pentax 67, medium format SLR, 6x7, legendary 105mm f/2.4 lens' },
  { name: 'Rolleiflex 2.8F (双反)', snippet: 'Rolleiflex 2.8F, twin-lens reflex, medium format 6x6, waist-level viewfinder' },
  { name: 'Mamiya 7 (中画幅旁轴)', snippet: 'Mamiya 7, medium format rangefinder, 6x7, sharp optics' },
  // 电影摄影机
  { name: 'ARRI ALEXA 35 (电影旗舰)', snippet: 'shot on ARRI ALEXA 35, ARRI color science, cinema-grade image, wide dynamic range, natural film-like texture' },
  { name: 'ARRI ALEXA Mini LF (大画幅)', snippet: 'shot on ARRI ALEXA Mini LF, large format sensor, cinematic shallow depth of field, ARRI color science' },
  { name: 'ARRI ALEXA 65 (IMAX级)', snippet: 'shot on ARRI ALEXA 65, 65mm large format, IMAX-grade resolution, extraordinary detail, epic cinematic scale' },
  { name: 'Sony VENICE 2 (8.6K)', snippet: 'shot on Sony VENICE 2, full-frame 8.6K, dual base ISO, cinematic depth, high-end production' },
  // 大画幅
  { name: '4×5 大画幅 (移轴)', snippet: '4x5 large format camera, tilt-shift, extreme detail and resolution, shallow plane of focus' },
  { name: '8×10 大画幅 (超大底片)', snippet: '8x10 large format, ultra-high resolution, extraordinary detail, massive negative' },
];

// ===== 镜头预设 =====
export const lensPresets: PresetOption[] = [
  { name: '50mm f/1.4 标准镜头', snippet: '50mm f/1.4 lens, natural perspective, shallow depth of field, creamy bokeh' },
  { name: '35mm f/2 广角镜头', snippet: '35mm f/2 wide-angle lens, environmental context, slight barrel distortion' },
  { name: '85mm f/1.8 人像镜头', snippet: '85mm f/1.8 portrait lens, flattering perspective, beautiful background separation, smooth bokeh' },
  { name: '135mm f/2 中长焦', snippet: '135mm f/2 telephoto, compressed perspective, extreme bokeh, subject isolation' },
  { name: '28mm f/2.8 广角', snippet: '28mm f/2.8 wide-angle, expansive view, street photography perspective' },
  { name: '蔡司 Planar 镜头', snippet: 'Carl Zeiss Planar lens, exceptional sharpness, smooth rendering, 3D pop' },
  { name: '蔡司 Sonnar 镜头', snippet: 'Carl Zeiss Sonnar lens, beautiful color rendering, classic optical character' },
  { name: 'Leica Summilux 镜头', snippet: 'Leica Summilux lens, exceptional micro-contrast, three-dimensional rendering' },
  { name: 'Leica Summicron 镜头', snippet: 'Leica Summicron lens, razor-sharp, classic Leica rendering' },
  { name: 'Helios 44-2 (旋涡散景)', snippet: 'Helios 44-2 58mm f/2, famous swirly bokeh, vintage Soviet lens character' },
  { name: 'Petzval 镜头 (19世纪)', snippet: 'Petzval lens, dramatic swirly bokeh, sharp center soft edges, 19th century optical design' },
  { name: '古董老镜头 (泛用)', snippet: 'vintage lens, soft glow, optical imperfections, swirly bokeh, character-rich rendering' },
  // 电影镜头
  { name: 'ARRI Signature Prime (电影)', snippet: 'ARRI Signature Prime lens, large format coverage, creamy smooth bokeh, organic cinematic rendering, warm color character' },
  { name: 'ARRI Master Anamorphic (变形宽银幕)', snippet: 'ARRI Master Anamorphic lens, 2x anamorphic squeeze, oval bokeh, horizontal lens flare, widescreen cinematic look' },
  { name: 'Cooke Anamorphic/i (变形)', snippet: 'Cooke Anamorphic/i lens, 2x anamorphic, warm Cooke Look, smooth skin tones, elegant oval bokeh' },
  { name: '变形宽银幕镜头 (泛用)', snippet: 'anamorphic lens, 2x squeeze, oval bokeh, horizontal blue lens flare, widescreen cinematic aspect ratio 2.39:1' },
];

// ===== 光线预设 =====
export const lightingPresets: PresetOption[] = [
  { name: '黄金时段 (Golden Hour)', snippet: 'golden hour, warm directional sunlight, long shadows, golden warm light' },
  { name: '蓝调时刻 (Blue Hour)', snippet: 'blue hour, cool twilight, soft diffused light, deep blue sky' },
  { name: '正午硬光 (Harsh Midday)', snippet: 'harsh midday sun, strong shadows, high contrast, bright highlights' },
  { name: '阴天柔光 (Overcast)', snippet: 'overcast soft light, even diffused illumination, no harsh shadows' },
  { name: '窗户光 (Window Light)', snippet: 'window light, soft directional natural light, Vermeer-like illumination' },
  { name: '霓虹灯 (Neon Lights)', snippet: 'neon lights, colorful artificial lighting, urban night, mixed color temperature' },
  { name: '逆光 (Backlit)', snippet: 'backlit, rim lighting, lens flare, silhouette edges, halo effect' },
  { name: '烛光 (Candlelight)', snippet: 'candlelight, warm orange glow, intimate low light, soft flickering illumination' },
  { name: '轻微过曝 (Overexposed)', snippet: 'slight overexposure, bright airy feel, lifted shadows, dreamy quality' },
  { name: '欠曝暗调 (Underexposed)', snippet: 'underexposed, moody dark tones, deep shadows, dramatic atmosphere' },
  { name: '推冲处理 (Push +1)', snippet: 'push processed +1 stop, increased contrast, more grain, punchier tones' },
];

// ===== 美学修饰预设 =====
export const aestheticPresets: PresetOption[] = [
  { name: '怀旧复古 (Nostalgic)', snippet: 'nostalgic, analog warmth, film photography aesthetic, natural imperfections, light leaks' },
  { name: '梦幻飘渺 (Dreamy)', snippet: 'dreamy, ethereal, soft focus, hazy atmosphere, airy bright feeling' },
  { name: '忧郁深沉 (Melancholic)', snippet: 'melancholic, moody, atmospheric, contemplative, deep shadows, muted tones' },
  { name: '纪实街拍 (Documentary)', snippet: 'documentary style, street photography feel, candid, raw, decisive moment' },
  { name: '亲密私密 (Intimate)', snippet: 'intimate, candid moment, personal atmosphere, close perspective, warm tones' },
  { name: '粗颗粒质感 (Gritty)', snippet: 'coarse grain, gritty dramatic look, raw energy, high contrast, visible film grain' },
  { name: '柔和奶油感 (Creamy)', snippet: 'creamy tones, soft pastel colors, matte finish, low contrast, smooth tonal transitions' },
  { name: '浓郁高对比 (Rich Contrast)', snippet: 'rich blacks, deep shadows, high contrast, saturated colors, punchy tones' },
  { name: '交叉冲洗 (Cross-Process)', snippet: 'cross-processed, unusual color shifts, increased contrast, experimental look, unpredictable tones' },
  { name: '跳漂效果 (Bleach Bypass)', snippet: 'bleach bypass look, desaturated, high contrast, silver-retained, gritty cinematic' },
  { name: '手工冲洗 (Hand-Developed)', snippet: 'hand-developed, organic imperfections, uneven development, artisanal film processing' },
  { name: '漏光与划痕 (Light Leaks)', snippet: 'light leaks, dust and scratches, analog imperfections, vintage degraded film look' },
];
