
## 一、为什么需要 ClickHouse？

先理解问题背景：

传统 OLTP 数据库（MySQL）的设计目标：
- 快速找到某一行（WHERE id = 123）
- 频繁的小事务（插入、更新、删除）
- 保证 ACID

但当你需要：
- "统计过去30天每个渠道的付费用户数"
- "计算百万玩家的留存率趋势"

MySQL 会很痛苦 —— 需要扫描大量行，读取整行数据（即使只需要2个字段）


**ClickHouse 专门为这类分析查询设计。**


## 二、列式存储 vs 行式存储（核心原理）

### 行式存储（MySQL）

```
┌─────────────────────────────────────────────────────┐
│ Row 1: [id=1, name="张三", level=50, gold=10000]    │
│ Row 2: [id=2, name="李四", level=30, gold=5000]     │
│ Row 3: [id=3, name="王五", level=45, gold=8000]     │
└─────────────────────────────────────────────────────┘

查询 SELECT AVG(level) FROM players：
→ 必须读取每一行的全部字段，再提取 level
→ 磁盘 I/O 浪费严重
```

### 列式存储（ClickHouse）

```
┌──────────────────────┐
│ id:    [1, 2, 3]     │  ← 单独存储
├──────────────────────┤
│ name:  [张三,李四,王五]│  ← 单独存储
├──────────────────────┤
│ level: [50, 30, 45]  │  ← 单独存储 ✓ 只读这个！
├──────────────────────┤
│ gold:  [10000,5000,8000]│
└──────────────────────┘

查询 SELECT AVG(level) FROM players：
→ 只读取 level 这一列
→ I/O 减少 75%（假设4列）
```

### 列存的额外好处：压缩率极高

```
level 列: [50, 50, 50, 51, 51, 50, 50, 52, 50, 50...]

同类型数据连续存放 → 压缩算法效果极好
- LZ4 压缩：速度快，压缩率 3-5x
- ZSTD 压缩：压缩率 5-10x

实际生产中，ClickHouse 存储空间通常是原始数据的 1/10 到 1/20
```

---

## 三、MergeTree 引擎（ClickHouse 的核心）

MergeTree 是最重要的表引擎，理解它就理解了 ClickHouse 的一半。

### 数据写入过程

```
        写入请求（批量INSERT）
              │
              ▼
    ┌─────────────────┐
    │  创建新的 Part  │  ← 每次写入生成一个独立的数据块
    │  (不可变文件)   │
    └────────┬────────┘
             │
             ▼ 后台异步
    ┌─────────────────┐
    │   Merge 合并    │  ← 多个小 Part 合并成大 Part
    │  (类似 LSM-Tree) │
    └─────────────────┘
```

**关键点**：

- 写入不修改现有文件，只追加新 Part → 写入极快
- 后台合并保证读取效率
- 这就是为什么叫 "MergeTree"

### 数据文件结构

```
/var/lib/clickhouse/data/game_db/player_login/
├── 202601_1_1_0/          ← 一个 Part
│   ├── primary.idx        ← 主键索引（稀疏索引）
│   ├── event_time.bin     ← event_time 列数据
│   ├── event_time.mrk2    ← 标记文件（定位用）
│   ├── player_id.bin      ← player_id 列数据
│   ├── player_id.mrk2
│   └── ...
├── 202601_2_2_0/          ← 另一个 Part
└── 202601_1_2_1/          ← 合并后的 Part
```

### 稀疏索引（与 MySQL B+Tree 的本质区别）

```
MySQL B+Tree 索引：
- 为每一行建立索引条目
- 1亿行 → 索引也很大，占用内存

ClickHouse 稀疏索引：
- 每 8192 行（默认）记录一个索引条目
- 1亿行 → 仅约 12000 个索引条目
- 索引常驻内存，定位极快

┌─────────────────────────────────────────┐
│ 稀疏索引示意                             │
│                                         │
│ 索引条目    指向的数据范围                │
│ ─────────────────────────               │
│ [mark 0] → 行 0 - 8191                  │
│ [mark 1] → 行 8192 - 16383              │
│ [mark 2] → 行 16384 - 24575             │
│ ...                                     │
└─────────────────────────────────────────┘

查询时：先用索引定位到可能的 mark 范围，再扫描这些 granule
```

---

## 四、查询执行原理

### 向量化执行

```
传统数据库（逐行处理）：
for each row:
    process(row)        ← 函数调用开销大，CPU 缓存不友好

ClickHouse（向量化）：
for each column_batch (如 8192 个值):
    process_batch(values[])   ← SIMD 指令并行处理
```

```
CPU SIMD 示意（AVX2 指令集）：

普通处理：  a1+b1, a2+b2, a3+b3, a4+b4  → 4次操作
SIMD：      [a1,a2,a3,a4] + [b1,b2,b3,b4] → 1次操作

ClickHouse 充分利用现代 CPU 的 SIMD 能力
单核性能远超传统数据库
```

### 多线程并行

```
SELECT count(*) FROM huge_table WHERE level > 50

         ┌──────────────────┐
         │   Coordinator    │
         └────────┬─────────┘
                  │ 分发
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
┌───────┐   ┌───────┐     ┌───────┐
│Thread1│   │Thread2│     │Thread3│
│Part 1 │   │Part 2 │     │Part 3 │
└───┬───┘   └───┬───┘     └───┬───┘
    │           │             │
    └───────────┴─────────────┘
                │ 汇总
                ▼
            最终结果

默认使用全部 CPU 核心并行处理
```

---

## 五、与传统数据库对比

|维度|MySQL/PostgreSQL|ClickHouse|
|---|---|---|
|**存储模型**|行式|列式|
|**索引类型**|B+Tree（密集）|稀疏索引 + 跳数索引|
|**写入模式**|单行事务写入|批量追加写入|
|**更新/删除**|高效（原地修改）|低效（标记+合并）|
|**并发事务**|完整 ACID|有限支持|
|**典型查询**|`WHERE id=123`|`GROUP BY ... 聚合`|
|**扫描性能**|全表扫描慢|全表扫描极快|
|**数据压缩**|一般|极高（10x+）|
|**适合数据量**|GB 级|TB~PB 级|

### 什么时候用什么？

```
用 MySQL/PostgreSQL：
- 用户系统、订单系统（频繁增删改查单条记录）
- 需要事务保证
- 数据量 < 千万级

用 ClickHouse：
- 日志存储与分析
- 用户行为分析、漏斗分析
- 实时报表、BI 看板
- 数据量 > 亿级，查询多为聚合统计
```

---

## 六、ClickHouse 的局限性

1. **不适合高频更新**
    
    - UPDATE/DELETE 是异步的 mutation 操作，很慢
    - 设计上假设数据是追加写入的
2. **不支持完整事务**
    
    - 没有 ROLLBACK
    - 适合"写入后不改"的场景
3. **JOIN 性能有限**
    
    - 大表 JOIN 大表可能很慢
    - 推荐使用宽表（预先 JOIN 好）或字典表
4. **单条查询延迟不稳定**
    
    - 设计目标是吞吐量，不是低延迟
    - 不适合做主键点查（用 Redis/MySQL）



## Windows上安装ClickHouse

### 直接安装

以管理员身份运行powershell
```shell
# 启用WSL组件
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 启用虚拟机平台组件（WSL2必需）
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

wsl --set-default-version 2

wsl --install -d Ubuntu-22.04

# 更新系统包
sudo apt update && sudo apt upgrade -y
# 安装ClickHouse
curl https://clickhouse.com/ | sh
```


### Docker安装（推荐）

```shell
#1. 拉取 ClickHouse 镜像（和Linux一致，无需修改）
docker pull clickhouse/clickhouse-server

#2. 创建本地持久化目录（Windows 风格，无-p参数，用\分隔路径）
mkdir D:\clickhouse\data D:\clickhouse\logs

#3. Windows 无 chmod 命令，跳过权限设置（Docker for Windows 会自动处理权限）

#4. 分行版启动命令（Windows CMD 支持分行，注释需用::）
docker run -d ^
  --name clickhouse-server ^
  -p 8123:8123 ^
  -p 9000:9000 ^
  -v D:\clickhouse\data:/var/lib/clickhouse ^
  -v D:\clickhouse\logs:/var/log/clickhouse-server ^
  --ulimit nofile=262144:262144 ^
  -e CLICKHOUSE_PASSWORD=123456 ^
  clickhouse/clickhouse-server

#5. 单行版启动命令（推荐，避免分行符问题）
docker run -d --name clickhouse-server -p 8123:8123 -p 9000:9000 -v D:\clickhouse\data:/var/lib/clickhouse -v D:\clickhouse\logs:/var/log/clickhouse-server --ulimit nofile=262144:262144 -e CLICKHOUSE_PASSWORD=123456 clickhouse/clickhouse-server
```
不推荐使用挂载，建议使用命名卷

```shell
docker stop clickhouse-server #停止
docker rm clickhouse-server #删除
```



### dbeaver连接

|端口|协议类型|用途|DBeaver 连接方式|
|---|---|---|---|
|8123|HTTP/HTTPS|轻量请求、API 调用、Web 访问|连接类型选 `HTTP` 时用这个端口|
|9000|Native (TCP)|高性能客户端连接、批量操作|连接类型选 `Native` 时用这个端口|

貌似只找到了支持8123端口的驱动，毕竟HTTP连接更通用
