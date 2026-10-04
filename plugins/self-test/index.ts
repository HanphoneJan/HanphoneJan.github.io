import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';
import type {QuizBank} from '@site/src/components/training/selftest/types';

/**
 * 把自测题库的「哪些题解有题」这份清单注入 globalData。
 *
 * ## 只发布键，不发布题目本身
 *
 * globalData 会进客户端主 bundle，被**全站每一页**加载。182 个 docId 约 7KB，
 * 可以接受；而几百道题的正文有好几百 KB，绝不能放进来。
 * 所以这里只发 `docIds`，题目数据由 SelfTest 组件在用户点开时按需 fetch
 * `/quiz/bank.json`。
 *
 * ## 为什么不用 remark 插件注入 JSX 组件
 *
 * 试过，会被 MDX 静默丢弃：手写进 mdast 的 `mdxjsEsm` 节点必须自带
 * `data.estree` 才会被编译成 import，否则整条语句消失，SSR 报
 * `Expected component SelfTest to be defined`。要补 estree 就得引 JS 解析器，
 * 为了一个组件不值得。改在已 swizzle 的 `DocItem/Layout` 里渲染，位置等价于
 * 「正文末尾」，且 126 篇 md 一行都不用改。
 */

export interface SelfTestOptions {
  /** 题库文件路径，相对 siteDir */
  bankFile?: string;
}

export interface SelfTestData {
  /** 有自测题的题解，键是 md 相对 code-training/docs 的路径 */
  docIds: string[];
}

export default function selfTestPlugin(
  context: LoadContext,
  options: SelfTestOptions,
): Plugin<SelfTestData> {
  const bankFile = options.bankFile ?? 'static/quiz/bank.json';

  return {
    name: 'self-test',

    async loadContent(): Promise<SelfTestData> {
      const fullPath = path.join(context.siteDir, bankFile);
      if (!fs.existsSync(fullPath)) {
        // 题库还没建时不影响构建
        return {docIds: []};
      }

      let bank: QuizBank;
      try {
        bank = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as QuizBank;
      } catch (e) {
        throw new Error(
          `题库 ${bankFile} 不是合法 JSON：${(e as Error).message}\n` +
            '请运行 `pnpm quiz:validate` 检查。',
        );
      }

      const docIds = [
        ...new Set((bank.items ?? []).map((item) => item.docId)),
      ].sort();

      return {docIds};
    },

    async contentLoaded({content, actions}): Promise<void> {
      actions.setGlobalData(content);
    },
  };
}