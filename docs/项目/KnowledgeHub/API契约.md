---
title: API 契约
sidebar_position: 8
description: Knowledge Hub 的 HTTP 契约：82 个端点、错误码、分页、SSE 问答、检索调试与 MCP/A2A 协议细节
---

# API 契约

本文是前端和后端并行开发时共同依据的接口约定。契约变更必须同步修改本文，`eval/contract_check.py` 会读取全部 `DESIGN-API*.md` 的端点声明，核对路径、方法和 query 参数面。

修改端点前先改这里。契约与代码不一致时，以代码为准，并立刻把契约改过来；改契约和改代码必须在同一轮完成。

## 0. 通用约定

### 0.1 基址与鉴权

```
基址：http://127.0.0.1:8010/api/v1          # 由 deploy/dev.sh 提供，可用 PKH_API_PORT 覆盖
鉴权：Authorization: Bearer <api_key>       # 每个用户一把
```

端口以代码为准，只有 `deploy/dev.sh` 里的 `PORT="${PKH_API_PORT:-8010}"` 一个来源，前端开发代理也指向 8010（见 `web/vite.config.ts`）。除 `/health` 和 `/auth/*` 外，所有端点都要求 Bearer Token。

### 0.2 错误响应

```json
{"error": {"code": "KB_NOT_FOUND", "message": "知识库不存在或无访问权限",
           "detail": {"kb_id": 999}, "request_id": "req_01H..."}}
```

权限不足和“不存在”返回同一个 code，这是 fail-closed 策略：不能让攻击者通过错误码差异探测资源是否存在。

### 0.3 错误码表

| HTTP | code | 含义 |
|---|---|---|
| 400 | `INVALID_REQUEST` | 参数缺失或格式错误 |
| 401 | `INVALID_TOKEN` | 缺失或无效的 API Key |
| 403 | `KB_NOT_FOUND` | 同时覆盖“无权限”和“不存在”两种情况 |
| 404 | `DOC_NOT_FOUND` | 文档不存在或无权限 |
| 413 | `FILE_TOO_LARGE` | 超过 50MB |
| 415 | `UNSUPPORTED_FORMAT` | 不在白名单里的格式 |
| 422 | `VALIDATION_FAILED` | 语义校验失败，例如页数超限 |
| 429 | `RATE_LIMITED` | 超出配额 |
| 500 | `INTERNAL` | 服务端错误 |
| 503 | `MODEL_UNAVAILABLE` | 模型未就绪或加载失败 |

### 0.4 分页

```
GET /xxx?page=1&page_size=20      默认 page=1、page_size=20，上限 100
响应：{"items":[...], "total": 123, "page":1, "page_size":20}
```

以代码为准的现状是：分页包只有部分端点返回，其余返回裸数组。

| 返回 `{"items","total","page","page_size"}` | 返回裸数组 `[...]` |
|---|---|
| `GET /kb/{id}/sessions`、`POST /kb/{id}/search`、`POST /search`、`GET /jobs` | `GET /kb`、`GET /workspaces`、`GET /kb/{id}/documents`、`GET /kb/{id}/trash`、`GET /documents/{id}/chunks`、`GET /workspaces/{id}/members`、`GET /auth/keys` |

`SearchResp` 只有 `items`、`total`、`mode`、`page` 和可选的 `debug`，没有 `page_size`。裸数组端点照样接受 `page` 和 `page_size`，上限 100，只是丢掉了 `total`。

新端点一律使用分页包（`services/common/pagination.py` 的 `Page`）。把历史裸数组端点改成分页包属于破坏性变更，需要单独排期。

### 0.5 通用字段约定

| 概念 | 字段 | 类型 |
|---|---|---|
| 可见性 | `visibility` | `private` / `workspace` / `global` |
| 文档状态 | `status` | `pending` / `parsing` / `chunking` / `embedding` / `ready` / `failed` |
| 引用类型 | `kind` | `text` / `page` / `image` |
| 时间 | 所有时间字段 | ISO 8601，带时区 |

## 1. 认证端点

### 1.1 注册

```http
POST /api/v1/auth/register
Content-Type: application/json
{"email":"a@b.com","password":"...","display_name":"A","nickname":"可选"}
→ 201 {"user":{...},"api_key":"sk-...","key_prefix":"sk_1a2b3c"}
```

明文 `api_key` 只在这里返回一次，之后无法再取。

这个端点不需要 API Key，而部署通常对公网可达，空体请求会返回 422 而不是 401，所以它是“往库里塞垃圾账号”最省事的入口。因此有限流：

| 条件 | 响应 |
|---|---|
| 同一客户端 IP 在 3600 秒内第 21 次请求 | 429 `RATE_LIMITED`，并带 `Retry-After: <秒>` 头 |
| 对端是回环地址且没有任何转发头 | 走单独的宽松桶，每小时 500 次。本机 curl 和验收脚本都属于这一类 |

桶键取真实客户端 IP，来源是 `CF-Connecting-IP`，但仅当对端是回环或内网地址时才采信，逻辑见 `services/api/rate_limit.py`。限流先于业务判断，所以超限时不会泄露“该邮箱已注册”。

自助注册由 `.env` 里的 `ALLOW_REGISTER` 控制。设为 `false` 且来源不是本机时，返回 403 `REGISTRATION_CLOSED`；本机（回环或内网且没有转发头）照常可用。开关判断在限流之前，关闭就是关闭，一次桶都不记。关闭后要新建账号，走 `services/api/scripts/create_user.py` 这个本机 CLI，不保留任何 HTTP 后门。

### 1.2 登录

```http
POST /api/v1/auth/login
{"email":"a@b.com","password":"..."}       // email 字段可填邮箱或昵称
→ 200 {"api_key":"sk-...","key_prefix":"sk_1a2b3c"}
```

这是唯一不需要任何凭证就能到达的数据入口，所以对失败请求限流：

| 条件 | 响应 |
|---|---|
| 同一客户端 IP 在 300 秒内第 11 次失败 | 429 `RATE_LIMITED`，带 `Retry-After: <秒>` |
| 同一账号在 900 秒内第 21 次失败，换 IP 也算 | 同上 |
| 对端是本机（回环且无转发头） | 走单独宽松桶，300 秒 100 次 |

只统计失败，成功不计数，否则按总次数限流会把主人锁在自己的正常使用里。IP 桶和账号桶都要有，因为账号桶才是保护某个具体密码的那一个，换 IP 也无法绕过。

429 的文案不说明是哪个桶触发的，也不说明密码是否正确。用户不存在和密码错误都返回 `400 账号或密码不正确`。

### 1.3 密钥与个人资料

```http
GET    /api/v1/auth/keys          → 列表（不含明文，裸数组）
POST   /api/v1/auth/keys          {"name":"Cursor"} → 新建，返回明文一次
DELETE /api/v1/auth/keys/{id}     → 吊销
GET    /api/v1/auth/me            → 当前用户
PATCH  /api/v1/auth/me            → 修改自己的资料（显示名、昵称、邮箱、密码）
```

路径参数名是 `{key_id}`，对应 `api_keys.id`。吊销是删除数据行，没有 `revoked_at`。字段名是 `name`，不是 `label`。`PATCH /auth/me` 修改 `email` 或密码时必须带 `current_password`。

## 2. 工作区

```http
GET    /api/v1/workspaces
POST   /api/v1/workspaces          {"name":"...","description":"..."}
GET    /api/v1/workspaces/{id}
PATCH  /api/v1/workspaces/{id}
DELETE /api/v1/workspaces/{id}      → 软删除，沿用 30 天机制
POST   /api/v1/workspaces/{id}/restore   → 撤销软删除，仅 owner
GET    /api/v1/workspaces/trash     → 回收站列表（裸数组 WorkspaceOut，仅 owner）
POST   /api/v1/workspaces/{id}/members   {"email":"x@y.com","role":"member"}
GET    /api/v1/workspaces/{id}/members
DELETE /api/v1/workspaces/{id}/members/{user_id}

# 邀请码：不接邮件服务，所以邀请必须自服务化
POST   /api/v1/workspaces/{id}/invites   {"ttl_days":7,"max_uses":1}
GET    /api/v1/workspaces/{id}/invites
DELETE /api/v1/workspaces/{id}/invites/{invite_id}
POST   /api/v1/invites/redeem        {"code":"ABCD2345"}
```

### 2.1 邀请码

`POST /members` 只能添加已经注册的邮箱，没注册会返回 400。设计上明确不接邮件服务，邀请码把它变成自服务。

| 端点 | 谁能调用 | 说明 |
|---|---|---|
| `POST /workspaces/{id}/invites` | owner 或 admin | 生成，明文只返回这一次 |
| `GET /workspaces/{id}/invites` | owner 或 admin | 列表里只有前缀，没有明文 |
| `DELETE /workspaces/{id}/invites/{invite_id}` | owner 或 admin | 撤销，重复撤销仍然返回 204 |
| `POST /invites/redeem` | 已登录用户 | 兑换后成为该工作区的 member |

四条设计约束：数据库只保存 HMAC-SHA256 哈希和前 4 位，每个码使用随机盐，与 API Key 同一纪律；口令 8 位，去掉 `0O1IL`，规范化时接受空格、连字符和小写，但不会把 `0` 猜成 `O`；默认 7 天、1 次，`max_uses` 上限 50；兑换失败统一返回一句话，不存在、过期、用完和撤销都是同一句，区分开等于给攻击者一个探测信号。

兑换的校验顺序是先验证哈希，再看“是不是已经是成员”，最后验证状态，否则重复兑换会得到“邀请码无效”。已经是成员不算失败，返回 200 和 `already_member: true`。`POST` 的请求体没有 `role` 字段，只能给 member。`used <= max_uses` 由数据库 CHECK 约束 `ck_invite_used` 保证，撞上时返回 400，项目的错误词汇里没有 409。

数据可见范围由服务端推导，不能由请求指定：私有库仅创建者可见，工作区库对全部成员可见，全局库对所有用户可见。

## 3. 知识库

```http
GET    /api/v1/kb?workspace_id=1&visibility=private&page=1
POST   /api/v1/kb
{
  "workspace_id": 1, "name": "项目文档", "description": "", "visibility": "private",
  "source_kind": "file",            // file | chat | photo
  "rerank_model": null,             // null 表示不启用；否则是 cross-encoder 模型名
  "chunk_size": 500, "chunk_overlap": 50,
  "chunk_strategy": "recursive",    // fixed|recursive|semantic|parent_child|late|contextual
  "generate_image_desc": false
}
GET    /api/v1/kb/{id}               → 含统计 {doc_count, chunk_count, size_bytes, stale_strategy_docs}
PATCH  /api/v1/kb/{id}               → 可改字段见下表
DELETE /api/v1/kb/{id}              → 软删除，其下文档一并进回收站
POST   /api/v1/kb/{id}/restore      → 撤销软删除，连带恢复那次删掉的文档并重新摄取
GET    /api/v1/kb/trash             → 回收站列表（裸数组 KbOut，按删除时间倒序）

// GET /kb/{id} 的 stale_strategy_docs 表示还停留在旧切分策略的当前文档数：
// 文档摄取时记录在 documents.quality.strategy 里的策略，与该库当前的 chunk_strategy 不同。
// 修改策略只对之后的摄取生效，所以这个数字代表“重摄取欠账”，用于提示这 N 份可以点重解析。

// PII 检出报告，只读
GET    /api/v1/kb/{id}/pii
```

`PATCH /kb/{id}` 的字段清单如下。不在表里的字段会被 pydantic 静默忽略，所以“传了没生效”的第一个问题就是“它在不在这张表里”。

| 字段 | 类型 | 语义 |
|---|---|---|
| `name` / `description` | str | 基本信息 |
| `visibility` | `private` / `workspace` / `global` | 三档可见性 |
| `generate_image_desc` | bool | 默认关闭 |
| `pii_mask` | bool | 默认 false，只对之后的摄取生效 |
| `chunk_size` / `chunk_overlap` | int | 分块参数。不会自动重跑索引，需要调用 `POST /documents/{id}/reparse` |
| `chunk_strategy` | 见上文 | 切分策略，默认 `recursive`。与 `chunk_size` 一样，只对之后重新摄取的文档生效 |
| `rerank_model` | str 或 null | 按知识库配置的精排模型。`null` 和 `""` 都表示“不启用”，不是“使用全局默认” |

### 3.1 知识库与工作区的回收站

`DELETE /kb/{id}` 和 `DELETE /workspaces/{id}` 都是软删除，有 30 天窗口，`POST .../restore` 可以恢复。但如果没有地方能列出“我删过哪些”，用户只能凭记忆按 id 调用恢复端点。看不见的窗口等于没有窗口。

| 端点 | 谁能调用 | 说明 |
|---|---|---|
| `GET /kb/trash` | 已登录用户 | 软删的库里我能恢复的那些，判据是 `can_write_kb`，按删除时间倒序 |
| `GET /workspaces/trash` | 仅 owner | 我删过的工作区 |

这两个端点都不能用 `readable_kb_ids` 或 `workspace_ids` 过滤，因为软删的行按定义不在那两个集合里，过滤后恒为空。软删的行必须先按行读取，再判断权限。

`KbOut` 和 `WorkspaceOut` 各多了一个 `deleted_at` 字段，只在回收站列表里非空，前端靠它计算“还能恢复几天”。知识库位于已软删的工作区时，不会出现在 `GET /kb/trash` 里，必须先恢复工作区，这是刻意安排的顺序。

回收站的可见性判据用的是写侧（`writable_kb_clause`），不是读判据（`visible_kb_clause`）。用读判据会出现“列表里有、点恢复 403”的情况，`tests/test_container_trash.py` 会用真值表逐格比对。

### 3.2 PII 掩码与检出报告

掩码默认关闭，因为它只作用于索引侧，却会让“搜我自己的手机号或身份证号”失效，而那正是个人知识库的核心用途。所以开关按知识库设置。三条边界是：只掩索引侧，blob 原件和 `/preview` 页图保持原文；不回溯，只对之后摄取或重新解析的文档生效；报告不含原文片段，只给计数和文件名。

`GET /kb/{id}/pii` 回答两个不同的问题，给出两套数字：

| 字段 | 含义 | 来源 |
|---|---|---|
| `source_total` / `source_by_type` | 原文里检出多少处 | `documents.pii_hits`，摄取时在掩码前记录 |
| `indexed_total` / `indexed_by_type` | 索引文本现在还剩多少处 | 现场扫描 `chunks.content_norm` |
| `docs_not_scanned` | `pii_hits IS NULL` 的文档数，即还没摄取完 | 不等于“干净” |
| `docs_no_text` | 已摄取但没有文本层的文档（照片或纯扫描件，`chunk_count = 0`） | 它们的 0 不代表图片里没有敏感信息 |
| `docs` / `docs_truncated` | 逐份明细，按命中数降序，上限 200 | `source_total` 是全量 |
| `scan_chars` / `scan_truncated` | 现场扫描读了多少字符、是否达到上限（400 万字符，常量 `SCAN_CHAR_LIMIT`） | 原文写“4 MB”是错的，代码统计的是字符数 |

开启掩码后会出现 `source_total=7` 而 `indexed_total=0`。这两个数字如果混成一个，用户会以为掩码没有生效。

## 4. 文档

### 4.1 上传

```http
POST /api/v1/kb/{kb_id}/documents
Content-Type: multipart/form-data
files: <最多 20 个文件>            // 每个不超过 50MB
generate_image_desc: false         // 可选
→ 202 {"batch_id": "bat_01H...",
       "documents": [{"id":123,"file_name":"a.pdf","status":"pending"}, ...]}
```

约束校验的顺序如下，能降级就降级：

| 阶段 | 检查 | 失败处理 |
|---|---|---|
| 上传时 | 格式白名单、大小不超过 50MB | 415 或 413，同步返回 |
| 白名单内容 | `.pdf` `.md` `.markdown` `.txt` `.csv` `.json` `.html` `.htm` `.docx` `.xlsx` `.pptx`，以及图片 `.jpg` `.jpeg` `.png` `.webp` `.bmp` `.tiff` | 由 `PARSERS` 单一来源派生，所以增加一种格式就是增加一条记录 |
| 上传时 | 加密 PDF | 不拒绝，入队后转视觉路径 |
| 解析时 | 页数超过 2000 | 422，文档状态置为 `failed` |
| 解析时 | 扫描件超过 50 页 | 422，文档状态置为 `failed` |
| 解析时 | 文件完全损坏 | 400，文档状态置为 `failed` 并写 `status_msg` |

上传接口同步返回的只有格式白名单和大小两类错误（415 和 413）。解析期的三条都是异步发生的，`documents.status` 由终态判定写入，见 `services/worker/doc_state.py`。

### 4.2 列表与详情

```http
GET /api/v1/kb/{kb_id}/documents?status=ready&page=1&page_size=50
→ [{"id":123,"file_name":"a.pdf","size_bytes":1234567,
   "status":"ready","status_msg":null,"is_current":true,"version_id":3,"deleted_at":null,
   "chunk_count":87,"page_count":18,"is_scanned":false,
   "mime_type":"application/pdf","source_path":null,"uploaded_by":3,
   "created_at":"...","updated_at":"..."}]
```

有三处以代码为准：返回的是裸数组，不是分页包；主键字段是 `id`，不是 `doc_id`（`DocumentOut` 上有一个 `doc_id` property，但 pydantic 不序列化普通 property）；没有 `progress` 字段，进度在 `jobs` 表上，通过 `GET /api/v1/jobs?doc_id=...` 获取。

```http
GET /api/v1/documents/{doc_id}
→ {...DocumentOut..., "content_hash":"…", "preview_url":"/api/v1/documents/123/preview"}

GET /api/v1/documents/{doc_id}/chunks?page=1&page_size=100
→ [{"chunk_index":7,"content_norm":"...","char_start":1204,"char_end":1603,
   "locations":[{"page":1,"bbox":[0.15,0.19,0.31,0.21]}],
   "token_count":312,"kind":"text","table_index":null,"row_count":null,"col_count":null,
   "table_json":null},
  {"chunk_index":8,
   "content_norm":"表格描述：3 行 × 2 列；表头：姓名、年龄。\n\n| 姓名 | 年龄 |\n|---|---|\n| 张三 | 20 |",
   "locations":[{"page":1,"bbox":[0.1,0.4,0.2,0.45],"row":0,"col":0}, "..."],
   "kind":"table","table_index":0,"row_count":3,"col_count":2,
   "table_json":{"header":["姓名","年龄"],"rows":[["张三","20"]],
                 "row_count":2,"col_count":2}}]
```

chunk 的正文字段是 `content_norm`，没有 `text_norm`，也没有 `text_raw`。需要原文时使用 `SearchHit.text`。

表格 chunk（`kind:"table"`）的 `content_norm` 仍然是 Markdown，供人阅读，但开头多了一句表格描述（“表格描述：N 行 × M 列；表头：…”）。这句描述会进索引，让“XX 一览表”这类查询能命中。结构化网格另外存在 `table_json` 里，格式是 `{"header":[], "rows":[[]], "row_count", "col_count"}`，前端据此渲染真表格。`table_json` 为 `null` 表示它不是表格 chunk，或者索引建立在该字段引入之前，后者需要重新摄取，与“重摄取欠账”同族。

### 4.3 更新与删除

```http
POST   /api/v1/documents/{doc_id}/reparse        # 重跑解析，改了分块配置后使用
POST   /api/v1/documents/{doc_id}/retry          # 失败后重试，重新入队 KIND_INGEST
DELETE /api/v1/documents/{doc_id}                 # 进回收站，30 天
POST   /api/v1/documents/{doc_id}/restore         # 从回收站恢复
GET    /api/v1/kb/{kb_id}/trash                   # 回收站列表（裸数组 DocumentOut，带 deleted_at）
DELETE /api/v1/trash?kb_id=&dry_run=              # 清空，返回 PurgeResp，参数见下
```

`DELETE /trash` 是本项目唯一不可撤销的端点，删用户和删知识库都还有软删兜底。

```jsonc
// 没有 GET 版本，用 DELETE 加 dry_run 预览
// 不给 ?kb_id=88 时，清理“我能读且能写”的全部库，范围更大
// ?dry_run=true 时只报告，不动任何数据
{"docs": 2, "chunks": 75, "blobs_dropped": 1, "bytes_freed": 318367,
 "doc_ids": [1313, 1314], "ids_truncated": false, "qdrant_failed": [], "dry_run": true}
```

| 字段 | 含义 |
|---|---|
| `docs` / `chunks` | 删了几份文档，连带多少 chunk |
| `blobs_dropped` / `bytes_freed` | 引用计数归零、文件真的被删掉的份数与字节数 |
| `doc_ids` | 最多 500 个，`ids_truncated` 说明被截断 |
| `qdrant_failed` | PostgreSQL 已删但索引点没清掉的文档 id。这里不吞掉问题，对账会发现它，但需要先有人知道 |
| `dry_run` | 为 true 时表示这是预测值，什么都没有删 |

有一条恒定条件：只清理 `is_current = FALSE` 的文档，当前版本从来没有进过回收站，30 天的反悔窗口对它不成立。

覆盖式更新的行为是：上传同名文件时，旧文档被置为 `is_current=FALSE` 并写入 `deleted_at=now()`，进入回收站，旧向量由周期清理任务清掉，不保留 30 天；新文档成为当前版本。

### 4.4 预览与缩略图

```http
GET /api/v1/documents/{doc_id}/preview
→ application/pdf            # Office 文档返回转换后的 PDF；PDF、图片和 Markdown 返回原格式或纯文本

GET /api/v1/documents/{doc_id}/pages/{page_no}?width=1200
→ image/jpeg                # 单页渲染图，作为引用底图。width 必须在 100 到 3000 之间

GET /api/v1/documents/{doc_id}/preview?page=1&chunk_index=7&width=1200
→ image/jpeg                # 服务端用 pymupdf 把 chunk 的框画进同一页，用于对照和调试

GET /api/v1/documents/{doc_id}/thumbs/{page_no}
→ image/jpeg                # 缩略图，入库时预生成，宽 400 像素
```

Office 预览走 LibreOffice 转换。摄取成功后会派生一个 `KIND_PDF_PREVIEW` 任务，产物是 `data/blobs/{aa}/{sha}/preview.pdf`。三个端点的“预览源”由 `documents.py::_preview_source` 共用一份。

转换会改变排版，所以页码和坐标与原件不一致。带框预览（`?chunk_index=`）的坐标来自“抽取这份坐标的那个文件”，两者都与被渲染的页面同源。定位不到的 chunk 故意没有坐标，此时带框预览返回 415 并说明原因；`chunk_index` 写错（不存在）返回 403 或 404。

转换失败不会让文档失败，因为预览属于增强功能。转换还没跑完时，`/preview` 和 `/pages/{n}` 返回 415 并说明原因，不是 500。转换结果按内容寻址复用。

参数名曾经写错。早期写的是 `{chunk_id}`，但缩略图存的是页，路径是 `data/blobs/{aa}/{sha}/thumbs/{page}.jpg`，而 `chunk_index` 不是页码。`thumb_url` 的推导在 `retrieval/types.py::thumb_url_for`：有 `locations[].page` 就用它；页级向量使用 `payload["page"]`；兜底时如果 `chunk_index < 0`，按 `-(chunk_index)-1` 反推；都没有就返回 `null`。

另外有两处路径和返回类型曾经写错，照旧版契约写前端会失败：

```
❌ 契约旧版：GET /documents/{id}/pages/{n}/image?width=
✅ 实现：    GET /documents/{id}/pages/{n}?width=

❌ 契约旧版：GET /documents/{id}/preview  →  application/pdf
✅ 实现：                                 →  image/jpeg（第 1 页，可选叠加红框）
```

第二条尤其要注意：`DocumentDetail.preview_url` 指向的就是这个端点，它给的是第 1 页的 JPEG，不是 PDF。

页图端点需要 `Authorization: Bearer`，前端不能用 `<img src>`，因为 `<img>` 带不了请求头，会静默 401。

### 4.5 引用坐标约定

坐标已经归一化到 0 到 1，与分辨率无关，实测往返误差为 0.00e+00。

```json
// 正文 chunk：单框
{"page": 2, "bbox": [0.1360, 0.2301, 0.8638, 0.2585]}
// 表格 chunk：每个非空单元格一个框，带 row 和 col 让前端排网格
{"page": 3, "bbox": [0.1055, 0.1954, 0.2446, 0.2403], "row": 2, "col": 0}
```

前端必须区分两种形态：`kind="text"` 是单框，直接画；`kind="table"` 是多框，按 `row` 和 `col` 画网格，实测框数上限 200；`kind="page"` 是扫描件，只高亮整页。判据是 `locations` 的形状，不是 `kind`。

## 5. 检索

### 5.1 问答（SSE）

```http
POST /api/v1/kb/{kb_id}/ask
{"question":"...","session_id":null,"top_k":8,"stream":true}
→ SSE (text/event-stream)
event: sources
data: {"sources":[
  {"idx":1,"kind":"text","score":0.032,"title":"张三-项目立项书","date":"","doc_id":123,"chunk_index":3,
   "text":"本文件说明立项背景与验收标准……","locations":[{"page":1,"bbox":[0.15,0.19,0.31,0.21]}],"thumb_url":null},
  {"idx":2,"kind":"image","score":0.028,"title":"2025-02-14 情人节.jpg","date":"2025-02-14","doc_id":345,
   "chunk_index":0,"text":"","locations":null,"thumb_url":null}],"retrieval_ms":312}
event: delta
data: {"text":"根据检索到的内容"}
event: done
data: {"citations":[1,2],"elapsed_ms":1840,"retrieval_ms":312,"generator":"extractive",
       "dangling_citations":[],"session_id":57,"history_turns":2,
       "quality":{"level":"ok","reason":"跨腿共识（dense+sparse）","max_legs":3},"degraded":null,
       "legs":{"dense":{"n":8,"ms":120,"skipped":null},"visual":{"n":8,"ms":192,"skipped":null}}}
```

`done` 帧的每个字段都有用处：

- `retrieval_ms` 用来验证“检索段小于 500 毫秒”；
- `generator` 是 `extractive` 或模型名；
- `dangling_citations` 在答案引用了不存在的编号时非空，前端必须提示“这条引用失效了”；
- `session_id` 用于多轮续问；
- `history_turns` 是这一轮带进生成的上下文条数，第一轮为 0；
- `quality` 是证据质量，取值 `ok`、`weak` 或 `none`。为 `none` 时会直接拒答，不调用 LLM；
- `degraded` 在外部生成器不可用并降级为抽取式时给出原因，否则为 `null`。这一轮仍然成功；
- `legs` 是每条通道的 `n`、`ms` 和 `skipped`，如实反映哪条没跑。

性能目标是首 token 小于 2 秒，检索段必须小于 500 毫秒，生成段靠 SSE 逐字输出掩盖慢速。

多库问答的范围是主题时可以跨库提问，与单库使用同一套内核：

```http
POST /api/v1/ask
{"question":"...","kb_ids":null,"session_id":null,"top_k":8}
```

`kb_ids=null` 表示全部有权限的库，由服务端推导。续问时沿用会话自己的范围。

```http
GET /api/v1/kb/{kb_id}/ask/preview?q=验收标准那一栏怎么填&top_k=8
→ {"question":"…","retrieval_ms":312,
   "evidences":[{"idx":1,"doc_id":345,"chunk_index":3,"score":0.032,"legs":["dense","sparse"],
                 "ranks":{"dense":2,"sparse":1},"title":"…","text":"…（不超过 400 字）","locations":[…]}]}
```

这个端点只检索不生成，用于前端在“换个说法再问”之前先看证据列表，调用的是同一个 `engine.search`。

### 5.2 搜索

```http
POST /api/v1/kb/{kb_id}/search
{"query":"1381234","mode":"exact","top_k":20,"page":1,"include_debug":false,"rewrite":false}
→ {"items":[{"doc_id":345,"file_name":"产品需求.md","chunk_index":3,
             "text":"…我的手机号是138****5678…",
             "snippets":[{"text":"…","highlight":"1381234","positions":[[12,19]]}],
             "score":0.0326,"kind":"text","locations":[{"page":1,"bbox":[0.15,0.19,0.31,0.21]}],"thumb_url":null}],
   "mode":"exact","total":1,"page":1,"debug":null}
```

`include_debug` 默认为 `false`，此时 `debug` 是 `null`。传 `true` 时返回四路召回和 RRF 融合的完整过程，形状与 `/search/debug` 去掉 `query` 和 `mode` 之后一致，两者共用 `routers/search.py::_debug_block`。

`text` 是 chunk 正文，上限 800 字。不要只靠 `snippets` 渲染结果，因为它是 `re.escape(query)` 的字面子串匹配产物，自然语言提问通常不是原文子串，实测 100% 为空。

`rewrite` 默认为 `false`，此时行为与引入该功能前完全一致。传 `true` 时先做规则层改写（规范化和抽取实体词）并融合；如果知识库配置了外部 LLM 且 `use_for_rewrite` 打开，还会追加一次 Multi-Query 改写，这会把检索 query 发给外部服务。原始 query 永远参与召回并排在第 0 位，作为改错时的兜底。过程记录在响应的 `rewrite` 段里。

`updated_after` 和 `updated_before` 使用 RFC3339 格式，按文档更新时间收紧范围。两者都为空时不过滤。这个条件与租户过滤并列在同一个 `and` 里，不是 `or`。旧数据没有该字段，带时间过滤时会被排除，属于重摄取欠账。

| mode | 走哪条路 | 能搜什么 |
|---|---|---|
| `semantic` | Qdrant dense | 意思相近的内容 |
| `exact` | PostgreSQL trgm | 子串，例如 `1381234` 或 `优秀学生奖学金` |
| `hybrid` | 默认 | dense、BM25（Qdrant）、trgm（PostgreSQL）三路 RRF |

“三路”在这里有两种含义，不要混：本文指三条文本通道，即 dense、sparse、trgm；而规格文档里的“三路混合”指 dense、sparse 加 visual，视觉通道的读侧由独立服务承担。

### 5.3 跨知识库搜索

```http
POST /api/v1/search
{"query":"...","kb_ids":null,"mode":"hybrid","top_k":20,"page":1,"include_debug":false,"rewrite":false}
```

`kb_ids=null` 表示该用户有权限的所有知识库；`kb_ids=[...]` 是子集，实际范围等于 `readable_kb_ids` 与 `kb_ids` 的交集。契约早期版本写的 `workspace_id` 在实现里不存在。

有两条边界：`kb_ids` 传空数组 `[]` 返回 400；求交后为空时返回空结果而不是报错，因为报错会泄露“这些 kb_id 里至少有一个存在”。

### 5.4 检索调试面板

```http
POST /api/v1/kb/{kb_id}/search/debug
{"query":"...","top_k":10}
→ {"query":"验收标准那一栏怎么填","mode":"hybrid",
   "rewrite":{"queries":["验收标准那一栏怎么填"],"applied":false},
   "quality":{"level":"ok","reason":"跨腿共识（dense+sparse）","max_legs":3},
   "legs":{"dense":{"n":20,"ms":88,"skipped":null,"items":[{"key":"text:123:3","doc_id":345,"chunk_index":3,
                                                          "rank":2,"score":0.032,"file_name":"…","text":"…（不超过 160 字）"}]},
           "sparse":{"n":20,"ms":30,"skipped":null,"items":[…]},
           "trgm":{"n":3,"ms":45,"skipped":null,"items":[…]},
           "visual":{"n":0,"ms":0,"skipped":"视觉腿在本进程不可用：colSmol 未启用。","items":[]}},
   "rrf":[{"key":"text:123:3","doc_id":345,"chunk_index":3,"score":0.0325,"ranks":{"dense":2,"sparse":1},
           "leg_scores":{…},"legs":["dense","sparse"]}],
   "elapsed":{"dense":88,"sparse":30,"trgm":45,"total_ms":312},"filtered_out_deleted":0}
```

有四条形状必须照抄：`legs[].skipped` 是字符串或 `null`，不是布尔值，因为前端要显示原因；`elapsed` 的键就是通道名（`dense`、`sparse`、`trgm`），没有 `_ms` 后缀；`rrf[].key` 带命名空间，例如 `text:<id>` 和 `visual:<id>`，不加前缀 RRF 会互相抵消；`filtered_out_deleted` 是软删除二次过滤丢掉的数量。

过程数据也可以从普通检索拿到（`include_debug=true`），这个端点保留给只需要过程的调用方。它只支持单库。

## 6. 时间线与个人化视图

```http
GET /api/v1/kb/{kb_id}/timeline?month=2025-02          → 月视图
GET /api/v1/kb/{kb_id}/timeline?date=2025-02-14        → 当天明细
GET /api/v1/kb/{kb_id}/timeline/anniversaries?limit=20 → 纪念日，即有照片的日子
GET /api/v1/kb/{kb_id}/timeline/milestones?limit=20    → 里程碑
GET /api/v1/kb/{kb_id}/photos?page=1&date=2025-01-01   → 照片墙，photo 类型知识库
```

这些端点只在 `source_kind` 为 `chat` 或 `photo` 时有内容，其它知识库返回 400。

## 7. 会话管理

```http
GET    /api/v1/sessions?kb_id=&page=1      → 我的全部会话
POST   /api/v1/sessions                     {"title":"…","kb_ids":[1,2]}
GET    /api/v1/kb/{kb_id}/sessions?page=1
POST   /api/v1/kb/{kb_id}/sessions         {"title":"第一次约会"}
GET    /api/v1/sessions/{session_id}        → 含消息历史
PATCH  /api/v1/sessions/{session_id}       {"title":"新标题"}
DELETE /api/v1/sessions/{session_id}
```

会话新增了 `kb_ids` 表示检索范围，`null` 表示全部有权限的库，`kb_id` 转为可空。存量会话迁移时回填 `kb_ids=[kb_id]`。`GET /sessions` 是用户级列表，可以用可选的 `?kb_id=` 过滤。

## 8. 聊天数据导入

```http
POST /api/v1/kb/import/chat
{"kb_id": 88, "source_path": "/path/to/chat_messages_clean.jsonl", "messages_per_doc": 50}
→ 202 {"job_id": 501, "estimated_docs": 1740}

GET /api/v1/jobs/{id}
GET /api/v1/jobs?kb_id=88&status=running&kind=ingest&doc_id=501&page=1&page_size=20
→ {"items":[{"id":501,"kind":"import_chat","status":"running","progress":0.42,"attempts":1,"doc_id":null,
             "kb_id":88,"error":null,"payload":{"processed_msgs":12000,"total_msgs":48000,"created_docs":240},
             "created_at":"…","updated_at":"…"}],"total":1,"page":1,"page_size":20}
```

早期版本把自定义数据写成 `detail`，实现里是 `payload`，`detail` 是审计日志的字段名。

导入由服务端读取文件，不走 HTTP 上传几万条 JSON。每 `messages_per_doc` 条消息切一个文档，默认 50 条，`doc_source` 为 `chat_import`。

导入时会重跑归属判定。旧审计日志里的判定结果被后续修复改动过 3 次，不能信任。

归属判定只记录，不拦截。聊天必然出现对话方的名字，拿它当门禁会把整个聊天库导空，所以 `payload.owner_rule_applied=false`。真正生效的隔离手段是库级的：`source_kind=chat` 加 `visibility=private`。

`source_path` 必须在 `IMPORT_ROOTS` 白名单内，并且要先 `resolve()` 再判断前缀，使用 `is_relative_to`。越界返回 400，并列出允许的目录。可以用 `GET /api/v1/kb/import/roots` 查询白名单。

目标知识库的 `source_kind` 必须匹配，chat 端点要求 `chat`，dir 端点要求 `photo`。

导入本身不执行摄取，只创建 `Document` 行、blob 和 `KIND_INGEST` 任务。导入结束时会有上千个 pending 的 ingest 任务。

## 9. 图片知识库

```http
# 方式一：单张上传，走统一文档上传端点
POST /api/v1/kb/{kb_id}/documents      files=@photo.jpg

# 方式二：从服务器目录批量导入
POST /api/v1/kb/{kb_id}/import/dir
{"path":"/data/imports/photos_original","recursive":true}
→ 202 {"job_id":502,"estimated_files":23,"recursive":true}

GET /api/v1/kb/import/roots
→ 200 {"roots":["/…/data/imports"],"env":"IMPORT_ROOTS"}
```

目录必须在 `IMPORT_ROOTS` 白名单内，目标知识库的 `source_kind` 必须是 `photo`，文档 `doc_source` 为 `photo_dir`。

`payload` 里的计数器是 `{"processed_files":…,"total_files":…,"created_docs":…,"skipped":…}`。重复导入是幂等的，内容 sha 相同就跳过。

排序按文件名进行（`sorted`），否则两次导入的文档顺序和编号会不同。扫描有 20000 个文件的上限，没有上限时一个指向 `/usr` 的路径会让 worker 遍历几十万个文件直到超时。

## 10. MCP Server

传输方式是 Streamable HTTP（`POST /mcp`），鉴权复用 `Authorization: Bearer <api_key>`。

```http
POST /mcp        → MCP Streamable HTTP，无状态，不实现 Mcp-Session-Id
GET  /mcp        → 能力自述，不属于协议，给人排查用
```

### 10.1 暴露的工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_kb` | 无 | 列出调用者有权限的知识库，按权限动态裁剪 |
| `search_kb` | `kb_id`、`query`、`top_k`、`mode` | 三路 RRF 检索 |
| `ask_kb` | `kb_id`、`question`、`top_k`、`session_id` | RAG 问答，非流式 |
| `get_document` | `kb_id`、`doc_id`、`limit` | 文档元信息加前 N 个 chunk |

支持的方法是 `initialize`、`notifications/initialized`、`ping`、`tools/list` 和 `tools/call`。未知方法返回 `-32601`。

传输层是无状态的，不实现 `Mcp-Session-Id`。协议错误也返回 HTTP 200，错误放在 body 的 `error` 里，只有“根本不是 JSON-RPC”时才返回 400。工具失败使用 `result.isError=true`，属于业务错误，模型能读懂，而不是 JSON-RPC 的 `error`。批量请求（JSON 数组）也支持，如果全是通知则返回 204。

```jsonc
{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"search_kb","arguments":{"kb_id":88,"query":"验收标准那一栏怎么填","top_k":5}}}
→ 200 {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"{\n  \"items\": [...]\n}"}],"isError":false}}
```

结果一律是 JSON 字符串，放在 `content[0].text` 里。MCP 客户端必须支持 `text` 内容类型，自造类型会被当作“未知类型”丢掉。

### 10.2 工具列表的权限裁剪

```
调用方 token → api_keys.user_id → 有权限的 kb_ids → list_tools 只返回这些库对应的工具实例
```

不能先返回全部工具、调用时再拒绝，因为那会让调用方探测到不该看到的知识库是否存在。

### 10.3 错误码

| 情况 | JSON-RPC code | 落在哪里 |
|---|---|---|
| 未知 `method` 或未知工具 | `-32601` | 顶层 `error` |
| 参数不合法（缺必填、类型错、越界、未知参数、enum 不符） | `-32602` Invalid params | 顶层 `error`，message 形如 `search_kb: 缺少必填参数 kb_id` |
| 知识库不存在或无权限 | 无协议错误 | `result.isError = true`，内容为 `{"error":"KB_NOT_FOUND"}` |
| 其它未预期异常 | `-32603` Internal error | 顶层 `error` |

界线是：参数不合法属于协议错误；请求合法但结果失败属于业务结果，用 `isError: true`。参数越界要报错，不能夹取，因为 MCP 的调用方多半是 LLM，悄悄夹取会让它拿着 50 条当作 80 条使用。错误消息里不出现 `KeyError`、`ValueError` 这类裸异常类型名。

### 10.4 审计

每次调用都写入 `audit_log`：`api_key_id`、`user_id`、`kb_ids[]`、query 摘要和耗时。

## 11. A2A Agent

读响应前先看 Agent Card。`GET /.well-known/agent-card.json` 里每个 skill 都带 `inputSchema` 和 `outputSchema`。正文在 `artifacts[].parts[].text` 里，没有顶层 `answer`；引用来源在顶层 `metadata.sources`；引用角标在 `artifacts[].parts[].metadata.citations`。`kb_id` 必填，但 Card 刻意不列出可用值，因为那是权限信息。

A2A 与 MCP 共用同一套检索和问答内核，对外按用途分成不同 Agent。

```http
GET  /.well-known/agent-card.json     → Agent Card，能力声明
POST /a2a/tasks                       → 委派任务
```

| Agent | skill | 用途 | 实现 |
|---|---|---|---|
| 问答 Agent | `answer` | 单轮查资料 | `ask.prepare` 加 `stream_answer(one_shot=True)` |
| 研究 Agent | `research` | 多轮检索并汇总 | 同一内核，`top_k` 放宽到 30，按文档分组逐份给摘录 |

`research` 不是“让 LLM 规划多轮检索”，因为默认生成层是抽取式，这是隐私红线。它是可解释的多角度汇总，返回结果里带 `extractive: true`。

`POST /a2a/tasks` 接受两种入参，都走同一个内部函数：

```jsonc
// ① 协议面：JSON-RPC tasks/send
{"jsonrpc":"2.0","id":1,"method":"tasks/send","params":{"skill":"answer","kb_id":88,
  "message":{"parts":[{"kind":"text","text":"验收标准那一栏怎么填"}]}}}
// ② 便捷面：curl 或手测
{"skill":"answer","kb_id":88,"query":"验收标准那一栏怎么填"}
```

响应是 A2A Task 对象：`{id, contextId, status:{state:"completed"}, history:[…], artifacts:[{parts:[…]}], metadata:{kb_id, skill, sources, documents}}`。`capabilities.streaming=false` 是如实声明。Agent Card 不包含任何库的名字，只有 `readableKbCount`。无权限与不存在返回同一个错误码（403）。

MCP 的 `tools/call` 和 A2A 的每个任务都写入 `audit_log`。

## 12. 文件存储

上传的文件落在两处，各存一半。归一化会让字符偏移失真，所以必须保留原文。

| 存哪里 | 是什么 | 位置怎么算 |
|---|---|---|
| `data/blobs/<sha[:2]>/<完整 sha>/original` | 原始文件，内容寻址 | `common/storage.py::blob_path(sha)` |
| 同目录下的 `preview.pdf` 和 `thumbs/N.jpg` | Office 预览和缩略图 | `preview_path` 和 `thumbs_dir` |
| PostgreSQL 的 `chunks` 表 | 归一化文本和切分结果（`content_norm`、`locations` 引用坐标） | 检索命中的是这一份 |

文件名就是内容的 sha256，所以同一份文件上传两次只存一份。写入采用“先写 `.tmp` 再原子改名”。

`blobs` 表只保存元信息，`ref_count` 是删除的安全阀，引用数不为 0 时不允许物理删除。

`storage_path` 这一列不是存储抽象。写入时它是 `str(blob_path(sha256))`，没有任何代码读取它做分发。

备份由 `deploy/backup.sh` 完成，PostgreSQL（`pg_dump -Fc`）和 `data/blobs/` 一起备份。Qdrant 不备份，但 manifest 里会记录点数。要做对象存储的触发条件是“要上第二台机器”或“备份要出本机”，到那时先做只读的远端副本，不动在线读写路径。

## 13. 运维端点

```http
GET  /                          → 两态，免鉴权：有 web/dist 时返回界面，深链回 index.html；
                                  没有构建产物时返回 {service, version, docs, api}
GET  /health                     → 免鉴权存活探针 {status,db,qdrant,worker,models,queue,available_legs,index_models}
GET  /api/v1/health              → 同一份 HealthResp，走 Bearer，models、queue、available_legs、index_models 才有值
GET  /api/v1/jobs                → 任务列表（分页包），支持 kb_id、doc_id、kind、status、page、page_size
GET  /api/v1/jobs/{id}           → 单个任务
POST /api/v1/jobs/{id}/retry     → 明确不做，不是待办。要重试文档摄取请用 POST /documents/{doc_id}/retry
GET  /api/v1/audit?workspace_id=&user_id=&action=&date_from=&date_to=
GET  /api/v1/workspaces/{id}/stats             → 工作区统计（知识库、文档、chunk、磁盘）
POST /api/v1/admin/reindex?kb_id=&swap=       → 入队 KIND_REINDEX，不阻塞；swap=true 时做蓝绿重建，需要超管
GET  /api/v1/admin/consistency?kb_id=         → PostgreSQL 与 Qdrant 的对账明细
GET  /api/v1/admin/llm                         → 读外部 LLM 配置，API Key 只回掩码
PUT  /api/v1/admin/llm                         → 写外部 LLM 配置，页面可配
POST /api/v1/admin/llm/test                    → 用当前配置试发一次请求
GET  /api/v1/admin/users                        → 列出全部用户，超管
POST /api/v1/admin/users                        → 建号，超管；自助注册关闭时的入口
PATCH  /api/v1/admin/users/{id}                  → 改角色、状态或昵称，超管
```

有三个框架自带的路径不进本契约表：`/docs`（Swagger UI）、`/redoc` 和 `/openapi.json`。它们由 FastAPI 提供，不是本服务的业务端点，受 `EXPOSE_DOCS` 开关控制，关闭后三条路由根本不存在。写进契约表会永久多出三条“声明了但未实现”。

`available_legs` 回答“这个部署实际能跑哪几条检索通道”。`["dense","sparse","trgm"]` 始终存在，`"visual"` 只在视觉查询服务可达且模型就绪时出现。它不会硬编码，只在鉴权版里有值，因为属于部署细节。它与 `kb_visual` 有没有点无关，那是数据，而这是能力。

`queue` 的结构是 `{pending, running, failed_24h, oldest_running_seconds, stuck_after_seconds}`。它不是心跳。没有 running 任务时，`oldest_running_seconds` 是 `null` 而不是 `0`；`stuck_after_seconds = 1800`，与巡检一致。它只在鉴权版里有值，查不到时是 `{"error": "…"}`，健康检查仍然返回 200。

### 13.1 外部 LLM 配置

- 页面可配，立即生效。配置落库到 `llm_settings` 全局单例，生成层和 Contextual 切分都读它，环境变量只作兜底。
- API Key 明文只进不出。`GET` 和 `PUT` 的响应一律只回掩码（`has_key` 加 `api_key_masked`）。
- 写时 `api_key` 不传表示保持原值，不是清空。要清空用 `clear_api_key=true`。
- `external_active` 为真需要同时满足三个条件：`provider=openai_compat`、`enabled=true`、base_url 和 model 和 api_key 齐全。
- 细粒度开关：`use_for_ask` 和 `use_for_contextual` 分开控制。
- 自定义请求头 `extra_headers` 让接入要求特殊头的网关不必改代码。
- 写端点要求工作区 owner，因为 `base_url` 能指向任意主机，如果任何登录用户都能改，就会把所有人的检索原文导向自己的服务器。读端点任意登录用户可读。

### 13.2 超级管理员与用户管理

- 全局角色是 `users.role`，取值 `user` 或 `superadmin`，与工作区的 owner/member 不是一回事。角色和 API Key 一样由服务端从用户行推导。
- `users.nickname` 是唯一昵称。`POST /auth/login` 的 `email` 字段可以填邮箱或昵称。
- `GET/POST/PATCH /admin/users` 仅超管可用，非超管返回 403 `FORBIDDEN`。
- 超管能修改任意用户的 `display_name`、`nickname`、`email`、`role` 和 `is_active`，并能重置密码。
- 任何用户都可以用 `PATCH /auth/me` 修改自己的显示名、昵称、邮箱和密码。修改 `email` 或密码必须带 `current_password`。
- 防自锁：不能降级或停用最后一个超级管理员，也不能停用自己。

### 13.3 审计

`GET /audit` 只能查询自己有权管理的工作区，因为审计里包含 query 摘要，那也是用户数据。`workspace_id` 必填，无权限与不存在返回同一个错误码。`action` 要先校验再查询，拼错的值如果静默返回空列表，就是在骗人。

哪些端点写审计：

| `action` | 端点 |
|---|---|
| `search` | `POST /kb/{id}/search`、`POST /search`、`POST /kb/{id}/search/debug`、`GET /kb/{id}/ask/preview` |
| `ask` | `POST /kb/{id}/ask`（SSE） |
| `upload` | `POST /kb/{id}/documents`、`import/chat`、`import/dir` |
| `mcp_call` | `POST /mcp`，每次 `tools/call` |
| `a2a_call` | `POST /a2a/tasks` |

`ask_preview` 记为 `search` 而不是 `ask`，因为它没有生成任何内容；另外两条都带 `detail.surface`。`ask` 的 `detail` 里另外记录 `retrieval_query`（真正送去检索的 query）和 `query_expanded`、`history_turns`。

有几类读端点刻意不记审计：`/documents/{id}/chunks`、`/pages/{n}`、`/preview`、`/thumbs/{n}`、`/pii`。新增检索端点时必须接上审计，`tests/test_audit_coverage.py` 是接线守卫。

### 13.4 索引对账

```jsonc
{"kb_ids":[1],"pg_chunks":74,"qdrant_points":148,
 "legs":{"kb_dense":{"points":74,"missing":[],"dangling":[],"missing_count":0,"dangling_count":0,"consistent":true},
         "kb_sparse":{…},"kb_visual":{"points":3,…}},
 "missing_in_qdrant":[],"dangling_in_pg":[],"missing_count":0,"dangling_count":0,"consistent":true}
```

`legs` 要按通道分别看，不要只看顶层。顶层是 dense 与 sparse 的并集口径，“只有一条通道坏了”在顶层看起来仍然是一致的。现在有三条通道，多了 `kb_visual`，键用 `point_id_for_page`，PostgreSQL 侧的真相来源是 `documents.scan_pages`。

视觉通道的 `missing` 不能靠 `KIND_REINDEX` 修，要重跑 `POST /documents/{id}/reparse`。

| 报告项 | 含义 | 该怎么处理 |
|---|---|---|
| `legs.*.missing` | PostgreSQL 有，这条通道没有 | 漏索引。文本通道可以用 `KIND_REINDEX` 修，视觉通道要重新解析 |
| `legs.*.dangling` | 这条通道有，PostgreSQL 没有 | 残留点。reindex 修不了，要重跑摄取或软删 |

两个列表都会截断到 200 条。对账两侧都用同一个函数计算键。`POST /admin/reindex` 的默认范围是“我有权访问的库”，重建只处理两条文本通道。BM25 的词表 `terms.df` 和 `corpus_stats` 是全局量，重建任一库时都会为全体存活 chunk 重新登记。

### 13.5 查询类型路由与精排

这两项没有新端点，属于行为层。

| 能力 | 怎么开启 | 关闭时的行为 |
|---|---|---|
| 查询类型路由 | 默认开启，但只在 `confidence >= 0.35` 时调整权重和过滤 | 等权 RRF 加不过滤，与引入前完全一致 |
| 精排 | 按知识库配置，`kb.rerank_model` 非空 | 标记 `skipped`，保持原顺序 |

`GET /kb/{id}/search/debug` 会额外返回两段：

```jsonc
"route": {"intent": "photo", "weights": {"visual": 3.0}, "prefer_kinds": null,
          "prefer_source_kinds": ["photo"], "date_hint": null, "confidence": 0.9,
          "why": "识别为「找照片」：优先照片库", "note": "库里没有 ['photo'] 类型的库，不做过滤"},
"rerank": {"applied": false, "model": "BAAI/bge-reranker-v2-m3", "ms": 0,
           "skipped": "已通过 RERANK_MODEL=\"\" 显式禁用", "scores": {}}
```

`rerank_model` 只从知识库读取，不接受请求参数，因为排序是知识库的属性。`rerank.scores` 是未归一化的 logits，不能当作置信度展示。跨库检索一律不启用精排。路由的偏好过滤是软性的，过滤后为空会自动退回全部，并在 `note` 里说明。默认精排模型是 `BAAI/bge-reranker-v2-m3`，实测 `base` 版本成对判别为 2/4，`v2-m3` 为 4/4。

### 13.6 工作区统计与任务可见性

`GET /workspaces/{id}/stats` 给出两个字节数。`sum_doc_size_bytes` 是各库文档 `size_bytes` 之和，只包含原始文件；`blob_disk_bytes` 是 blob 目录实际占用的磁盘空间，等于原始文件加派生文件 `preview.pdf` 和 `thumbs/*.jpg`，所以通常更大。

`/jobs` 的租户口径是：能看到的任务等于 `jobs.kb_id` 落在 `ctx.readable_kb_ids` 里的任务，与 `auth.load_user_context` 同源。`kb_id IS NULL` 的任务（`cleanup` 和 `reindex`）自动不可见，因为 `IN (...)` 对 NULL 恒不匹配。无权限的 `job_id` 与不存在的 `job_id` 返回同一个错误码。

## 14. 已记录的补充决策

| 编号 | 决策 | 来源 |
|---|---|---|
| 1 | 聊天按 50 条消息一个文档，引用更精确 | 本轮 |
| 2 | 工作区软删除，沿用 30 天机制 | 本轮 |
| 3 | 全局公共知识库所有用户可读可编辑，预留 RBAC | 本轮 |
| 4 | 非当前文档的向量点及时清理，取代早期“3 天”的说法 | 本轮 |
| 5 | 批量上传单请求最多 20 个文件 | 本轮 |
| 6 | 问答首 token 小于 2 秒，检索段小于 500 毫秒 | 本轮 |
| 7 | 聊天导入使用专用端点，由服务端读取文件 | 本轮 |
| 8 | 图片知识库支持上传和服务器目录导入两种方式 | 本轮 |

## 15. 相关文档

实现侧的架构、摄取、检索、权限、任务与前端说明正在重写；端点形状以本契约为准。
