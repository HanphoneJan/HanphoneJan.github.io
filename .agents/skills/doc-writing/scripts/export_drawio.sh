#!/usr/bin/env bash
# 把 static/diagrams/src/*.drawio 导出为 PNG 2x（默认）或 SVG。
#
# 用法：
#   export_drawio.sh [--format svg|png] [src_dir] [out_dir]
#   export_drawio.sh static/img/dsh-a2a/src static/img/dsh-a2a
#
# 中文标签默认 PNG 2x：draw.io 导 SVG 常把中文栅格化成 <image>，体积大且不可搜索。
# 只有纯英文/数字标签才考虑 --format svg。
set -euo pipefail

fmt="png"
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
if [ -f "$src" ]; then
  # 单文件模式：只重导这一张，改一张验一张时不用等 10 张
  files=("$src")
else
  files=("$src"/*.drawio)
fi
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
    # 2x 导出，避免高分屏发虚；-t 透明底（暗色主题下不能是白板）。
    # 透明底的前提是**每个文字都在浅色填充上**：裸标签（没填色的文本框）导出来
    # 是深灰字落在透明底，暗色主题下看不见。画的时候给标签一个浅色底，
    # 或者干脆不要裸标签 —— 不要把 -t 去掉来绕，那会在暗色页面上留一块白板。
    drawio -x --no-sandbox -t -f png --scale 2 -o "$target" "$f" >/dev/null 2>&1 || true
    # RGBA 的 2x 图能到 200KB 以上，而 150KB 的上限是按索引色标的。这里转一次
    # 调色板 PNG（256 色 + 1bit alpha）：桌面端几块平色，肉眼无差，体积降一半到
    # 三分之二。别去掉这一步，也别手工再压一遍 —— 重跑脚本要能复现同样的产物。
    if [ -s "$target" ] && command -v ffmpeg >/dev/null 2>&1; then
      pal="$(mktemp -u "${TMPDIR:-/tmp}/drawio-pal-XXXXXX.png")"
      small="$(mktemp -u "${TMPDIR:-/tmp}/drawio-small-XXXXXX.png")"
      if ffmpeg -y -loglevel error -i "$target" \
          -vf "palettegen=reserve_transparent=1:stats_mode=full:max_colors=256" "$pal" >/dev/null 2>&1 &&
         ffmpeg -y -loglevel error -i "$target" -i "$pal" \
          -lavfi "paletteuse=dither=none:alpha_threshold=128" "$small" >/dev/null 2>&1 &&
         [ -s "$small" ] && [ "$(stat -c%s "$small")" -lt "$(stat -c%s "$target")" ]; then
        mv "$small" "$target"
      fi
      rm -f "$pal" "$small"
    fi
  else
    drawio -x --no-sandbox -f svg -o "$target" "$f" >/dev/null 2>&1 || true
  fi
  if [ ! -s "$target" ]; then
    echo "导出失败：$f" >&2
    exit 1
  fi
done

echo "done: $out ($fmt)"
