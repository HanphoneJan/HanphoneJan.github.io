/**
 * Python 代码编辑器（CodeMirror 6）。
 *
 * ## 为什么单独拆文件 + 动态 import
 *
 * CodeMirror 6 全家桶（view/state/commands/language/lang-python）加起来
 * 几百 KB。它只服务于「改代码再跑」这个次要动作，绝大多数读者不会点。
 * 所以：
 *
 * - 用 `React.lazy(() => import('./CodeEditor'))` 在 SnippetBar 里按需加载，
 *   不点「改代码」的人一个字节都不下载。
 * - 在这个文件**内部**才 import `@codemirror/*`；SnippetBar 本身不碰它们。
 *
 * （CodeMirror 全部是纯 ESM、无 install 脚本，所以 pnpm 11 的 build 白名单、
 * CI 的 frozen-lockfile 都不受影响 —— 这也是选它而不是 Monaco 的原因之一。）
 *
 * ## 配色：零主题包，复用代码块的 CSS 变量
 *
 * 容器上已经有 `--prism-background-color` / `--prism-color`，编辑器 theme
 * 直接读这些变量，配 `--ifm-color-emphasis-*`。深浅色自动跟随，
 * 不引入 `@codemirror/theme-one-dark`。
 *
 * ## 高度：显式给，编辑器内部滚动
 *
 * CM6 的 scroller 是绝对定位布局，父容器不显式给高度就会塌成一行。
 * 这里给一个 max-height，超出内部滚动。题解里的完整代码普遍 20~60 行，
 * 不限高会把页面撑得很长。
 *
 * ## 错误行高亮
 *
 * Pyodide 的 `filename` + 我们登记的 linecache 让 traceback 里带出
 * 「第几行」和那行源码。把行号喂给 CM6，用 Decoration 把出错行标红 ——
 * 这是把「运行」变成「学习」的关键一环：一眼看到自己错在哪一行。
 */

import React, {useEffect, useRef, type ReactNode} from 'react';
import {
  EditorState,
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
  type DecorationSet,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  indentUnit,
} from '@codemirror/language';
import {python} from '@codemirror/lang-python';
import {closeBrackets} from '@codemirror/autocomplete';
import styles from './styles.module.css';

interface Props {
  /** 初始代码 */
  value: string;
  /** 出错行号（1 起），会高亮 */
  errorLines: number[];
  onChange?: (value: string) => void;
  /** Cmd/Ctrl+Enter 触发的运行 */
  onRun?: () => void;
}

/** 传进来的行号变化时 dispatch 这个 effect，让 StateField 重算装饰 */
const setErrorLines = StateEffect.define<number[]>();

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    // 先把已有装饰跟着文档变化重映射
    let next = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorLines)) {
        const lines: number[] = e.value;
        const marks = lines
          // 文档只有 doc.lines 行，越界的高亮要丢掉（否则 CM6 抛错）
          .filter((n) => n >= 1 && n <= tr.state.doc.lines)
          .map((n) =>
            Decoration.line({class: styles.cmErrorLine}).range(
              tr.state.doc.line(n).from,
            ),
          );
        next = Decoration.set(marks, true);
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/** 主题：全部走 CSS 变量，跟着代码块配色走 */
const editorTheme = EditorView.theme({
  '&': {
    fontSize: 'var(--ifm-code-font-size)',
    backgroundColor: 'transparent',
    color: 'var(--prism-color)',
  },
  '.cm-content': {
    fontFamily: 'var(--ifm-font-family-monospace)',
    caretColor: 'var(--prism-color)',
    padding: '0.5rem 0',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--ifm-color-emphasis-600)',
    border: 'none',
  },
  '.cm-activeLine': {backgroundColor: 'rgba(127,127,127,0.12)'},
  '.cm-activeLineGutter': {backgroundColor: 'rgba(127,127,127,0.12)'},
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(127,127,127,0.25)',
  },
  '.cm-cursor': {borderLeftColor: 'var(--prism-color)'},
});

export default function CodeEditor({
  value,
  errorLines,
  onChange,
  onRun,
}: Props): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  // 只建一次视图；内容/回调的后续变化走 update 监听与外部 dispatch
  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      indentUnit.of('    '),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
      python(),
      editorTheme,
      EditorView.lineWrapping,
      errorLineField,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString());
        }
      }),
      keymap.of([
        {
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
        // 放在 historyKeymap 之后，让 undo/redo 仍走默认栈
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
    ];

    const view = new EditorView({
      state: EditorState.create({doc: value, extensions}),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部（如「还原」）改了 value —— 用 replace 覆盖，但不动光标以外的
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const cur = view.state.doc.toString();
    if (cur === value) {
      return;
    }
    view.dispatch({
      changes: {from: 0, to: cur.length, insert: value},
    });
  }, [value]);

  // 行号变化 -> 高亮
  useEffect(() => {
    viewRef.current?.dispatch({effects: setErrorLines.of(errorLines)});
  }, [errorLines]);

  return (
    <div className={styles.editorHost}>
      <div ref={hostRef} />
      <p className={styles.editorHint}>Cmd/Ctrl + Enter 运行</p>
    </div>
  );
}