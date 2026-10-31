---
title: 怎么用 AI 干活
description: 把 AI 当结对程序员而不是答案机：复述问题、提假设、给验证步骤，最后才要代码。
---

几条反复验证过的习惯：让它先复述你的问题、再提假设、再给验证方法，最后才写代码；用苏格拉底式提问确定边界；把结论写进文档，别指望对话历史。


把 AI 当「结对程序员」，不是答案机器
让它先 复述你的问题
让它 提出假设
让它 给验证步骤
最后才要代码


及时更新文档，并用文档保存记忆。

### 开发流程
提出需求，然后使用苏格拉底提问，确定边界，编写文档。“有问题问我”
产品分析，使用第一性原理。分析可行性。此时不需要技术选型。
编写静态页面展示，验证是否符合需求。

## 提示词

苏格拉底提问法与第一性原理

## Claude  Code

及时删除Claude Code产生的NUL文件

### 安装Tips
挂梯子要打开虚拟网卡，TUN模式

全局搜索`claude.json`文件，

一般的目录上`user/.claude.json`（⚠️注意文件名前面是`.`）

编辑这个配置文件`vi ./.claude.json`

添加这个配置

```json
"hasCompletedOnboarding": true,  // 这是你新增的行，末尾要加逗号
```

```json
{

  "autoUpdatesChannel": "latest",

  "model": "opus",

  "language": "zh_cn"

}
```

## AI工具

PPT  [Gammas - Gamma](https://gamma.app/)
