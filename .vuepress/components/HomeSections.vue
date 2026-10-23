<template>
  <div class="home-sections">
    <dl v-if="stats.length > 0" class="stats">
      <div v-for="s in stats" :key="s.label" class="stat">
        <dt class="stat-label">{{ s.label }}</dt>
        <dd class="stat-value">{{ s.value }}</dd>
      </div>
    </dl>

    <section class="section">
      <h2 class="section-title">从哪里开始</h2>
      <div class="cards">
        <a v-for="entry in ENTRIES" :key="entry.to" :href="entry.to" class="card">
          <span class="card-icon" aria-hidden="true">{{ entry.icon }}</span>
          <h3 class="card-title">{{ entry.title }}</h3>
          <p class="card-desc">{{ entry.desc }}</p>
          <span class="card-cta">{{ entry.cta }} →</span>
        </a>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">这里有什么不一样</h2>
      <div class="features">
        <a v-for="feature in FEATURES" :key="feature.title" :href="feature.to" class="feature">
          <span class="feature-icon" aria-hidden="true">{{ feature.icon }}</span>
          <div>
            <h3 class="feature-title">{{ feature.title }}</h3>
            <p class="feature-desc">{{ feature.desc }}</p>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 首页正文（hope 的 `home: true` 只负责 hero，其余内容由这里渲染）。
 *
 * 数字是构建期真算出来的：`.vuepress/plugins/training.ts` 把题解数、
 * 有轨迹的篇数、有自测题的篇数通过 Vite `define` 注入 `__SITE_STATS__`。
 * 内容增删后首页自动跟着变，不会出现「写着 282 其实已经 300」。
 */
declare const __SITE_STATS__:
  | string
  | {problems?: number; animations?: number; selfTests?: number}
  | undefined

// define 注入的是字符串（JSON.stringify 的结果），要先 parse 再读字段
const raw: {problems?: number; animations?: number; selfTests?: number} =
  typeof __SITE_STATS__ === 'string'
    ? JSON.parse(__SITE_STATS__)
    : (__SITE_STATS__ ?? {})

const stats = [
  {value: raw.problems ?? 0, label: '篇题解'},
  {value: raw.animations ?? 0, label: '份算法动画'},
  {value: raw.selfTests ?? 0, label: '篇带自测题'},
].filter((s) => s.value > 0)

const ENTRIES = [
  {
    to: '/docs',
    icon: '📘',
    title: '技术文档',
    desc: '前端、后端、嵌入式、机器学习、AI Agent，以及 Python / Java 计算机基础系列。',
    cta: '进入文档',
  },
  {
    to: '/code-training/category/题库',
    icon: '🧮',
    title: '代码训练',
    desc: '力扣 / 牛客题解，每道题都能在浏览器里直接跑样例、看逐行动画。',
    cta: '开始刷题',
  },
  {
    to: '/stars',
    icon: '⭐',
    title: 'Stars',
    desc: '收藏并打标签的优质开源仓库，支持搜索、标签筛选与排序。',
    cta: '浏览收藏',
  },
  {
    to: '/projects',
    icon: '🚀',
    title: '项目',
    desc: '自己做过与正在做的开源项目与作品。',
    cta: '查看项目',
  },
]

const FEATURES = [
  {
    to: '/code-training/category/题库',
    icon: '▶',
    title: '浏览器里跑样例',
    desc: '点一下就能运行代码、比对样例输出，不用装 Python，也不用复制粘贴。',
  },
  {
    to: '/code-training/category/算法模式',
    icon: '🎬',
    title: '逐行算法动画',
    desc: '录制真实执行过程并回放每一步：数组怎么收缩、指针怎么走、DP 表怎么填。',
  },
  {
    to: '/code-training/category/题库',
    icon: '🧠',
    title: '主动回忆自测',
    desc: '每道题解末尾都有一组自测题，看完解析当场检验自己是不是真的记住了。',
  },
]
</script>

<style scoped>
.home-sections {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem 2rem;
}

/* ── 统计 ─────────────────────────────────── */
.stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2.5rem;
  margin: 0 auto 3rem;
  padding: 1.5rem 1rem;
  max-width: 760px;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}

.stat {
  display: flex;
  /* DOM 必须是 dt -> dd（合法 HTML），视觉上想先看到数字，所以反向 */
  flex-direction: column-reverse;
  align-items: center;
  gap: 0.15rem;
}

.stat-value {
  margin: 0;
  font-family: var(--vp-font-heading);
  font-size: 1.9rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--vp-c-accent);
}

.stat-label {
  margin: 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-mute);
}

/* ── 板块 ─────────────────────────────────── */
.section {
  margin-bottom: 3rem;
}

.section-title {
  margin: 0 0 1.25rem;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--vp-c-text);
  text-align: center;
}

/* ── 入口卡片 ─────────────────────────────── */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  padding: 1.35rem 1.25rem 1.15rem;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--vp-radius, 10px);
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-accent);
  box-shadow: 0 6px 20px rgb(0 0 0 / 8%);
}

.card-icon {
  font-size: 1.6rem;
  line-height: 1;
  margin-bottom: 0.75rem;
}

.card-title {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vp-c-text);
}

.card-desc {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  line-height: 1.65;
  color: var(--vp-c-text-mute);
}

.card-cta {
  margin-top: auto;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-accent);
}

/* ── 差异化能力 ───────────────────────────── */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.feature {
  display: flex;
  gap: 0.9rem;
  padding: 1.1rem 1.2rem;
  border-radius: var(--vp-radius, 10px);
  color: inherit;
  text-decoration: none;
  transition: background 0.2s ease;
}

.feature:hover {
  background: var(--vp-c-bg-alt);
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2.1rem;
  font-size: 1rem;
  color: var(--vp-c-accent);
  background: var(--vp-c-accent-soft);
  border-radius: 50%;
}

.feature-title {
  margin: 0 0 0.3rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text);
}

.feature-desc {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.65;
  color: var(--vp-c-text-mute);
}

@media (max-width: 719px) {
  .stats {
    gap: 1.5rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .section {
    margin-bottom: 2rem;
  }
}
</style>
