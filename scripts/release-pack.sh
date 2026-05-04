#!/usr/bin/env bash
# ============================================================================
#  MOKE Vision One · Release 打包与分发脚本
# ----------------------------------------------------------------------------
#  做什么：
#   1. 从 package.json 读取 version（单一事实来源）
#   2. 校验 release/ 下存在 DMG / EXE / RELEASE_NOTES
#   3. 强校验 macOS DMG 为 Universal（含 x86_64 Intel + arm64 Apple Silicon）
#   4. 生成 SHA256SUMS
#   5. 把 DMG / EXE / Release Notes 复制到 ~/Desktop
#   6. 打 ZIP 发布包（store 模式，不二次压缩）并复制到 ~/Desktop
#
#  使用：
#     bash scripts/release-pack.sh
#
#  依赖：bash 4+ · jq（可选，没装会走 grep fallback）· lipo（macOS 自带）·
#        hdiutil（macOS 自带）· shasum · zip
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 输出辅助
# ---------------------------------------------------------------------------
C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'
C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'

log()   { printf '%s▸%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()    { printf '%s✅%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn()  { printf '%s⚠️ %s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
die()   { printf '%s❌ %s %s\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }
title() { printf '\n%s%s=== %s ===%s\n' "$C_BOLD" "$C_BLUE" "$*" "$C_RESET"; }

# ---------------------------------------------------------------------------
# 路径定位（脚本可在任意 cwd 被调用）
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASE_DIR="$PROJECT_ROOT/release"
DESKTOP_DIR="$HOME/Desktop"

cd "$PROJECT_ROOT"

# ---------------------------------------------------------------------------
# 1) 读取版本号
# ---------------------------------------------------------------------------
title "1/6 读取版本号"
if command -v jq >/dev/null 2>&1; then
  VERSION="$(jq -r .version package.json)"
else
  # Fallback：不依赖 jq
  VERSION="$(grep -E '"version"\s*:' package.json | head -1 | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
fi
[[ -n "$VERSION" && "$VERSION" != "null" ]] || die "无法从 package.json 读取 version"
log "版本号：${C_BOLD}v$VERSION${C_RESET}"

# ---------------------------------------------------------------------------
# 2) 校验关键产物
# ---------------------------------------------------------------------------
title "2/6 校验 release/ 产物"

DMG_FILE="$RELEASE_DIR/MOKE Vision One-${VERSION}-universal.dmg"
EXE_FILE="$RELEASE_DIR/MOKE Vision One Setup ${VERSION}.exe"
NOTES_FILE="$RELEASE_DIR/RELEASE_NOTES_v${VERSION}.md"

MISSING=()
[[ -f "$DMG_FILE"   ]] || MISSING+=("DMG: $DMG_FILE")
[[ -f "$EXE_FILE"   ]] || MISSING+=("EXE: $EXE_FILE")
[[ -f "$NOTES_FILE" ]] || MISSING+=("Release Notes: $NOTES_FILE")

if (( ${#MISSING[@]} > 0 )); then
  printf '%s❌ 以下文件缺失：%s\n' "$C_RED" "$C_RESET" >&2
  for m in "${MISSING[@]}"; do printf '   - %s\n' "$m" >&2; done
  printf '\n%s提示%s：先跑：\n' "$C_YELLOW" "$C_RESET" >&2
  printf '   npm run electron:build:mac   # 产出 DMG\n' >&2
  printf '   npm run electron:build:win   # 产出 EXE\n' >&2
  printf '   再手写或复用 RELEASE_NOTES_v%s.md\n' "$VERSION" >&2
  exit 1
fi

ok "DMG 存在   ($(du -h "$DMG_FILE"   | cut -f1))"
ok "EXE 存在   ($(du -h "$EXE_FILE"   | cut -f1))"
ok "Notes 存在 ($(du -h "$NOTES_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 3) 强校验 DMG Universal（x86_64 + arm64）
# ---------------------------------------------------------------------------
title "3/6 校验 macOS DMG 包含 Intel + Apple Silicon"

command -v hdiutil >/dev/null 2>&1 || die "缺少 hdiutil（需在 macOS 上运行本脚本）"
command -v lipo    >/dev/null 2>&1 || die "缺少 lipo（需 Xcode Command Line Tools）"

MOUNT_POINT="$(mktemp -d)/moke-dmg-verify"
mkdir -p "$MOUNT_POINT"
cleanup_mount() {
  if mount | grep -q "$MOUNT_POINT"; then
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  fi
  rm -rf "$(dirname "$MOUNT_POINT")" 2>/dev/null || true
}
trap cleanup_mount EXIT

log "挂载 DMG…"
hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -nobrowse -quiet \
  || die "DMG 挂载失败：$DMG_FILE"

APP_DIR="$(find "$MOUNT_POINT" -maxdepth 2 -type d -name '*.app' | head -1)"
[[ -n "$APP_DIR" && -d "$APP_DIR" ]] \
  || { cleanup_mount; die "DMG 内未找到 .app bundle"; }

# .app/Contents/MacOS/<ExecutableName>，名字默认与 app 相同（去掉 .app 后缀）
APP_NAME="$(basename "$APP_DIR" .app)"
APP_BIN="$APP_DIR/Contents/MacOS/$APP_NAME"

# 兜底：读 Info.plist 拿 CFBundleExecutable（防止名字被重命名过）
if [[ ! -f "$APP_BIN" ]] && command -v defaults >/dev/null 2>&1; then
  EXE_KEY="$(defaults read "$APP_DIR/Contents/Info" CFBundleExecutable 2>/dev/null || true)"
  [[ -n "$EXE_KEY" ]] && APP_BIN="$APP_DIR/Contents/MacOS/$EXE_KEY"
fi

# 再兜底：目录里第一个可执行文件
if [[ ! -f "$APP_BIN" ]]; then
  APP_BIN="$(find "$APP_DIR/Contents/MacOS" -maxdepth 1 -type f -perm -u+x | head -1)"
fi

[[ -n "$APP_BIN" && -f "$APP_BIN" ]] \
  || { cleanup_mount; die "DMG 内未找到 .app 主可执行文件（检查过：$APP_DIR/Contents/MacOS）"; }

log "分析主二进制架构：${APP_BIN##*/Contents/MacOS/}"
ARCH_INFO="$(lipo -archs "$APP_BIN" 2>/dev/null || true)"
log "架构：$ARCH_INFO"

HAS_X86=0; HAS_ARM=0
[[ "$ARCH_INFO" == *"x86_64"* ]] && HAS_X86=1
[[ "$ARCH_INFO" == *"arm64"*  ]] && HAS_ARM=1

cleanup_mount
trap - EXIT

if (( HAS_X86 == 0 )); then
  die "DMG 不包含 x86_64（Intel）架构！请用 'npm run electron:build:mac'（已配 universal）重打。"
fi
if (( HAS_ARM == 0 )); then
  die "DMG 不包含 arm64（Apple Silicon）架构！请用 'npm run electron:build:mac' 重打。"
fi
ok "DMG Universal 双架构校验通过：x86_64 ✓ · arm64 ✓"

# ---------------------------------------------------------------------------
# 4) 生成 SHA256
# ---------------------------------------------------------------------------
title "4/6 生成 SHA256SUMS"

SHA_FILE="$RELEASE_DIR/SHA256SUMS.txt"
( cd "$RELEASE_DIR" && shasum -a 256 \
    "MOKE Vision One-${VERSION}-universal.dmg" \
    "MOKE Vision One Setup ${VERSION}.exe" \
    > "SHA256SUMS.txt" )
log "校验文件：$SHA_FILE"
cat "$SHA_FILE"
ok "SHA256 已生成"

# ---------------------------------------------------------------------------
# 5) 复制到桌面
# ---------------------------------------------------------------------------
title "5/6 复制到桌面"

cp -f "$DMG_FILE"   "$DESKTOP_DIR/"
cp -f "$EXE_FILE"   "$DESKTOP_DIR/"
cp -f "$NOTES_FILE" "$DESKTOP_DIR/"
ok "DMG → ~/Desktop/$(basename "$DMG_FILE")"
ok "EXE → ~/Desktop/$(basename "$EXE_FILE")"
ok "Notes → ~/Desktop/$(basename "$NOTES_FILE")"

# ---------------------------------------------------------------------------
# 6) 打 ZIP 发布包
# ---------------------------------------------------------------------------
title "6/6 打 ZIP 发布包（store 模式）"

STAGE_NAME="MOKE-Vision-One-v${VERSION}-Release"
STAGE_DIR="$RELEASE_DIR/$STAGE_NAME"
ZIP_FILE="$RELEASE_DIR/${STAGE_NAME}.zip"

rm -rf "$STAGE_DIR" "$ZIP_FILE"
mkdir -p "$STAGE_DIR"

cp "$DMG_FILE"   "$STAGE_DIR/"
cp "$EXE_FILE"   "$STAGE_DIR/"
cp "$NOTES_FILE" "$STAGE_DIR/"
cp "$SHA_FILE"   "$STAGE_DIR/"

log "发布包目录内容："
ls -lh "$STAGE_DIR"

log "打 ZIP（-0 store 模式：安装包已被 UPX/NSIS/xar 压缩，二次压缩收益为零且耗 CPU）…"
( cd "$RELEASE_DIR" && zip -r -0 "${STAGE_NAME}.zip" "$STAGE_NAME" -x "*.DS_Store" > /dev/null )
rm -rf "$STAGE_DIR"

cp -f "$ZIP_FILE" "$DESKTOP_DIR/"
ok "ZIP → $(du -h "$ZIP_FILE" | cut -f1)  ·  ~/Desktop/${STAGE_NAME}.zip"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
title "🎉 完成：v${VERSION} 发布物清单"
printf '\n桌面文件：\n'
(
  cd "$DESKTOP_DIR"
  ls -lh \
    "MOKE Vision One-${VERSION}-universal.dmg" \
    "MOKE Vision One Setup ${VERSION}.exe" \
    "RELEASE_NOTES_v${VERSION}.md" \
    "${STAGE_NAME}.zip" 2>/dev/null | awk '{printf "   %s  %s\n", $5, $NF}'
)
printf '\n%s直接把 ~/Desktop/%s.zip 发出去即可%s\n\n' "$C_GREEN" "$STAGE_NAME" "$C_RESET"
