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
 * 1. **CI 里只用 `GITHUB_SHA`（7 位），不加任何后缀。** `refresh-data.yml`
 *    每天都会重建并重新部署，但提交没变 —— 版本号必须保持稳定，否则读者
 *    每天都会看到「离线包需要更新」。
 *
 *    这里**不能**用「工作区脏不脏」来判断：两个部署 workflow 在 build 之前
 *    都会 `node scripts/fetch-stars.js` / `fetch-projects.js` 重写
 *    `data/*.json`，检出立即变脏，于是每个 CI 构建都会得到
 *    `<sha>-dirty.<时间戳>` —— 每天变一次，正是要避免的那种噪音。
 * 2. 本地构建用 `git rev-parse --short HEAD`，同一提交重复构建结果一致。
 * 3. 本地工作区有未提交改动时，同样的提交确实会产出不同的 chunk 哈希，
 *    追加 `-dirty.<时间戳>`，让本地验证「更新」这条路径时能看出区别。
 *
 * 拿不到 git（比如浅克隆里没有 .git）时退化成 `local-<时间戳>`。
 */
function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

function resolveBuildId(): string {
  const shaEnv = process.env.GITHUB_SHA?.trim().slice(0, 7)
  if (shaEnv) return shaEnv

  const sha = git(['rev-parse', '--short=7', 'HEAD'])
  if (!sha) return `local-${Date.now().toString(36)}`

  const dirty = Boolean(git(['status', '--porcelain']))
  return dirty ? `${sha}-dirty.${Date.now().toString(36)}` : sha
}

export const BUILD_ID = resolveBuildId()
