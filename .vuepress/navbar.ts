import { navbar } from 'vuepress-theme-hope'

export default navbar([
  { text: '首页', link: '/' },
  { text: '文档', link: '/docs' },
  {
    text: '代码训练',
    children: [
      { text: '题目库', link: '/code-training/category/题库' },
      { text: '机器学习', link: '/code-training/category/机器学习' },
      { text: '数据结构', link: '/code-training/category/数据结构' },
      { text: '算法模式', link: '/code-training/category/算法模式' },
      { text: '复习系统', link: '/code-training/category/复习系统' },
    ],
  },
  { text: 'Stars', link: '/stars' },
  { text: '项目', link: '/projects' },
  { text: 'GitHub', link: 'https://github.com/hanphonejan' },
  { text: '个人主页', link: 'https://hanphone.cn' },
])
