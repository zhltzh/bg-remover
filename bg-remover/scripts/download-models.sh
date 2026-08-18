#!/usr/bin/env bash
# ============================================
# 模型 + WASM 自托管下载脚本
# 下载与 types.ts 中 sizeBytes 精确匹配的 @rmbg 分片文件到 public/models/
# 并把 onnxruntime-web 的 WASM 文件复制到 public/wasm/
# 用途：构建前自动执行（prebuild/pre-generate），避免浏览器运行时从慢速 CDN 拉取
# ============================================
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="$ROOT/public/models"
WASM_DIR="$ROOT/public/wasm"

# 下载源优先级：unpkg（实测最快）> cdn.jsdelivr.net > fastly > gcore
PRIMARY="https://unpkg.com"
SECONDARY="https://cdn.jsdelivr.net/npm"
TERCIARY_1="https://fastly.jsdelivr.net/npm"
TERCIARY_2="https://gcore.jsdelivr.net/npm"

# 单个文件下载，带多源回退；输出到 stdout 由调用方重定向
# 用法: fetch_file <相对路径> <输出文件>
fetch_file() {
  local rel="$1"
  local out="$2"
  local urls=(
    "$PRIMARY/$rel"
    "$SECONDARY/$rel"
    "$TERCIARY_1/$rel"
    "$TERCIARY_2/$rel"
  )
  for url in "${urls[@]}"; do
    if curl -sSL --fail -o "$out" "$url" 2>/dev/null; then
      echo "  ✓ $rel  <- $url"
      return 0
    fi
  done
  echo "  ✗ 全部源失败: $rel" >&2
  return 1
}

# ===== 模型分片定义（与 types.ts 的 sizeBytes 精确一致） =====
declare -A BRIA_SHARDS=(
  [briaai-1.onnx]=9437184
  [briaai-2.onnx]=9437184
  [briaai-3.onnx]=9437184
  [briaai-4.onnx]=9437184
  [briaai-5.onnx]=6654490
)
declare -A MODNET_SHARDS=(
  [modnet-1.onnx]=9437184
  [modnet-2.onnx]=9437184
  [modnet-3.onnx]=7014272
)
declare -A U2NETP_SHARDS=(
  [u2netp.onnx]=4574861
)

# 下载一组分片：<包名> <目标子目录> <分片关联数组名>
download_group() {
  local pkg="$1"
  local subdir="$2"
  local -n shards="$3"
  local target="$MODELS_DIR/$subdir"
  mkdir -p "$target"
  echo "📦 下载 $pkg → $target"
  for file in "${!shards[@]}"; do
    local expect="${shards[$file]}"
    # 已存在且大小正确则跳过
    if [ -f "$target/$file" ] && [ "$(stat -c%s "$target/$file" 2>/dev/null || stat -f%z "$target/$file" 2>/dev/null)" = "$expect" ]; then
      echo "  ⏭ 已存在: $file"
      continue
    fi
    fetch_file "${pkg}@0.0.1/${file}" "$target/$file"
    # 校验大小
    local actual
    actual=$(stat -c%s "$target/$file" 2>/dev/null || stat -f%z "$target/$file" 2>/dev/null)
    if [ "$actual" != "$expect" ]; then
      echo "  ✗ 大小不匹配 $file: 期望 $expect 实际 $actual" >&2
      rm -f "$target/$file"
      return 1
    fi
  done
  echo "  ✔ $pkg 完成"
}

echo "📥 模型自托管目录: $MODELS_DIR"
echo ""

download_group "@rmbg/model-briaai"  "bria"   BRIA_SHARDS
download_group "@rmbg/model-modnet"  "modnet" MODNET_SHARDS
download_group "@rmbg/model-u2netp"  "u2netp" U2NETP_SHARDS

# ===== 汇总校验（与 types.ts 的 sizeBytes 一致） =====
echo ""
echo "🔍 汇总校验:"
bria_sum=$(( $(stat -c%s "$MODELS_DIR"/bria/*.onnx 2>/dev/null | paste -sd+ -) ))
modnet_sum=$(( $(stat -c%s "$MODELS_DIR"/modnet/*.onnx 2>/dev/null | paste -sd+ -) ))
u2netp_size=$(stat -c%s "$MODELS_DIR"/u2netp/u2netp.onnx 2>/dev/null)
echo "  bria   = $bria_sum  (期望 44403226)"
echo "  modnet = $modnet_sum  (期望 25888640)"
echo "  u2netp = $u2netp_size  (期望 4574861)"
[ "$bria_sum" = "44403226" ] || { echo "✗ bria 校验失败"; exit 1; }
[ "$modnet_sum" = "25888640" ] || { echo "✗ modnet 校验失败"; exit 1; }
[ "$u2netp_size" = "4574861" ] || { echo "✗ u2netp 校验失败"; exit 1; }
echo "  ✔ 全部模型大小校验通过"

# ===== WASM 自托管 =====
echo ""
echo "⚙️  复制 onnxruntime-web WASM → $WASM_DIR"
mkdir -p "$WASM_DIR"

# 需要复制的 WASM/mjs 文件（对应 onnxruntime-web@1.27.0）
DIST="$ROOT/node_modules/onnxruntime-web/dist"
WASM_NEEDED=(
  "ort-wasm-simd-threaded.mjs"
  "ort-wasm-simd-threaded.wasm"
  "ort-wasm-simd-threaded.jsep.mjs"
  "ort-wasm-simd-threaded.jsep.wasm"
  "ort-wasm-simd-threaded.jspi.mjs"
  "ort-wasm-simd-threaded.jspi.wasm"
  "ort-wasm-simd-threaded.asyncify.mjs"
  "ort-wasm-simd-threaded.asyncify.wasm"
)

for f in "${WASM_NEEDED[@]}"; do
  if [ -f "$DIST/$f" ]; then
    cp "$DIST/$f" "$WASM_DIR/$f"
    echo "  ✓ $f (本地复制)"
  else
    echo "  ⬇ $f 本地缺失，从 CDN 补下"
    fetch_file "onnxruntime-web@1.27.0/dist/$f" "$WASM_DIR/$f"
  fi
done

echo ""
echo "✅ 全部完成！"
echo "  模型: $MODELS_DIR"
echo "  WASM: $WASM_DIR"
