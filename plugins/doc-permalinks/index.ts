import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

/**
 * 全站 code-training 文档的 `md 相对路径 -> permalink` 映射。
 *
 * ## 为什么不自己按文件名拼 permalink
 *
 * Docusaurus 的 numberPrefixParser 会按文件名前缀改写 docId，规则不统一、
 * 且随配置变化：
 *   `0001_two_sum.md`              → `1`
 *   `sf_min_refuel_stops.md`       → `sf-min-refuel-stops`（下划线转横线）
 *   `HJ48.从单向链表….md`          → `HJ48`
 *   `SQL200.查找最晚入职….md`      → `SQL200`
 * 复刻这套规则等于埋一个随时会炸的坑。直接问 docs 插件要准确答案。
 *
 * ## 为什么需要它
 *
 * tracer、自测都持有「题解 md 的相对路径」这个稳定标识，
 * 但要跳转就必须拿到真实 permalink。有了这张表，三处都能用同一个 key 跳转。
 */

type DocsContent = {
  loadedVersions?: Array<{
    docs?: Array<{source?: string; permalink?: string}>;
  }>;
};

export interface DocPermalinkData {
  /** md 相对 code-training/docs 的路径 -> permalink */
  map: Record<string, string>;
}

export default function docPermalinksPlugin(
  context: LoadContext,
): Plugin<DocPermalinkData> {
  let map: Record<string, string> = {};

  return {
    name: 'doc-permalinks',

    async loadContent(): Promise<DocPermalinkData> {
      return {map: {}};
    },

    async allContentLoaded({allContent, actions}): Promise<void> {
      const docsPlugin = allContent['docusaurus-plugin-content-docs'] as
        | Record<string, DocsContent>
        | undefined;

      const found: Record<string, string> = {};
      for (const instance of Object.values(docsPlugin ?? {})) {
        for (const version of instance.loadedVersions ?? []) {
          for (const doc of version.docs ?? []) {
            if (!doc.source || !doc.permalink) {
              continue;
            }
            // `@site/code-training/docs/<rel>` -> `<rel>`
            const marker = '/code-training/docs/';
            const idx = doc.source.indexOf(marker);
            if (idx === -1) {
              continue;
            }
            found[doc.source.slice(idx + marker.length)] = doc.permalink;
          }
        }
      }

      map = found;
      actions.setGlobalData({map} satisfies DocPermalinkData);

      const total = Object.keys(found).length;
      if (total === 0) {
        console.warn('[doc-permalinks] 没匹配到任何文档，permalink 跳转会失效');
      }
    },
  };
}