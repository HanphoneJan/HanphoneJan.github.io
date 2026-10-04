/**
 * 录制题解的执行轨迹。
 *
 * ## 为什么单独一个脚本而不是构建插件
 *
 * 录制要起 Pyodide（12.9MB 运行时 + WASM 编译），182 篇题解跑一遍要几分钟。
 * 放进 Docusaurus 的 loadContent 里意味着**每次本地 `pnpm start` 都重跑**，
 * 开发体验会烂掉。
 *
 * 所以拆成显式的一步：产物落在 `static/traces/`（进 git），
 * Docusaurus 构建时只读文件。代价是「改了题解代码要记得重录」，
 * 由 `test:adapters` 兜底检查 —— 题解代码变了但轨迹没变会直接报错。
 *
 * 跑法：
 * ```
 * pnpm trace:record          # 全部
 * pnpm trace:record 0001 0003  # 只录这几篇，调试用
 * ```
 */

import {recordTraces} from '../src/components/training/visualizer/recorder';

async function main(): Promise<void> {
  const only = process.argv.slice(2);
  console.log(
    `录制题解执行轨迹${only.length ? `（仅 ${only.join(', ')}）` : '（全部题解）'}…`,
  );
  const {stats, written} = await recordTraces(only);

  console.log(`\n成功 ${stats.ok} 篇`);
  const skips = Object.entries(stats.skipped);
  if (skips.length > 0) {
    console.log(
      '跳过：' +
        skips
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k}=${v}`)
          .join('  '),
    );
  }
  if (written.length > 0) {
    console.log(
      `写入 static/traces/：${written.slice(0, 6).join(', ')}${written.length > 6 ? ' …' : ''}`,
    );
  }

  /**
   * 失败清单。
   *
   * 只有聚合计数（「no-sample=56」）没法指导下一步 —— 不知道是哪 56 篇、
   * 缺什么。所以按原因分组打出「题 + 细节」，补 adapter 时直接照着单子做。
   * 只在详细模式或全部录制时打，否则 `trace:record 0001` 会被刷屏。
   */
  if (stats.failures.length > 0 && (only.length === 0 || process.env.VERBOSE)) {
    const grouped = new Map<string, typeof stats.failures>();
    for (const f of stats.failures) {
      const list = grouped.get(f.reason) ?? [];
      list.push(f);
      grouped.set(f.reason, list);
    }
    for (const [reason, list] of [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n--- ${reason} (${list.length}) ---`);
      for (const f of list) {
        console.log(`  ${f.doc.padEnd(52)} ${f.detail}`);
      }
    }
  }

  console.log('\n下一步：pnpm test:adapters');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
