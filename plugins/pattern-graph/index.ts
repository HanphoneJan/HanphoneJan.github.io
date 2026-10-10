import type {LoadContext, Plugin} from '@docusaurus/types';

/**
 * 知识图谱：把「题解 --patterns--> 算法模式文档」的边聚起来，供算法模式页
 * 反向列出「相关题目」。
 *
 * ## 数据从哪来
 *
 * 题解 frontmatter 里的 `patterns`（由 `scripts/gen-patterns.js` 从 `tags`
 * 机械推导）。这里是它的**反向索引**：pattern 文档 -> 题目列表。
 *
 * 为什么走 `allContentLoaded` 而不是读文件：`permalink` 是 docs 插件按
 * numberPrefixParser 等规则算出来的（`0001_two_sum.md` -> `/1`、
 * `HJ48.xxx.md` -> `/HJ48`），自己拼必错。这里直接从加载好的文档对象里取
 * `source` / `permalink` / `frontMatter`，与 `plugins/doc-permalinks` 同一套。
 *
 * ## 为什么只发题目元信息，不发正文
 *
 * globalData 会进客户端主 bundle，被**全站每一页**加载。这里每条只有
 * 标题/链接/难度几个短字段，200 条也就几十 KB，可以接受；题解正文绝不能进来。
 *
 * ## 为什么难度分组放在客户端
 *
 * 服务端只保证列表有序；分组标题（简单/中等/困难）与排序的展示细节留给
 * 组件，改文案不用重跑构建。
 */

export interface PatternProblem {
  /** 题解标题 */
  title: string;
  /** 真实 permalink（由 docs 插件给出） */
  permalink: string;
  /** 原始难度文本（`Medium` / `中等` / …） */
  difficulty: string;
  /** 题号 */
  id: string;
  /** 平台 */
  platform: string;
}

export interface PatternGraphData {
  /** pattern 文档的 docId（如 `patterns/bfs.md`）-> 相关题目 */
  byPattern: Record<string, PatternProblem[]>;
}

type DocMeta = {
  source?: string;
  permalink?: string;
  title?: string;
  frontMatter?: Record<string, unknown>;
};

type DocsContent = {
  loadedVersions?: Array<{docs?: DocMeta[]}>;
};

/** 难度排序用的粗排秩，认不出的排在最后 */
function diffRank(d: string): number {
  if (/简单|Easy/i.test(d)) return 0;
  if (/中等|Medium/i.test(d)) return 1;
  if (/困难|Hard/i.test(d)) return 2;
  return 3;
}

export default function patternGraphPlugin(
  _context: LoadContext,
): Plugin<PatternGraphData> {
  return {
    name: 'pattern-graph',

    async loadContent(): Promise<PatternGraphData> {
      // 真实数据在 allContentLoaded 里才有（需要 docs 插件的产物）
      return {byPattern: {}};
    },

    async allContentLoaded({allContent, actions}): Promise<void> {
      const docsPlugin = allContent['docusaurus-plugin-content-docs'] as
        | Record<string, DocsContent>
        | undefined;

      const byPattern: Record<string, PatternProblem[]> = {};
      const marker = '/code-training/docs/';

      for (const instance of Object.values(docsPlugin ?? {})) {
        for (const version of instance.loadedVersions ?? []) {
          for (const doc of version.docs ?? []) {
            const source = doc.source ?? '';
            const idx = source.indexOf(marker);
            if (idx === -1) {
              continue;
            }
            const rel = source.slice(idx + marker.length);
            // 只收题库里的题解；模式 / 数据结构 / 复习文档本身不参与
            if (!rel.startsWith('problems/')) {
              continue;
            }
            const fm = doc.frontMatter ?? {};
            const patterns = Array.isArray(fm.patterns) ? fm.patterns : [];
            for (const raw of patterns) {
              // `../../patterns/bfs.md` -> `patterns/bfs.md`
              const key = String(raw).replace(/^(?:\.\.\/)+/, '');
              (byPattern[key] ??= []).push({
                title: doc.title ?? rel,
                permalink: doc.permalink ?? '',
                difficulty: String(fm.difficulty ?? ''),
                id: String(fm.id ?? ''),
                platform: String(fm.platform ?? ''),
              });
            }
          }
        }
      }

      for (const list of Object.values(byPattern)) {
        list.sort((a, b) => {
          const d = diffRank(a.difficulty) - diffRank(b.difficulty);
          if (d !== 0) {
            return d;
          }
          // 同难度按题号自然序（数字优先，其次字符串）
          const na = Number(a.id);
          const nb = Number(b.id);
          if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
            return na - nb;
          }
          return a.title.localeCompare(b.title, 'zh');
        });
      }

      actions.setGlobalData({byPattern} satisfies PatternGraphData);
    },
  };
}
