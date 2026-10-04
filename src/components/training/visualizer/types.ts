/**
 * 算法可视化的核心契约。
 *
 * ## 为什么要有这层抽象
 *
 * 如果每个算法各写一个播放器组件，就是 N 份播放/暂停/调速/换输入的重复代码，
 * 加一个算法要重写一遍 UI。拆成「tracer 产出帧 + 通用播放器渲染帧」之后：
 *
 *   新增一个算法 = 写 30~60 行 trace 函数，白送一整套交互播放器
 *
 * 代价是要先把「算法执行过程」抽象成数据（Frame），这层抽象值得。
 *
 * ## 一个 tracer 需要产出什么
 *
 * 一串 Frame，每帧描述**这一步执行后的完整状态**（不是增量 diff）。
 * 播放器随机跳帧、后退都不需要重算，因为每帧自包含。
 *
 * 反例（不要这么设计）：只描述「交换了 i 和 j」，播放器自己维护数组。
 * 那样倒退就得反向执行操作，复杂度高且容易出 bug。
 */

/** 格子状态 -> 视觉语义 */
export type CellState =
  | 'idle' // 未涉及
  | 'active' // 当前操作位置
  | 'compare' // 正在比较
  | 'swap' // 正在交换/移动
  | 'pivot' // 基准/分界点
  | 'done' // 已确定（排序完成）
  | 'excluded' // 已排除（不在搜索范围内）
  | 'found'; // 已找到答案

export type Display = 'bars' | 'boxes';

/** 辅助数组（归并排序的第二路、双指针的双数组等） */
export interface AuxArray {
  label: string;
  values: number[];
  states?: CellState[];
}

/** 网格（岛屿数量、BFS 最短路） */
export interface GridFrame {
  rows: number;
  cols: number;
  /** 长度 = rows * cols，行优先 */
  cells: GridCell[];
  /** 当前遍历位置 [r, c] */
  cursor?: [number, number];
  /** 队列/栈里待访问的格子 */
  frontier?: Array<[number, number]>;
}

export interface GridCell {
  /** 显示文本，缺省用 value */
  value?: string;
  state: CellState;
}

/** DP 表格 */
export interface TableFrame {
  rowLabels: string[];
  colLabels: string[];
  /** values[r][c] */
  values: number[][];
  /** 正在计算的格子 */
  active?: [number, number];
  /** 逐格状态；不填则由 active 推导 */
  states?: CellState[][];
}

/**
 * 一帧。
 *
 * 用 union 而不是全字段必填，是为了让 tracer 只写自己关心的部分。
 * 播放器按存在哪个字段决定渲染哪种视图。
 */
export interface BaseFrame {
  /** 这一步在做什么，显示在播放器顶部。教学价值最高的一句，别偷懒 */
  note: string;
  /** 计数器面板：比较次数 / 交换次数 / 写入次数 */
  counters?: Record<string, number>;
  /** 高亮的源码行号（从 1 开始），对应 tracer.code */
  line?: number;
}

export interface ArrayFrame extends BaseFrame {
  /**
   * 数组内容。
   *
   * 元素类型是 `number | string` 而不是纯 number：字符串类题目
   * （0003 无重复子串这类滑动窗口）在画面上就是一串字符，
   * 而 ArrayView 的 Cell 本来就渲染 string。
   */
  array: Array<number | string>;
  states?: CellState[];
  /** 指针标注，如 {left: 0, right: 3}，渲染成数组上方的标签 */
  pointers?: Record<string, number>;
  aux?: AuxArray[];
  grid?: never;
  table?: never;
}

export interface GridFrameWrapper extends BaseFrame {
  grid: GridFrame;
  array?: never;
  table?: never;
}

export interface TableFrameWrapper extends BaseFrame {
  table: TableFrame;
  array?: never;
  grid?: never;
}

export type Frame = ArrayFrame | GridFrameWrapper | TableFrameWrapper;

/** 输入解析结果。用 discriminated union 让调用方必须处理失败分支 */
export type ParseResult<T> =
  | {ok: true; value: T}
  | {ok: false; error: string};

export interface Tracer<I> {
  /** 唯一 id，用于路由/锚点 */
  id: string;
  title: string;
  /** 一句话说明这个算法解决什么问题 */
  description: string;
  /** 源码，逐行渲染并高亮；frames 里的 line 对应它的行号 */
  code: string;
  complexity: {time: string; space: string};
  /** 数组用柱状图（看大小关系），指针类用方块（看清下标和指针） */
  display: Display;
  defaultInput: I;
  /**
   * 把算法输入序列化成输入框里的字符串。
   *
   * 必须由 tracer 自己提供：输入类型五花八门（数字数组、带目标的数组、
   * 网格、两个整数），播放器不可能猜出格式。曾经在播放器里写兜底
   * `String(value)`，结果对象类型输入变成 "[object Object]"，
   * defaultInput 解析必然失败 —— 首屏 0 帧。
   */
  formatInput(value: I): string;
  /** 把用户在输入框敲的字符串解析成算法输入 */
  parseInput(raw: string): ParseResult<I>;
  /** 执行并产出所有帧 */
  run(input: I): Frame[];
  /** 链回对应题解/笔记的 docId */
  relatedDocId?: string;
}

/**
 * 单个 tracer 的帧数上限。
 *
 * 快排在 200 个元素上会产生几万帧，浏览器会卡死、内存也会爆。
 * 超限时截断并插入一帧提示，而不是静默丢弃。
 */
export const MAX_FRAMES = 1500;

/** 在输入里允许的最大元素个数 */
export const MAX_INPUT_SIZE = 60;

/**
 * 帧构造辅助。
 *
 * tracer 里手写 10 个字段的对象字面量太啰嗦，用这个 builder 补全默认值，
 * 让 tracer 只写「这一步在比什么」这一件有意义的事。
 */
export class TraceBuilder {
  readonly frames: Frame[] = [];
  private truncated = false;

  push(frame: Frame): this {
    if (this.frames.length >= MAX_FRAMES) {
      if (!this.truncated) {
        this.truncated = true;
        this.frames.push({
          note: `⚠️ 帧数超过 ${MAX_FRAMES} 上限，已截断。换更小的输入试试。`,
          array: [],
        } satisfies ArrayFrame);
      }
      return this;
    }
    this.frames.push(frame);
    return this;
  }

  /** 便捷方法：数组 + 状态 + 指针 + 说明 */
  step(opts: {
    note: string;
    array: Array<number | string>;
    states?: CellState[];
    pointers?: Record<string, number>;
    aux?: AuxArray[];
    counters?: Record<string, number>;
    line?: number;
  }): this {
    return this.push({
      note: opts.note,
      array: opts.array,
      states: opts.states,
      pointers: opts.pointers,
      aux: opts.aux,
      counters: opts.counters,
      line: opts.line,
    });
  }

  get truncatedFrames(): boolean {
    return this.truncated;
  }
}

/**
 * 解析逗号/空格/顿号分隔的数字数组。
 *
 * 允许用户直接粘贴「2,7,11,15」或「[2, 7, 11, 15]」。
 */
export function parseNumberList(raw: string): ParseResult<number[]> {
  const cleaned = raw
    .replace(/[\[\]()]/g, ' ')
    .replace(/，/g, ',')
    .replace(/、/g, ',')
    .replace(/\s+/g, ',')
    .trim();
  if (!cleaned) {
    return {ok: false, error: '请输入至少一个数字'};
  }
  const parts = cleaned.split(',').filter((s) => s.length > 0);
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n)) {
      return {ok: false, error: `"${p}" 不是数字`};
    }
    nums.push(n);
  }
  if (nums.length === 0) {
    return {ok: false, error: '请输入至少一个数字'};
  }
  if (nums.length > MAX_INPUT_SIZE) {
    return {
      ok: false,
      error: `最多 ${MAX_INPUT_SIZE} 个元素（现在 ${nums.length} 个），太多了会看不清`,
    };
  }
  return {ok: true, value: nums};
}

/** 把数字数组格式化回输入框字符串 */
export function formatNumberList(nums: number[]): string {
  return nums.join(', ');
}