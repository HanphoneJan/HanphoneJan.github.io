/**
 * 期望值比较。纯函数，单独成文件是为了能被 scripts/test-pysnippets.ts 直接测。
 *
 * （原先它和 React 组件挤在一个文件里，没法脱离浏览器验证。）
 */

/**
 * 比较实际值与期望值。
 *
 * ## 为什么不能直接字符串相等
 *
 * 题解里的期望值有多种写法，直接比必然误判：
 * - `2.00000`（力扣的浮点格式）vs Python 的 `2.0`
 * - `[0,1]`（无空格）vs `json.dumps` 产出的 `[0, 1]`
 * - `["ad","ae"]` vs `'["ad", "ae"]'`
 *
 * 所以按「结构化比较 → 去引号 → 数值容差 → 字符串」逐级降级。
 */
export function compare(
  actual: string,
  expected: string,
): {ok: boolean; reason?: string} {
  const a = actual.trim();
  const e = expected.trim();
  if (a === e) {
    return {ok: true};
  }

  // 1) 双方都是合法 JSON -> 结构化深比较
  const aj = tryJson(a);
  const ej = tryJson(e);
  if (aj.ok && ej.ok) {
    if (deepEqual(aj.value, ej.value)) {
      return {ok: true};
    }
    return {
      ok: false,
      reason: `内容不符：期望 ${JSON.stringify(ej.value)}，实际 ${JSON.stringify(aj.value)}`,
    };
  }

  // 2) 有一边是 JSON 字符串字面量时，去掉引号再比
  //    - 期望值带引号、实际不带：题解写 "abc"，Python 打出 abc
  //    - 实际带引号、期望值不带：返回值是字符串时 json.dumps 必然加引号。
  //      这一条不是锦上添花 —— HJ11「数字颠倒」的期望值是 0006151，
  //      实际是 "0006151"，而 0006151 会被 JSON.parse 吃成数字 6151，
  //      于是数字容差那一步还会给出「期望 6151」这种莫名其妙的理由。
  if (ej.ok && typeof ej.value === 'string' && ej.value === a) {
    return {ok: true};
  }
  if (aj.ok && typeof aj.value === 'string' && aj.value === e) {
    return {ok: true};
  }

  // 3) 数值容差（中位数这类会写成 2.00000）
  const an = Number(a);
  const en = Number(e);
  if (Number.isFinite(an) && Number.isFinite(en)) {
    return Math.abs(an - en) < 1e-6
      ? {ok: true}
      : {ok: false, reason: `数值不符：期望 ${en}，实际 ${an}`};
  }

  return {ok: false, reason: `期望 ${e}，实际 ${a}`};
}

export function tryJson(s: string): {ok: true; value: unknown} | {ok: false} {
  if (!s || !/^[[{"]|^-?\d|^true$|^false$|^null$/.test(s.trim())) {
    return {ok: false};
  }
  try {
    return {ok: true, value: JSON.parse(s)};
  } catch {
    return {ok: false};
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
}

/**
 * 题解里的期望值常带省略号（「输出：[0,1,2,...]」），这种没法判定，
 * py-samples 抽取阶段就会丢掉；这里再挡一次，防止手工输入的样例混进来。
 */
export function isUsableExpected(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && !t.includes('...') && !t.includes('…');
}