<template>
  <div class="home-mount">
    <main>
      <header :class="$style.hero">
        <div :class="$style.heroContainer">
          <h1 :class="$style.title">{{ title }}</h1>
          <p :class="$style.subtitle">{{ tagline }}</p>
          <p :class="$style.lead">
            技术文档与算法训练场 —— 静态笔记之外，还放得下可运行的代码、
            可回放的算法动画，以及看完就忘不了的自测题。
          </p>
          <div :class="$style.buttons">
            <a href="/docs" :class="$style.heroButton">开始阅读</a>
            <a
              href="/code-training/category/题库"
              :class="$style.heroButtonSecondary"
            >
              刷算法题
            </a>
          </div>

          <dl v-if="stats.length > 0" :class="$style.stats">
            <div v-for="stat in stats" :key="stat.label" :class="$style.stat">
              <dt :class="$style.statLabel">{{ stat.label }}</dt>
              <dd :class="$style.statValue">{{ stat.value }}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section :class="$style.section">
        <h2 :class="$style.sectionTitle">从哪里开始</h2>
        <div :class="$style.cards">
          <a
            v-for="entry in ENTRIES"
            :key="entry.to"
            :href="entry.to"
            :class="$style.card"
          >
            <span :class="$style.cardIcon" aria-hidden="true">{{ entry.icon }}</span>
            <h3 :class="$style.cardTitle">{{ entry.title }}</h3>
            <p :class="$style.cardDesc">{{ entry.desc }}</p>
            <span :class="$style.cardCta">{{ entry.cta }} →</span>
          </a>
        </div>
      </section>

      <section :class="$style.section">
        <h2 :class="$style.sectionTitle">这里有什么不一样</h2>
        <div :class="$style.features">
          <a
            v-for="feature in FEATURES"
            :key="feature.title"
            :href="feature.to"
            :class="$style.feature"
          >
            <span :class="$style.featureIcon" aria-hidden="true">
              {{ feature.icon }}
            </span>
            <div>
              <h3 :class="$style.featureTitle">{{ feature.title }}</h3>
              <p :class="$style.featureDesc">{{ feature.desc }}</p>
            </div>
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * 站点首页（**服务端渲染**，不是 React 孤岛）。
 *
 * 原来这里是 `HomeMount.vue` + `src/pages/index.tsx`：内容由 React 在
 * `onMounted` 之后动态挂载，SSR 产物里的 `.home-mount` 是空的。
 * 而主题 hero 又被 CSS 藏掉，所以首次访问（尤其是 app bundle 还没下完时）
 * 页面上只剩导航栏，看起来像「首页内容没有加载」。
 *
 * 现在整页由 Vue 直接渲染进 HTML：首屏就有标题、入口卡片与数字条，
 * 不依赖任何 JS chunk。数据只来自构建期注入的 `__SITE_DATA__` 清单，
 * 所以数字仍然是真算的，不是写死的。
 *
 * 样式是从旧的 `src/pages/index.module.css` 原样搬过来的 CSS Module；
 * 变量 `--ifm-*` 由 `.vuepress/styles/infima-compat.scss` 映射到主题变量。
 */
import { computed } from 'vue'
import { useSiteData } from 'vuepress/client'
import { usePluginData } from '../../src/vuepress/compat/useGlobalData'

interface DocPermalinkData {
  map: Record<string, string>
}

interface VisTracesData {
  entries: unknown[]
}

interface SelfTestData {
  docIds: string[]
}

interface Entry {
  to: string
  icon: string
  title: string
  desc: string
  cta: string
}

interface Feature {
  to: string
  icon: string
  title: string
  desc: string
}

const site = useSiteData()
const title = computed(() => site.value.title)
const tagline = '技术文档与算法训练场'

const ENTRIES: Entry[] = [
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

const FEATURES: Feature[] = [
  {
    to: '/code-training/category/题库',
    icon: '▶',
    title: '浏览器里跑样例',
    desc: '题解里点一下就能运行代码、比对样例输出，不用装 Python 环境，也不用复制粘贴。',
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

const docData = usePluginData<DocPermalinkData>('doc-permalinks')
const visData = usePluginData<VisTracesData>('vis-traces')
const selfTestData = usePluginData<SelfTestData>('self-test')

const problemCount = Object.keys(docData?.map ?? {}).filter((key) =>
  key.startsWith('problems/'),
).length
const visCount = visData?.entries?.length ?? 0
const selfTestCount = selfTestData?.docIds?.length ?? 0

const stats = [
  { value: problemCount, label: '篇题解' },
  { value: visCount, label: '份算法动画' },
  { value: selfTestCount, label: '篇带自测题' },
].filter((stat) => stat.value > 0)
</script>

<style module>
.hero {
  min-height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 24px 48px;
}

.heroContainer {
  max-width: 760px;
  text-align: center;
}

.title {
  font-size: 2.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--ifm-font-color-base);
}

.subtitle {
  font-size: 1.125rem;
  color: var(--ifm-color-content-secondary);
  margin-bottom: 1rem;
}

.lead {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ifm-color-content-secondary);
  margin: 0 auto 2rem;
  max-width: 620px;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.heroButton {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 6px;
  background: var(--ifm-color-primary);
  color: white;
  text-decoration: none;
}

.heroButton:hover {
  background: var(--ifm-color-primary-dark);
  color: white;
  text-decoration: none;
}

.heroButtonSecondary {
  padding: 10px 24px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--ifm-color-emphasis-300);
  color: var(--ifm-font-color-base);
  text-decoration: none;
}

.heroButtonSecondary:hover {
  border-color: var(--ifm-color-primary);
  color: var(--ifm-color-primary);
  text-decoration: none;
}

/* ===== 数字条 ===== */
.stats {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3rem;
  margin: 3rem 0 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.statLabel {
  order: 2;
  font-size: 0.85rem;
  color: var(--ifm-color-content-secondary);
  margin-top: 0.25rem;
}

.statValue {
  order: 1;
  margin: 0;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--ifm-color-primary);
}

/* ===== 通用分节 ===== */
.section {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.sectionTitle {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

/* ===== 入口卡片 ===== */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  border-color: var(--ifm-color-primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgb(0 0 0 / 8%);
  color: inherit;
  text-decoration: none;
}

.cardIcon {
  font-size: 1.75rem;
  line-height: 1;
}

.cardTitle {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0;
  color: var(--ifm-font-color-base);
}

.cardDesc {
  flex: 1;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ifm-color-content-secondary);
}

.cardCta {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ifm-color-primary);
}

/* ===== 差异化能力 ===== */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.feature {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem 1.5rem;
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.feature:hover {
  border-color: var(--ifm-color-primary);
  color: inherit;
  text-decoration: none;
}

.featureIcon {
  font-size: 1.5rem;
  line-height: 1.2;
  flex-shrink: 0;
}

.featureTitle {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
  color: var(--ifm-font-color-base);
}

.featureDesc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ifm-color-content-secondary);
}

@media (max-width: 600px) {
  .title {
    font-size: 2rem;
  }

  .hero {
    padding: 64px 20px 32px;
  }

  .stats {
    gap: 2rem;
  }

  .statValue {
    font-size: 1.75rem;
  }
}
</style>
