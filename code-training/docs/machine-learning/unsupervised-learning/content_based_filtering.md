---
title: content_based_filtering
_synced: true
---


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

    Y的形状 (4778, 443) R的形状 (4778, 443)
    X的形状 (4778, 10)
    W的形状 (443, 10)
    b的形状 (1, 443)
    特征数量 10
    电影数量 4778
    用户数量 443
    电影1的平均评分为: 3.400 / 5
    All tests passed!
    成本值: 13.67
    带正则化的成本值: 28.09
    向量化成本值: 13.67
    带正则化的向量化成本值: 28.09

    新用户评分：

    为 Shrek (2001) 打了 5.0 分
    为 Harry Potter and the Sorcerer's Stone (a.k.a. Harry Potter and the Philosopher's Stone) (2001) 打了 5.0 分
    为 Amelie (Fabuleux destin d'Amélie Poulain, Le) (2001) 打了 2.0 分
    为 Harry Potter and the Chamber of Secrets (2002) 打了 5.0 分
    为 Pirates of the Caribbean: The Curse of the Black Pearl (2003) 打了 5.0 分
    为 Lord of the Rings: The Return of the King, The (2003) 打了 5.0 分
    为 Eternal Sunshine of the Spotless Mind (2004) 打了 3.0 分
    为 Incredibles, The (2004) 打了 5.0 分
    为 Persuasion (2007) 打了 2.0 分
    为 Toy Story 3 (2010) 打了 5.0 分
    为 Inception (2010) 打了 3.0 分
    为 Louis Theroux: Law & Disorder (2008) 打了 1.0 分
    为 Nothing to Declare (Rien à déclarer) (2010) 打了 1.0 分
    第 0 次迭代的训练损失: 2238692.4
    第 20 次迭代的训练损失: 130489.9
    第 40 次迭代的训练损失: 49017.1
    第 60 次迭代的训练损失: 22979.1
    第 80 次迭代的训练损失: 12655.6
    第 100 次迭代的训练损失: 7879.2
    第 120 次迭代的训练损失: 5413.5
    第 140 次迭代的训练损失: 4046.8
    第 160 次迭代的训练损失: 3252.1
    第 180 次迭代的训练损失: 2772.4

    推荐电影：
    预测评分为 4.41 的电影：Into the Forest of Fireflies' Light (2011)
    预测评分为 4.40 的电影：Palindromes (2004)
    预测评分为 4.38 的电影：Battle Royale 2: Requiem (Batoru rowaiaru II: Chinkonka) (2003)
    预测评分为 4.38 的电影：Into the Abyss (2011)
    预测评分为 4.38 的电影：Eichmann (2007)
    预测评分为 4.38 的电影：61* (2001)
    预测评分为 4.37 的电影：Raise Your Voice (2004)
    预测评分为 4.37 的电影：What Love Is (2007)
    预测评分为 4.37 的电影：Kung Fu Panda: Secrets of the Masters (2011)
    预测评分为 4.37 的电影：One I Love, The (2014)
    预测评分为 4.37 的电影：I'm the One That I Want (2000)
    预测评分为 4.37 的电影：My Life as McDull (Mak dau goo si) (2001)
    预测评分为 4.37 的电影：Ghost Graduation (2012)
    预测评分为 4.37 的电影：Particle Fever (2013)
    预测评分为 4.36 的电影：Strictly Sexual (2008)
    预测评分为 4.36 的电影：Loving Vincent (2017)
    预测评分为 4.36 的电影：George Carlin: It's Bad for Ya! (2008)


    原始评分与预测评分对比：

    原始评分 5.0, 预测评分 4.98 的电影：Shrek (2001)
    原始评分 5.0, 预测评分 4.82 的电影：Harry Potter and the Sorcerer's Stone (a.k.a. Harry Potter and the Philosopher's Stone) (2001)
    原始评分 2.0, 预测评分 2.07 的电影：Amelie (Fabuleux destin d'Amélie Poulain, Le) (2001)
    原始评分 5.0, 预测评分 4.89 的电影：Harry Potter and the Chamber of Secrets (2002)
    原始评分 5.0, 预测评分 4.84 的电影：Pirates of the Caribbean: The Curse of the Black Pearl (2003)
    原始评分 5.0, 预测评分 4.94 的电影：Lord of the Rings: The Return of the King, The (2003)
    原始评分 3.0, 预测评分 3.00 的电影：Eternal Sunshine of the Spotless Mind (2004)
    原始评分 5.0, 预测评分 4.90 的电影：Incredibles, The (2004)
    原始评分 2.0, 预测评分 2.09 的电影：Persuasion (2007)
    原始评分 5.0, 预测评分 4.81 的电影：Toy Story 3 (2010)
    原始评分 3.0, 预测评分 3.07 的电影：Inception (2010)
    原始评分 1.0, 预测评分 1.38 的电影：Louis Theroux: Law & Disorder (2008)
    原始评分 1.0, 预测评分 1.24 的电影：Nothing to Declare (Rien à déclarer) (2010)

    推荐电影列表（按平均评分排序）：
              pred  mean rating  number of ratings  \
    1743  4.000334     4.252336                107   
    155   3.895236     4.155914                 93   
    2395  4.056169     4.136364                 88   
    929   4.938721     4.118919                185   
    2700  4.812631     4.109091                 55   
    393   3.937306     4.106061                198   
    848   3.940164     4.033784                 74   
    3802  3.914530     4.020000                 50   
    2420  4.035387     4.004762                105   
    877   4.309668     3.961832                131   
    773   3.936267     3.960993                141   
    1051  3.866062     3.913978                 93   
    2967  3.873427     3.910000                 50   
    2455  4.045932     3.887931                 58   
    3014  3.922532     3.869565                 69   
    246   4.981457     3.867647                170   
    1930  4.116639     3.862069                 58   
    1150  4.898574     3.836000                125   
    1081  4.310168     3.803797                 79   
    793   4.838989     3.778523                149   
    366   4.821752     3.761682                107   
    622   4.890206     3.598039                102   

                                                      title  
    1743                               Departed, The (2006)  
    155                                       Snatch (2000)  
    2395                        Inglourious Basterds (2009)  
    929   Lord of the Rings: The Return of the King, The...  
    2700                                 Toy Story 3 (2010)  
    393   Lord of the Rings: The Fellowship of the Ring,...  
    848                          Lost in Translation (2003)  
    3802                          The Imitation Game (2014)  
    2420                                          Up (2009)  
    877                            Kill Bill: Vol. 1 (2003)  
    773                                 Finding Nemo (2003)  
    1051    Harry Potter and the Prisoner of Azkaban (2004)  
    2967  Harry Potter and the Deathly Hallows: Part 2 (...  
    2455      Harry Potter and the Half-Blood Prince (2009)  
    3014                               Avengers, The (2012)  
    246                                        Shrek (2001)  
    1930   Harry Potter and the Order of the Phoenix (2007)  
    1150                            Incredibles, The (2004)  
    1081                                Spider-Man 2 (2004)  
    793   Pirates of the Caribbean: The Curse of the Bla...  
    366   Harry Potter and the Sorcerer's Stone (a.k.a. ...  
    622      Harry Potter and the Chamber of Secrets (2002)  
