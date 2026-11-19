#!/usr/bin/env bash
# 抽取《Coding练习--Java》里的全部 ```java 代码块，逐块编译并运行。
# 每块都写成 `public class Main`，所以统一落到独立目录的 Main.java。
#
# 用法：pnpm check:java [可选:文档路径]
set -u
set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOC="${1:-$ROOT/code-training/docs/review/Coding练习--Java.md}"
JAVAC="${JAVAC:-javac}"
JAVA="${JAVA:-java}"
JAVAC_FLAGS=(-encoding UTF-8 -Xlint:all -Werror)

if ! command -v "$JAVAC" >/dev/null 2>&1; then
  echo "找不到 $JAVAC，跳过（只影响本地验收，不影响站点构建）"
  exit 0
fi

if [ ! -f "$DOC" ]; then
  echo "找不到文档: $DOC" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

awk -v dir="$TMP" '
  /^```java$/ { inside = 1; n++; next }
  /^```$/     { if (inside) inside = 0; next }
  inside      { print > (dir "/b" n ".java") }
' "$DOC"

total=0
compiled=0
ran=0
failed=0

for src in "$TMP"/b*.java; do
  [ -e "$src" ] || continue
  total=$((total + 1))
  name="$(basename "$src" .java)"
  dir="$TMP/$name"
  mkdir -p "$dir"
  mv "$src" "$dir/Main.java"

  if ! "$JAVAC" "${JAVAC_FLAGS[@]}" -d "$dir" "$dir/Main.java" 2>"$dir/javac.err"; then
    echo "✗ 编译失败: $name"
    sed -n '1,12p' "$dir/javac.err"
    failed=$((failed + 1))
    continue
  fi
  compiled=$((compiled + 1))

  # 文档里的块都带 main，stdin 接 /dev/null，避免「读输入」的模板卡住
  if ! timeout 15 "$JAVA" -cp "$dir" Main </dev/null >"$dir/run.out" 2>"$dir/run.err"; then
    echo "✗ 运行失败: $name"
    sed -n '1,12p' "$dir/run.err"
    failed=$((failed + 1))
    continue
  fi
  ran=$((ran + 1))
done

echo "代码块 $total 个：编译通过 $compiled，运行通过 $ran，失败 $failed"
[ "$failed" -eq 0 ]
