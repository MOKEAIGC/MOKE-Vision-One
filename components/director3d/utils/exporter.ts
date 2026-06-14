// 文件路径: components/director3d/utils/exporter.ts
import { useSceneStore } from '../store';

export const exportScene = () => {
  const state = useSceneStore.getState();
  const sceneRoot = document.getElementById('director3d-scene-root');
  const canvas = (sceneRoot?.querySelector('canvas') ?? document.querySelector('canvas')) as HTMLCanvasElement | null;
  
  if (!canvas) {
    alert("无法找到画布");
    return;
  }

  // 1. Generate Prompt
  let promptParts = ["场景描述："];
  const heroes = state.objects.filter(o => o.role === 'hero');
  const others = state.objects.filter(o => o.role !== 'hero');
  
  if (heroes.length > 0) {
    promptParts.push(`主体：${heroes.map(h => `${h.label}(${h.note || '未指定外观'})`).join('，')}。`);
  }
  if (others.length > 0) {
    promptParts.push(`环境与配角：${others.map(o => `${o.label}(${o.type})`).join('，')}。`);
  }
  
  promptParts.push(`镜头预设：${state.cameraPose.name}视角。`);

  const scenePrompt = promptParts.join('\n');

  // 2. Generate JSON
  const sceneJson = JSON.stringify({
    version: '0.1',
    scenePrompt,
    objects: state.objects,
    camera: state.cameraPose,
  }, null, 2);

  // 3. Download the current canvas view
  try {
    const dataUrl = canvas.toDataURL('image/png');
    
    // Create a download for the JSON
    downloadFile(sceneJson, 'scene.json', 'application/json');
    // Create a download for the main screenshot
    downloadFile(dataUrl, 'main_view.png', 'image/png');
    
    // Create a combined prompt download
    downloadFile(scenePrompt, 'prompt.txt', 'text/plain');

  } catch (err) {
    console.error("导出截图失败, 可能是 webgl 上下文未保留: ", err);
    alert("导出时发生错误，请查看控制台日志。确保 Canvas 设置了 preserveDrawingBuffer 或在 render 循环中截图。");
  }
};

function downloadFile(content: string, filename: string, contentType: string) {
  const a = document.createElement("a");
  if (contentType.startsWith('image/')) {
    a.href = content;
  } else {
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
  }
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
