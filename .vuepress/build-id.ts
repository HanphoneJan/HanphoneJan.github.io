import { execFileSync } from 'node:child_process'

/**
 * 构建标识 = 离线包的版本号。
 *
 * 离线包里存的是**这一版**的 HTML 与页面 chunk：HTML 引用
 * `assets/app-<hash>.js` 和 `assets/<页面>-<hash>.js`，这些名字每次部署
 * 都会变、旧文件会被删掉。所以离线包必须记下自己属于哪一版，站上部署了
 * 新版本之后，旧包要么整包重下，要么离线打开时白屏 —— 没有第三条路。
 *
 * 取值的三个层次：
 *
 * 1. CI 里用 `GITHUB_SHA`（精确到 7 位）。`refresh-data.yml` 每天都会重建
 *    并重新部署，但内容没变、SHA 也没变 —— 版本号保持稳定，
 *    读者不会每天被提示「离线包过期」。
 * 2. 本地构建用 `git rev-parse --short HEAD`，同一提交重复构建结果一致。
 * 3. 工作区有未提交改动时，同样的提交其实会产出不同的 chunk 哈希，
 *    所以追加 `-dirty.<时间戳>`，让本地验证「更新」这条路径时能看出区别。
 *
 * 拿不到 git（比如 CI 的浅克隆里没有 .git）时退化成 `local-<时间戳>`。
 */
function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

function resolveBuildId(): string {
  const sha = process.env.GITHUB_SHA?.trim().slice(0, 7) || git(['rev-parse', '--short=7', 'HEAD'])
  if (!sha) return `local-${Date.now().toString(36)}`
  const dirty = git(['status', '--porcelain']) !== null && Boolean(git(['status', '--porcelain']))
  return dirty ? `${sha}-dirty.${Date.now().toString(36)}` : sha
}

export const BUILD_ID = resolveBuildId()
