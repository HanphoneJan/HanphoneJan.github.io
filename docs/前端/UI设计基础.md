---
title: UI 设计基础
sidebar_position: 9
description: 设计工具与交付、素材站与书单，以及网页字体栈、字体子集化与 Web 字体的加载策略。
---

## 设计工具

| 工具 | 平台 | 适合 |
|---|---|---|
| **Figma** | Web / 桌面 | 团队协作与组件库，插件生态最全；国内访问需要代理 |
| **即时设计** | Web | 国产，交互与 Figma 接近，个人免费，中文素材社区 |
| **Pixso** | Web | 国产一体化（设计 + 原型 + 交付），适合国内团队 |
| **Axure RP** | Windows / macOS | 高保真原型与交互逻辑，B 端需求文档常用 |
| **墨刀** | Web / 桌面 | 移动端原型，上手快，适合快速演示 |
| **Sketch** | macOS | 老牌 UI 设计工具，插件多，仅 macOS |
| **Adobe XD** | Windows / macOS | 已停止新功能开发，新项目不建议再选 |
| **Photoshop** | Windows / macOS | 位图处理、修图、切图，不做界面设计 |
| **Zeplin** | Web | 设计稿标注与交付，生成间距、颜色、切图 |

选型看协作方式：团队都在国内、要中文素材，即时设计或 Pixso；要和海外团队协作、用现成插件，Figma；只做原型演示，Axure 或墨刀。

### 原型与 HTML 互转

- Figma 里可以装 [html.to.design](https://www.figma.com/community/plugin/1159123024924461424) 把网页导成可编辑图层。
- Axure 侧有 [HTML 导入的流程](https://blog.csdn.net/2401_84204207/article/details/148928468)，适合拿现成页面改原型。

## 素材与灵感

- [WebStack](https://webstack.cc/cn/index.html)：国内外设计、开发、素材站导航
- [GitHub website-template](https://github.com/topics/website-template)：整站模板
- [站酷 ZCOOL](https://www.zcool.com.cn/)：国内设计师社区，看商业案例与配色
- [花瓣](https://huaban.com/)：灵感采集与画板

## 书单

- 《写给大家看的设计书》—— 对比、重复、对齐、亲密性四原则，入门第一本
- 《配色设计从入门到精通》—— 配色方案与色卡
- 《平面设计完全手册》—— 版式、字体、印刷的系统参考

## 字体与排版

### 字体栈

优先用系统字体：零网络请求、没有字体闪烁（FOUT），中文交给各平台的系统字体渲染。

```css
/* 系统字体栈 */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, "Noto Sans", sans-serif,
             "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
             "Noto Color Emoji";

/* 中文字体栈 */
font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
             "微软雅黑", Arial, sans-serif;

/* 衬线 */
font-family: Georgia, "Times New Roman", serif;

/* 等宽 */
font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
```

中文正文不要用楷体：小字号下笔画细、屏显发虚，而且完整楷体字库有几 MB。真要用，先用 [Fontmin](https://github.com/ecomfe/fontmin) 做子集化，只打包用到的字。

### Web 字体

```css
/* Google Fonts（国内访问不稳定，生产环境建议自托管） */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* 自托管字体 */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2'),
       url('font.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap; /* 先用回退字体渲染，字体到了再换 */
}
```

- `font-display: swap`：避免文字空白（FOIT），代价是加载完成时会闪一下。
- 中文字体动辄几 MB，必须子集化或按 `unicode-range` 分片，不要整包加载。
- 数字与字母想单独用一套字形时，可以用 `@font-face` + `unicode-range` 只覆盖 `U+0030-0039`。

## 相关

- 组件库的样式覆盖与主题：见 [Vue 基础](./Vue基础.md) 的 Element Plus、[React 基础](./React基础.md) 的 antd。
- 页面里的 2D / 3D 绘制：见 [浏览器 API 与图形](./浏览器API与图形.md)。
