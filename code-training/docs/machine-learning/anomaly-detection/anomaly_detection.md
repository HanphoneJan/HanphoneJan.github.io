---
title: 异常检测：基于高斯分布
_synced: true
---
# 异常检测：基于高斯分布


**异常检测（Anomaly Detection）**
用于发现数据中「不太一样」的样本，在工业质检、服务器监控、欺诈识别等场景非常常见。

核心思想：先用**正常数据**拟合一个概率模型（这里用高斯分布），然后认为**出现概率极低的样本就是异常点**。

流程如下：

1.  用训练集估计每个特征的均值 $\mu$ 和方差 $\sigma^2$，得到高斯分布；
2.  计算每个样本在该分布下的概率密度 $p(x)$；
3.  设置阈值 $\epsilon$，概率低于阈值的样本判为异常。

本笔记基于服务器监控场景：每个样本用「延迟（ms）」和「吞吐量（mb/s）」两个特征描述，找出运行异常（如服务器故障）的时刻。

## 1. 导入工具库与数据集

导入所需库。`utils`
模块提供数据加载、多元高斯概率密度计算（`multivariate_gaussian`）与拟合可视化（`visualize_fit`）等辅助函数。

- `X_train`：训练集，用于估计高斯分布参数；
- `X_val`、`y_val`：交叉验证集，用于挑选最佳阈值（`y_val` 中 `1` =
  异常，`0` = 正常）。

画出训练集散点图，可以看到绝大多数点聚集在左下角区域，右上角有两个「离群」的点——这正是我们要找的异常。

``` python
import numpy as np
import matplotlib.pyplot as plt
from utils import *

%matplotlib inline
# 设置中文字体
plt.rcParams["font.family"] = ["sans-serif","SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号

# 加载数据集
X_train, X_val, y_val = load_data()

print('X_train的形状是:', X_train.shape)
print('X_val的形状是:', X_val.shape)
print('y_val的形状是: ', y_val.shape)

# 创建数据的散点图，使用蓝色"x"作为标记
plt.scatter(X_train[:, 0], X_train[:, 1], marker='x', c='b') 

# 设置标题
plt.title("第一个数据集")
# 设置y轴标签
plt.ylabel('吞吐量 (mb/s)')
# 设置x轴标签
plt.xlabel('延迟 (ms)')
# 设置坐标轴范围
plt.axis([0, 30, 0, 30])
plt.show()

```

## 2. 估计高斯分布参数

假设每个特征独立地服从高斯分布，需要估计它的参数——**均值 $\mu$**
和**方差 $\sigma^2$**：

$$\mu_j = \frac{1}{m}\sum_{i=1}^{m} x^{(i)}_j, \qquad \sigma^2_j = \frac{1}{m}\sum_{i=1}^{m} \left(x^{(i)}_j - \mu_j\right)^2$$

实现要点：

- `np.mean(X, axis=0)` 沿样本轴（第 0 轴）求每个特征的均值；
- `np.var(X, axis=0)` 求每个特征的方差，注意这里用**总体方差**（除以 $m$
  而不是 $m-1$）。

``` python
def estimate_gaussian(X): 
    """
    计算数据集中所有特征的均值和方差
    
    参数:
        X (ndarray): (m, n) 数据矩阵，m个样本，n个特征
    
    返回:
        mu (ndarray): (n,) 每个特征的均值
        var (ndarray): (n,) 每个特征的方差
    """

    m, n = X.shape  # m是样本数，n是特征数
    
    ### 开始代码 ###
    # 计算每个特征的均值（沿样本轴计算）
    mu = np.mean(X, axis=0)
    # 计算每个特征的方差（使用总体方差，除以m而非m-1）
    var = np.var(X, axis=0)
    ### 结束代码 ###
        
    return mu, var

```

### 拟合与可视化

用 `estimate_gaussian` 估计出训练集的均值与方差，再用
`multivariate_gaussian`
计算每个样本的概率密度，并通过等高线画出高斯分布的拟合效果：越靠近中心，概率密度越高。

``` python
# 估计训练集的高斯分布参数
mu, var = estimate_gaussian(X_train)              

print("每个特征的均值:", mu)
print("每个特征的方差:", var)
    
# 单元测试
from public_tests import estimate_gaussian_test
estimate_gaussian_test(estimate_gaussian)

# 计算训练集样本的多元高斯概率密度
p = multivariate_gaussian(X_train, mu, var)

# 可视化高斯分布拟合结果
visualize_fit(X_train, mu, var)

```

## 3. 用交叉验证选择阈值

有了概率密度，还需要一个阈值 $\epsilon$ 来判断异常。`select_threshold`
的做法：

- 在验证集上遍历 1000 个候选阈值；
- 对每个阈值，把概率低于它的样本预测为异常；
- 用 **F1 分数** 衡量预测效果，选出 F1 最高的阈值。

评价指标说明：

- **真阳性 TP**：真实异常且被判为异常；
- **假阳性 FP**：正常样本被误判为异常；
- **假阴性 FN**：异常样本被漏掉；
- 精确率 $Precision = \frac{TP}{TP+FP}$，召回率
  $Recall = \frac{TP}{TP+FN}$；
- $$F1 = 2 \cdot \frac{Precision \cdot Recall}{Precision + Recall}$$

F1 同时兼顾精确率与召回率，特别适合异常检测这种正样本很少的场景。

``` python
def select_threshold(y_val, p_val): 
    """
    基于验证集的概率结果(p_val)和真实标签(y_val)找到最佳异常检测阈值
    
    参数:
        y_val (ndarray): 验证集的真实标签（1表示异常，0表示正常）
        p_val (ndarray): 验证集样本的概率密度
        
    返回:
        epsilon (float): 选择的阈值
        F1 (float): 使用该阈值得到的F1分数
    """ 

    best_epsilon = 0
    best_F1 = 0
    F1 = 0
    
    # 计算步长，将概率范围分为1000个区间
    step_size = (max(p_val) - min(p_val)) / 1000
    
    # 遍历所有可能的阈值
    for epsilon in np.arange(min(p_val), max(p_val), step_size):
    
        ### 开始代码 ###
        # 预测异常：概率小于阈值的为异常(1)，否则为正常(0)
        predictions = (p_val < epsilon).astype(int)
        
        # 计算真阳性(TP)：真实异常且被预测为异常
        TP = np.sum((predictions == 1) & (y_val == 1))
        # 计算假阳性(FP)：真实正常但被预测为异常
        FP = np.sum((predictions == 1) & (y_val == 0))
        # 计算假阴性(FN)：真实异常但被预测为正常
        FN = np.sum((predictions == 0) & (y_val == 1))
        
        # 计算精确率(precision)和召回率(recall)
        precision = TP / (TP + FP) if (TP + FP) > 0 else 0
        recall = TP / (TP + FN) if (TP + FN) > 0 else 0
        
        # 计算F1分数
        F1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        ### 结束代码 ###
        
        # 更新最佳阈值和对应的F1分数
        if F1 > best_F1:
            best_F1 = F1
            best_epsilon = epsilon
        
    return best_epsilon, best_F1

```

### 选择最佳阈值并标记异常点

计算验证集样本的概率密度，用交叉验证选出最佳阈值
$\epsilon$，然后在训练集上找出概率小于 $\epsilon$
的异常点，用红色圆圈标出。可以看到之前观察到的两个离群点被成功识别。

``` python
# 计算验证集样本的概率密度
p_val = multivariate_gaussian(X_val, mu, var)
# 选择最佳阈值
epsilon, F1 = select_threshold(y_val, p_val)

print('通过交叉验证找到的最佳阈值: %e' % epsilon)
print('交叉验证集上的最佳F1分数: %f' % F1)
    
# 单元测试
from public_tests import select_threshold_test
select_threshold_test(select_threshold)

# 找到训练集中的异常点
outliers = p < epsilon

# 可视化拟合结果
visualize_fit(X_train, mu, var)

# 用红色圆圈标记异常点
plt.plot(X_train[outliers, 0], X_train[outliers, 1], 'ro',
         markersize=10, markerfacecolor='none', markeredgewidth=2)

```

## 4. 高维数据的异常检测

第一个数据集只有 2
个特征，可以直接画图观察。但实际应用中特征往往成百上千（这里是 11
维），无法可视化。好在我们的算法完全不受维度限制：

- 直接对 11 维训练集估计高斯参数；
- 计算训练集与验证集的概率密度；
- 用交叉验证选出最佳阈值，再统计训练集中的异常点数量。

打印结果显示阈值极小（约 $1.4 \times 10^{-18}$），共发现 117
个异常点——说明这套方法在高维场景下同样有效。

``` python
# 加载高维数据集
X_train_high, X_val_high, y_val_high = load_data_multi()

print('X_train_high的形状是:', X_train_high.shape)
print('X_val_high的形状是:', X_val_high.shape)
print('y_val_high的形状是: ', y_val_high.shape)

# 估计高维数据的高斯分布参数
mu_high, var_high = estimate_gaussian(X_train_high)

# 计算训练集的概率密度
p_high = multivariate_gaussian(X_train_high, mu_high, var_high)

# 计算验证集的概率密度
p_val_high = multivariate_gaussian(X_val_high, mu_high, var_high)

# 找到最佳阈值
epsilon_high, F1_high = select_threshold(y_val_high, p_val_high)

print('通过交叉验证找到的最佳阈值: %e' % epsilon_high)
print('交叉验证集上的最佳F1分数: %f' % F1_high)
print('发现的异常点数量: %d' % sum(p_high < epsilon_high))
```
