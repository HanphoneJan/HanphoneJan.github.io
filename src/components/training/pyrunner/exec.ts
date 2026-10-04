/**
 * 在 Pyodide 里执行一段题解代码，并把 stdout / traceback / 出错行号取回来。
 *
 * ## 为什么从 runtime.ts（加载器）里拆出来
 *
 * 加载器里用 webpackIgnore 按 URL 动态 import pyodide.mjs，那一招在 Node 里
 * 必然失败（它是给 webpack 打包用的），于是加载器无法被单测覆盖 ——
 * 而**执行协议**恰恰是整条链路里最需要验证的部分：
 *
 * - linecache 登记对不对（决定 traceback 有没有源码行）
 * - `dedent: false` 有没有生效（Pyodide 默认会改写代码）
 * - 三步是否共用同一个 globals
 * - 驱动以裸表达式收尾时 `runPythonAsync` 到底返不返回值
 *
 * 拆开之后，这一层只依赖一个「能跑 Python 的东西」，于是可以用 Node 里的
 * 真 Pyodide 直接对拍，见 `scripts/test-pyodide.ts`。
 */

import {buildPrelude, globalsInit} from './driver';
import type {PyodideRuntime} from './runtime';

/** PyProxy 只需要 destroy */
interface PyProxy {
  destroy?: () => void;
}

/** 驱动自己的文件名。traceback 里靠它区分「代码错」还是「驱动错」。 */
const DRIVER_FILENAME = 'pyrunner-driver.py';

export interface ExecOptions {
  /** 要跑的代码 */
  code: string;
  /**
   * traceback 里显示的文件名，同时用于 linecache。
   * 要与页面上的代码一一对应，所以每次运行用不同的名字，
   * 解析出错行号时才知道是哪个文件。
   */
  filename: string;
  /** 喂给 sys.stdin 的内容；不传就是空 */
  stdin?: string;
  /**
   * 代码是不是「程序本体」（牛客题的 stdin/stdout 形态）。
   * true 时 `__name__` 取 __main__，`if __name__ == "__main__":` 里那段会执行。
   */
  asMain?: boolean;
  /** 跑完代码后再执行的驱动代码，与代码共用 globals */
  driver?: string;
  /** 驱动自己的文件名，用于它的 traceback */
  driverFilename?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  /** 代码本身抛错时的 traceback（已带源码行） */
  error: string;
  /** 代码抛错时的行号，1 起。给编辑器高亮用。 */
  errorLines: number[];
  /** 驱动抛错时的 traceback */
  driverError: string;
  driverErrorLines: number[];
  /** 驱动最后一个表达式的返回值（调用结果 JSON 字符串） */
  value: unknown;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 从 traceback 文本里捞出某个文件的出错行号 */
export function errorLinesOf(traceback: string, filename: string): number[] {
  const re = new RegExp(`File "${escapeRe(filename)}", line (\\d+)`, 'g');
  const lines: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(traceback)) !== null) {
    const n = Number(m[1]);
    if (!lines.includes(n)) {
      lines.push(n);
    }
  }
  return lines;
}

/**
 * 跑一段代码，收集 stdout/stderr/异常。
 *
 * 不用 `runPython`（同步版）而是 `runPythonAsync`：内部会 await，
 * 异步代码（比如用户自己写的 async def）才能正确收敛。
 *
 * ## 每次运行都用全新的 globals（这是修掉的真 bug）
 *
 * 原来直接跑在解释器的默认全局上，于是第二次运行时第一次定义的变量还在，
 * 类也是被重新赋值而不是重建 —— 读者改了一处辅助函数再跑，看到的可能是
 * 上一轮的旧对象，判定结果毫无意义。
 *
 * ## 三步各自 try，不用「看 traceback 里有没有驱动文件名」去猜是哪步炸的
 *
 * 早先是一个大 try 兜住全部，catch 里靠字符串匹配判断阶段。分成三个独立
 * try 之后阶段是确定的，行号归属也是确定的。
 */
export async function execPython(
  py: PyodideRuntime,
  {
    code,
    filename,
    stdin = '',
    asMain = false,
    driver,
    driverFilename = DRIVER_FILENAME,
  }: ExecOptions,
): Promise<ExecResult> {
  let stdout = '';
  let stderr = '';

  py.setStdout({
    batched: (msg: string) => {
      stdout += msg;
      stdout += '\n';
    },
  });
  py.setStderr({
    batched: (msg: string) => {
      stderr += msg;
      stderr += '\n';
    },
  });

  const result: ExecResult = {
    stdout: '',
    stderr: '',
    error: '',
    errorLines: [],
    driverError: '',
    driverErrorLines: [],
    value: undefined,
  };

  // dict 字面量而不是 py.globals：只有真的返回 dict 代理才能当 exec 的 globals，
  // 而且 __name__ 必须显式给 '非 __main__'（见 driver.ts 的说明）。
  const globals = (await py.runPythonAsync(globalsInit(asMain), {
    dedent: false,
  })) as PyProxy;

  try {
    try {
      await py.runPythonAsync(buildPrelude({filename, code, stdin}), {
        globals,
        filename: '<pyrunner-prelude>',
        dedent: false,
      });
    } catch (e) {
      // prelude 只做 linecache 与 stdin 登记，炸了说明 Pyodide 本身有问题
      result.driverError = String((e as Error)?.message ?? e);
      return result;
    }

    try {
      await py.runPythonAsync(code, {globals, filename, dedent: false});
    } catch (e) {
      const message = String((e as Error)?.message ?? e);
      result.error = message;
      result.errorLines = errorLinesOf(message, filename);
      return result;
    } finally {
      // 收尾必须补一个换行。
      //
      // 题解常把最后一行写成不带换行的（`sys.stdout.write(' '.join(...))`），
      // 而 Pyodide 的 batched 回调**只在遇到换行时才吐出内容**：
      // `write('AAA'); write('\n'); write('BBB')` 实测只能收到 `AAA`。
      // 不管的话那最后一行页面上根本看不到 —— lstm-temperature 那题就只
      // 显示第一行，期望值两行，判成失败。
      //
      // 补的换行随后被 `trimEnd()` 去掉，不会污染判定；
      // `write('\n')` 对本来就以换行结尾的输出是空操作。
      try {
        await py.runPythonAsync("__sys__.stdout.write('\\n')", {globals});
      } catch {
        /* 收尾失败不影响已拿到的输出 */
      }
    }

    if (driver) {
      try {
        result.value = await py.runPythonAsync(driver, {
          globals,
          filename: driverFilename,
          dedent: false,
        });
      } catch (e) {
        const message = String((e as Error)?.message ?? e);
        result.driverError = message;
        result.driverErrorLines = errorLinesOf(message, driverFilename);
      }
    }

    // 驱动跑完同样补一个换行：调用入口的过程中也可能有 print（题解里的调试
    // 输出、递归里的日志），末尾那行同样可能不带换行。
    try {
      await py.runPythonAsync("__sys__.stdout.write('\\n')", {globals});
    } catch {
      /* 同上 */
    }
  } finally {
    globals.destroy?.();
    result.stdout = stdout.trimEnd();
    result.stderr = stderr.trimEnd();
  }

  return result;
}

/** 去掉 Pyodide 控制台常见的交互式 REPL 残留 */
export function normalizeCode(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/^\s*>>>\s?/gm, '').trimEnd();
}