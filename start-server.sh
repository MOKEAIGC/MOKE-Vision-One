#!/bin/bash
# MOKE Vision One — 后端服务启动脚本
# 集成 Infinite-Canvas 全部后端功能

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"

echo "🚀 MOKE Vision Canvas Server"
echo "================================"

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python 3.10+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1)
echo "✅ $PYTHON_VERSION"

# 检查并安装依赖
cd "$SERVER_DIR"
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "📦 安装 Python 依赖..."
    python3 -m pip install -r requirements.txt --quiet
fi

# 创建 .env（如果不存在）
if [ ! -f "$SERVER_DIR/.env" ]; then
    cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
    echo "📝 已创建 .env 文件，请配置 API Key"
fi

echo ""
echo "🌐 启动服务..."
echo "   Backend: http://127.0.0.1:3001"
echo "   WebSocket: ws://127.0.0.1:3001/ws/stats"
echo ""

python3 main.py
