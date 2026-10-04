/**
 * 录制式可���化的数据结构。
 *
 * ## 为什么不是「手写 run()」
 *
 * 最早的 10 个 tracer 每个都要手写一遍执行过程：自己 push 帧、自己标 states、
 * 自己算 counters、自己抄一份源码给高亮用。写一个算法是 30~60 行，
 * 但这是**每道题都要重复一遍**的成本 —— 182 篇题解手写 182 遍，
 * 而且以后每次 `sync-leetcode` 同步出新题，都得再补一个。
 *
 * ���外手写的帧有个更危险的问题：**算法写错了，可视化照样流畅地跑完**，
 * 读者反而更确信自己是错的（AGENTS.md 里记过这条）。
 *
 * 所以这里改成「录制」：`sys.settrace` 跑一遍题解里那份**已经通过样例**的代码，
 * 把每一行的局部变量记下来。帧来自真实执行，不可能骗人；
 * 新题只要代码能跑，录制就自动覆盖。
 */

/** 一个可 JSON 序列化的值。录制时把对象/类实例等都换成 null 或摘要。 */
export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | {[k: string]: Json};

/** 一条 line 事件：执行到 `line` 行**之前**，此刻的局部变量。 */
export interface TraceEvent {
  /** 1 起，与题解代码块的行号一致 */
  line: number;
  /** 局部变量快照。`self` 被丢掉（对读者没意思） */
  locals: Record<string, Json>;
  /**
   * 此刻在目标文件里的调用层数（1 = 顶层）。
   *
   * 树题与分治题的核心教学点是「一层层下去再逐层回来」，而这类题解的
   * 局部变量里往往**只有一个**节点变量 —— 0104 的 `maxDepth` 每层的
   * `root` 都是「当前这棵子树」，光看它看不出深浅（满树时每层长度一样）。
   * 深度是唯一能把递归过程讲清楚的信息。
   */
  depth?: number;
}

/**
 * 一份录制结果。
 *
 * 这是**构建期**的中间产物，落盘缓存后由 adapter 翻译成 Frame。
 * 分成两层的原因见文件头：录制是通用的（跟算法无关），
 * 翻译成「画面」才需要按算法模式分类。
 */
export interface RawTrace {
  /**
   * 题解文件名（去扩展名），如 `0001_two_sum`。
   *
   * 存在的唯一理由是让 adapter 能查自己的覆盖表（`OVERRIDES`）——
   * 少数题目的源码形态特殊，自动判据认不出真指针，需要显式钉死。
   */
  docKey?: string;
  /** 题解里的代码原文，用于源码高亮与角色识别 */
  code: string;
  /** 入口方法名，如 `twoSum` */
  method: string | null;
  /**
   * 入口方法的参数名（不含 self），按顺序。
   *
   * 给「主数组选谁」提供比启发式可靠得多的依据：**题面描述的就是入参**。
   *
   * 0300 最长递增子序列里同时有 `nums` 与 `dp` 两个数组，i/j 对两者都下标，
   * 「被下标得多」这条判据分不出高下 —— 但读者要看的显然是 nums，
   * dp 是算法的中间产物。所以「是入参」优先于「被下标得多」。
   */
  paramNames?: string[];
  /**
   * 每个入参的结构类型：`none` / `list` / `tree` / `randlist` / `byval`。
   *
   * 与 `pyrunner/snippet.ts` 的 `NodeKind` 同构。adapter 靠它决定
   * 「这个局部变量是不是平台对象」—— 不看的话会把 ListNode 录成的
   * `"<ListNode val=1>"` 摘要串当成字符串数组画出来。
   */
  argKinds?: string[];
  /** 录制用的实参（Python 字面量文本）。stdin 模式为空数组 */
  args: string[];
  /**
   * stdin 模式喂进去的原始文本（牛客/ACM 题）。
   *
   * 非空表示「这个入口是读 stdin 的程序」，adapter 要据此知道
   * 局部变量里的字符串是**逐行读进来的**而不是函数参数 ——
   * 两者的画面语义不一样。
   */
  stdin?: string;
  /** 期望返回值，仅用于自检：录制跑出来的结果必须与样例一致 */
  expected: string;
  /** 实际返回值 */
  result: Json;
  /** 事件序列 */
  events: TraceEvent[];
}

/** 录制失败时的原因分类，决定要不要给读者看。 */
export type RecordSkipReason =
  | 'no-pyodide' // 本地没下运行时
  | 'no-code' // 题解里没有可运行代码
  | 'no-entry' // 抽不到入口方法
  | 'no-sample' // 抽不到可用样例（没输入就没法跑）
  | 'exec-error' // 代码本身跑不起来（题解坏了）
  | 'result-mismatch'; // 跑出来的结果与样例期望不符 —— 宁可不录
