# PostgreSQL


## 一、为什么选择 PostgreSQL？

先理解问题背景：

传统关系型数据库的设计目标：
- 快速处理 CRUD 操作（增删改查）
- 保证 ACID 事务特性
- 适合结构化数据

但当你需要：
- "存储和处理复杂的 JSON 数据"
- "支持全文检索和地理位置查询"
- "需要高并发读写且保证数据一致性"
- "处理复杂的关系查询"

**PostgreSQL 作为世界上最先进的开源关系型数据库，完美解决这些问题。**

Slogan："世界上最先进的开源关系型数据库"

---

## 二、PostgreSQL 核心架构原理

### 客户端/服务器模型

```
┌─────────────────────────────────────────────────────┐
│                  PostgreSQL 架构                       │
│                                                     │
│  客户端                服务器                          │
│  ┌──────┐             ┌──────────────────┐           │
│  │ psql │◄────────────┤  postgres 进程   │           │
│  │pgAdmin│ TCP/IP     │ (监听器进程)      │           │
│  │Django │────────────►│  - 接受连接      │           │
│  └──────┘             │  - Fork 新进程   │           │
│                       └────────┬─────────┘           │
│                                │                      │
│                  ┌─────────────┼─────────────┐       │
│                  ▼             ▼             ▼       │
│           ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│           │ 后端进程1 │  │ 后端进程2 │  │ 后端进程3 │  │
│           │ (连接A)   │  │ (连接B)   │  │ (连接C)   │  │
│           └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────┘

关键点：
- 每个客户端连接都会 fork 一个独立的后端进程
- 进程隔离，一个进程崩溃不影响其他连接
- 共享内存用于缓存和进程间通信
```

### 进程模型详解

```
PostgreSQL 采用进程模型（而非线程模型）：

优势：
✓ 稳定性高 - 一个进程崩溃不会拖垮整个数据库
✓ 内存隔离 - 防止内存泄漏影响其他连接
✓ 调试简单 - 每个进程独立，容易定位问题

劣势：
✓ 连接开销大 - 每个连接都启动新进程
✓ 上下文切换成本高 - 进程切换比线程切换慢

解决方案：使用连接池（如 PgBouncer）来减少连接开销
```

---

## 三、MVCC 多版本并发控制（核心特性）

### 什么是 MVCC？

MVCC (Multi-Version Concurrency Control) 是 PostgreSQL 并发控制的核心机制。

```
传统数据库的并发问题：

时间线：
T1: 事务 A 开始，读取 id=1 的记录 (name="张三")
T2: 事务 B 读取 id=1 的记录 (name="张三")
T3: 事务 B 更新 id=1 的记录为 name="李四"
T4: 事务 A 再次读取 id=1 的记录 → 结果是什么？

- 可重复读隔离级别：应该还是 "张三"
- 读已提交隔离级别：变成 "李四"

传统数据库通过锁实现：
- 读锁：阻塞写
- 写锁：阻塞读
→ 并发性能差！

PostgreSQL 的 MVCC 方案：

┌─────────────────────────────────────────────────────┐
│ MVCC 数据存储示意                                     │
│                                                     │
│ id=1 的数据：                                        │
│ ┌───────────────────────────────────────────────┐ │
│ │ xmin  | xmax  | id  | name  | 其他字段          │ │
│ ├───────────────────────────────────────────────┤ │
│ │ 100   | NULL  | 1   | 张三   | ...              │ │ ← 旧版本 │
│ │ 101   | NULL  | 1   | 李四   | ...              │ │ ← 新版本 │
│ └───────────────────────────────────────────────┘ │
│                                                     │
│ xmin: 创建该版本的事务 ID                             │
│ xmax: 删除该版本的事务 ID（NULL 表示未删除）           │
└─────────────────────────────────────────────────────┘

查询时：
- 事务 A (xid=100) 只能看到 xmin <= 100 且 xmax 为 NULL 的行
- 事务 B (xid=101) 可以看到 xmin <= 101 的所有行
→ 读写不冲突！
```

### MVCC 的优势

```
1. 读写不冲突
   - 读操作不需要加锁
   - 写操作不需要等待读操作
   - 并发性能大幅提升

2. 快照一致性
   - 每个事务看到的是数据库的一个快照
   - 不会出现"幻读"（在可重复读隔离级别下）

3. 无死锁风险
   - 读操作不阻塞写操作
   - 大大减少死锁发生的概率
```

### VACUUM 清理机制

```
MVCC 的代价：旧版本数据需要清理

数据版本链：
┌─────────────────────────────────────────────────┐
│ id=1 的历史版本：                                │
│                                                 │
│ 事务100 创建：[张三] (xmin=100)                  │
│ 事务101 更新：[李四] (xmin=101, 隐式删除了[张三]) │
│ 事务102 更新：[王五] (xmin=102, 隐式删除了[李四]) │
│                                                 │
│ → [张三]、[李四] 都是"死元组"，需要清理          │
└─────────────────────────────────────────────────┘

VACUUM 三种模式：

1. AUTOVACUUM（自动）
   - 后台自动运行
   - 定期清理死元组
   - 防止表膨胀

2. VACUUM（手动，不锁表）
   - 回收空间供重用
   - 不阻塞读写操作
   - 推荐日常维护使用

3. VACUUM FULL（手动，锁表）
   - 完全重建表
   - 收缩磁盘空间
   - 会阻塞表操作，谨慎使用
```

---

## 四、WAL 预写日志机制

### WAL 原理

```
WAL (Write-Ahead Log) 是 PostgreSQL 保证数据持久性的核心机制

数据修改流程：

                    1. 写入 WAL 日志
                       ┌─────────────────────┐
                       │  pg_wal/ 目录        │
                       │  ┌───────────────┐  │
用户请求 ──────────►   │  │  WAL 记录      │  │
UPDATE table ...       │  │  (先写日志)    │  │
                       │  └───────────────┘  │
                       └──────────┬──────────┘
                                  │ 2. 同步到磁盘
                                  │ (fsync)
                                  ▼
                       ┌─────────────────────┐
                       │  数据文件修改        │
                       │  (后修改数据)        │
                       └─────────────────────┘

关键原则：
- 数据修改前，必须先将修改日志写入 WAL
- WAL 成功写入后，才允许修改实际数据
- 崩溃恢复时，重放 WAL 日志恢复数据
```

### WAL 的作用

```
1. 数据持久性保证
   - 系统崩溃后，可以通过 WAL 恢复未落盘的数据

2. 时间点恢复（PITR）
   - 可以恢复到任意时间点的状态
   - 基于 WAL 的归档机制

3. 流复制基础
   - 主库将 WAL 发送给备库
   - 备库应用 WAL 实现同步

4. 提升写入性能
   - 随机写改为顺序写（WAL 是顺序追加）
   - 减少磁盘 I/O 延迟
```

---

## 五、高级特性

### 丰富的数据类型

```
传统数据库 vs PostgreSQL：

传统数据库：
- 基本类型：INT, VARCHAR, DATE, TIMESTAMP...
- 扩展性差

PostgreSQL：
1. 基本类型（完整的支持）
   - 数值：smallint, integer, bigint, numeric, decimal
   - 字符：char, varchar, text
   - 时间：timestamp, date, time, interval
   - 二进制：bytea

2. 高级类型
   - 数组：integer[], text[]
   - JSON/JSONB：支持 JSON 查询和索引
   - UUID：原生 UUID 类型
   - XML：原生 XML 支持
   - 枚举：CREATE TYPE enum_type AS ENUM(...)

3. 特殊类型
   - 几何类型：point, line, polygon
   - 网络地址：inet, cidr, macaddr
   - 位串：bit, varbit
   - 范围：int4range, tsrange
   - 自定义类型：CREATE TYPE
```

### JSON/JSONB 支持

```sql
-- 创建表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    data JSONB
);

-- 插入 JSON 数据
INSERT INTO users (name, data) VALUES
    ('张三', '{"age": 25, "tags": ["编程", "阅读"]}'::jsonb),
    ('李四', '{"age": 30, "tags": ["音乐", "旅行"]}'::jsonb);

-- JSON 查询
SELECT name, data->>'age' as age FROM users;
SELECT name, data->'tags'->>0 as first_tag FROM users;

-- JSON 索引
CREATE INDEX idx_users_data_gin ON users USING gin (data);

-- JSONB 特性
-- 查询年龄大于 25 的用户
SELECT * FROM users WHERE (data->>'age')::int > 25;

-- 检查 JSON 中是否包含某个键
SELECT * FROM users WHERE data ? 'age';

-- 检查数组中是否包含某个值
SELECT * FROM users WHERE data->'tags' ? '编程';
```

### 索引类型

```
PostgreSQL 支持多种索引类型，适用于不同场景：

1. B-Tree（默认）
   - 用途：等值查询、范围查询、排序
   - 示例：WHERE age = 25, WHERE age > 20, ORDER BY age

2. Hash
   - 用途：等值查询
   - 示例：WHERE email = 'test@example.com'
   - 限制：不支持范围查询

3. GiST（通用搜索树）
   - 用途：几何查询、全文检索、范围查询
   - 示例：WHERE point @> circle, to_tsvector('text') @@ 'keyword'

4. GIN（倒排索引）
   - 用途：数组查询、JSON 查询、全文检索
   - 示例：WHERE tags @> ARRAY['编程'], data ? 'key'

5. SP-GiST（空间分区通用搜索树）
   - 用途：非平衡数据结构
   - 示例：电话号码前缀搜索
```

---

## 六、与传统数据库对比

| 维度 | MySQL | PostgreSQL | ClickHouse |
|------|-------|------------|------------|
| **存储模型** | 行式 | 行式 | 列式 |
| **核心特性** | 简单易用、成熟稳定 | MVCC、WAL、丰富数据类型 | 列存、MergeTree |
| **事务隔离** | RR、RC（有限 MVCC） | 完整 MVCC | 不支持 |
| **数据类型** | 基本类型 | 极其丰富 | 基本类型 |
| **JSON 支持** | 部分支持 | 原生 JSONB | 支持 |
| **全文检索** | 基础支持 | 强大的 tsvector | 支持 |
| **查询性能** | OLTP 优秀 | OLTP 优秀 | OLAP 极快 |
| **适用场景** | Web 应用、电商 | 复杂业务、数据分析 | 日志分析、大数据 |

### 什么时候用什么？

```
用 MySQL：
- 简单的 Web 应用
- 需要快速开发和部署
- 团队熟悉度高

用 PostgreSQL：
- 复杂的业务逻辑
- 需要处理 JSON、地理信息等非结构化数据
- 需要高并发和强一致性
- 需要强大的全文检索和复杂查询能力

用 ClickHouse：
- 日志存储与分析
- 用户行为分析、漏斗分析
- 实时报表、BI 看板
- 数据量 > 亿级，查询多为聚合统计
```

---

## 七、PostgreSQL 的优势和局限性

### 优势

```
1. 强大的数据类型支持
   - JSONB、数组、范围类型、几何类型
   - 几乎可以存储任何类型的数据

2. MVCC 多版本并发控制
   - 读写不冲突，高并发性能优秀
   - 避免读锁导致的性能瓶颈

3. 完整的 ACID 事务支持
   - 原子性、一致性、隔离性、持久性
   - 支持多种事务隔离级别

4. 扩展性强
   - 支持 C 语言编写的扩展
   - PostGIS（地理信息系统）、TimescaleDB（时序数据库）等

5. 开源免费
   - 完全开源，无商业授权费用
   - 活跃的社区支持
```

### 局限性

```
1. MVCC 导致表膨胀
   - 需要定期执行 VACUUM
   - 频繁更新表时需要调优 autovacuum 参数

2. 连接开销大
   - 每个连接对应一个进程
   - 需要使用连接池（PgBouncer）

3. 大表查询性能
   - 超大数据量（PB级）不如 ClickHouse
   - 全表扫描性能不如列式存储

4. 配置复杂
   - 参数众多，调优难度较大
   - 需要深入理解内部机制才能发挥最大性能
```

---

## 实践环节


### Docker安装
```shell
#非持久化
docker run -d --name pgsql -p 5432:5432 -e POSTGRES_PASSWORD=123456 postgres
# 持久化
docker run -d --name pgsql -p 5432:5432 -v pgsql-data:/var/lib/postgresql/data -e POSTGRES_PASSWORD=123456 --restart always postgres
```


[pgadmin4 工具安装及使用-CSDN 博客](https://blog.csdn.net/tangzongwu/article/details/122165362)

#### PostgreSQL 数据库操作

1. 连接数据库
   - **命令行工具（psql）**：`psql -U username -h localhost -p 5432 -d database_name`。
   - **图形化工具（pgAdmin）**：通过界面可视化连接服务器并管理数据库。
2. 数据库管理
   - **创建**：`CREATE DATABASE teachDB;`。
   - **修改**：重命名数据库`ALTER DATABASE teachDB RENAME TO courseDB;`（需断开连接）。
   - **删除**：`DROP DATABASE IF EXISTS courseDB;`。

### PostgreSQL 连接数据库

```
命令行工具
psql：交互式SQL命令行工具，允许用户执行SQL查询和脚本。
pg_dump：用于备份数据库。
pg_restore：用于恢复数据库。
pg_ctl：用于启动、停止和重启PostgreSQL服务器。
sc delete servicename
```

**记录我的游戏本上 windows 上 PostgreSQL 安装失败**

安装的最后：Problem running post-install step Installation may not complete correctly The database cluster initialisation failed

[Windows 上安装 PostgreSQL | 菜鸟教程](https://www.runoob.com/postgresql/windows-install-postgresql.html)

```
解决方案1：安装目录与启动用户权限不足，使用管理员模式，修改文件夹权限。可能还要关闭防火墙与杀毒软件。

解决方案2：初始化数据库集群失败或注册服务失败，手动进行
手动初始化数据库集群或者手动注册postgreSQL 服务
初始化数据库D:\PostgreSQL\17\bin>initdb.exe -D D:\PostgreDB
注册服务D:\PostgreSQL\17\bin>pg_ctl register -N postgresql-x64-17 -D D:\ PostgreData
注销服务 pg_ctl register -N PostgreSQL17 -D "D:\PostgreSQL\17\data"
登录SQL psql -U postgres

但是初始化时遇到错误initdb: error: program "postgres" was found by "D:/PostgreSQL/17/bin/initdb.exe" but was not the same version as initdb

解决方案3：postgre用户需要手动创建
3. 输入`win`+`R`然后输入cmd，使用`Ctrl`+`Shift`+`Enter`通过管理员打开命令窗口
4. 使用`net user postgres /delete`来删除可能已经存在的postgres
5. 使用`net user /add postgres <password>`来建立用户，这里记得换成自己的password
6. 使用`net localgroup administrators postgres /add`将 postgres 用户添加到管理员组
7. 用`net localgroup "power users" postgres /add`将 postgres 用户添加到 Power Users 组
8. 接下来直接找到我们前面下载的exe文件，右键然后选择以管理员身份运行。

解决方案4：Locale设置问题
目前不太会有这个问题，Default,C,Chinese都试一下
```

##### 最后在 StackOverflow 上找到了答案

如果您曾经更改过注册表中的命令行代码编码参数

> HKEY_LOCAL_MACHINE\Software\Microsoft\Command Processor\Autorun

对于 chcp 65001、chcp 1251 或任何其他，那么这可能是问题所在。

将命令行编码注册表值的值返回为默认值（空）解决了我的问题。

尝试将您的注册表值更改为空：

> HKEY_LOCAL_MACHINE\Software\Microsoft\Command Processor\Autorun

### Ubuntu 安装

安装 postgres

```
sudo apt-get install postgresql postgresql-client
数据库超级用户 postgres，默认密码为空
ALTER USER postgres WITH PASSWORD 'xxxxxxxxxxx';  重置数据库密码
psql -U postgres 登录数据库
\q 退出pqsl
sudo passwd -d postgres    删除linux用户postgres密码
sudo -u postgres passwd    设置用户postgres的密码
```

##### 使用 Curl 工具安装 pgAdmin

[ubuntu20.04 安装 postgresql12 及 pgadmin4_pgadmin4 国内源安装 ubuntu-CSDN 博客](https://blog.csdn.net/duan9015/article/details/115896166)

```
web访问pgadmin：http://127.0.0.1/pgadmin4
```

#### 备份工具

- pg_dump

  - 单库备份：导出指定数据库的结构和数据。

    ```bash
    pg_dump -h localhost -U postgres -d "mydb" -f "mydb_backup.sql"
    ```

  - 参数：

    - `-c`：删除现有对象后重建（避免重复）；
    - `-t`：指定表名（如`-t "users -t "orders"`）。

- pg_dumpall 备份整个数据库集群（含角色、表空间），用于跨集群迁移。