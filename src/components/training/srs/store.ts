/**
 * 复习进度的浏览器端存储。
 *
 * ## 为什么用 localStorage 而不是回写 md
 *
 * 这是个静态站，没有后端。回写 frontmatter 意味着每次复习都要本地跑脚本 +
 * git push，而进度数据的价值恰恰在于「随手就能记一笔」。
 * 代价是清缓存 / 换设备会丢，所以 `exportProgress` / `importProgress`
 * 是必需功能而不是锦上添花。
 *
 * ## 首启排期用 date_added 兜底
 *
 * 182 张卡的 date_added 都在过去（最近的也是几个月前），
 * 所以第一次进来会是「全部到期」。这不是 bug —— 几个月前做的题本来
 * 就该复习一遍。之后每次复习都会按 SM-2 正常推进。
 */

import type {SrsCard} from '@site/plugins/srs-cards';
import {
  initialState,
  isDue,
  review,
  toDay,
  type Day,
  type Grade,
  type SrsState,
} from './scheduler';

const STORAGE_KEY = 'srs.progress.v1';

/** localStorage 里存的东西 */
export interface Progress {
  /** 卡片 id -> 调度状态 */
  states: Record<string, SrsState>;
  /** 最近一次复习日 */
  lastSession?: Day;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadProgress(): Progress {
  if (!hasStorage()) {
    return {states: {}};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {states: {}};
    }
    const parsed = JSON.parse(raw) as Progress;
    if (!parsed || typeof parsed.states !== 'object') {
      return {states: {}};
    }
    return parsed;
  } catch {
    // 数据损坏时不要卡住用户，重新开始
    return {states: {}};
  }
}

function saveProgress(progress: Progress): void {
  if (!hasStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 配额满或隐私模式，忽略
  }
}

/** 取某张卡的当前状态；没复习过就按难度生成初始排期 */
export function stateOf(
  card: SrsCard,
  progress: Progress,
  today: Day,
): SrsState {
  return progress.states[card.id] ?? initialState(card.level, today);
}

/** 记录一次打分并落盘 */
export function commitGrade(
  card: SrsCard,
  progress: Progress,
  grade: Grade,
  today: Day,
): Progress {
  const current = stateOf(card, progress, today);
  const next = review(current, grade, today);
  const updated: Progress = {
    ...progress,
    states: {...progress.states, [card.id]: next},
    lastSession: today,
  };
  saveProgress(updated);
  return updated;
}

/** 今日到期的卡片 */
export function dueCards(
  cards: SrsCard[],
  progress: Progress,
  today: Day,
): SrsCard[] {
  return cards.filter((c) => isDue(stateOf(c, progress, today), today));
}

/** 每日上限：避免第一次进来面对 182 张卡直接劝退 */
export const DAILY_LIMIT = 20;

export interface Deck {
  /** 本次要复习的卡片 */
  cards: SrsCard[];
  /** 今日到期总数（可能大于 cards.length，受 DAILY_LIMIT 限制） */
  totalDue: number;
  /** 今天还剩多少张没排进本次 */
  remaining: number;
}

/**
 * 组装今日复习牌组。
 *
 * 排序：先按遗忘次数多的优先（lapses 高说明这题老忘），
 * 再按到期日早晚 —— 越早到期越该先做。
 */
export function buildDeck(
  cards: SrsCard[],
  progress: Progress,
  today: Day,
  limit: number = DAILY_LIMIT,
): Deck {
  const all = dueCards(cards, progress, today);
  const sorted = [...all].sort((a, b) => {
    const sa = stateOf(a, progress, today);
    const sb = stateOf(b, progress, today);
    if (sb.lapses !== sa.lapses) {
      return sb.lapses - sa.lapses;
    }
    return sa.due - sb.due;
  });
  const picked = sorted.slice(0, limit);
  return {
    cards: picked,
    totalDue: all.length,
    remaining: Math.max(0, all.length - picked.length),
  };
}

/**
 * 薄弱标签：按标签统计「答错次数 / 复习次数」，找出最需要补的知识点。
 *
 * 样本太少的标签不参与排名 —— 只复习过 1 次的标签算出来的失分率
 * 没有意义，反而会误导。
 */
export interface WeakTag {
  tag: string;
  /** 该标签相关的复习次数 */
  attempts: number;
  /** 答错次数 */
  failures: number;
  /** 失分率 0~1 */
  rate: number;
}

const MIN_ATTEMPTS = 3;

/**
 * 需要「失败次数」信息，SM-2 的 state 里只有 lapses（累计遗忘），
 * 正因为如此：lapses 就是这道题答错的次数。
 */
export function weakTags(
  cards: SrsCard[],
  progress: Progress,
  minAttempts = MIN_ATTEMPTS,
): WeakTag[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const acc = new Map<string, {attempts: number; failures: number}>();

  for (const [id, state] of Object.entries(progress.states)) {
    if (state.lastReview === 0) {
      continue;
    }
    const card = byId.get(id);
    if (!card) {
      continue;
    }
    for (const tag of card.tags) {
      const cur = acc.get(tag) ?? {attempts: 0, failures: 0};
      cur.attempts += 1;
      cur.failures += state.lapses;
      acc.set(tag, cur);
    }
  }

  return [...acc.entries()]
    .filter(([, v]) => v.attempts >= minAttempts)
    .map(([tag, v]) => ({
      tag,
      attempts: v.attempts,
      failures: v.failures,
      rate: v.failures / v.attempts,
    }))
    // 至少错过一次的才值得展示
    .filter((v) => v.failures > 0)
    .sort((a, b) => b.rate - a.rate || b.failures - a.failures)
    .slice(0, 8);
}

/** 导出进度，供用户备份到文件 */
export function exportProgress(): string {
  return JSON.stringify(loadProgress(), null, 2);
}

/** 从导出的 JSON 恢复 */
export function importProgress(json: string): {ok: boolean; message: string} {
  try {
    const parsed = JSON.parse(json) as Progress;
    if (!parsed || typeof parsed.states !== 'object') {
      return {ok: false, message: '文件格式不对：缺少 states 字段'};
    }
    saveProgress(parsed);
    return {ok: true, message: `已恢复 ${Object.keys(parsed.states).length} 张卡的进度`};
  } catch (e) {
    return {ok: false, message: `解析失败：${(e as Error).message}`};
  }
}

/** 清空全部进度 */
export function resetProgress(): void {
  if (hasStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export {toDay};