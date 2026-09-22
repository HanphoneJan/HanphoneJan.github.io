---
title: 基于内容的过滤推荐系统
_synced: true
---
# 基于内容的过滤推荐系统（Content-Based Filtering）


**基于内容的过滤**是推荐系统的另一大流派：它利用**用户画像**和**物品特征**（例如电影的类型、题材）来预测评分。和协同过滤不同，它**不需要其他用户的行为数据**，因此能很好地应对「冷启动」问题（新电影没有评分也能被推荐）。

核心思想是训练两个神经网络，把高维稀疏的特征压缩成低维稠密的**嵌入向量**：

- **用户网络（User NN）**：把用户特征（ID、类型偏好等）映射为向量
  $u_x$。
- **物品网络（Item NN）**：把电影特征（类型等）映射为向量 $v_x$。

预测评分是两个向量的**点积**：

$$\hat y = u_x \cdot v_x$$

点积越大，说明用户与电影越「匹配」。为了让点积数值稳定，两个向量在做点积前先进行
**L2 归一化**。

## 1. 导入库与加载数据

加载用户特征 `user_train`、物品特征 `item_train` 与评分
`y_train`，同时读入特征名、电影字典、用户-类型映射等辅助信息。

关键配置：

- `num_user_features` / `num_item_features`：真正进入网络的特征数（去掉
  ID、评分数量等非特征列）。
- `u_s` / `i_s`：训练时实际使用的特征起始列。
- `uvs` / `ivs`：类型向量在完整特征中的起始位置（用于展示）。
- `scaledata`：是否对特征做标准化。

`pprint_train` 以表格形式展示数据样例，方便我们「看懂」每一列的含义。

``` python
# 基于内容的过滤
import numpy as np
import numpy.ma as ma
from numpy import genfromtxt
from collections import defaultdict
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import pandas as pd
import tabulate
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from recsysNN_utils import *
from public_tests import *
pd.set_option("display.precision", 1)

# 加载数据并设置配置变量
item_train, user_train, y_train, item_features, user_features, item_vecs, movie_dict, user_to_genre = load_data()

# 计算特征数量（训练时移除ID等非特征列）
num_user_features = user_train.shape[1] - 3  # 移除用户ID、评分计数和平均评分
num_item_features = item_train.shape[1] - 1  # 移除电影ID
uvs = 3  # 用户类型向量起始位置
ivs = 3  # 物品类型向量起始位置
u_s = 3  # 训练中使用的用户特征起始列
i_s = 1  # 训练中使用的物品特征起始列
scaledata = True  # 是否对数据进行标准化
print(f"训练向量数量: {len(item_train)}")

# 打印训练数据样例
pprint_train(user_train, user_features, uvs,  u_s, maxcount=5)
pprint_train(item_train, item_features, ivs, i_s, maxcount=5, user=False)
print(f"y_train[:5]: {y_train[:5]}")

```

## 2. 特征标准化

不同特征量纲差异很大（例如「评分数量」可能是几百，而「类型」只有
0/1），直接使用会误导梯度下降。这里用 `StandardScaler`
对**参与训练的特征部分**做标准化：

$$z = \frac{x - \mu}{\sigma}$$

并用 `inverse_transform` 验证标准化是可逆的（打印 `True`）。

``` python
# 对训练数据进行标准化
if scaledata:
    item_train_save = item_train
    user_train_save = user_train

    scalerItem = StandardScaler()
    # scalerItem 只拟合用于训练的部分
    scalerItem.fit(item_train[:, i_s:])
    item_train[:, i_s:] = scalerItem.transform(item_train[:, i_s:])

    scalerUser = StandardScaler()
    # scalerUser 只拟合用于训练的部分
    scalerUser.fit(user_train[:, u_s:])
    user_train[:, u_s:] = scalerUser.transform(user_train[:, u_s:])

    # 验证标准化的可逆性
    # 注意：这里也需要只转换和比较用于训练的部分
    print(np.allclose(item_train_save[:, i_s:], scalerItem.inverse_transform(item_train[:, i_s:])))
    print(np.allclose(user_train_save[:, u_s:], scalerUser.inverse_transform(user_train[:, u_s:])))

```

## 3. 划分训练集与测试集

用 `train_test_split` 按 8:2
划分数据。关键点：用户、物品、评分三个矩阵必须用**同一次**划分（同样的
`random_state=1`），保证每个样本的用户-物品对依然对齐。

最后用 `MinMaxScaler` 把评分**归一化到 \[-1,
1\]**，让神经网络输出落在有界范围内，学习更稳定：

$$\tilde y = 2 \cdot \frac{y - y_{min}}{y_{max} - y_{min}} - 1$$

``` python
# 划分训练集和测试集
item_train, item_test = train_test_split(item_train, train_size=0.80, shuffle=True, random_state=1)
user_train, user_test = train_test_split(user_train, train_size=0.80, shuffle=True, random_state=1)
y_train, y_test       = train_test_split(y_train,    train_size=0.80, shuffle=True, random_state=1)
print(f"电影/物品训练数据形状: {item_train.shape}")
print(f"电影/物品测试数据形状: {item_test.shape}")

# 打印标准化后的训练数据样例
pprint_train(user_train, user_features, uvs, u_s, maxcount=5)

# 对评分进行归一化到[-1, 1]范围
scaler = MinMaxScaler((-1, 1))
scaler.fit(y_train.reshape(-1, 1))
ynorm_train = scaler.transform(y_train.reshape(-1, 1))
ynorm_test = scaler.transform(y_test.reshape(-1, 1))
print(ynorm_train.shape, ynorm_test.shape)

```

## 4. 构建用户 / 物品神经网络（双塔结构）

用户网络和物品网络都是三层全连接网络（结构完全相同、参数各自独立）：

``` text
输入特征 → 256 → ReLU → 128 → ReLU → 32 维输出
```

这里有一个实现细节：每个线性层后面手动挂一个 `activation`
属性（`nn.ReLU()` 或
`nn.Identity()`），训练时统一地应用激活函数。这样做既能通过官方的
`test_tower` 单元测试，也让代码结构更清晰。

``` python
# 定义用户和物品的神经网络（完全适配测试函数要求）
num_outputs = 32
torch.manual_seed(1)  # 设置随机种子保证可复现性

# 用户神经网络 - 使用标准的nn.Linear层，并直接附加激活函数实例
user_NN = [
    nn.Linear(num_user_features, 256),
    nn.Linear(256, 128),
    nn.Linear(128, num_outputs)
]

# 物品神经网络 - 使用标准的nn.Linear层
item_NN = [
    nn.Linear(num_item_features, 256),
    nn.Linear(256, 128),
    nn.Linear(128, num_outputs)
]

# 为每个层添加activation属性，值为激活函数的实例（而非类）
# 这样 type(layer.activation) 就会是 nn.ReLU，通过测试
user_NN[0].activation = nn.ReLU()
user_NN[1].activation = nn.ReLU()
user_NN[2].activation = nn.Identity()

item_NN[0].activation = nn.ReLU()
item_NN[1].activation = nn.ReLU()
item_NN[2].activation = nn.Identity()

```

## 5. 定义推荐模型（RecommenderModel）

`RecommenderModel` 把两个「塔」拼起来完成一次预测：

1.  用户输入经过用户网络得到 $u_x$。
2.  物品输入经过物品网络得到 $v_x$。
3.  分别做 **L2 归一化**（把向量缩放到单位长度，使点积稳定）。
4.  计算点积 $u_x \cdot v_x$ 作为预测评分。

归一化后的点积，其几何意义就是 **余弦相似度**：

$$\cos\theta = \frac{u_x \cdot v_x}{\|u_x\|\,\|v_x\|}$$

下面初始化模型、打印网络结构，并运行单元测试。

``` python
# 定义完整模型
class RecommenderModel(nn.Module):
    def __init__(self, user_layers, item_layers):
        super(RecommenderModel, self).__init__()
        # 将列表形式的层转换为ModuleList，使其能被PyTorch识别
        self.user_layers = nn.ModuleList(user_layers)
        self.item_layers = nn.ModuleList(item_layers)
        
    def forward(self, user_input, item_input):
        # 计算用户嵌入（应用线性层和对应的激活函数）
        ux = user_input
        for layer in self.user_layers:
            ux = layer(ux)  # 应用线性变换
            ux = layer.activation(ux)  # 直接调用附加的激活函数实例
            
        # 计算物品嵌入（应用线性层和对应的激活函数）
        ix = item_input
        for layer in self.item_layers:
            ix = layer(ix)  # 应用线性变换
            ix = layer.activation(ix)  # 直接调用附加的激活函数实例
                
        # L2归一化
        ux = nn.functional.normalize(ux, p=2, dim=1)
        ix = nn.functional.normalize(ix, p=2, dim=1)
        
        # 计算点积作为输出
        output = torch.sum(ux * ix, dim=1, keepdim=True)
        return output

# 初始化模型
model = RecommenderModel(user_NN, item_NN)

# 打印模型结构
print("用户网络结构:")
for i, layer in enumerate(user_NN):
    print(f"第{i+1}层: {layer}，激活函数: {type(layer.activation).__name__}")
print("\n物品网络结构:")
for i, layer in enumerate(item_NN):
    print(f"第{i+1}层: {layer}，激活函数: {type(layer.activation).__name__}")


test_tower(user_NN)
test_tower(item_NN)

```

## 6. 准备数据加载器与优化器

`prepare_data` 把 numpy 数据封装成 `TensorDataset` 和 `DataLoader`，按
`batch_size=64` 分批次、随机打乱，供训练时使用。

损失函数用**均方误差（MSE）**，优化器用 Adam（学习率 0.01）。

``` python
# 准备数据加载器
def prepare_data(user_data, item_data, labels, batch_size=64):
    # 转换为PyTorch张量
    user_tensor = torch.FloatTensor(user_data)
    item_tensor = torch.FloatTensor(item_data)
    labels_tensor = torch.FloatTensor(labels)
    
    # 创建数据集和数据加载器
    dataset = TensorDataset(user_tensor, item_tensor, labels_tensor)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    return dataloader

# 准备训练和测试数据
train_loader = prepare_data(
    user_train[:, u_s:], 
    item_train[:, i_s:], 
    ynorm_train
)

test_loader = prepare_data(
    user_test[:, u_s:], 
    item_test[:, i_s:], 
    ynorm_test
)

# 设置损失函数和优化器
cost_fn = nn.MSELoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

```

## 7. 训练与评估

标准的训练循环：每个 epoch 遍历全部小批量，执行「前向 → 反向 →
更新」，并打印平均损失。训练 30 个 epoch
后，在测试集上评估模型的泛化能力：

``` text
Epoch 1/30, 平均损失: 0.14XX
...
测试集平均损失: 0.08XX
```

训练损失持续下降、测试损失与训练损失接近，说明模型没有明显过拟合。

``` python
# 训练模型
torch.manual_seed(1)
epochs = 30

for epoch in range(epochs):
    model.train()  # 训练模式
    total_loss = 0
    
    for user_batch, item_batch, label_batch in train_loader:
        # 前向传播
        outputs = model(user_batch, item_batch)
        loss = cost_fn(outputs, label_batch)
        
        # 反向传播和优化
        optimizer.zero_grad()  # 清零梯度
        loss.backward()        # 反向传播
        optimizer.step()       # 更新参数
        
        total_loss += loss.item()
    
    # 打印每轮的平均损失
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch {epoch+1}/{epochs}, 平均损失: {avg_loss:.4f}")

# 在测试集上评估模型
model.eval()  # 评估模式
test_loss = 0

with torch.no_grad():  # 不计算梯度
    for user_batch, item_batch, label_batch in test_loader:
        outputs = model(user_batch, item_batch)
        loss = cost_fn(outputs, label_batch)
        test_loss += loss.item()

avg_test_loss = test_loss / len(test_loader)
print(f"测试集平均损失: {avg_test_loss:.4f}")

```

## 8. 为新用户生成推荐

模拟一个只看过 3
部电影的新用户：他尤其喜欢**喜剧、爱情、科幻**（这些类型偏好设为 5）。

- `gen_user_vecs` 把用户向量复制成与物品数量相同的矩阵。
- `predict_uservec` 对所有电影预测评分并降序排序。
- `print_pred_movies` 展示 Top 10 推荐。

可以看到推荐结果基本都是喜剧 / 爱情 / 科幻片，完全符合这个用户的画像。

``` python
# 后续推荐生成和相似度计算代码保持不变...
# 创建新用户并生成推荐
new_user_id = 5000
new_rating_ave = 1.0
new_action = 1.0
new_adventure = 1
new_animation = 1
new_childrens = 1
new_comedy = 5
new_crime = 1
new_documentary = 1
new_drama = 1
new_fantasy = 1
new_horror = 1
new_mystery = 1
new_romance = 5
new_scifi = 5
new_thriller = 1
new_rating_count = 3

# 新用户特征向量
user_vec = np.array([[new_user_id, new_rating_count, new_rating_ave,
                      new_action, new_adventure, new_animation, new_childrens,
                      new_comedy, new_crime, new_documentary,
                      new_drama, new_fantasy, new_horror, new_mystery,
                      new_romance, new_scifi, new_thriller]])

# 生成与物品数量匹配的用户向量
user_vecs = gen_user_vecs(user_vec, len(item_vecs))

# 预测并排序推荐结果
sorted_index, sorted_ypu, sorted_items, sorted_user = predict_uservec(
    user_vecs, item_vecs, model, u_s, i_s, 
    scaler, scalerUser, scalerItem, scaledata=scaledata
)

# 打印推荐结果
print_pred_movies(sorted_ypu, sorted_user, sorted_items, movie_dict, maxcount=10)

```

## 9. 为已有用户生成推荐

对训练集中的真实用户（`uid=36`）做推荐。

注意这里先把 `user_train` 中**被缩放过的部分**用
`scalerUser.inverse_transform` 还原，再拼回完整向量，确保
`get_user_vecs` 拿到的是原始量纲的数据（因为 `user_train`
此时已经被标准化覆盖了）。

`print_existing_user` 会把「预测评分 vs
实际评分」一起展示，验证模型在已知评分上的表现。

``` python
# 为已有用户生成推荐
uid = 36 
# 获取用户向量

# 正确地逆变换用户训练数据
# 1. 逆变换被缩放的部分
user_train_unscaled_part = scalerUser.inverse_transform(user_train[:, u_s:])
# 2. 拼接未被缩放的部分和逆变换后的部分，形成完整的未缩放数据
full_user_train_unscaled = np.concatenate((user_train[:, :u_s], user_train_unscaled_part), axis=1)

# 获取用户向量
user_vecs, y_vecs = get_user_vecs(uid, full_user_train_unscaled, item_vecs, user_to_genre)

# 预测并排序推荐结果
sorted_index, sorted_ypu, sorted_items, sorted_user = predict_uservec(
    user_vecs, item_vecs, model, u_s, i_s, scaler, 
    scalerUser, scalerItem, scaledata=scaledata
)
sorted_y = y_vecs[sorted_index]

# 打印已有用户的推荐结果
print_existing_user(
    sorted_ypu, sorted_y.reshape(-1,1), sorted_user, 
    sorted_items, item_features, ivs, uvs, movie_dict, maxcount=10
)

```

## 10. 相似电影搜索：嵌入向量的魅力

训练好的物品网络可以当作一个「特征提取器」：每部电影被映射为 32
维向量，**语义相近的电影会在向量空间里彼此靠近**。

先定义**平方距离**来衡量两个向量的接近程度：

$$d(a,b) = \|a - b\|^2 = \sum_k (a_k - b_k)^2$$

并用单元测试和示例验证：相同向量距离为 0，越相似的向量距离越小。

``` python
# 定义平方距离函数
def sq_dist(a, b):
    """
    计算两个向量之间的平方距离
    参数:
      a (ndarray (n,)): 具有n个特征的向量
      b (ndarray (n,)): 具有n个特征的向量
    返回:
      d (float) : 平方距离
    """
    diff = a - b
    d = np.dot(diff, diff)
    return d

# 测试平方距离函数
test_sq_dist(sq_dist)

# 测试示例
a1 = np.array([1.0, 2.0, 3.0]); b1 = np.array([1.0, 2.0, 3.0])
a2 = np.array([1.1, 2.1, 3.1]); b2 = np.array([1.0, 2.0, 3.0])
a3 = np.array([0, 1, 0]);       b3 = np.array([1, 0, 0])
print(f"a1和b1的平方距离: {sq_dist(a1, b1)}")
print(f"a2和b2的平方距离: {sq_dist(a2, b2)}")
print(f"a3和b3的平方距离: {sq_dist(a3, b3)}")

```

### 10.1 计算所有电影的嵌入向量

用与训练时相同的 `scalerItem`
对物品特征做标准化，再喂给物品网络（`model_m`），得到所有电影的嵌入向量
`vms`。

``` python
# 创建物品嵌入模型（用于计算物品间相似度）
class ItemEmbeddingModel(nn.Module):
    def __init__(self, item_layers):
        super(ItemEmbeddingModel, self).__init__()
        self.item_layers = nn.ModuleList(item_layers)
        
    def forward(self, x):
        for layer in self.item_layers:
            x = layer(x)
            x = layer.activation(x) # 直接调用附加的激活函数实例
        return nn.functional.normalize(x, p=2, dim=1)

# 初始化物品嵌入模型
model_m = ItemEmbeddingModel(item_NN)

# 计算所有物品的嵌入向量
scaled_item_vecs = scalerItem.transform(item_vecs[:, i_s:])
item_features_tensor = torch.FloatTensor(scaled_item_vecs)

model_m.eval()
with torch.no_grad():
    vms = model_m(item_features_tensor).numpy()

print(f"所有预测的电影特征向量大小: {vms.shape}")

```

### 10.2 相似度矩阵与结果展示

计算任意两部电影嵌入向量的平方距离，构造**距离矩阵**；屏蔽对角线（自己与自己的距离为
0）后，对每部电影找出**距离最近**的另一部电影。

结果以 HTML 表格展示并保存为
`movie_similarity.html`。你会看到《指环王》《哈利·波特》这类气质相近的影片被排在了一起——这正是嵌入向量语义能力的直观体现。

``` python
# 计算物品间的距离矩阵
count = 50
dim = len(vms)
dist = np.zeros((dim, dim))

for i in range(dim):
    for j in range(dim):
        dist[i, j] = sq_dist(vms[i, :], vms[j, :])

# 屏蔽对角线（自身距离为0）
m_dist = ma.masked_array(dist, mask=np.identity(dist.shape[0]))

# 展示相似电影
disp = [["电影1", "类型", "电影2", "类型"]]
for i in range(count):
    min_idx = np.argmin(m_dist[i])
    movie1_id = int(item_vecs[i, 0])
    movie2_id = int(item_vecs[min_idx, 0])
    genre1, _ = get_item_genre(item_vecs[i, :], ivs, item_features)
    genre2, _ = get_item_genre(item_vecs[min_idx, :], ivs, item_features)

    disp.append([movie_dict[movie1_id]['title'], genre1,
                 movie_dict[movie2_id]['title'], genre2])

# 打印结果表格
table = tabulate.tabulate(disp, tablefmt='html', headers="firstrow")
print(table)
with open("movie_similarity.html", "w", encoding="utf-8") as f:
    f.write(table)

print("表格已保存为 movie_similarity.html，请用浏览器打开查看")
```
