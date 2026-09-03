# Code Training - 算法训练仓库

长期算法训练知识库，面向系统化学习和持续积累。

## 项目简介

这是一个**以知识体系为核心**的算法训练仓库，采用**数据库思维**而非平台思维进行组织。

### 核心特点

- **原子化存储**：每道题目独立存档，便于检索和维护
- **知识聚合**：按知识点和算法模式组织，而非按平台分类
- **双向链接**：题目 ↔ 知识点 ↔ 模式，形成知识网络
- **YAML 元数据**：结构化信息，支持筛选和统计
- **持续积累**：错题本、周总结，强化复习体系
- **评论互动**：集成 Giscus 评论，支持每道题目下讨论交流

### 设计理念

> **数据库思维，不是平台思维**

| 层级   | 目录                | 说明                          |
| ------ | ------------------- | ----------------------------- |
| 原子层 | `docs/problems/`  | 每道题目独立存档              |
| 聚合层 | `docs/topics/`    | 按数据结构/算法分类的知识体系 |
| 抽象层 | `docs/patterns/`  | 通用解题模式和思维框架        |
| 工具层 | `docs/templates/` | 常用算法的标准实现            |
| 反馈层 | `docs/review/`    | 错题本和周总结                |
| 代码层 | `leetcode/`       | LeetCode 刷题代码文件         |

## 目录结构

```
code-training/
├── docs/                          # 文档内容（Docusaurus 源文件）
│   ├── problems/                  # 题解文档
│   │   └── leetcode/              # LeetCode 题解（120+ 道）
│   ├── topics/                    # 知识点（14 个）
│   ├── patterns/                  # 算法模式（7 个）
│   ├── templates/                 # 代码模板（4 个）
│   ├── review/                    # 复习系统
│   └── resources.md               # 学习资源汇总
│
├── leetcode/                      # LeetCode 刷题代码（128+ 文件）
│   └── 1.two-sum.py
│
├── src/                           # Docusaurus 主题覆盖和组件
│   ├── components/                # React 组件（GiscusComments 等）
│   ├── theme/                     # 主题覆盖（DocItem Layout 等）
│   ├── types/                     # TypeScript 类型声明
│   └── css/                       # 样式文件
│
├── static/                        # 静态资源
├── .github/workflows/             # CI 工作流
├── docusaurus.config.ts           # Docusaurus 配置
├── sidebars.ts                    # 侧边栏配置
├── CLAUDE.md                      # 算法文档撰写规范
├── DEPLOYMENT.md                  # 部署说明
└── README.md                      # 本文件
```

## 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm start
# 访问 http://localhost:3001

# 构建生产版本
pnpm build

# 预览构建结果
pnpm serve
```

### 添加新题目

1. 在 `docs/problems/leetcode/` 下创建题解文档，文件名格式：`题号_题目名.md`

```yaml
---
title: 题目名称
platform: LeetCode
difficulty: 简单/中等/困难
id: 题号
url: 题目链接
tags: [标签1, 标签2]
topics:
  - ../../topics/知识点.md
patterns:
  - ../../patterns/模式.md
date_added: YYYY-MM-DD
date_reviewed: []
---

# 题号. 题目名称

## 题目描述
...

## 解题思路
...

## 完整代码实现
...

## 复杂度分析
...
```

2. 在 `leetcode/` 下添加对应的代码文件
3. 推送后由主站统一构建部署

### 文档撰写规范

所有题解文档须遵循 [CLAUDE.md](CLAUDE.md) 规范：

- 按暴力 → 优化 → 最优的顺序讲解
- 绝不留下内部思考痕迹
- 面向初学者，每个推导步骤都要解释清楚
- 必须给出具体数字的完整推演过程
- 复杂度用表格对比

### 使用 `/leetcode-processor` 自动生成题解

项目中已配置 `leetcode-processor` Skill，可对 LeetCode Python 代码文件自动添加注释、测试用例，并生成符合规范的 Markdown 题解文档。

**适用场景**：

- 刚做完一道题，需要快速生成标准化题解文档
- 已有代码需要补充注释和测试用例
- 整理旧代码时统一格式

**使用方法**：

```bash
# 在 Claude Code 中执行
/leetcode-processor leetcode/1.two-sum.py
```

Skill 会自动：

1. 读取 Python 代码，分析题目结构和实现
2. 为 Solution 类添加详细注释（算法思路、复杂度分析）
3. 添加 `if __name__ == "__main__":` 测试用例（包含基础用例和边界条件）
4. 在 `docs/problems/leetcode/` 下生成符合模板的 Markdown 题解文档

**关键约束**（Skill 会自动检查）：

- 保留原有代码和注释，不删除用户手写内容
- `TreeNode`/`ListNode` 等辅助类必须放在 `@lcpr-template-start` 和 `@lcpr-template-end` 之间，不可放入 `@lc code=start` 提交区域
- 测试代码必须位于文件末尾，在所有 LeetCode 注释标记之后

## 使用原则

### 推荐做法

- 一题多解，记录不同解法
- 建立知识点之间的关联（通过 YAML 中的 `topics` 和 `patterns`）
- 定期复习错题和总结
- 使用相对路径链接形成知识网络

### 禁止做法

- 按平台分类做主结构
- 将题目文件放入知识点目录
- 扁平化堆叠所有题目
- 复制粘贴代码不加理解
