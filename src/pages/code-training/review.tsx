/**
 * 复习队列页。
 *
 * 只是一层壳，实际逻辑在 `src/components/training/srs/`：
 *  - scheduler.ts  SM-2 lite 调度（纯函数，可单测）
 *  - store.ts      localStorage 持久化 + 牌组组装 + 薄弱标签统计
 *  - index.tsx     界面
 *
 * 放在 src/pages/ 而不是 docs 里，因为它不是 markdown 文档，
 * 而是一个纯交互页面（进度存在浏览器，没有服务端状态）。
 */
export {default} from '@site/src/components/training/srs';