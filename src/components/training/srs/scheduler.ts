/**
 * SM-2 lite 间隔重复调度器。
 *
 * ## 为什么是 lite
 *
 * 完整的 SM-2 有 6 档评分和一套参数拟合，实践中对个人题库收益递减，
 * 但**记忆负担明显上升**（要判断"hard"还是"easy"到底是差多少）。
 * 这里砍成三档，规则也短到能一眼看懂：
 *
 *   忘了   → 回到 1 天内重来，ease 下调
 *   记得   → 间隔 × ease
 *   秒答   → 间隔 × ease × 1.3，ease 上调
 *
 * 三档对个人刷题已足够，失败率也低得多（打分本身也是负担）。
 *
 * ## 纯函数，无 React、无 DOM
 *
 * 便于单测和心算验证。所有时间都用「天序号」而非 Date 对象，
 * 避免时区/夏令时导致跨天判定错乱。
 */

/** 自 1970-01-01 起的天数。用整数比较，避免 Date 的时区坑 */
export type Day = number;

const MS_PER_DAY = 86_400_000;

/**
 * 本地日期 -> 天序号。
 *
 * ## 关键：用本地日历分量构造 **UTC** 时间戳
 *
 * 直觉写法是 `new Date(y, m, d).getTime() / MS_PER_DAY`，但那算的是
 * **本地午夜**的时间戳，会把时区偏移带进天序号：UTC+8 下 1970-01-01
 * 得到 -1 而不是 0。后果是 `dayToISO` 无法用固定倍数还原
 * （实测 UTC+8 下会退一天，导出的文件名日期是错的）。
 *
 * 这里改成 `Date.UTC(本地年, 本月, 本日)` —— 日历分量取本地（因为
 * 「今天」是人的概念），时间戳走 UTC（避免时区污染）。
 * 这样天序号是纯日历序号，与 `dayToISO` 严格互逆，且与时区/DST 无关。
 */
export function toDay(date: Date = new Date()): Day {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY,
  );
}

/**
 * 天序号 -> YYYY-MM-DD（仅用于展示）。
 *
 * `toDay` 用 `Date.UTC(本地日历分量)` 生成天序号，所以这里直接
 * `new Date(day * MS_PER_DAY)` 取 UTC 日期就是严格逆运算，
 * 不需要任何偏移修正。
 */
export function dayToISO(day: Day): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 难度 -> 初始间隔（天）。难题忘得慢，值得更长的首间隔 */
const INITIAL_INTERVAL: Record<1 | 2 | 3, number> = {1: 2, 2: 4, 3: 7};

/** ease 的取值范围，防止长期「秒答」把间隔推到不合理的大 */
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;

/** 单次间隔上限（天）。两年后再复习意义不大 */
const MAX_INTERVAL = 365;

export type Grade = 'forgot' | 'recall' | 'instant';

export interface SrsState {
  /** 当前间隔（天） */
  interval: number;
  /** 难度系数，会随表现调整 */
  ease: number;
  /** 连续答对次数 */
  reps: number;
  /** 累计遗忘次数 */
  lapses: number;
  /** 下次到期日（天序号） */
  due: Day;
  /** 上次复习日（天序号），0 表示从未复习 */
  lastReview: Day;
}

/** 新卡片的初始状态：首间隔按难度定，首次到期日 = 今天 */
export function initialState(level: 1 | 2 | 3, today: Day): SrsState {
  return {
    interval: INITIAL_INTERVAL[level],
    ease: 2.0,
    reps: 0,
    lapses: 0,
    due: today,
    lastReview: 0,
  };
}

/**
 * 打分后推进状态。
 *
 * 三档的实际行为：
 * - forgot：间隔清零、ease -0.2、当天还会再出现一次（由调用方排队列）
 * - recall：间隔 × ease
 * - instant：间隔 × ease × 1.3（奖励明显大于 recall）
 */
export function review(
  state: SrsState,
  grade: Grade,
  today: Day,
): SrsState {
  switch (grade) {
    case 'forgot':
      return {
        interval: 1,
        ease: clamp(state.ease - 0.2, EASE_MIN, EASE_MAX),
        reps: 0,
        lapses: state.lapses + 1,
        due: today + 1,
        lastReview: today,
      };
    case 'recall':
      return {
        // reps 为 0 时说明是刚初始化、还没真正复习过，
        // 用初始间隔更符合直觉（而不是 0 × ease = 0）
        interval: clamp(
          state.reps === 0
            ? state.interval
            : state.interval * state.ease,
          1,
          MAX_INTERVAL,
        ),
        ease: clamp(state.ease - 0.05, EASE_MIN, EASE_MAX),
        reps: state.reps + 1,
        lapses: state.lapses,
        due: today + Math.round(state.reps === 0 ? state.interval : state.interval * state.ease),
        lastReview: today,
      };
    case 'instant': {
      const next =
        state.reps === 0
          ? state.interval * 1.3
          : state.interval * state.ease * 1.3;
      const interval = clamp(Math.round(next), 1, MAX_INTERVAL);
      return {
        interval,
        ease: clamp(state.ease + 0.1, EASE_MIN, EASE_MAX),
        reps: state.reps + 1,
        lapses: state.lapses,
        due: today + interval,
        lastReview: today,
      };
    }
    default:
      return state;
  }
}

/** 该卡片今天是否到期 */
export function isDue(state: SrsState, today: Day): boolean {
  return state.due <= today;
}

/**
 * 记忆成熟度：0~1，用于直观展示「这张卡有多稳」。
 *
 * 用 `1 - 2^(-reps)` 这种指数饱和曲线：reps=0 时 0，reps=1 时 0.5，
 * reps=5 时 0.97。配合 lapses 惩罚，连续遗忘会拉低评分。
 */
export function maturity(state: SrsState): number {
  if (state.reps === 0) {
    return 0;
  }
  const base = 1 - Math.pow(2, -state.reps);
  const penalty = Math.min(state.lapses * 0.15, 0.6);
  return clamp(base - penalty, 0, 1);
}

/** 记忆强度分档，用于列表徽标 */
export function strengthLabel(state: SrsState): {
  text: string;
  tone: 'weak' | 'ok' | 'strong';
} {
  const m = maturity(state);
  if (state.lapses > 0 && m < 0.5) {
    return {text: '薄弱', tone: 'weak'};
  }
  if (m >= 0.9) {
    return {text: '牢固', tone: 'strong'};
  }
  return {text: '一般', tone: 'ok'};
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * 未来 N 天的到期分布，用于画柱状图。
 *
 * 返回的数组第 0 项是**「已逾期」**（due < today），后面才是今天、明天…
 * 把逾期单列一栏很重要：它们才是真正该优先复习的，如果只统计
 * `due >= today`，柱状图会在「今天」显示 0，视觉上给出「今天没事做」
 * 的错误信号。
 */
export function forecast(
  states: Record<string, SrsState>,
  today: Day,
  days: number,
): number[] {
  const buckets = new Array<number>(days + 1).fill(0);
  for (const s of Object.values(states)) {
    const offset = s.due - today;
    if (offset < 0) {
      buckets[0] += 1;
    } else if (offset < days) {
      buckets[offset + 1] += 1;
    }
  }
  return buckets;
}

/**
 * 逾期天数，用于提示「欠了多少」。
 * 从未复习过的卡不算逾期（它的 due 就是今天）。
 */
export function overdueBy(state: SrsState, today: Day): number {
  return state.lastReview > 0 ? Math.max(0, today - state.due) : 0;
}