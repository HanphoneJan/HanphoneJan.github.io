---
title: collaborative_filtering
_synced: true
---


``` python
# 协同过滤
import numpy as np
import torch
from recsys_utils import *  # 导入推荐系统工具函数（如数据加载、电影列表处理等）

# 加载预计算的参数和评分数据
# X: 电影特征矩阵，W: 用户参数矩阵，b: 用户偏置项
# num_movies: 电影数量，num_features: 特征维度，num_users: 用户数量
X, W, b, num_movies, num_features, num_users = load_precalc_params_small()
# Y: 评分矩阵（行=电影，列=用户，值=评分），R: 指示矩阵（1=有评分，0=无评分）
Y, R = load_ratings_small()

# 打印数据维度，验证数据加载正确性
print("Y的形状", Y.shape, "R的形状", R.shape)  # 应均为 (电影数, 用户数)
print("X的形状", X.shape)  # (电影数, 特征数)
print("W的形状", W.shape)  # (用户数, 特征数)
print("b的形状", b.shape)  # (1, 用户数)
print("特征数量", num_features)
print("电影数量", num_movies)
print("用户数量", num_users)


# 计算统计量示例：电影1的平均评分
# R[0, :].astype(bool) 筛选出对电影1评过分的用户
tsmean = np.mean(Y[0, R[0, :].astype(bool)])
print(f"电影1的平均评分为: {tsmean:0.3f} / 5")

# 协同过滤成本函数（numpy实现）
def cofi_cost_func(X, W, b, Y, R, lambda_):
    """
    计算协同过滤的损失值，包含预测误差和正则化项
    参数:
      X: 电影特征矩阵 (电影数, 特征数)
      W: 用户参数矩阵 (用户数, 特征数)
      b: 用户偏置向量 (1, 用户数)
      Y: 实际评分矩阵 (电影数, 用户数)
      R: 指示矩阵 (电影数, 用户数)，标记有评分的位置
      lambda_: 正则化系数，控制过拟合
    返回:
      J: 总损失值
    """
    nm, nu = Y.shape  # nm=电影数，nu=用户数
    J = 0
    
    # 1. 计算预测评分：X与W的转置点积 + 偏置b（形状为 (电影数, 用户数)）
    predictions = X @ W.T + b  
    # 2. 仅计算有实际评分的误差（用R过滤未评分项）
    errors = (predictions - Y) * R
    # 3. 计算平方误差和的一半（基础损失）
    J = 0.5 * np.sum(errors **2)
    
    # 4. 添加正则化项（防止X和W参数过大）
    J += (lambda_ / 2) * (np.sum(X** 2) + np.sum(W ** 2))
    
    return J

# 测试成本函数正确性（使用公开测试用例）
from public_tests import *
test_cofi_cost_func(cofi_cost_func)

# 缩小数据集以加速测试（取部分电影、用户和特征）
num_users_r = 4
num_movies_r = 5 
num_features_r = 3

X_r = X[:num_movies_r, :num_features_r]  # 截取前5部电影，前3个特征
W_r = W[:num_users_r,  :num_features_r]  # 截取前4个用户，前3个特征
b_r = b[0, :num_users_r].reshape(1,-1)   # 截取前4个用户的偏置
Y_r = Y[:num_movies_r, :num_users_r]     # 截取对应评分矩阵
R_r = R[:num_movies_r, :num_users_r]     # 截取对应指示矩阵

# 测试无正则化的损失
J = cofi_cost_func(X_r, W_r, b_r, Y_r, R_r, 0);
print(f"成本值: {J:0.2f}")

# 测试有正则化的损失（值应更大）
J = cofi_cost_func(X_r, W_r, b_r, Y_r, R_r, 1.5);
print(f"带正则化的成本值: {J:0.2f}")

# 协同过滤成本函数（PyTorch向量化版本，用于高效训练）
def cofi_cost_func_v(X, W, b, Y, R, lambda_):
    """
    功能同cofi_cost_func，但使用PyTorch张量操作，支持自动求导
    参数:
      X: 电影特征张量 (电影数, 特征数)
      W: 用户参数张量 (用户数, 特征数)
      b: 用户偏置张量 (1, 用户数)
      Y: 实际评分张量 (电影数, 用户数)
      R: 指示张量 (电影数, 用户数)
      lambda_: 正则化系数
    返回:
      J: 总损失张量
    """
    # 1. 计算预测误差（仅包含有评分的项）
    j = (torch.matmul(X, W.t()) + b - Y) * R  # torch.matmul等价于矩阵乘法
    # 2. 计算带正则化的总损失
    J = 0.5 * torch.sum(j**2) + (lambda_/2) * (torch.sum(X**2) + torch.sum(W**2))
    return J

# 将缩小的数据集转换为PyTorch张量（适配向量化函数）
X_r_torch = torch.tensor(X_r, dtype=torch.float64)
W_r_torch = torch.tensor(W_r, dtype=torch.float64)
b_r_torch = torch.tensor(b_r, dtype=torch.float64)
Y_r_torch = torch.tensor(Y_r, dtype=torch.float64)
R_r_torch = torch.tensor(R_r, dtype=torch.float64)

# 测试向量化版本的无正则化损失（应与numpy版本一致）
J = cofi_cost_func_v(X_r_torch, W_r_torch, b_r_torch, Y_r_torch, R_r_torch, 0);
print(f"向量化成本值: {J.item():0.2f}")

# 测试向量化版本的有正则化损失
J = cofi_cost_func_v(X_r_torch, W_r_torch, b_r_torch, Y_r_torch, R_r_torch, 1.5);
print(f"带正则化的向量化成本值: {J.item():0.2f}")

# 加载电影列表（包含电影ID和名称对应关系）
movieList, movieList_df = load_Movie_List_pd()

# 初始化新用户（当前用户）的评分向量（初始全为0）
my_ratings = np.zeros(num_movies)         

# 手动为部分电影评分（根据电影ID，可在small_movie_list.csv中查询）
my_ratings[2700] = 5  # 《玩具总动员3》(2010)
my_ratings[2609] = 2  # 《劝导》(2007)
my_ratings[929]  = 5   # 《指环王3：王者归来》
my_ratings[246]  = 5   # 《怪物史莱克》(2001)
my_ratings[2716] = 3   # 《盗梦空间》
my_ratings[1150] = 5   # 《超人总动员》(2004)
my_ratings[382]  = 2   # 《天使爱美丽》
my_ratings[366]  = 5   # 《哈利·波特与魔法石》(2001)
my_ratings[622]  = 5   # 《哈利·波特与密室》(2002)
my_ratings[988]  = 3   # 《美丽心灵的永恒阳光》(2004)
my_ratings[2925] = 1   # 《路易斯·泰鲁：法律与秩序》(2008)
my_ratings[2937] = 1   # 《无需申报》
my_ratings[793]  = 5   # 《加勒比海盗：黑珍珠号的诅咒》(2003)

# 获取所有已评分的电影索引（用于后续排除已评分电影）
my_rated = [i for i in range(len(my_ratings)) if my_ratings[i] > 0]

# 打印当前用户的评分记录
print('\n新用户评分：\n')
for i in range(len(my_ratings)):
    if my_ratings[i] > 0 :
        print(f'为 {movieList_df.loc[i,"title"]} 打了 {my_ratings[i]} 分');


# 将新用户的评分添加到原有数据集
Y, R = load_ratings_small()  # 重新加载原始评分数据
Y    = np.c_[my_ratings, Y]  # 在Y的第一列添加当前用户的评分（成为新用户）
R    = np.c_[(my_ratings != 0).astype(int), R]  # 更新指示矩阵（标记新用户的评分位置）

# 标准化评分数据（减去每个电影的平均评分，避免用户打分习惯偏差）
Ynorm, Ymean = normalizeRatings(Y, R)


# 模型训练参数设置
num_movies, num_users = Y.shape  # 此时用户数已包含新用户
num_features = 100  # 特征维度（潜在因子数量）

# 初始化模型参数（X:电影特征，W:用户参数，b:偏置），使用PyTorch的Parameter以便跟踪梯度
torch.manual_seed(1234)  # 设置随机种子，确保结果可重现
W = torch.nn.Parameter(torch.randn((num_users, num_features), dtype=torch.float64))
X = torch.nn.Parameter(torch.randn((num_movies, num_features), dtype=torch.float64))
b = torch.nn.Parameter(torch.randn((1, num_users), dtype=torch.float64))

# 定义优化器（使用Adam算法，学习率0.1）
optimizer = torch.optim.Adam([X, W, b], lr=1e-1)

# 转换数据为PyTorch张量（提前转换以提高训练效率）
Ynorm_tensor = torch.tensor(Ynorm, dtype=torch.float64)
R_tensor = torch.tensor(R, dtype=torch.float64)

# 训练模型
iterations = 200  # 迭代次数
lambda_ = 1       # 正则化系数
for iter in range(iterations):
    # 清零梯度（避免累积上一轮的梯度）
    optimizer.zero_grad()
    
    # 计算当前损失（前向传播）
    cost_value = cofi_cost_func_v(X, W, b, Ynorm_tensor, R_tensor, lambda_)
    
    # 反向传播计算梯度
    cost_value.backward()
    
    # 更新参数（根据梯度调整X, W, b）
    optimizer.step()
    
    # 每20次迭代打印一次损失，观察训练进度
    if iter % 20 == 0:
        print(f"第 {iter} 次迭代的训练损失: {cost_value.item():0.1f}")

# 使用训练好的模型进行预测
with torch.no_grad():  # 关闭梯度计算，节省资源
    # 计算预测评分（标准化后的结果）
    p = torch.matmul(X, W.t()) + b
    # 将标准化评分还原（加上电影平均评分Ymean）
    pm = p.numpy() + Ymean
    # 提取对新用户（第一列）的预测评分
    my_predictions = pm[:, 0]

# 对预测结果按评分降序排序（获取推荐优先级）
ix = np.argsort(my_predictions)[::-1]  # [::-1]实现降序

# 打印推荐电影（排除已评分的电影，取前17部）
print("\n推荐电影：")
count = 0
for i in range(len(ix)):
    j = ix[i]
    if j not in my_rated:  # 跳过已评分的电影
        print(f'预测评分为 {my_predictions[j]:0.2f} 的电影：{movieList[j]}')
        count += 1
        if count >= 17:
            break

# 对比原始评分与模型预测评分（验证模型对已知评分的拟合效果）
print('\n\n原始评分与预测评分对比：\n')
for i in range(len(my_ratings)):
    if my_ratings[i] > 0:
        print(f'原始评分 {my_ratings[i]}, 预测评分 {my_predictions[i]:0.2f} 的电影：{movieList[i]}')

# 进一步筛选高质量推荐：仅保留有超过20个评分的电影（排除冷门电影）
filter_mask = (movieList_df["number of ratings"] > 20)
movieList_df["pred"] = my_predictions  # 添加预测评分到DataFrame
# 保留需要的列：预测评分、平均评分、评分数量、电影名称
movieList_df = movieList_df.reindex(columns=["pred", "mean rating", "number of ratings", "title"])
# 显示前300个预测结果中符合筛选条件、且按平均评分降序排列的电影
print("\n推荐电影列表（按平均评分排序）：")
print(movieList_df.loc[ix[:300]].loc[filter_mask].sort_values("mean rating", ascending=False))
```
