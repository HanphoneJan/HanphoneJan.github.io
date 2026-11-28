/**
 * 文档题解 -> 评测服务题目 ID。
 *
 * 规则必须和 `judge-server` 的导入脚本一致：`platform` 转小写、`id` 转小写，
 * 非字母数字压成 `-`。力扣 `id: 1` -> `leetcode-1`，牛客 `id: HJ80` ->
 * `nowcoder-hj80`。没有 `id` 时用文件名兜底。
 *
 * 平台名有中文，先做一张显式映射；映射不到才退回 slug，避免生成
 * `顺丰科技-xxx` 这种非 ASCII ID（服务端路径校验只接受 `[a-z0-9-]`）。
 */

const PLATFORM: Record<string, string> = {
  LeetCode: 'leetcode',
  力扣: 'leetcode',
  NowCoder: 'nowcoder',
  牛客: 'nowcoder',
  CodeFun2000: 'codefun2000',
  Shopee: 'shoppee',
  '顺丰科技': 'sf',
  京东: 'jd',
  途游: 'tuyou',
  成谷科技: 'chenggu',
  自定义: 'custom',
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 稳定短哈希：给纯中文 ID 兜底，不追求密码学强度。 */
function shortHash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function judgeIdOf(
  frontmatter: Record<string, unknown>,
  docId: string,
): string {
  const platformRaw = String(frontmatter.platform ?? '')
  const platform =
    PLATFORM[platformRaw] ?? (slug(platformRaw) || 'custom')

  const last = docId.split('/').pop()?.replace(/\.md$/i, '') ?? 'doc'
  const rawId =
    frontmatter.id === undefined || frontmatter.id === null
      ? last
      : String(frontmatter.id)
  // `HJ80.整型数组合并` / `0001_two_sum` 这类文件名，只取题号段作为兜底；
  // 有 frontmatter.id 时按 id 走，不受影响。
  const base = rawId.includes('.') ? rawId.split('.')[0] : rawId
  const id = slug(base) || `doc-${shortHash(`${platform}:${docId}`)}`

  return `${platform}-${id}`
}
