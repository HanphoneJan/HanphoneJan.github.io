## 增量索引

### 数据结构

```python
class IncrementalIndexManager:
    # 核心数据:
    self.main_index: IndexModule        # Faiss IVF 主索引 (存量数据)
    self.buffer_features: List[ndarray] # 缓冲区特征 (新增数据)
    self.buffer_paths: List[str]        # 缓冲区路径
    self.buffer_ids: List[int]          # 缓冲区 ID
    self.deleted_ids: Set[int]          # 逻辑删除标记
    self.next_id: int                   # 自增 ID 计数器
    self.id_to_path: Dict[int, str]     # ID→路径 映射
```

### add_images — 添加图片

```
image_paths → ImageIndexBuilder.extract_features() → CLIP 编码
  → 分配 ID (next_id 自增)
  → 追加到 buffer_features / buffer_paths / buffer_ids
  → 检查: len(buffer) >= threshold? → 提示 merge
  → 返回 {"added": N, "ids": [id1, id2, ...]}
```

不碰主索引, O(1) 完成。复杂度主要在新图片的 CLIP 编码 (~100ms/张)。

### remove_images — 逻辑删除

```
image_ids → 逐个检查:
  - 存在于主索引 OR 缓冲区? → deleted_ids.add(id)
  - 恰好在缓冲区? → 直接从 list pop 移除
  - 都不存在? → 返回 not_found
```

为什么是逻辑删除?

| 方案 | 可行性 |
|:---|:---|
| 物理删除 | Faiss IVF 索引不支持逐条 delete |
| 逻辑删除 | O(1) 标记, 搜索时 O(1) 过滤, 积累多了 rebuild 清理 |

### search — 双路搜索合并

```python
def search(self, query_vector, topk):
    # 1. 主索引搜索
    main_dist, main_ids = main_index.feat_retrieval(query_vector, topk*2)

    # 2. 缓冲区暴力搜索
    buffer_matrix = np.vstack(buffer_features)  # (M, 512)
    similarities = np.dot(buffer_matrix, query_vector.T).flatten()
    buffer_dist = 1 - similarities
    # → argsort → topk*2

    # 3. 合并
    for dist, id in (主索引结果 + 缓冲区结果):
        if id not in deleted_ids:    # 过滤逻辑删除
            all_results.append((dist, id, path))

    # 4. 全局排序 → topk
    all_results.sort(key=lambda x: x[0])
    return all_results[:topk]
```

**缓冲区为什么用暴力 dot product 而不是也建 Faiss 索引?**

- buffer 通常 < 1000 条, 512 维: `np.dot` 只需几十微秒
- 超了就 merge 到主索引, 没必要为 buffer 单独建索引
- 如果一定要优化: 改用 `faiss.IndexFlatIP` (内积索引), BLAS 加速比 numpy 快 2-3 倍

### merge_buffer — 缓冲区合并

```
buffer vstack → float32 矩阵 (M, 512)
  → main_index.add_vectors(buffer_matrix)  # Faiss IVADC 免训
  → 清空 buffer
  → 保存状态
```

**为什么 add_vectors 不需要重新训练?**

```
IVF 层: 4096 个聚类中心在初始训练时就固定了
       新向量只需找最近的聚类中心 → 放入对应倒排列表
       聚类中心本身不移动

PQ 层: 32×256 个码本中心在初始训练时就固定了
       新向量按已有码本编码即可
       码本不更新
```

类比: 行政区划 (聚类中心) 画好后不改, 新居民 (新向量) 直接落户最近行政区就行。代价是: 如果新数据分布变了, 编码质量会下降 → 所以需要定期 rebuild 刷新。

### rebuild_index — 完全重建

```
all_features → 过滤 deleted_ids → 只保留有效向量
  → 新建 IndexModule(索引字符串, feat_dim, 有效特征)
     → index.train() → 重新 KMeans + PQ 训练
  → 清空 buffer + deleted_ids + 重置 next_id
  → 主索引替换为新索引
```

这是唯一真正物理删除数据的操作。训练成本与数据量成正比 (12 万图约 2 分钟)。

### 状态持久化

```python
def save_state(self):
    # JSON: next_id, deleted_ids, buffer_ids, buffer_paths
    # Pickle: buffer_features (vstack 后存)

def load_state(self, map_dict):
    # 恢复 JSON 状态 + Pickle 特征
    # buffer_features 重建为 List[ndarray] 格式
```

每次 add/remove/merge 后自动保存, Flask 启动时自动加载。JSON 可读便于调试, Pickle 高效存 ndarray。

---

范文来源：本仓库 `docs/项目/图像检索系统/核心系统设计.md` §2 节选（项目文档原稿；作为范文只学行文，不搬事实）。

这份范文治什么：

- **先给字段和类型，再让算法引用这些字段名**：`buffer_features`、`deleted_ids`、`next_id` 在数据结构里出现一次，后面直接拿来用，读者不用回翻。
- **每个操作写「输入 → 步骤 → 返回」的编号伪代码**，复杂度另起一行，不用「性能很好」概括。
- **取舍用一张两行表格承载**（物理删除 / 逻辑删除），表里写的是接口限制和复杂度，不是感受。
- **两层结构分别写清**：主索引只能逻辑删除、buffer 可以直接 pop，两段各写一遍，不合并成「分别处理」。
- **给类比的同时给代价**：行政区划那句类比后面紧跟「新数据分布变了，编码质量会下降 → 定期 rebuild」，类比不单独承担解释。
- **允许写「唯一」和具体成本**：`rebuild_index` 是唯一物理删除的操作，12 万图约 2 分钟。
