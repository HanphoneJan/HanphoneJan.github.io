/**
 * 自测题库的数据类型定义。
 *
 * 这个类型同时被三处引用，请保持同步：
 *   - 运行时渲染组件   src/components/training/selftest/index.tsx
 *   - 出题脚本         scripts/gen-quiz.ts
 *   - 校验脚本         scripts/validate-bank.ts
 */

/** 题型 */
export type QuestionType =
  | 'single' // 单选：干扰项全部来自真实内容（如复杂度表里的其他行）
  | 'multi' // 多选
  | 'judge' // 判断
  | 'blank'; // 填空

interface BaseQuestion {
  /** 全局唯一，形如 `leetcode-1-complexity` */
  id: string;
  /**
   * 题解 md 相对 code-training/docs 的路径，形如
   * `problems/leetcode/0001_two_sum.md`。
   * 用路径而不是 docId 做键，是因为 Docusaurus 的 numberPrefixParser 会把
   * `0001_two_sum.md` 的 id 改写成 `1`，而 nowcoder 的 `HJ48_xxx.md` 会改写成
   * `HJ48` —— 规则不一致，路径是唯一稳定的标识。
   */
  docId: string;
  /** 题干 */
  stem: string;
  /**
   * 解析。**必填** —— 这是复习时唯一有学习价值的内容，
   * 不能只判对错就完事。
   */
  explain: string;
  /** 出处小节，用于溯源和批量核对，如「复杂度分析」 */
  source: string;
}

export interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: string[];
  /** 正确选项下标 */
  answer: number;
}

export interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  options: string[];
  /** 正确选项下标数组，升序且去重 */
  answer: number[];
}

export interface JudgeQuestion extends BaseQuestion {
  type: 'judge';
  answer: boolean;
}

export interface BlankQuestion extends BaseQuestion {
  type: 'blank';
  /** 标准答案 */
  answer: string;
  /**
   * 其他可接受答案（已做归一化比较：去空白 + 忽略大小写）。
   * 例如填空「O(n log n)」可接受 `O(nlogn)`。
   */
  accept?: string[];
}

export type Question =
  | SingleQuestion
  | MultiQuestion
  | JudgeQuestion
  | BlankQuestion;

/** 题库文件结构 */
export interface QuizBank {
  version: number;
  items: Question[];
}

/**
 * 判断题作答归一化：去所有空白 + 转小写。
 * 这样 `O(n log n)`、`O(nlogn)`、`o(n log n)` 视为等价。
 */
export function normalizeAnswer(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase();
}

/** 用户某题是否答对 */
export function isCorrect(q: Question, userAnswer: unknown): boolean {
  switch (q.type) {
    case 'single':
      return userAnswer === q.answer;
    case 'judge':
      return userAnswer === q.answer;
    case 'multi': {
      if (!Array.isArray(userAnswer)) {
        return false;
      }
      const picked = [...new Set(userAnswer as number[])].sort((a, b) => a - b);
      const right = [...new Set(q.answer)].sort((a, b) => a - b);
      return (
        picked.length === right.length &&
        picked.every((v, i) => v === right[i])
      );
    }
    case 'blank': {
      if (typeof userAnswer !== 'string') {
        return false;
      }
      const given = normalizeAnswer(userAnswer);
      const accepted = [q.answer, ...(q.accept ?? [])].map(normalizeAnswer);
      return accepted.includes(given);
    }
    default:
      return false;
  }
}