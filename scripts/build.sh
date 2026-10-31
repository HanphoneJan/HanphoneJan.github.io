#!/usr/bin/env bash
# 串行化站点构建：同一台机器上只允许一个 VuePress build 实例。
#
# 背景：并行 agent 各自跑 `pnpm build`，两三个 4–6GB 的构建叠在一起会把
# 15GB 内存压满，内核可能先杀掉 gnome-shell。这里用 flock 让后到的构建排队。
set -euo pipefail

cd "$(dirname "$0")/.."

LOCK="${XDG_RUNTIME_DIR:-/tmp}/hanphone-docs-build.lock"
exec 9>"$LOCK"

if ! flock -n 9; then
  echo "[build] 已有构建在运行，等待它结束…"
  flock 9
fi

# 默认给 V8 6GB 堆；调用方显式设置 NODE_OPTIONS 时尊重调用方。
: "${NODE_OPTIONS:=--max-old-space-size=6144}"
export NODE_OPTIONS

avail_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
if [ "$avail_mb" -gt 0 ] && [ "$avail_mb" -lt 7000 ]; then
  echo "[build] 警告：当前可用内存约 ${avail_mb}MB，构建可能需要 4–6GB；"
  echo "        建议先关闭不必要的浏览器/代理进程，避免系统级 OOM。"
fi

echo "[build] NODE_OPTIONS=$NODE_OPTIONS"
exec pnpm exec vuepress build .
