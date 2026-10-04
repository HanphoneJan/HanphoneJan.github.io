/**
 * SRS 调度器与牌组逻辑的单测。
 *
 * ## 为什么必须有
 *
 * `scheduler.ts` 是纯函数、没有 UI 保护网，改错了不会报错，
 * 只会表现为「复习间隔越算越离谱」——而这需要用户自己复习几天才能发现。
 * 里面有三类容易出错的逻辑，必须断言：
 *
 * 1. **ease / interval 的边界** —— ease 越界会让间隔指数级发散或永远停在 1
 * 2. **首调与次调的差别** —— reps===0 时不该乘 ease（否则间隔变成 0）
 * 3. **遗忘重置** —— 答错必须真的回到起点，否则「忘了」这个档位形同虚设
 *
 * 跑法：pnpm test:srs
 */

import {
  dayToISO,
  forecast,
  initialState,
  isDue,
  maturity,
  overdueBy,
  review,
  strengthLabel,
  toDay,
  type SrsState,
} from '../src/components/training/srs/scheduler';

let pass = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    const suffix = detail === undefined ? '' : ` → ${JSON.stringify(detail)}`;
    failures.push(`✗ ${name}${suffix}`);
    console.log(`✗ ${name}${suffix}`);
  }
}

const TODAY = 20000;

function eq(name: string, got: unknown, want: unknown): void {
  check(name, got === want, {got, want});
}

// ============================================================
// 初始排期
// ============================================================

eq('Easy 首间隔 2 天', initialState(1, TODAY).interval, 2);
eq('Medium 首间隔 4 天', initialState(2, TODAY).interval, 4);
eq('Hard 首间隔 7 天', initialState(3, TODAY).interval, 7);
eq('新卡今天即到期', initialState(2, TODAY).due, TODAY);
eq('新卡未复习过', initialState(2, TODAY).lastReview, 0);
eq(
  'ease 初始 2.0',
  initialState(2, TODAY).ease,
  2.0,
);

// ============================================================
// 秒答：间隔应单调增长，ease 上调
// ============================================================

let s = initialState(2, TODAY);
const seq: number[] = [];
for (let i = 0; i < 6; i++) {
  s = review(s, 'instant', s.due);
  seq.push(s.interval);
}
check(
  '秒答间隔单调递增',
  seq.every((v, i) => i === 0 || v >= seq[i - 1]),
  seq,
);
check('秒答 ease 上调', s.ease > 2.0, s.ease);
check('秒答 reps 累加', s.reps === 6, s.reps);
check(
  '秒答 due = 最后复习日 + 间隔',
  s.due === s.lastReview + s.interval,
  {due: s.due, lastReview: s.lastReview, interval: s.interval},
);

// ============================================================
// 记得：首调不乘 ease
// ============================================================

let r = initialState(1, TODAY);
r = review(r, 'recall', TODAY);
eq('记得首调保持初间隔 2 天', r.interval, 2);
check('记得首调 due = 今天 + 2', r.due === TODAY + 2, r.due);
check('记得 ease 略降', r.ease < 2.0, r.ease);

const beforeInterval = r.interval;
r = review(r, 'recall', r.due);
check(
  '记得次调间隔 × ease',
  Math.abs(r.interval - beforeInterval * r.ease) <= 1,
  {got: r.interval, expect: beforeInterval * r.ease},
);

// ============================================================
// 遗忘：必须真的重置
// ============================================================

let g = initialState(3, TODAY);
g = review(g, 'instant', TODAY);
g = review(g, 'instant', g.due);
g = review(g, 'instant', g.due);
const grown = g.interval;
const easeBeforeForgot = g.ease;
g = review(g, 'forgot', g.due);
eq('遗忘后 reps 归零', g.reps, 0);
eq('遗忘后 lapses +1', g.lapses, 1);
eq('遗忘后间隔降为 1', g.interval, 1);
check('遗忘确实把间隔打回去了', grown > 1, {grown, now: g.interval});
eq('遗忘后明天就到期', g.due, g.lastReview + 1);
check(
  '遗忘后 ease 下调 0.2',
  Math.abs(g.ease - (easeBeforeForgot - 0.2)) < 1e-9,
  {before: easeBeforeForgot, after: g.ease},
);

// 连续遗忘
let f = initialState(2, TODAY);
for (let i = 0; i < 5; i++) {
  f = review(f, 'forgot', f.due);
}
eq('连续 5 次遗忘 lapses = 5', f.lapses, 5);

// ============================================================
// 边界：ease 与 interval 的上下限
// ============================================================

let lo = initialState(2, TODAY);
for (let i = 0; i < 100; i++) {
  lo = review(lo, 'forgot', TODAY);
}
check('ease 不低于 1.3', lo.ease >= 1.3, lo.ease);
eq('ease 恰好停在 1.3', lo.ease, 1.3);

let hi = initialState(2, TODAY);
for (let i = 0; i < 300; i++) {
  hi = review(hi, 'instant', TODAY);
}
check('ease 不高于 2.8', hi.ease <= 2.8, hi.ease);
eq('ease 恰好停在 2.8', hi.ease, 2.8);
check('interval 不超过 365', hi.interval <= 365, hi.interval);
eq('interval 恰好停在 365', hi.interval, 365);

// ============================================================
// 成熟度与强度标签
// ============================================================

const m0 = maturity(initialState(2, TODAY));
eq('新卡成熟度 0', m0, 0);
const m1 = maturity(review(initialState(2, TODAY), 'recall', TODAY));
check('reps=1 成熟度约 0.5', Math.abs(m1 - 0.5) < 0.01, m1);
const m5 = maturity({...initialState(2, TODAY), reps: 5});
check('reps=5 成熟度 > 0.9', m5 > 0.9, m5);
const m5Lapsed = maturity({...initialState(2, TODAY), reps: 5, lapses: 3});
check('多次遗忘拉低成熟度', m5Lapsed < m5, {clean: m5, lapsed: m5Lapsed});

let strong = initialState(2, TODAY);
for (let i = 0; i < 6; i++) {
  strong = review(strong, 'instant', TODAY);
}
eq('牢固标签', strengthLabel(strong).text, '牢固');
eq(
  '薄弱标签',
  strengthLabel({...initialState(2, TODAY), reps: 1, lapses: 2}).text,
  '薄弱',
);
eq('一般标签', strengthLabel({...initialState(2, TODAY), reps: 1}).text, '一般');

// ============================================================
// 到期判定与逾期天数
// ============================================================

const due: SrsState = {...initialState(2, TODAY), due: TODAY};
check('今天到期', isDue(due, TODAY), true);
check('昨天到期（今天仍算到期）', isDue({...due, due: TODAY - 5}, TODAY), true);
check('明天未到期', !isDue({...due, due: TODAY + 1}, TODAY), true);

eq('新卡不算逾期', overdueBy(initialState(2, TODAY), TODAY), 0);
eq(
  '复习过的卡按今天 - due 算逾期',
  overdueBy({...due, due: TODAY - 4, lastReview: TODAY - 20}, TODAY),
  4,
);
check(
  '未来到期的卡不算逾期',
  overdueBy({...due, due: TODAY + 5, lastReview: TODAY}, TODAY) === 0,
  true,
);

// ============================================================
// 未来分布：必须能反映逾期
// ============================================================

const states: Record<string, SrsState> = {
  overdue: {...due, due: TODAY - 3, lastReview: TODAY - 10},
  today: {...due, due: TODAY, lastReview: TODAY - 5},
  plus2: {...due, due: TODAY + 2, lastReview: TODAY},
  far: {...due, due: TODAY + 30, lastReview: TODAY}, // 落在 14 天窗口外
};
const buckets = forecast(states, TODAY, 14);
eq('分布长度 = 1（逾期）+ 14（天）', buckets.length, 15);
eq('逾期桶 = 1', buckets[0], 1);
eq('今天桶 = 1', buckets[1], 1);
eq('第 2 天桶 = 1', buckets[3], 1);
eq('窗口外的卡不计入', buckets.reduce((a, b) => a + b, 0), 3);

// ============================================================
// 天序号换算（时区/夏令时安全）
// ============================================================

const today = toDay(new Date(2026, 2, 25));
eq('2026-03-25 的天序号稳定', toDay(new Date(2026, 2, 25)), today);
eq('toDay 幂等', toDay(new Date(2026, 2, 25)), today);
eq('同一天不同时间得到同一天序号', toDay(new Date(2026, 2, 25, 23, 59)), today);
eq('次日 +1', toDay(new Date(2026, 2, 26)) - today, 1);
eq('跨月正确', toDay(new Date(2026, 3, 1)) - today, 7);
eq('跨闰年 2 月正确', toDay(new Date(2028, 2, 1)) - toDay(new Date(2028, 1, 28)), 2);
eq('dayToISO 回转', dayToISO(toDay(new Date(2026, 2, 25))), '2026-03-25');
eq('dayToISO 补零', dayToISO(toDay(new Date(2026, 0, 5))), '2026-01-05');

// ============================================================

console.log('');
if (failures.length > 0) {
  console.log('--- 失败 ---');
  failures.forEach((x) => console.log(x));
  console.log(`\n通过 ${pass}/${pass + failures.length}`);
  process.exit(1);
}
console.log(`全部通过：${pass} 项`);