import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';

/**
 * 间隔重复复习（SRS）的卡片数据源。
 *
 * ## 只发卡片元数据，不发正文
 *
 * globalData 会进客户端主 bundle，被**全站每一页**加载。182 张卡的
 * 元数据约 30KB，可以接受；题解正文绝不能进来。
 *
 * ## 为什么用插件而不是运行时读 Markdown
 *
 * `useAllDocsData()` 会把每篇文档的完整 toc 一起带进来（几十万字），
 * 太重；`useDocsData()` 只有 id/path，拿不到 frontmatter。
 * 构建期用 gray-matter 解析最直接，而且能顺手做归一化和校验。
 *
 * ## 复习进度不在这份数据里
 *
 * 进度存在浏览器 localStorage（见 `src/components/training/srs/store.ts`），
 * 静态站没有后端。这份数据只负责「有哪些卡、各自什么难度/标签/首解日期」。
 */

export interface SrsCard {
  /** 稳定标识，建议用题号 */
  id: string;
  /** 题解 md 相对 code-training/docs 的路径 */
  docId: string;
  title: string;
  /** 题解页 permalink（用于点击跳转） */
  permalink: string;
  platform: string;
  /** 已归一化为 1/2/3 */
  level: 1 | 2 | 3;
  /** 原始难度字符串，便于展示 */
  difficultyLabel: string;
  tags: string[];
  patterns: string[];
  /** 首次解题日期 YYYY-MM-DD */
  dateAdded: string;
}

export interface SrsData {
  cards: SrsCard[];
}

/** 难度归一化：题解里中英两套写法混用 */
function normalizeDifficulty(raw: unknown): {
  level: 1 | 2 | 3;
  label: string;
} {
  const s = String(raw ?? '').trim();
  const map: Record<string, 1 | 2 | 3> = {
    // 英文（LeetCode）
    easy: 1,
    medium: 2,
    hard: 3,
    // 中文（牛客 / 顺丰 / Shopee）
    简单: 1,
    入门: 1,
    中等: 2,
    困难: 3,
  };
  const level = map[s.toLowerCase()] ?? map[s] ?? 2;
  return {level, label: s || '中等'};
}

/** frontmatter 的多行数组字段 */
function readStringArray(fm: Record<string, unknown>, key: string): string[] {
  const v = fm[key];
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return [v.trim()];
  }
  return [];
}

function collectProblemDocs(root: string): string[] {
  const problemsDir = path.join(root, 'problems');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        out.push(full);
      }
    }
  };
  if (fs.existsSync(problemsDir)) {
    walk(problemsDir);
  }
  return out.sort();
}

/** 极简 frontmatter 解析：只取顶层 `key: value` 与 `  - item` 列表 */
function parseFrontMatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    return {};
  }
  const lines = m[1].split(/\r?\n/);
  const fm: Record<string, unknown> = {};
  let currentKey: string | undefined;
  for (const line of lines) {
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentKey) {
      const arr = Array.isArray(fm[currentKey]) ? (fm[currentKey] as string[]) : [];
      arr.push(listItem[1].trim());
      fm[currentKey] = arr;
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) {
      continue;
    }
    currentKey = kv[1];
    const value = kv[2].trim();
    if (!value) {
      // 可能是数组头，留空；后面由 listItem 填充
      fm[currentKey] = [];
    } else if (value.startsWith('[') && value.endsWith(']')) {
      fm[currentKey] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      fm[currentKey] = value.replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}

/** docs 插件的 content 里，文档元数据的最小结构 */
type DocsContent = {
  loadedVersions?: Array<{
    docs?: Array<{
      source?: string;
      id?: string;
      permalink?: string;
      frontMatter?: Record<string, unknown>;
    }>;
  }>;
};

export default function srsCardsPlugin(context: LoadContext): Plugin<SrsData> {
  /** 卡片已按 md 解析好，permalink 留待 allContentLoaded 用 docs 插件的真实数据回填 */
  const parsed: Array<Omit<SrsCard, 'permalink'> & {absPath: string}> = [];


  return {
    name: 'srs-cards',

    async loadContent(): Promise<SrsData> {
      const docsRoot = path.join(context.siteDir, 'code-training/docs');
      const files = collectProblemDocs(docsRoot);

      for (const abs of files) {
        const rel = path.relative(docsRoot, abs).split(path.sep).join('/');
        const content = fs.readFileSync(abs, 'utf8');
        const fm = parseFrontMatter(content);
        const {level, label} = normalizeDifficulty(fm.difficulty);

        // 题号：优先 frontmatter 的 id，其次文件名数字前缀
        const id = String(fm.id ?? path.basename(rel, '.md')).trim();
        const title = String(fm.title ?? id).trim();

        parsed.push({
          id,
          docId: rel,
          title,
          platform: String(fm.platform ?? '').trim(),
          level,
          difficultyLabel: label,
          tags: readStringArray(fm, 'tags'),
          patterns: readStringArray(fm, 'patterns').map((p) =>
            path.basename(p, '.md'),
          ),
          dateAdded: String(fm.date_added ?? '').slice(0, 10),
          absPath: abs,
        });
      }

      // permalink 要在 allContentLoaded 里用 docs 插件的真实数据回填，
      // 这里先给一个占位值
      return {
        cards: parsed.map(({absPath: _absPath, ...rest}) => ({
          ...rest,
          permalink: '',
        })),
      };
    },

    /**
     * 用 docs 插件的真实 permalink 回填。
     *
     * ## 为什么不自己算 permalink
     *
     * Docusaurus 的 numberPrefixParser 会按文件名前缀改写 docId，
     * 规则不统一，且随配置变化：
     *   `0001_two_sum.md`              → `1`
     *   `sf_min_refuel_stops.md`       → `sf-min-refuel-stops`（下划线转横线）
     *   `HJ48.从单向链表….md`          → `HJ48`
     *   `SQL200.查找最晚入职….md`      → `SQL200`
     * 自己复刻这套规则等于埋一个随时会炸的坑，直接问 docs 插件要准确答案。
     */
    async allContentLoaded({allContent, actions}): Promise<void> {
      const docsPlugin = allContent['docusaurus-plugin-content-docs'] as
        | Record<string, DocsContent>
        | undefined;

      const bySource = new Map<string, string>();
      for (const instance of Object.values(docsPlugin ?? {})) {
        for (const version of instance.loadedVersions ?? []) {
          for (const doc of version.docs ?? []) {
            if (doc.source && doc.permalink) {
              bySource.set(doc.source, doc.permalink);
            }
          }
        }
      }

      const siteDir = context.siteDir;
      const cards: SrsCard[] = parsed.map(({absPath, ...rest}) => {
        const source = `@site/${path
          .relative(siteDir, absPath)
          .split(path.sep)
          .join('/')}`;
        return {...rest, permalink: bySource.get(source) ?? ''};
      });

      actions.setGlobalData({cards} satisfies SrsData);

      const missing = cards.filter((c) => !c.permalink);
      if (missing.length > 0) {
        console.warn(
          `[srs-cards] ${missing.length} 张卡没匹配到 permalink，例如：` +
            missing
              .slice(0, 3)
              .map((c) => c.docId)
              .join(', '),
        );
      }
    },
  };
}