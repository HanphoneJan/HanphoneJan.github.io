#!/usr/bin/env bash
# 抽取《Coding练习--C》里的全部 ```c 代码块，逐个编译；
# 带 main 的块再链接、跑一遍（stdin 接 /dev/null）。
#
# 文档开头写着「每块都能 -Werror 编译」，这个脚本就是那句话的验收，
# 改完正文跑一次 `pnpm check:c`。
set -u
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="${1:-$ROOT/code-training/docs/review/Coding练习--C.md}"
CC="${CC:-gcc}"
FLAGS=(-std=c11 -Wall -Wextra -Werror -O1)

if ! command -v "$CC" >/dev/null 2>&1; then
  echo "找不到 $CC，跳过（只影响本地验收，不影响站点构建）"
  exit 0
fi

if [ ! -f "$DOC" ]; then
  echo "找不到文档: $DOC" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

awk -v dir="$TMP" '
  /^```c$/ { inside = 1; n++; next }
  /^```$/ { if (inside) inside = 0; next }
  inside   { print > (dir "/b" n ".c") }
' "$DOC"

total=0
compiled=0
ran=0
failed=0

for src in "$TMP"/b*.c; do
  [ -e "$src" ] || continue
  total=$((total + 1))
  name="$(basename "$src")"

  if ! "$CC" "${FLAGS[@]}" -c "$src" -o "${src%.c}.o" 2>"$src.err"; then
    echo "✗ 编译失败: $name"
    sed -n '1,10p' "$src.err"
    failed=$((failed + 1))
    continue
  fi
  compiled=$((compiled + 1))

  if grep -q 'int main' "$src"; then
    if ! "$CC" "${FLAGS[@]}" -o "${src%.c}" "$src" 2>"$src.link.err"; then
      echo "✗ 链接失败: $name"
      sed -n '1,10p' "$src.link.err"
      failed=$((failed + 1))
      continue
    fi
    if ! timeout 10 "${src%.c}" </dev/null >"$src.out" 2>"$src.run.err"; then
      echo "✗ 运行失败: $name"
      sed -n '1,10p' "$src.run.err"
      failed=$((failed + 1))
      continue
    fi
    ran=$((ran + 1))
  fi
done

echo "代码块 $total 个：编译通过 $compiled，运行通过 $ran，失败 $failed"
[ "$failed" -eq 0 ]
