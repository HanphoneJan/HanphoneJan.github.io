---
name: github-stars-tagger
description: 为 GitHub Stars 仓库自动生成标签分类
version: 1.0.0
---

# GitHub Stars Tagger

为用户的 GitHub Stars 仓库自动生成中文标签分类，更新 `data/star-tags.json` 文件。

## 使用方式

```
/github-stars-tagger [options]
```

### 参数

- `--dry-run` - 预览标签建议但不保存
- `--force` - 重新分析所有仓库（包括已有标签的）

## 执行步骤

1. 读取 `data/github-stars.json` 和 `data/star-tags.json`
2. 找出未打标签的仓库（或所有仓库如果使用了 --force）
3. 对每个仓库：
   - 获取 README 内容（前 2000 字符）
   - 分析仓库名称、描述、topics、语言
   - 使用大模型生成 2-4 个中文标签
4. 更新 `data/star-tags.json`
5. 提交更改

## 标签分类体系

预定义的分类参考：
- **前端框架** - React, Vue, Angular 等相关
- **后端框架** - Django, Spring, Express 等
- **AI/ML** - 机器学习、深度学习、大模型相关
- **工具库** - 通用工具、SDK、CLI
- **开发工具** - IDE、调试器、代码检查工具
- **数据库** - SQL/NoSQL 数据库、缓存
- **DevOps** - Docker, K8s, CI/CD, 监控
- **学习资源** - 教程、awesome 列表、课程
- **文档/笔记** - 文档工具、知识库
- **算法/数据结构** - 算法实现、LeetCode 相关

## 操作流程

当用户调用此 skill 时：

1. **分析仓库数据**
   - 读取 stars 数据文件
   - 对比已有标签，找出需要分析的仓库

2. **批量分析（逐个处理）**
   对于每个未标签的仓库：
   - 构造提示词，包含仓库信息和 README 摘要
   - 调用大模型生成标签建议
   - 展示建议标签给用户确认

3. **更新配置**
   - 将确认后的标签写入 `data/star-tags.json`
   - 更新 `lastUpdated` 时间戳

4. **提交更改**
   - git add data/star-tags.json
   - git commit -m "chore: update star tags [date]"
   - git push

## 标签生成提示词模板

```
请为以下 GitHub 仓库生成 2-4 个中文标签，用于分类管理。

仓库信息：
- 名称：{name}
- 描述：{description}
- Topics：{topics}
- 语言：{language}

README 摘要：
{readme}

要求：
1. 标签简洁明了，2-4 个字为佳
2. 参考分类体系：前端框架、后端框架、AI/ML、工具库、开发工具、数据库、DevOps、学习资源
3. 可以创造新标签，但要有通用性
4. 按重要程度排序
5. 只返回标签列表，用顿号分隔

示例输出：前端框架、React生态、组件库
```

## 输出示例

```
🔍 GitHub Stars Tagger

📦 需要分析 15 个仓库（共 150 个）

[1/15] 分析: facebook/react
读取 README...
生成标签建议...

建议标签：前端框架、React生态、UI组件
确认? [Y/n/修改]: Y
✅ 已添加标签

[2/15] 分析: microsoft/vscode
...

✅ 已保存 15 个仓库的标签到 data/star-tags.json
```
