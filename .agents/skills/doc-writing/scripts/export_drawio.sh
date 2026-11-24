#!/usr/bin/env bash
# 把 static/diagrams/src/*.drawio 导出为 PNG（默认白底 2x）或 SVG。
#
# 用法：
#   export_drawio.sh [--format svg|png] [--scale 3] [--colors 32] [src_dir|src_file] [out_dir]
#   export_drawio.sh static/img/dsh-a2a/src static/img/dsh-a2a
#   export_drawio.sh static/img/dsh-a2a/src/outbox.drawio static/img/dsh-a2a
#
# 默认 PNG 2x 白底：图会出现在两种场景 —— 正文里、以及被读者放大或拷进别的文档，
# 白底在这两种场景都不露底，打印即白纸。代价是深色主题下是一块浅色面板，
# 由正文样式给 figure 加圆角来缓和（见 .vuepress/styles/index.scss）。
#
# 字多的「关键帧」图用 `--scale 3`：2x 在 2 倍屏上只比显示宽度多一点点，
# 浏览器上采样后字边发虚；3x 转成调色板 PNG 后通常仍在 150KB 以内。
#
# --transparent 是逃生口：只有当图本身用饱和色块 + 白字画（Vue 官方文档那种），
# 透明底才在两种主题下都成立。普通「浅色卡片 + 深色字」的图不要用。
set -euo pipefail

fmt="png"
transparent=0
scale=2
colors=256
args=()
while [ $# -gt 0 ]; do
  case "$1" in
    --format)
      fmt="${2:-}"; shift 2 ;;
    --format=*)
      fmt="${1#*=}"; shift ;;
    --scale)
      scale="${2:-}"; shift 2 ;;
    --scale=*)
      scale="${1#*=}"; shift ;;
    --colors)
      colors="${2:-}"; shift 2 ;;
    --colors=*)
      colors="${1#*=}"; shift ;;
    --transparent)
      transparent=1; shift ;;
    *)
      args+=("$1"); shift ;;
  esac
done

if [ "$fmt" != "svg" ] && [ "$fmt" != "png" ]; then
  echo "--format 只支持 svg 或 png，收到：$fmt" >&2
  exit 2
fi
if ! [[ "$scale" =~ ^[0-9]+$ ]] || [ "$scale" -lt 1 ]; then
  echo "--scale 必须是正整数，收到：$scale" >&2
  exit 2
fi
if ! [[ "$colors" =~ ^[0-9]+$ ]] || [ "$colors" -lt 2 ] || [ "$colors" -gt 256 ]; then
  echo "--colors 必须是 2..256，收到：$colors" >&2
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
    # 默认 2x；字多的关键帧图用 --scale 3。不带 -t = 白底；--transparent 才出透明底。
    if [ "$transparent" = "1" ]; then
      drawio -x --no-sandbox -t -f png --scale "$scale" -o "$target" "$f" >/dev/null 2>&1 || true
    else
      drawio -x --no-sandbox -f png --scale "$scale" -o "$target" "$f" >/dev/null 2>&1 || true
    fi
    # drawio 直出的图是 24 位色，能到 200KB 以上，而 150KB 的上限是按索引色标的。
    # 这里转一次调色板 PNG：桌面端几块平色，肉眼无差，体积降一半以上。
    # 别去掉这一步，也别手工再压一遍 —— 重跑脚本要能复现同样的产物。
    if [ -s "$target" ] && command -v ffmpeg >/dev/null 2>&1; then
      pal="$(mktemp -u "${TMPDIR:-/tmp}/drawio-pal-XXXXXX.png")"
      small="$(mktemp -u "${TMPDIR:-/tmp}/drawio-small-XXXXXX.png")"
      if [ "$transparent" = "1" ]; then
        gen="palettegen=reserve_transparent=1:stats_mode=full:max_colors=$colors"
        use="paletteuse=dither=none:alpha_threshold=128"
      else
        gen="palettegen=stats_mode=full:max_colors=$colors"
        use="paletteuse=dither=none"
      fi
      if ffmpeg -y -loglevel error -i "$target" -vf "$gen" "$pal" >/dev/null 2>&1 &&
         ffmpeg -y -loglevel error -i "$target" -i "$pal" -lavfi "$use" "$small" >/dev/null 2>&1 &&
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
