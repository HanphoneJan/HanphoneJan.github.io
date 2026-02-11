### API服务
阿里云：[大模型服务平台百炼控制台](https://bailian.console.aliyun.com/cn-beijing/?spm=5176.29615833.J_go7Hzi7p17rPSpUsoA-Iv.1.10ad6e39tFMk79&tab=api#/api/?type=model&url=2846066)
智谱AI：[Embedding-3 - 智谱AI开放文档](https://docs.bigmodel.cn/cn/guide/models/embedding/embedding-3)

[嵌入 |LlamaIndex Python 文档](https://developers.llamaindex.ai/python/framework/module_guides/models/embeddings/)
embedding模型有很多种，其接口也有很多，并不能完全套用OPEN AI 接口。


Embedding 模型是**以 Embedding 层为基础，叠加完整 Transformer 架构**的独立模型。
```
文本预处理 → Token分词 → Embedding层 → 位置编码 → Transformer Encoder堆叠 → 聚合层 → 文本向量输出
```


```python
import torch
import torch.nn as nn

# 1. 定义嵌入层参数
vocab_size = 10000  # 词表大小（含所有Token）
embedding_dim = 768  # 输出向量维度

# 2. 初始化嵌入层（权重随机初始化）
embedding_layer = nn.Embedding(
    num_embeddings=vocab_size,  # 词表大小
    embedding_dim=embedding_dim,  # 向量维度
    padding_idx=0  # [PAD] Token的索引，初始向量设为全0
)

# 3. 输入：Token的整数索引序列（形状：[batch_size, seq_len]）
# 例：batch_size=2（2个句子），seq_len=3（每个句子3个Token）
token_indices = torch.tensor([[102, 345, 567], [890, 123, 456]])

# 4. 映射：通过嵌入层得到Token向量
token_vectors = embedding_layer(token_indices)

# 输出结果
print(token_vectors.shape)  # torch.Size([2, 3, 768]) → [批次大小, Token长度, 向量维度]
print(token_vectors[0][0].shape)  # torch.Size([768]) → 单个Token的向量
```

### 本地部署

