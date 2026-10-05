/**
 * 逐题验证页面上那个 **「▶ 跑样例」按钮** 真能跑通。
 *
 * ## 为什么需要它
 *
 * `test:pyrunner` 只验纯函数（抽取、翻译、驱动生成），
 * `test:pyodide` 只验执行协议（一次 stdin、一次类方法）。
 * **两者都不验「这一篇题解的样例，端到端跑出来对不对」** ——
 * 而那正是读者点一下按钮会看到的东西。
 *
 * 这条路径上出过的错，每一个都不会让上面两个单测失败：
 *
 * - 围栏形式的 `**输入：**` 只吃得到三个反引号 → 抽不出样例，页面退化成手动填
 * - `reverse_number(num_str: str)` 拿到裸数字 `1516000` → `'int' object is not subscriptable`
 * - `Optional[ListNode]` 命中「样例本身就是字面量，别动」→ `5 -> 3 -> 1` 不被还原
 * - 入口挑错（挑到私有辅助函数 `_reverse`）→ `missing 1 required positional argument`
 *
 * 症状统一是「这篇题解的样例跑不过」，读者看到的却是
 * 「你的解法写错了」—— 那是本仓库最不该出现的误导。
 *
 * ## 验什么
 *
 * 完全照抄 `runner.ts` 的 `samples` 分支（同一份判据，不重新实现）：
 *
 * 1. 按**构建期同一套抽取**拿样例（`extractDocSamples` + `usableSamples`）
 * 2. 按 `asCallArgument(raw, annotation)` 翻译实参（`manualCase` 同一个函数）
 * 3. 用 `buildCallDriver` 生成驱动，在**真 Pyodide** 里跑
 * 4. 用 `compare()` 判每一组的期望值
 *
 * ## 跑法
 *
 * ```
 * pnpm check:runbar            # 全站
 * pnpm check:runbar 0141 0399  # 只查文件名含这些串的题
 * ```
 *
 * 需要先 `pnpm sync:pyodide`（12.9MB，已 gitignore）。
 */

import fs from 'fs';
import path from 'path';
import {extractDocSamples, extractSignature, crossCheckEntryName} from '../plugins/py-samples';
import {analyzeSnippet, nodeParams, callTarget} from '../src/components/training/pyrunner/snippet';
import {buildCallDriver} from '../src/components/training/pyrunner/driver';
import {execPython} from '../src/components/training/pyrunner/exec';
import {compare, isUsableExpected} from '../src/components/training/pyrunner/compare';
import {
  sampleCase,
  usableSamples,
  usesDummyHead,
} from '../src/components/training/pyrunner/runner';
import type {SnippetEntry} from '../src/components/training/pyrunner/snippet';
import type {PyodideRuntime} from '../src/components/training/pyrunner/runtime';

interface Row {
  doc: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
}

/** 与 py-samples 插件里那段 walk 完全一致（复制而不是 import，避免动插件） */
function collect(): Array<{doc: string; md: string}> {
  const root = path.join(process.cwd(), 'code-training', 'docs', 'problems');
  const out: Array<{doc: string; md: string}> = [];
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith('.md')) {
        out.push({doc: full.replace(/^.*\/problems\//, ''), md: fs.readFileSync(full, 'utf8')});
      }
    }
  };
  if (fs.existsSync(root)) {
    walk(root);
  }
  return out;
}

function pythonBlock(section: string): string {
  return section.match(/```python\s*\n([\s\S]*?)```/)?.[1] ?? '';
}

function section(md: string, title: string): string {
  const m = new RegExp(`^##\\s+${title}\\s*$`, 'm').exec(md);
  if (!m) {
    return '';
  }
  const rest = md.slice(m.index);
  const next = /^##\s/m.exec(rest.slice(1));
  return next ? rest.slice(0, next.index + 1) : rest;
}

async function main(): Promise<void> {
  const only = process.argv.slice(2);
  const docs = collect().filter(
    (d) => !only.length || only.some((o) => d.doc.includes(o)),
  );
  console.log(`检查 ${docs.length} 篇题解的「跑样例」按钮\n`);

  const runtimeDir = path.join(process.cwd(), 'static', 'pyodide');
  if (!fs.existsSync(path.join(runtimeDir, 'pyodide.mjs'))) {
    console.error('先跑 pnpm sync:pyodide');
    process.exit(1);
  }

  /**
   * 用 **npm 包**的 `loadPyodide`，不用浏览器那条 `loadPyodideRuntime`。
   *
   * 后者靠 `import(`${indexUrl}pyodide.mjs`)` 按 URL 取模块
   * （还带 fetch 拦截 + Cache 预热），那是浏览器的东西；
   * 在 Node 里那个 import 直接 MODULE_NOT_FOUND。
   * npm 包给的对象本身就有 `runPythonAsync` / `setStdout` / `setStderr`，
   * 正好是 `PyodideRuntime` 这三个方法（与 test-pyodide.ts 同一套做法）。
   *
   * 被验的是 `execPython` + `buildCallDriver` + `compare` 这条链，
   * 运行时从哪加载不影响它。
   */
  const {loadPyodide} = require('pyodide') as {
    loadPyodide: (o: unknown) => Promise<PyodideRuntime>;
  };
  const py: PyodideRuntime = await loadPyodide({indexURL: runtimeDir});

  const rows: Row[] = [];
  let seq = 0;
  for (const {doc, md} of docs) {
    const code = pythonBlock(section(md, '完整代码实现'));
    if (!code) {
      continue;
    }
    const sig = extractSignature(code);
    const entryName = crossCheckEntryName(md, code, sig.method) ?? sig.method;
    const samples = usableSamples(extractDocSamples(md, sig.paramNames, sig.requiredCount));
    if (samples.length === 0) {
      continue;
    }
    const analysis = analyzeSnippet(code, entryName);
    if (!analysis.runnable || !analysis.entry) {
      rows.push({doc, status: 'skip', detail: '题解被判为不可运行'});
      continue;
    }
    const entry = analysis.entry as SnippetEntry;
    if (!entry.paramNames.length) {
      rows.push({doc, status: 'skip', detail: '入口没有参数（走 stdin 通道）'});
      continue;
    }

    /**
     * 与 `runner.ts` 的 samples 分支**同一个函数**（`sampleCase`）——
     * 两边一旦分叉，这个脚本验的就不是读者点按钮时会发生的事。
     */
    const cases = samples.map((s) => sampleCase(s.args, entry));
    const driver = buildCallDriver(
      cases,
      callTarget(entry),
      nodeParams(entry, code),
      false,
      usesDummyHead(code),
      false,
    );

    const result = await execPython(py, {
      code,
      filename: `runbar-${++seq}.py`,
      stdin: '',
      asMain: false,
      driver,
    });
    if (result.error) {
      rows.push({doc, status: 'fail', detail: `定义阶段失败：${result.error.slice(0, 90)}`});
      continue;
    }
    let parsed: Array<{v?: string; e?: string}> = [];
    try {
      parsed = JSON.parse(String(result.value ?? '[]'));
    } catch {
      rows.push({doc, status: 'fail', detail: `驱动输出不是 JSON：${String(result.value).slice(0, 80)}`});
      continue;
    }

    let bad = 0;
    const reasons: string[] = [];
    cases.forEach((args, i) => {
      const item = parsed[i];
      const expected = samples[i]?.expected ?? '';
      if (!item) {
        bad++;
        reasons.push(`第 ${i + 1} 组：驱动没有产出结果`);
        return;
      }
      if (item.e !== undefined) {
        bad++;
        reasons.push(`第 ${i + 1} 组：${item.e.split('\n').slice(-1)[0].slice(0, 70)}`);
        return;
      }
      // 没有期望值就不判成败（`Number('') === 0` 会造出假失败）
      if (!expected || !isUsableExpected(expected)) {
        return;
      }
      const v = compare(item.v ?? '', expected, {
        // 这两个标记来自题面文本（0049「可以按任意顺序返回」、
        // 0108 的「`[0,-10,5,null,-3,null,9]` 也将被视为正确答案」），
        // 挂在每条样例上，由 py-samples 按题面算好
        orderAgnostic: samples[i]?.orderAgnostic,
        multiAnswer: samples[i]?.multiAnswer,
      });
      if (!v.ok) {
        bad++;
        reasons.push(`第 ${i + 1} 组：${v.reason ?? '不一致'}`);
      }
    });
    rows.push({
      doc,
      status: bad === 0 ? 'pass' : 'fail',
      detail: bad === 0 ? `${cases.length} 组通过` : reasons.slice(0, 2).join('；'),
    });
  }

  const pass = rows.filter((r) => r.status === 'pass');
  const fail = rows.filter((r) => r.status === 'fail');
  const skip = rows.filter((r) => r.status === 'skip');
  for (const r of rows) {
    const mark = r.status === 'pass' ? '✓' : r.status === 'skip' ? '·' : '✗';
    console.log(`${mark} ${r.doc}：${r.detail}`);
  }
  console.log(`\n通过 ${pass.length}｜失败 ${fail.length}｜跳过 ${skip.length}`);
  if (fail.length > 0) {
    console.error('失败清单：\n  ' + fail.map((r) => `${r.doc} —— ${r.detail}`).join('\n  '));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});