#!/usr/bin/env bash
# 把 static/diagrams/src/*.drawio 导出为 SVG 或 PNG。
#
# 用法：
#   export_drawio.sh [--format svg|png] [src_dir] [out_dir]
#   export_drawio.sh --format png static/diagrams/src static/diagrams
#
# 格式由 writer 决定：矢量图/要搜索文字优先 svg；复杂效果或平台兼容问题用 png。
set -euo pipefail

fmt="svg"
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --format)
      fmt="${2:-}"; shift 2 ;;
    --format=*)
      fmt="${1#*=}"; shift ;;
    *)
      args+=("$1"); shift ;;
  esac
done

if [ "$fmt" != "svg" ] && [ "$fmt" != "png" ]; then
  echo "--format 只支持 svg 或 png，收到：$fmt" >&2
  exit 2
fi

src="${args[0]:-static/diagrams/src}"
out="${args[1]:-static/diagrams}"

if ! command -v drawio >/dev/null 2>&1; then
  echo "drawio CLI 未安装：https://github.com/jgraph/drawio-desktop" >&2
  exit 1
fi

mkdir -p "$out"
shopt -s nullglob
files=("$src"/*.drawio)
if [ ${#files[@]} -eq 0 ]; then
  echo "没有找到 .drawio：$src" >&2
  exit 0
fi

for f in "${files[@]}"; do
  name="$(basename "$f" .drawio)"
  target="$out/$name.$fmt"
  echo "export $name.$fmt"
  # 无头环境会打印 GPU/DRM 警告，忽略 stderr，只看产物
  if [ "$fmt" = "png" ]; then
    # 2x 导出，避免高分屏发虚
    drawio -x --no-sandbox -f png --scale 2 -o "$target" "$f" >/dev/null 2>&1 || true
  else
    drawio -x --no-sandbox -f svg -o "$target" "$f" >/dev/null 2>&1 || true
  fi
  if [ ! -s "$target" ]; then
    echo "导出失败：$f" >&2
    exit 1
  fi
done

echo "done: $out ($fmt)"
