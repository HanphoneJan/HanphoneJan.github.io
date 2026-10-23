import { navbar } from 'vuepress-theme-hope'

export default navbar([
  { text: '首页', link: '/' },
  { text: '文档', link: '/docs' },
  {
    text: '代码训练',
    children: [
      { text: '题库', link: '/code-training/category/题库' },
      { text: '机器学习', link: '/code-training/category/机器学习' },
      { text: '数据结构', link: '/code-training/category/数据结构' },
      { text: '算法模式', link: '/code-training/category/算法模式' },
      { text: '复习系统', link: '/code-training/category/复习系统' },
    ],
  },
  {
    text: '归档',
    children: [
      { text: '全部文章', link: '/article/' },
      { text: '分类', link: '/category/' },
      { text: '标签', link: '/tag/' },
      { text: '时间轴', link: '/timeline/' },
    ],
  },
  { text: 'Stars', link: '/stars' },
  { text: '项目', link: '/projects' },
])
