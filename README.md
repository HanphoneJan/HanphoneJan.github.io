# HanphoneJan.github.io

Hanphone 的 Github 个人主页 - 基于 Docusaurus 构建的技术文档站。

## 📝 笔记管理系统 

项目现在支持从私人笔记库 `hanphone-note` 自动同步内容。可以完全在私人笔记中写作，通过标记控制发布。

### 核心同步指令

```bash
pnpm sync     # 同步通用笔记与博客
pnpm sync:ml  # 同步机器学习笔记 (ipynb -> md)
```

### 如何发布笔记？

1. **在私人笔记中标记**：在你的 `.md` 文件 Front Matter 中添加 `publish: true`。
   - 默认同步到 `docs/`。
   - 若添加 `type: blog`，则同步到 `blog/`。
2. **运行同步**：在本项目根目录执行 `pnpm sync`。
3. **自动处理**：
   - **一致性维护**：脚本会保持两端内容一致，私人笔记是唯一事实来源。
   - **自动撤回**：若删除 `publish: true` 标记并再次运行同步，项目中的对应文件会被自动删除。
   - **图片样式清理**：同步时会自动移除 HTML `<img>` 标签中的 `style` 属性，确保响应式兼容性。
   - **隐私保护**：同步后，项目中的文件会自动移除 `publish` 等内部标记字段。

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
pnpm sync   # 先同步最新笔记
pnpm start  # 启动 Docusaurus 预览
```

### 构建与部署

项目配置了 GitHub Actions。推送到 `main` 分支后会自动构建并部署到 GitHub Pages。

```bash
pnpm sync
git add .
git commit -m "feat: sync notes and update"
git push origin main
```

- **主站**：[https://www.hanphone.top](https://www.hanphone.top)
- **算法训练站**：[https://www.hanphone.top/code-training/](https://www.hanphone.top/code-training/)

---

## 📁 项目结构

```
├── blog/                   # 同步生成的博客文章
├── docs/                   # 同步生成的结构化文档
├── code-training/          # 算法训练子项目（独立维护）
├── scripts/                # 自动化脚本（包含同步逻辑）
├── static/                 # 静态资源（图片等）
├── src/                    # 源代码与自定义组件
├── docusaurus.config.ts    # 主配置文件
└── package.json
```
