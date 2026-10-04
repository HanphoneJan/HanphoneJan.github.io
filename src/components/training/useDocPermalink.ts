import {usePluginData} from '@docusaurus/useGlobalData';
import type {DocPermalinkData} from '@site/plugins/doc-permalinks';

/**
 * 用 md 相对路径换真实 permalink。
 *
 * 拿不到时返回 undefined，由调用方决定降级方案（不要自己按文件名拼 ——
 * numberPrefixParser 会改写 docId，见 plugins/doc-permalinks）。
 */
export function useDocPermalink(docPath: string): string | undefined {
  const data = usePluginData('doc-permalinks') as unknown as
    | DocPermalinkData
    | undefined;
  return data?.map[docPath];
}