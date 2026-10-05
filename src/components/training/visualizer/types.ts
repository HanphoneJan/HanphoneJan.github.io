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

/** 辅助数组（归并排序的第二路、双指针的双数组、栈/队列等） */
export interface AuxArray {
  label: string;
  /**
   * 元素类型跟主数组一样允许 string —— 栈里装的是字符
   * （0020 有效括号的 `stack = ['(', '[']`）。
   */
  values: Array<number | string>;
  states?: CellState[];
}

/** 网格（岛屿数量、BFS 最短路） */
export interface GridFrame {
  rows: number;
  cols: number;
  /** 长度 = rows * cols，行优先 */
  cells: GridCell[];
  /** 当前遍历位置 [r, c] */
  cursor?: number[];
  /**
   * 队列/栈里待访问的格子。
   *
   * 用 `number[][]` 而不是 `Array<[number, number]>`：destructuring 出来的
   * `[r, c]` 推断成 `number[]`，赋给元组类型会报错（gridAndDp.ts 里 3 处）。
   * 行优先的两元素数组与元组在运行时没有区别，硬钉成元组只是为了让每个
   * 调用点各写一次 `as [number, number]`。
   */
  frontier?: number[][];
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
  tree?: never;
}

export interface GridFrameWrapper extends BaseFrame {
  grid: GridFrame;
  /**
   * 网格之外的**累加结果**。
   *
   * 0056 合并区间、0406 按身高重建队列：输入那张网格排完序之后一个格子都不再变，
   * 而真正在动的是 `merged` / `ans` —— 参差的列表塞不进网格，
   * 于是「结果」在画面上完全缺席（题解教的就是 append 那一步）。
   */
  aux?: AuxArray[];
  array?: never;
  table?: never;
  tree?: never;
}

export interface TableFrameWrapper extends BaseFrame {
  table: TableFrame;
  array?: never;
  grid?: never;
  tree?: never;
}

/**
 * 单个树节点格子的类型。
 *
 * `empty` 与 `null` 分开是有意的：`null` 是「这格没有孩子」（力扣层序里
 * 的占位），`empty` 是「孩子是空字符串」（0084 那种把访问过的格子置空的
 * DFS）。混成一个就会丢掉「这里原本没有节点」与「这里被算法改过」的区别。
 */
export type TreeCellKind = 'number' | 'string' | 'null' | 'empty';

export interface TreeCell {
  value: number | string | null;
  kind: TreeCellKind;
}

/**
 * 二叉树的一帧。
 *
 * ## 为什么不用 `grid`
 *
 * 网格有明确的行列边长，树是**不完全满**的 —— 层序数组 `[1,2,3,null,5]`
 * 里第 5 格挂在第 2 格下面。用 GridView 画要么留一堆空格（看不出父子关系），
 * 要么把树摊平成网格（读者看不出谁是谁的孩子）。
 *
 * 树视图按层序画：**下一行的两格是上一格的两个孩子**，中间的空位用
 * 虚线连到父节点。这与力扣题面的写法一致，读者对得上号。
 */
export interface TreeFrameWrapper extends BaseFrame {
  tree: {
    /** 层序数组，与力扣题面写法一致：`[1,2,3,null,5]` */
    cells: TreeCell[];
    /** 当前聚焦的层序下标 */
    cursor?: number;
  };
  array?: never;
  grid?: never;
  table?: never;
}

export type Frame =
  | ArrayFrame
  | GridFrameWrapper
  | TableFrameWrapper
  | TreeFrameWrapper;

/**
 * Frame 是 union，另外几个分支把 `grid`/`table`/`tree` 声明成了 `?: never`，
 * TS 的 `in`/真值收窄**不生效**（optional 属性存在 undefined 的可能），
 * 所以手写守卫。两个播放器（AlgoPlayer / RecordedPlayer）共用这三个。
 */
export function isGridFrame(f: Frame): f is GridFrameWrapper {
  return f.grid !== undefined;
}

export function isTableFrame(f: Frame): f is TableFrameWrapper {
  return f.table !== undefined;
}

export function isTreeFrame(f: Frame): f is TreeFrameWrapper {
  return f.tree !== undefined;
}

/** 四种帧里当前这个是哪一种，给错误信息用 */
export function frameKind(f: Frame): 'array' | 'grid' | 'table' | 'tree' {
  if (isGridFrame(f)) return 'grid';
  if (isTableFrame(f)) return 'table';
  if (isTreeFrame(f)) return 'tree';
  return 'array';
}

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