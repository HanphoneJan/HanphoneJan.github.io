# 设计系统文档

## 设计理念

**极简工程美学** - Brutalism + Swiss Design 融合

- 功能性优先，信息层级清晰
- 大量留白，内容密度适中
- 微妙的交互反馈
- 基于 8px 栅格系统

## 配色方案

### 主色调（科技蓝系）

#### Light Mode
```css
--primary-blue: #0066FF        /* 主色 */
--primary-blue-dark: #0052CC   /* 深蓝 - hover */
--primary-blue-light: #3385FF  /* 浅蓝 - 次要元素 */
--accent-cyan: #00D4FF         /* 强调色 - 链接 */
```

#### Dark Mode
```css
--primary-blue: #4D9FFF        /* 主色 - 降低饱和度 */
--primary-blue-dark: #3385FF   /* 深蓝 */
--primary-blue-light: #66B3FF  /* 浅蓝 */
--accent-cyan: #00E5FF         /* 强调色 */
```

### 中性色系统

#### Light Mode
```css
--gray-50: #FAFBFC    /* 背景 */
--gray-100: #F5F7FA   /* 次级背景 */
--gray-200: #E4E7EB   /* 边框 */
--gray-300: #CBD2D9   /* 分割线 */
--gray-600: #616E7C   /* 次要文本 */
--gray-900: #1A202C   /* 主文本 */
```

#### Dark Mode
```css
--gray-50: #0D1117    /* 主背景 - 真实深色 */
--gray-100: #161B22   /* 次级背景 */
--gray-200: #21262D   /* 卡片背景 */
--gray-300: #30363D   /* 边框 */
--gray-600: #8B949E   /* 次要文本 */
--gray-900: #E6EDF3   /* 主文本 */
```

### 语义色
```css
--code-keyword: #FF6B9D   /* 关键字 - 粉红 */
--code-string: #00D084    /* 字符串 - 绿 */
--code-function: #FFB454  /* 函数 - 橙 */
--code-comment: #6B7280   /* 注释 - 灰 */
```

## 字体系统

### 字体栈
```css
/* 标题和正文 */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Microsoft YaHei', 'PingFang SC', sans-serif;

/* 代码 */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 
             'SF Mono', 'Consolas', monospace;
```

### 字阶系统（1.25 比例）
```css
--text-xs: 0.75rem      /* 12px - 标签 */
--text-sm: 0.875rem     /* 14px - 辅助文本 */
--text-base: 1rem       /* 16px - 正文 */
--text-lg: 1.125rem     /* 18px - 小标题 */
--text-xl: 1.25rem      /* 20px - 卡片标题 */
--text-2xl: 1.5rem      /* 24px - 页面标题 */
--text-3xl: 1.875rem    /* 30px - 大标题 */
--text-4xl: 2.25rem     /* 36px - Hero 标题 */
--text-5xl: 3rem        /* 48px - 超大标题 */
```

### 行高
```css
--leading-tight: 1.25    /* 标题 */
--leading-normal: 1.6    /* 正文 */
--leading-relaxed: 1.75  /* 长文本 */
```

## 间距系统

基于 8px 基准：
```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
--space-24: 6rem     /* 96px */
```

## 布局系统

### 三栏结构
```
┌─────────────────────────────────────────────────────┐
│  Navbar (60px)                                       │
├──────┬──────────────────────────────────┬───────────┤
│ Left │         Main Content             │   Right   │
│ Side │         (max-width: 800px)       │    TOC    │
│ bar  │                                  │  (240px)  │
│(280px│                                  │           │
└──────┴──────────────────────────────────┴───────────┘
```

### 响应式断点
```css
/* 桌面端 */
@media (min-width: 1440px) { max-width: 1400px; }

/* 笔记本 */
@media (min-width: 1024px) and (max-width: 1440px) { max-width: 1200px; }

/* 平板 */
@media (min-width: 768px) and (max-width: 1024px) { /* 隐藏右侧 TOC */ }

/* 移动端 */
@media (max-width: 768px) { /* 单栏布局 */ }
```

## 组件规范

### 导航栏
- 高度：60px
- 背景：半透明毛玻璃效果
- 边框：1px 底部边框
- 链接：圆角 6px，hover 背景色变化

### 按钮
- 主按钮：蓝色背景，白色文字
- 次要按钮：透明背景，蓝色边框
- 圆角：8px
- Hover：上移 2px + 阴影

### 代码块
- 背景：灰色背景
- 边框：1px 边框
- 圆角：12px
- 内边距：24px
- 字体：JetBrains Mono 14px
- 行高：1.6

### 卡片
- 背景：表面颜色
- 边框：1px 边框
- 圆角：8px
- Hover：上移 2px + 蓝色阴影

## 深色模式原则

1. **真实深色**：使用 #0D1117 而非纯黑
2. **降低饱和度**：主色饱和度降低 15-20%
3. **提升对比度**：文字对比度 ≥ 7:1
4. **表面高程**：使用不同灰度表示层级
5. **阴影处理**：边框 + 微阴影
6. **图片处理**：降低亮度 10%
7. **平滑过渡**：0.3s 过渡动画

## 动画规范

### 过渡时间
```css
--ifm-transition-fast: 150ms   /* 快速交互 */
--ifm-transition-slow: 200ms   /* 常规交互 */
```

### 缓动函数
```css
transition-timing-function: ease;  /* 默认 */
```

### 常用动画
- Hover：translateY(-2px)
- 主题切换：0.3s 颜色过渡
- 页面切换：无动画（性能优先）

## 可访问性

- 对比度：WCAG AA 标准（4.5:1）
- 焦点状态：明显的焦点环
- 键盘导航：完整支持
- 屏幕阅读器：语义化 HTML

## 性能优化

- 字体：使用 font-display: swap
- 图片：懒加载
- 代码分割：按路由分割
- CSS：关键 CSS 内联

## 浏览器支持

- Chrome/Edge：最新 2 个版本
- Firefox：最新 2 个版本
- Safari：最新 2 个版本
- 移动端：iOS 13+, Android 8+

## 设计资源

- 字体：[Inter](https://rsms.me/inter/), [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- 图标：SVG 内联
- 配色工具：[Coolors](https://coolors.co/)
- 对比度检查：[WebAIM](https://webaim.org/resources/contrastchecker/)
