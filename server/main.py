"""
MOKE Vision One — Infinite Canvas Backend Server
整合 Infinite-Canvas 全部后端功能:
  • 多平台 AI 图片生成（OpenAI/Gemini/APIMart/ModelScope/火山引擎/RunningHub）
  • 视频生成（Veo3/Sora/通义万相/豆包 Seedance）
  • ComfyUI 工作流调度与负载均衡
  • 画布 CRUD + 实时协作（WebSocket）
  • 素材库管理
  • LLM 对话（流式/非流式）
  • 历史记录管理
  • 版本管理与自动更新
"""

import os
import json
import time
import uuid
import asyncio
import base64
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ===== 路径配置 =====
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CANVAS_DIR = DATA_DIR / "canvases"
CONVERSATION_DIR = DATA_DIR / "conversations"
OUTPUT_DIR = BASE_DIR / "output"
ASSETS_DIR = BASE_DIR / "assets"
WORKFLOW_DIR = BASE_DIR / "workflows"
ENV_FILE = BASE_DIR / ".env"

for d in [DATA_DIR, CANVAS_DIR, CONVERSATION_DIR, OUTPUT_DIR, ASSETS_DIR, ASSETS_DIR / "input", WORKFLOW_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ===== 环境变量 =====
load_dotenv(ENV_FILE)

APP_VERSION = "2026.05.23.1"
GITHUB_REPO = "https://github.com/hero8152/Infinite-Canvas"


# ===== WebSocket 连接管理 =====
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for conn in self.active_connections[:]:
            try:
                await conn.send_json(message)
            except Exception:
                self.active_connections.remove(conn)

    @property
    def online_count(self):
        return len(self.active_connections)


manager = ConnectionManager()

# ===== 任务队列 =====
TASK_QUEUE: Dict[str, Dict[str, Any]] = {}
QUEUE_LOCK = asyncio.Lock()
CANVAS_LOCK = asyncio.Lock()
HISTORY_LOCK = asyncio.Lock()


# ===== Pydantic 请求模型 =====
class OnlineImageRequest(BaseModel):
    prompt: str
    provider_id: Optional[str] = None
    model: Optional[str] = None
    size: Optional[str] = "1024x1024"
    ratio: Optional[str] = "1:1"
    resolution: Optional[str] = "1K"
    quality: Optional[str] = "medium"
    reference_images: Optional[List[str]] = None  # base64 or URLs
    lora: Optional[str] = None
    negative_prompt: Optional[str] = None


class CanvasVideoRequest(BaseModel):
    prompt: str
    provider_id: Optional[str] = None
    model: Optional[str] = None
    image_url: Optional[str] = None  # reference image (data URL or http)
    duration: Optional[int] = 5
    ratio: Optional[str] = "16:9"


class CanvasLLMRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider_id: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    max_tokens: Optional[int] = 4096


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    mode: Optional[str] = "chat"  # chat | image
    provider_id: Optional[str] = None
    model: Optional[str] = None
    conversation_id: Optional[str] = None


class CanvasCreateRequest(BaseModel):
    title: Optional[str] = "未命名画布"
    kind: Optional[str] = "classic"  # classic | smart


class CanvasSaveRequest(BaseModel):
    title: Optional[str] = None
    nodes: Optional[List[Dict]] = None
    connections: Optional[List[Dict]] = None
    viewport: Optional[Dict] = None
    settings: Optional[Dict] = None


class AssetLibraryCategoryRequest(BaseModel):
    name: str


class AssetLibraryAddRequest(BaseModel):
    category_id: str
    url: str
    name: Optional[str] = None
    type: Optional[str] = "image"


class MsGenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = "Tongyi-MAI/Z-Image-Turbo"
    size: Optional[str] = "1024x1024"
    image_url: Optional[str] = None
    lora: Optional[str] = None


class ComfyUIGenerateRequest(BaseModel):
    workflow: str
    prompt: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    size: Optional[str] = "1024x1024"
    seed: Optional[int] = None


class ProviderConfig(BaseModel):
    id: str
    name: str
    base_url: str
    api_key: Optional[str] = ""
    protocol: Optional[str] = "openai"  # openai | apimart | gemini | volcengine | runninghub
    models: Optional[List[str]] = None
    enabled: Optional[bool] = True


# ===== Provider 管理 =====
def load_providers() -> List[Dict[str, Any]]:
    """从 .env 和内置配置加载所有 Provider"""
    providers = []
    try:
        config_file = DATA_DIR / "providers.json"
        if config_file.exists():
            providers = json.loads(config_file.read_text(encoding="utf-8"))
    except Exception:
        pass

    if not providers:
        # 默认 Provider 从环境变量构建
        default_provider = {
            "id": os.getenv("API_PROVIDER_ID", "default"),
            "name": os.getenv("API_PROVIDER_NAME", "Default"),
            "base_url": os.getenv("API_BASE_URL", "https://api.openai.com"),
            "api_key": os.getenv("API_KEY", ""),
            "protocol": os.getenv("API_PROTOCOL", "openai"),
            "models": [],
            "enabled": True,
        }
        if os.getenv("GEMINI_API_KEY"):
            providers.append({
                "id": "gemini",
                "name": "Google Gemini",
                "base_url": os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com"),
                "api_key": os.getenv("GEMINI_API_KEY", ""),
                "protocol": "gemini",
                "models": ["gemini-2.0-flash-exp", "gemini-2.0-flash-preview-image-generation"],
                "enabled": True,
            })
        providers.insert(0, default_provider)

    return providers


def save_providers(providers: List[Dict[str, Any]]):
    config_file = DATA_DIR / "providers.json"
    config_file.write_text(json.dumps(providers, ensure_ascii=False, indent=2), encoding="utf-8")


def get_provider(provider_id: Optional[str] = None) -> Dict[str, Any]:
    providers = load_providers()
    if provider_id:
        for p in providers:
            if p["id"] == provider_id:
                return p
    return providers[0] if providers else {"id": "none", "base_url": "", "api_key": "", "protocol": "openai"}


# ===== ComfyUI 实例管理 =====
def load_comfyui_instances() -> List[Dict[str, Any]]:
    raw = os.getenv("COMFYUI_INSTANCES", "[]")
    try:
        instances = json.loads(raw)
        return instances if isinstance(instances, list) else []
    except Exception:
        return []


async def get_best_comfyui_backend() -> Optional[Dict[str, Any]]:
    """选择队列最短的 ComfyUI 后端"""
    instances = load_comfyui_instances()
    if not instances:
        return None

    best = None
    min_queue = float("inf")

    async with httpx.AsyncClient(timeout=5) as client:
        for inst in instances:
            try:
                resp = await client.get(f"{inst['url']}/queue")
                if resp.status_code == 200:
                    data = resp.json()
                    queue_len = len(data.get("queue_running", [])) + len(data.get("queue_pending", []))
                    if queue_len < min_queue:
                        min_queue = queue_len
                        best = inst
            except Exception:
                continue

    return best or (instances[0] if instances else None)


# ===== 图片生成核心 =====
async def generate_via_openai(provider: Dict, prompt: str, size: str = "1024x1024",
                              reference_images: Optional[List[str]] = None,
                              model: Optional[str] = None, quality: str = "medium") -> Dict[str, Any]:
    """通过 OpenAI 协议生成图片"""
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    effective_model = model or "gpt-image-2"

    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}

    async with httpx.AsyncClient(timeout=120) as client:
        if reference_images:
            # 使用 /v1/images/edits
            import io
            from PIL import Image

            files = []
            for idx, img_data in enumerate(reference_images[:3]):
                if img_data.startswith("data:"):
                    img_bytes = base64.b64decode(img_data.split(",")[1])
                else:
                    img_bytes = base64.b64decode(img_data)
                files.append(("image", (f"ref_{idx}.png", img_bytes, "image/png")))

            data = {
                "prompt": prompt,
                "model": effective_model,
                "n": "1",
                "size": size,
                "quality": quality,
            }
            resp = await client.post(f"{base_url}/v1/images/edits", headers=headers, data=data, files=files)
        else:
            body = {
                "model": effective_model,
                "prompt": prompt,
                "n": 1,
                "size": size,
                "quality": quality,
                "response_format": "b64_json",
            }
            headers["Content-Type"] = "application/json"
            resp = await client.post(f"{base_url}/v1/images/generations", headers=headers, json=body)

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Image API error: {resp.text[:500]}")

        payload = resp.json()
        return extract_image_result(payload)


async def generate_via_gemini(provider: Dict, prompt: str, size: str = "1024x1024",
                              reference_images: Optional[List[str]] = None,
                              model: Optional[str] = None) -> Dict[str, Any]:
    """通过 Gemini 协议生成图片"""
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    effective_model = model or "gemini-2.0-flash-exp"

    parts = [{"text": prompt}]
    if reference_images:
        for img in reference_images[:2]:
            if img.startswith("data:"):
                mime = img.split(";")[0].split(":")[1]
                data = img.split(",")[1]
            else:
                mime = "image/png"
                data = img
            parts.append({"inlineData": {"mimeType": mime, "data": data}})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
    }

    url = f"{base_url}/v1beta/models/{effective_model}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini error: {resp.text[:500]}")

        payload = resp.json()
        # Extract image from Gemini response
        candidates = payload.get("candidates", [])
        for candidate in candidates:
            parts = candidate.get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    return {
                        "image": f"data:{part['inlineData']['mimeType']};base64,{part['inlineData']['data']}",
                        "model": effective_model,
                    }

    raise HTTPException(status_code=500, detail="Gemini did not return an image")


async def generate_via_apimart(provider: Dict, prompt: str, size: str = "1024x1024",
                               reference_images: Optional[List[str]] = None,
                               model: Optional[str] = None) -> Dict[str, Any]:
    """通过 APIMart 异步协议生成图片"""
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    effective_model = model or "gpt-image-2"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    body = {
        "model": effective_model,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }

    if reference_images:
        # Upload images first
        image_urls = []
        async with httpx.AsyncClient(timeout=60) as client:
            for img in reference_images[:3]:
                upload_resp = await client.post(
                    f"{base_url}/v1/uploads/images",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"image": img}
                )
                if upload_resp.status_code == 200:
                    upload_data = upload_resp.json()
                    url = upload_data.get("data", {}).get("url") or upload_data.get("url")
                    if url:
                        image_urls.append(url)
        if image_urls:
            body["image_urls"] = image_urls

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(f"{base_url}/v1/images/generations", headers=headers, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"APIMart error: {resp.text[:500]}")

        payload = resp.json()

        # Check if async task
        task_id = extract_task_id(payload)
        if task_id:
            return await wait_for_image_task(base_url, api_key, task_id)

        return extract_image_result(payload)


async def generate_via_volcengine(provider: Dict, prompt: str, size: str = "1024x1024",
                                  model: Optional[str] = None) -> Dict[str, Any]:
    """通过火山引擎协议生成图片"""
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"model": model or "doubao-seedream-3-0-t2i-250415", "prompt": prompt, "size": size, "n": 1}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(f"{base_url}/v1/images/generations", headers=headers, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Volcengine error: {resp.text[:500]}")
        return extract_image_result(resp.json())


async def generate_via_modelscope(prompt: str, model: str = "Tongyi-MAI/Z-Image-Turbo",
                                  size: str = "1024x1024", image_url: Optional[str] = None,
                                  lora: Optional[str] = None) -> Dict[str, Any]:
    """通过 ModelScope 免费生图"""
    token = os.getenv("MODELSCOPE_TOKEN", "")
    if not token:
        raise HTTPException(status_code=400, detail="ModelScope token not configured")

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body: Dict[str, Any] = {"model": model, "input": {"prompt": prompt, "size": size}}

    if image_url:
        body["input"]["image_url"] = image_url
    if lora:
        body["input"]["lora"] = lora

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post("https://api-inference.modelscope.cn/api/v1/models", headers=headers, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"ModelScope error: {resp.text[:500]}")

        data = resp.json()
        task_id = data.get("task_id") or data.get("output", {}).get("task_id")

        if task_id:
            # Poll for result
            for _ in range(200):
                await asyncio.sleep(2)
                poll_resp = await client.get(
                    f"https://api-inference.modelscope.cn/api/v1/tasks/{task_id}",
                    headers=headers
                )
                if poll_resp.status_code == 200:
                    poll_data = poll_resp.json()
                    status = poll_data.get("output", {}).get("task_status", "")
                    if status == "SUCCEEDED":
                        results = poll_data.get("output", {}).get("results", [])
                        if results:
                            return {"image": results[0].get("url", ""), "model": model}
                    elif status in ("FAILED", "CANCELLED"):
                        raise HTTPException(status_code=500, detail=f"ModelScope task {status}")

            raise HTTPException(status_code=408, detail="ModelScope task timeout")

        # Direct result
        output = data.get("output", {})
        results = output.get("results", [])
        if results:
            return {"image": results[0].get("url", ""), "model": model}

    raise HTTPException(status_code=500, detail="ModelScope returned no image")


async def generate_via_comfyui(workflow_name: str, prompt: Optional[str] = None,
                               params: Optional[Dict] = None, size: str = "1024x1024",
                               seed: Optional[int] = None) -> Dict[str, Any]:
    """通过本地 ComfyUI 工作流生图"""
    backend = await get_best_comfyui_backend()
    if not backend:
        raise HTTPException(status_code=503, detail="No ComfyUI backend available")

    workflow_path = WORKFLOW_DIR / f"{workflow_name}.json"
    if not workflow_path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_name}' not found")

    workflow_data = json.loads(workflow_path.read_text(encoding="utf-8"))

    # Inject params
    if prompt:
        for node in workflow_data.values():
            if isinstance(node, dict) and node.get("class_type") in ("CLIPTextEncode", "PositivePrompt"):
                if "inputs" in node:
                    node["inputs"]["text"] = prompt

    if seed is not None:
        for node in workflow_data.values():
            if isinstance(node, dict) and "inputs" in node and "seed" in node["inputs"]:
                node["inputs"]["seed"] = seed

    if params:
        for key, value in params.items():
            for node in workflow_data.values():
                if isinstance(node, dict) and "inputs" in node and key in node["inputs"]:
                    node["inputs"][key] = value

    # Submit to ComfyUI
    client_id = str(uuid.uuid4())
    async with httpx.AsyncClient(timeout=300) as client:
        submit_resp = await client.post(
            f"{backend['url']}/prompt",
            json={"prompt": workflow_data, "client_id": client_id}
        )
        if submit_resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"ComfyUI submit error: {submit_resp.text[:300]}")

        prompt_id = submit_resp.json().get("prompt_id")

        # Poll history
        for _ in range(300):
            await asyncio.sleep(1)
            hist_resp = await client.get(f"{backend['url']}/history/{prompt_id}")
            if hist_resp.status_code == 200:
                history = hist_resp.json()
                if prompt_id in history:
                    outputs = history[prompt_id].get("outputs", {})
                    for node_output in outputs.values():
                        images = node_output.get("images", [])
                        if images:
                            img_info = images[0]
                            img_resp = await client.get(
                                f"{backend['url']}/view",
                                params={"filename": img_info["filename"], "subfolder": img_info.get("subfolder", ""), "type": img_info.get("type", "output")}
                            )
                            if img_resp.status_code == 200:
                                img_b64 = base64.b64encode(img_resp.content).decode()
                                return {"image": f"data:image/png;base64,{img_b64}", "model": workflow_name}

        raise HTTPException(status_code=408, detail="ComfyUI task timeout")


# ===== 视频生成 =====
async def generate_video(provider: Dict, prompt: str, model: Optional[str] = None,
                         image_url: Optional[str] = None, duration: int = 5,
                         ratio: str = "16:9") -> Dict[str, Any]:
    """统一视频生成入口"""
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    protocol = provider.get("protocol", "openai")
    effective_model = model or "veo-3"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body: Dict[str, Any] = {"model": effective_model, "prompt": prompt}

    if image_url:
        if protocol == "apimart":
            # Upload image for APIMart
            async with httpx.AsyncClient(timeout=60) as client:
                upload_resp = await client.post(
                    f"{base_url}/v1/uploads/images",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"image": image_url}
                )
                if upload_resp.status_code == 200:
                    upload_data = upload_resp.json()
                    uploaded_url = upload_data.get("data", {}).get("url") or upload_data.get("url")
                    if uploaded_url:
                        body["image_urls"] = [uploaded_url]
        else:
            body["image"] = image_url

    body["duration"] = duration
    body["aspect_ratio"] = ratio

    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(f"{base_url}/v1/video/generations", headers=headers, json=body)
        if resp.status_code not in (200, 201, 202):
            # Try alternative endpoint
            resp = await client.post(f"{base_url}/v1/images/generations", headers=headers, json=body)

        if resp.status_code not in (200, 201, 202):
            raise HTTPException(status_code=resp.status_code, detail=f"Video API error: {resp.text[:500]}")

        payload = resp.json()
        task_id = extract_task_id(payload)

        if task_id:
            # Poll for video
            for _ in range(300):
                await asyncio.sleep(3)
                poll_resp = await client.get(
                    f"{base_url}/v1/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                if poll_resp.status_code == 200:
                    poll_data = poll_resp.json()
                    status = poll_data.get("status") or poll_data.get("data", {}).get("status", "")
                    if status in ("completed", "succeeded", "SUCCEEDED"):
                        video_url = extract_video_url(poll_data)
                        if video_url:
                            # Download and save locally
                            local_path = await save_remote_video(client, video_url)
                            return {"video_url": f"/output/{local_path.name}", "model": effective_model}
                    elif status in ("failed", "FAILED", "cancelled"):
                        raise HTTPException(status_code=500, detail=f"Video task {status}")

            raise HTTPException(status_code=408, detail="Video generation timeout")

        # Direct video URL in response
        video_url = extract_video_url(payload)
        if video_url:
            local_path = await save_remote_video(client, video_url)
            return {"video_url": f"/output/{local_path.name}", "model": effective_model}

    raise HTTPException(status_code=500, detail="No video URL in response")


# ===== 辅助函数 =====
def extract_image_result(payload: Dict) -> Dict[str, Any]:
    """从各种响应格式提取图片"""
    # OpenAI format
    data_items = payload.get("data", [])
    if isinstance(data_items, list):
        for item in data_items:
            if isinstance(item, dict):
                if item.get("b64_json"):
                    return {"image": f"data:image/png;base64,{item['b64_json']}", "model": ""}
                if item.get("url"):
                    return {"image": item["url"], "model": ""}

    # APIMart wrapped
    if "code" in payload and "data" in payload:
        inner = payload["data"]
        if isinstance(inner, dict):
            return extract_image_result(inner)

    # Direct image field
    if payload.get("image"):
        return {"image": payload["image"], "model": ""}

    # Results array
    results = payload.get("results") or payload.get("output", {}).get("results", [])
    if results and isinstance(results, list):
        return {"image": results[0].get("url", ""), "model": ""}

    raise HTTPException(status_code=500, detail="No image found in response")


def extract_task_id(payload: Dict) -> Optional[str]:
    """从响应中提取异步任务 ID"""
    for key in ("task_id", "taskId", "id"):
        if payload.get(key):
            return str(payload[key])
    data = payload.get("data", {})
    if isinstance(data, dict):
        for key in ("task_id", "taskId", "id"):
            if data.get(key):
                return str(data[key])
    return None


def extract_video_url(payload: Dict) -> Optional[str]:
    """从响应中提取视频 URL"""
    # Direct
    for key in ("video_url", "videoUrl", "url"):
        if payload.get(key) and isinstance(payload[key], str):
            return payload[key]

    # Nested data
    data = payload.get("data", {})
    if isinstance(data, dict):
        for key in ("video_url", "videoUrl", "url"):
            if data.get(key):
                return data[key]
        # Results array
        results = data.get("results", [])
        if results and isinstance(results, list):
            for r in results:
                if isinstance(r, dict) and r.get("url"):
                    return r["url"]

    # Output field
    output = payload.get("output", {})
    if isinstance(output, dict):
        for key in ("video_url", "url"):
            if output.get(key):
                return output[key]
        results = output.get("results", [])
        if results:
            return results[0].get("url")

    return None


async def wait_for_image_task(base_url: str, api_key: str, task_id: str) -> Dict[str, Any]:
    """轮询异步图片任务"""
    headers = {"Authorization": f"Bearer {api_key}"}
    async with httpx.AsyncClient(timeout=300) as client:
        for _ in range(150):
            await asyncio.sleep(2)
            resp = await client.get(f"{base_url}/v1/tasks/{task_id}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("status") or data.get("data", {}).get("status", "")
                if status in ("completed", "succeeded", "SUCCEEDED"):
                    return extract_image_result(data)
                elif status in ("failed", "FAILED"):
                    raise HTTPException(status_code=500, detail=f"Task failed: {data}")

    raise HTTPException(status_code=408, detail="Image task timeout")


async def save_remote_video(client: httpx.AsyncClient, url: str) -> Path:
    """下载远程视频到本地"""
    resp = await client.get(url, follow_redirects=True)
    ext = "mp4"
    if ".webm" in url:
        ext = "webm"
    filename = f"video_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    path = OUTPUT_DIR / filename
    path.write_bytes(resp.content)
    return path


def save_image_to_output(image_data: str) -> str:
    """保存 base64 图片到本地 output 目录"""
    if image_data.startswith("data:"):
        header, data = image_data.split(",", 1)
        ext = "png" if "png" in header else "jpg"
    else:
        data = image_data
        ext = "png"

    filename = f"img_{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    path = OUTPUT_DIR / filename
    path.write_bytes(base64.b64decode(data))
    return f"/output/{filename}"


# ===== 画布 CRUD =====
def canvas_path(canvas_id: str) -> Path:
    safe_id = "".join(c for c in canvas_id if c.isalnum() or c in "-_")
    return CANVAS_DIR / f"{safe_id}.json"


def save_canvas_data(canvas_id: str, data: Dict) -> Dict:
    data["updatedAt"] = int(time.time() * 1000)
    path = canvas_path(canvas_id)
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return data


def load_canvas_data(canvas_id: str) -> Optional[Dict]:
    path = canvas_path(canvas_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def list_canvases() -> List[Dict]:
    canvases = []
    for f in sorted(CANVAS_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            canvases.append({
                "id": data.get("id", f.stem),
                "title": data.get("title", "未命名"),
                "kind": data.get("kind", "classic"),
                "icon": data.get("icon", "🎨"),
                "nodeCount": len(data.get("nodes", [])),
                "updatedAt": data.get("updatedAt", 0),
                "createdAt": data.get("createdAt", 0),
            })
        except Exception:
            continue
    return canvases


# ===== 素材库 =====
def asset_library_path() -> Path:
    return DATA_DIR / "asset_library.json"


def load_asset_library() -> Dict:
    path = asset_library_path()
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"categories": [], "items": []}


def save_asset_library(data: Dict):
    path = asset_library_path()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ===== 历史记录 =====
def history_path() -> Path:
    return DATA_DIR / "history.json"


def load_history() -> List[Dict]:
    path = history_path()
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def save_history(records: List[Dict]):
    path = history_path()
    path.write_text(json.dumps(records[-500:], ensure_ascii=False), encoding="utf-8")


def add_history_record(record: Dict):
    records = load_history()
    records.append(record)
    save_history(records)


# ===== 对话管理 =====
def conversation_file(conv_id: str) -> Path:
    safe_id = "".join(c for c in conv_id if c.isalnum() or c in "-_")
    return CONVERSATION_DIR / f"{safe_id}.json"


# ===== FastAPI 应用 =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="MOKE Vision Canvas Server", version=APP_VERSION, lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")
app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


# ===== WebSocket =====
@app.websocket("/ws/stats")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await manager.broadcast({"type": "online", "count": manager.online_count})
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "canvas_update":
                await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({"type": "online", "count": manager.online_count})


# ===== App Info =====
@app.get("/api/app-info")
async def app_info():
    return {"version": APP_VERSION, "repo": GITHUB_REPO}


# ===== Provider 路由 =====
@app.get("/api/providers")
async def get_providers():
    return load_providers()


@app.put("/api/providers")
async def update_providers(providers: List[ProviderConfig]):
    data = [p.model_dump() for p in providers]
    save_providers(data)
    return {"ok": True}


@app.post("/api/providers/test-connection")
async def test_provider_connection(provider: ProviderConfig):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            headers = {"Authorization": f"Bearer {provider.api_key}"}
            resp = await client.get(f"{provider.base_url.rstrip('/')}/v1/models", headers=headers)
            if resp.status_code == 200:
                return {"success": True, "message": "Connected", "models": resp.json().get("data", [])}
            return {"success": False, "message": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ===== 在线生图 =====
@app.post("/api/online-image")
async def online_image(req: OnlineImageRequest):
    provider = get_provider(req.provider_id)
    protocol = provider.get("protocol", "openai")

    try:
        if protocol == "gemini":
            result = await generate_via_gemini(provider, req.prompt, req.size, req.reference_images, req.model)
        elif protocol == "apimart":
            result = await generate_via_apimart(provider, req.prompt, req.size, req.reference_images, req.model)
        elif protocol == "volcengine":
            result = await generate_via_volcengine(provider, req.prompt, req.size, req.model)
        else:
            result = await generate_via_openai(provider, req.prompt, req.size, req.reference_images, req.model, req.quality)

        # Save to output
        image_url = result.get("image", "")
        if image_url.startswith("data:"):
            local_url = save_image_to_output(image_url)
            result["local_url"] = local_url

        # Save history
        add_history_record({
            "timestamp": int(time.time() * 1000),
            "prompt": req.prompt,
            "model": result.get("model", req.model or ""),
            "image": result.get("local_url") or result.get("image", ""),
            "size": req.size,
        })

        # Broadcast
        await manager.broadcast({"type": "image_generated", "data": result})

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== 画布图片异步任务 =====
@app.post("/api/canvas-image-tasks")
async def create_canvas_image_task(req: OnlineImageRequest):
    task_id = str(uuid.uuid4())
    TASK_QUEUE[task_id] = {"status": "pending", "created": time.time(), "request": req.model_dump()}

    # Run in background
    asyncio.create_task(_run_image_task(task_id, req))
    return {"task_id": task_id, "status": "pending"}


async def _run_image_task(task_id: str, req: OnlineImageRequest):
    try:
        TASK_QUEUE[task_id]["status"] = "running"
        provider = get_provider(req.provider_id)
        protocol = provider.get("protocol", "openai")

        if protocol == "gemini":
            result = await generate_via_gemini(provider, req.prompt, req.size, req.reference_images, req.model)
        elif protocol == "apimart":
            result = await generate_via_apimart(provider, req.prompt, req.size, req.reference_images, req.model)
        elif protocol == "volcengine":
            result = await generate_via_volcengine(provider, req.prompt, req.size, req.model)
        else:
            result = await generate_via_openai(provider, req.prompt, req.size, req.reference_images, req.model, req.quality)

        image_url = result.get("image", "")
        if image_url.startswith("data:"):
            local_url = save_image_to_output(image_url)
            result["local_url"] = local_url

        TASK_QUEUE[task_id] = {"status": "completed", "result": result}
        await manager.broadcast({"type": "task_completed", "task_id": task_id, "result": result})
    except Exception as e:
        TASK_QUEUE[task_id] = {"status": "failed", "error": str(e)}


@app.get("/api/canvas-image-tasks/{task_id}")
async def get_canvas_image_task(task_id: str):
    task = TASK_QUEUE.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


# ===== 视频生成 =====
@app.post("/api/canvas-video")
async def canvas_video(req: CanvasVideoRequest):
    provider = get_provider(req.provider_id)
    result = await generate_video(provider, req.prompt, req.model, req.image_url, req.duration, req.ratio)
    await manager.broadcast({"type": "video_generated", "data": result})
    return result


# ===== Canvas LLM =====
@app.post("/api/canvas-llm")
async def canvas_llm(req: CanvasLLMRequest):
    provider = get_provider(req.provider_id)
    protocol = provider.get("protocol", "openai")
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    model = req.model or "gpt-4o-mini"

    messages = req.messages[:]
    if req.system_prompt:
        messages.insert(0, {"role": "system", "content": req.system_prompt})

    if protocol == "gemini":
        # Use Gemini chat
        parts = []
        for msg in messages:
            parts.append({"text": f"[{msg['role']}]: {msg['content']}"})

        body = {"contents": [{"parts": parts}]}
        url = f"{base_url}/v1beta/models/{model}:generateContent?key={api_key}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=body)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:500])
            payload = resp.json()
            text = ""
            for candidate in payload.get("candidates", []):
                for part in candidate.get("content", {}).get("parts", []):
                    if "text" in part:
                        text += part["text"]
            return {"text": text, "model": model}
    else:
        # OpenAI compatible
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        body = {"model": model, "messages": messages, "max_tokens": req.max_tokens}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{base_url}/v1/chat/completions", headers=headers, json=body)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:500])
            payload = resp.json()
            text = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
            usage = payload.get("usage", {})
            return {"text": text, "model": model, "usage": usage}


# ===== GPT 对话（流式） =====
@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    provider = get_provider(req.provider_id)
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    model = req.model or "gpt-4o-mini"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"model": model, "messages": req.messages, "stream": True}

    async def event_generator():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{base_url}/v1/chat/completions", headers=headers, json=body) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        yield f"{line}\n\n"
                    elif line == "data: [DONE]":
                        yield "data: [DONE]\n\n"
                        break

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/api/chat")
async def chat(req: ChatRequest):
    provider = get_provider(req.provider_id)
    base_url = provider["base_url"].rstrip("/")
    api_key = provider["api_key"]
    model = req.model or "gpt-4o-mini"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    body = {"model": model, "messages": req.messages}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{base_url}/v1/chat/completions", headers=headers, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text[:500])
        payload = resp.json()
        text = payload.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Save conversation
    if req.conversation_id:
        conv_file = conversation_file(req.conversation_id)
        history = []
        if conv_file.exists():
            history = json.loads(conv_file.read_text(encoding="utf-8")).get("messages", [])
        history.extend(req.messages)
        history.append({"role": "assistant", "content": text})
        conv_file.write_text(json.dumps({"id": req.conversation_id, "messages": history[-100:]}, ensure_ascii=False))

    return {"text": text, "model": model}


# ===== 对话管理 =====
@app.get("/api/conversations")
async def list_conversations():
    convs = []
    for f in sorted(CONVERSATION_DIR.glob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            convs.append({"id": data.get("id", f.stem), "title": data.get("title", "对话"), "updatedAt": int(f.stat().st_mtime * 1000)})
        except Exception:
            continue
    return convs


@app.get("/api/conversations/{conv_id}")
async def get_conversation(conv_id: str):
    f = conversation_file(conv_id)
    if not f.exists():
        raise HTTPException(status_code=404)
    return json.loads(f.read_text(encoding="utf-8"))


@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    f = conversation_file(conv_id)
    if f.exists():
        f.unlink()
    return {"ok": True}


# ===== 画布管理 =====
@app.get("/api/canvases")
async def get_canvases():
    return list_canvases()


@app.post("/api/canvases")
async def create_canvas(req: CanvasCreateRequest):
    canvas_id = f"{int(time.time())}_{uuid.uuid4().hex[:8]}"
    data = {
        "id": canvas_id,
        "title": req.title,
        "kind": req.kind,
        "icon": "🎨",
        "nodes": [],
        "connections": [],
        "viewport": {"x": 0, "y": 0, "scale": 1},
        "logs": [],
        "settings": {},
        "createdAt": int(time.time() * 1000),
        "updatedAt": int(time.time() * 1000),
    }
    save_canvas_data(canvas_id, data)
    return data


@app.get("/api/canvases/{canvas_id}")
async def get_canvas(canvas_id: str):
    data = load_canvas_data(canvas_id)
    if not data:
        raise HTTPException(status_code=404)
    return data


@app.put("/api/canvases/{canvas_id}")
async def update_canvas(canvas_id: str, req: CanvasSaveRequest):
    data = load_canvas_data(canvas_id)
    if not data:
        raise HTTPException(status_code=404)

    if req.title is not None:
        data["title"] = req.title
    if req.nodes is not None:
        data["nodes"] = req.nodes
    if req.connections is not None:
        data["connections"] = req.connections
    if req.viewport is not None:
        data["viewport"] = req.viewport
    if req.settings is not None:
        data["settings"] = req.settings

    save_canvas_data(canvas_id, data)
    await manager.broadcast({"type": "canvas_updated", "canvas_id": canvas_id})
    return data


@app.delete("/api/canvases/{canvas_id}")
async def delete_canvas(canvas_id: str):
    path = canvas_path(canvas_id)
    if path.exists():
        # Move to trash
        trash_dir = CANVAS_DIR / ".trash"
        trash_dir.mkdir(exist_ok=True)
        shutil.move(str(path), str(trash_dir / path.name))
    return {"ok": True}


@app.post("/api/canvases/{canvas_id}/restore")
async def restore_canvas(canvas_id: str):
    trash_path = CANVAS_DIR / ".trash" / f"{canvas_id}.json"
    if trash_path.exists():
        shutil.move(str(trash_path), str(canvas_path(canvas_id)))
        return {"ok": True}
    raise HTTPException(status_code=404)


# ===== ModelScope =====
@app.post("/api/ms/generate")
async def ms_generate(req: MsGenerateRequest):
    result = await generate_via_modelscope(req.prompt, req.model, req.size, req.image_url, req.lora)
    if result.get("image", "").startswith("data:"):
        result["local_url"] = save_image_to_output(result["image"])
    return result


# ===== ComfyUI =====
@app.post("/api/comfyui/generate")
async def comfyui_generate(req: ComfyUIGenerateRequest):
    result = await generate_via_comfyui(req.workflow, req.prompt, req.params, req.size, req.seed)
    if result.get("image", "").startswith("data:"):
        result["local_url"] = save_image_to_output(result["image"])
    return result


@app.get("/api/comfyui/instances")
async def get_comfyui_instances():
    return load_comfyui_instances()


@app.put("/api/comfyui/instances")
async def update_comfyui_instances(instances: List[Dict[str, Any]]):
    # Save to .env
    env_content = ""
    if ENV_FILE.exists():
        env_content = ENV_FILE.read_text(encoding="utf-8")

    # Update COMFYUI_INSTANCES line
    new_value = json.dumps(instances, ensure_ascii=False)
    if "COMFYUI_INSTANCES=" in env_content:
        lines = env_content.split("\n")
        for i, line in enumerate(lines):
            if line.startswith("COMFYUI_INSTANCES="):
                lines[i] = f"COMFYUI_INSTANCES={new_value}"
                break
        env_content = "\n".join(lines)
    else:
        env_content += f"\nCOMFYUI_INSTANCES={new_value}\n"

    ENV_FILE.write_text(env_content, encoding="utf-8")
    os.environ["COMFYUI_INSTANCES"] = new_value
    return {"ok": True}


# ===== 工作流管理 =====
@app.get("/api/workflows")
async def list_workflows():
    workflows = []
    for f in WORKFLOW_DIR.glob("*.json"):
        if f.name.endswith(".config.json"):
            continue
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            config_file = WORKFLOW_DIR / f"{f.stem}.config.json"
            config = {}
            if config_file.exists():
                config = json.loads(config_file.read_text(encoding="utf-8"))
            workflows.append({
                "name": f.stem,
                "title": config.get("title", f.stem),
                "description": config.get("description", ""),
                "fields": config.get("fields", []),
            })
        except Exception:
            continue
    return workflows


@app.post("/api/workflows/upload")
async def upload_workflow(file: UploadFile = File(...), title: str = Form(""), description: str = Form("")):
    content = await file.read()
    name = Path(file.filename or "workflow").stem
    safe_name = "".join(c for c in name if c.isalnum() or c in "-_")

    workflow_path = WORKFLOW_DIR / f"{safe_name}.json"
    workflow_path.write_bytes(content)

    if title or description:
        config_path = WORKFLOW_DIR / f"{safe_name}.config.json"
        config_path.write_text(json.dumps({"title": title, "description": description, "fields": []}, ensure_ascii=False))

    return {"name": safe_name, "title": title or safe_name}


@app.delete("/api/workflows/{name}")
async def delete_workflow(name: str):
    safe_name = "".join(c for c in name if c.isalnum() or c in "-_")
    workflow_path = WORKFLOW_DIR / f"{safe_name}.json"
    config_path = WORKFLOW_DIR / f"{safe_name}.config.json"
    if workflow_path.exists():
        workflow_path.unlink()
    if config_path.exists():
        config_path.unlink()
    return {"ok": True}


# ===== 素材库 =====
@app.get("/api/asset-library")
async def get_asset_library():
    return load_asset_library()


@app.post("/api/asset-library/categories")
async def create_asset_category(req: AssetLibraryCategoryRequest):
    lib = load_asset_library()
    cat_id = str(uuid.uuid4())[:8]
    lib["categories"].append({"id": cat_id, "name": req.name})
    save_asset_library(lib)
    return {"id": cat_id, "name": req.name}


@app.delete("/api/asset-library/categories/{cat_id}")
async def delete_asset_category(cat_id: str):
    lib = load_asset_library()
    lib["categories"] = [c for c in lib["categories"] if c["id"] != cat_id]
    lib["items"] = [i for i in lib["items"] if i.get("category_id") != cat_id]
    save_asset_library(lib)
    return {"ok": True}


@app.post("/api/asset-library/items")
async def add_asset_item(req: AssetLibraryAddRequest):
    lib = load_asset_library()
    item_id = str(uuid.uuid4())[:8]
    lib["items"].append({
        "id": item_id,
        "category_id": req.category_id,
        "url": req.url,
        "name": req.name or f"asset_{item_id}",
        "type": req.type,
        "addedAt": int(time.time() * 1000),
    })
    save_asset_library(lib)
    return {"id": item_id}


@app.delete("/api/asset-library/items/{item_id}")
async def delete_asset_item(item_id: str):
    lib = load_asset_library()
    lib["items"] = [i for i in lib["items"] if i["id"] != item_id]
    save_asset_library(lib)
    return {"ok": True}


# ===== 历史记录 =====
@app.get("/api/history")
async def get_history(limit: int = Query(50)):
    records = load_history()
    return records[-limit:]


@app.post("/api/history/delete")
async def delete_history_item(timestamp: int = Form(...)):
    records = load_history()
    records = [r for r in records if r.get("timestamp") != timestamp]
    save_history(records)
    return {"ok": True}


# ===== 文件上传 =====
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    content = await file.read()
    ext = Path(file.filename or "file.png").suffix or ".png"
    filename = f"upload_{int(time.time())}_{uuid.uuid4().hex[:8]}{ext}"
    path = ASSETS_DIR / "input" / filename
    path.write_bytes(content)
    return {"url": f"/assets/input/{filename}", "filename": filename}


# ===== 队列状态 =====
@app.get("/api/queue_status")
async def queue_status():
    running = sum(1 for t in TASK_QUEUE.values() if t.get("status") == "running")
    pending = sum(1 for t in TASK_QUEUE.values() if t.get("status") == "pending")
    return {"running": running, "pending": pending, "online": manager.online_count}


# ===== Config =====
@app.get("/api/config")
async def get_config():
    providers = load_providers()
    return {
        "providers": providers,
        "comfyui_instances": load_comfyui_instances(),
        "has_modelscope_token": bool(os.getenv("MODELSCOPE_TOKEN")),
        "version": APP_VERSION,
    }


# ===== 启动 =====
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("SERVER_PORT", "3001"))
    host = os.getenv("SERVER_HOST", "0.0.0.0")
    print(f"\n🚀 MOKE Vision Canvas Server v{APP_VERSION}")
    print(f"   http://{host}:{port}")
    print(f"   WebSocket: ws://{host}:{port}/ws/stats\n")
    uvicorn.run(app, host=host, port=port)
