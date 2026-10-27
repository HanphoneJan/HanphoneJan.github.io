# HanphoneJan.github.io

Hanphone 的 Github 个人主页 - 基于 **VuePress 2 + vuepress-theme-hope** 构建的技术文档站（主题参照 JavaGuide）。

> 2026-10 从 Docusaurus 迁到 VuePress，迁移细节与已知缺失见 [`.vuepress/README.md`](.vuepress/README.md)。

## 📝 文档维护

`docs/` 直接在本仓库维护，不再从私人笔记库同步。

---

## 🧠 Code Training

`code-training/` 是算法训练子站点，提供详细的算法题解与知识体系。

- **原子化存储**：每道题目独立存档
- **知识聚合**：按知识点和算法模式组织
- **双向链接**：题目 ↔ 知识点 ↔ 模式
- **评论互动**：集成 Giscus 评论

---

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 本地开发

```bash
pnpm start  # 启动 VuePress 开发服务器（端口 3001）
```

### 构建与部署

项目配置了 GitHub Actions。推送到 `main` 分支后会自动构建并部署到 GitHub Pages。

```bash
pnpm build
git add .
git commit -m "docs: update"
git push origin main
```

- **主站**：[https://docs.hanphone.cn](https://docs.hanphone.cn)
- **算法训练站**：[https://docs.hanphone.cn/code-training/](https://docs.hanphone.cn/code-training/)
- **博客**：[https://hanphone.cn](https://hanphone.cn)（独立站点，不在本仓库）

---

## 📁 项目结构

```
├── docs/                   # 主文档
├── code-training/          # 算法训练子项目（独立维护）
├── scripts/                # 构建与辅助脚本
├── static/                 # 静态资源（图片、题库、轨迹、Pyodide）
├── src/                    # React 交互件与孤岛挂载层
├── .vuepress/              # VuePress 配置、主题、插件、组件注入
├── index.md                # 首页
└── package.json
```
