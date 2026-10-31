---
title: MongoDB 速查
description: Docker 起一个 MongoDB、常用 mongosh 命令、文档模型与关系库的差异，以及什么时候不该用它。
---

## 起一个（Docker）

```bash
docker run -d \
  --name mongodb \
  --restart always \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=你的密码 \
  mongo:latest
```

命名卷 `mongodb_data` 必须挂：不挂的话容器一删数据就没了。

## 连接

```bash
docker exec -it mongodb mongosh -u root -p 你的密码 --authenticationDatabase admin
```

## 常用命令

```js
show dbs                                   // 列出数据库
use blog                                   // 切换（不存在时会在首次写入后创建）
db.posts.insertOne({ title: "t", tags: ["a"] })
db.posts.find({ tags: "a" }).limit(10)     // 数组字段按「包含」匹配
db.posts.find({ views: { $gt: 100 } })
db.posts.updateOne({ _id: id }, { $set: { title: "新标题" } })
db.posts.createIndex({ tags: 1 })          // 1 升序，-1 降序
db.posts.explain("executionStats").find({ tags: "a" })   // 看有没有走索引
```

## 和关系型数据库的差异

| 维度 | MongoDB | 关系型 |
|---|---|---|
| 数据单位 | 文档（BSON），字段可以不一致 | 行，列固定 |
| 关联 | 内嵌优先，`$lookup` 能用但慢 | JOIN 是常规操作 |
| 事务 | 4.0+ 支持多文档事务，但代价高 | 原生 |
| 扩展 | 分片是内建能力 | 通常靠中间件 |
| 约束 | 没有外键，唯一性靠唯一索引 | 外键 + 约束 |

**建模的第一原则是「按查询建」**：先想清楚页面怎么查，再决定内嵌还是引用。内嵌读得快但更新麻烦，引用灵活但要多一次查询。

## 什么时候别用它

- 需要大量多表关联、强事务（订单、账务）—— 用 PostgreSQL
- 数据结构非常稳定、查询模式固定 —— 关系库的约束能帮你早点发现错误
- 只是「想试试 NoSQL」—— 那多半不需要

它真正合适的是：**结构不固定、读写以单文档为中心、需要水平扩展**的场景，比如日志、内容管理、IoT 事件。
