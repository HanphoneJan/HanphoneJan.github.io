---
title: 主成分分析 PCA
_synced: true
---
# 主成分分析 PCA 实践


主成分分析（Principal Component Analysis,
PCA）是最经典的线性降维方法。它通过寻找数据方差最大的方向，把高维数据投影到低维空间，同时尽量保留原始信息。

本文从零实现
PCA，并用可视化展示中心化、协方差矩阵、特征值分解和降维结果，帮助你理解
PCA 每一步在做什么。

## 1. 导入依赖

使用 PyTorch 完成矩阵运算，`make_blobs` 生成聚类数据，`seaborn`
绘制协方差热力图。设置随机种子保证结果可复现。

``` python
import torch
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_blobs
import seaborn as sns  # 用于更美观的热图展示

# 设置随机种子，保证结果可复现
torch.manual_seed(42)
np.random.seed(42)

```

## 2. 从零实现 PCA

PCA 的核心步骤：

1.  **中心化**：减去每个特征的均值，使数据中心落在原点。
2.  **计算协方差矩阵**：$C = \frac{1}{n-1} X_{centered}^\top X_{centered}$，它刻画各特征自身的方差以及特征之间的相关性。
3.  **特征值分解**：对协方差矩阵求特征值与特征向量，特征向量即主成分方向，特征值大小代表该方向承载的方差。
4.  **投影**：按特征值从大到小取前 $k$
    个特征向量，将中心化数据投影到这些方向上。

下面实现 `PCA` 类，包含 `fit`、`transform` 和 `fit_transform` 三个方法。

``` python
# 定义PCA类（与之前相同，此处省略注释）
class PCA:
    def __init__(self, n_components=2):
        self.n_components = n_components
        self.components = None
        self.mean = None
        self.eigenvalues = None  # 新增：保存特征值用于后续分析
        
    def fit(self, X):
        self.mean = torch.mean(X, dim=0)
        X_centered = X - self.mean
        n_samples = X.shape[0]
        covariance_matrix = torch.matmul(X_centered.T, X_centered) / (n_samples - 1)
        
        # 计算特征值和特征向量并保存特征值
        eigenvalues, eigenvectors = torch.linalg.eig(covariance_matrix)
        self.eigenvalues = eigenvalues.real  # 保存特征值
        eigenvectors = eigenvectors.real
        
        sorted_indices = torch.argsort(self.eigenvalues, descending=True)
        top_indices = sorted_indices[:self.n_components]
        self.components = eigenvectors[:, top_indices]

    def transform(self, X):
        X_centered = X - self.mean
        return torch.matmul(X_centered, self.components)
    
    def fit_transform(self, X):
        self.fit(X)
        return self.transform(X)

```

## 3. 生成测试数据

用 `make_blobs` 生成 300 个样本、10 个特征、3 个簇的数据，并转换为
PyTorch 张量。

``` python
# 生成测试数据
n_samples = 300
n_features = 10
n_centers = 3
X_np, y_np = make_blobs(n_samples=n_samples, n_features=n_features, 
                       centers=n_centers, random_state=42)
X = torch.tensor(X_np, dtype=torch.float32)
y = torch.tensor(y_np, dtype=torch.int64)

```

## 4. 观察数据：原始分布、中心化与协方差

先画三张图直观理解 PCA 的前置处理：

- **原始数据**：任选两个特征，查看原始分布。
- **中心化后**：每个特征减去均值后，数据围绕原点分布。
- **协方差矩阵热力图**：对角线表示各特征方差，非对角线表示特征间的相关性。

``` python
# --------------- 新增可视化1：原始数据的两个特征分布 ---------------
plt.figure(figsize=(15, 5))

# 绘制原始数据中两个特征的分布（随机选两个特征）
plt.subplot(131)
feat1, feat2 = 0, 1  # 选择前两个特征
plt.scatter(X[:, feat1], X[:, feat2], c=y, cmap='viridis', alpha=0.7)
plt.title(f'原始数据（特征{feat1+1} vs 特征{feat2+1}）', fontsize=12)
plt.xlabel(f'特征 {feat1+1}')
plt.ylabel(f'特征 {feat2+1}')
plt.grid(alpha=0.3)

# --------------- 新增可视化2：数据中心化前后对比 ---------------
# 计算中心化数据
X_centered = X - X.mean(dim=0)

plt.subplot(132)
plt.scatter(X_centered[:, feat1], X_centered[:, feat2], c=y, cmap='viridis', alpha=0.7)
plt.axhline(y=0, color='r', linestyle='--', alpha=0.5)  # x轴零线
plt.axvline(x=0, color='r', linestyle='--', alpha=0.5)  # y轴零线
plt.title(f'中心化后数据（特征{feat1+1} vs 特征{feat2+1}）', fontsize=12)
plt.xlabel(f'中心化特征 {feat1+1}')
plt.ylabel(f'中心化特征 {feat2+1}')
plt.grid(alpha=0.3)

# --------------- 新增可视化3：协方差矩阵 ---------------
# 计算协方差矩阵
# 对角线颜色：反映每个特征的方差大小（颜色越深，该特征自身的离散程度越高）。
# 非对角线颜色：反映特征间的相关性（如红色表示强正相关，蓝色表示强负相关）
cov_matrix = torch.matmul(X_centered.T, X_centered) / (X.shape[0] - 1)

plt.subplot(133)
sns.heatmap(cov_matrix.numpy(), annot=False, cmap='coolwarm', fmt='.2f')
plt.title('特征协方差矩阵', fontsize=12)
plt.tight_layout()
plt.show()

```

## 5. 执行 PCA 降维

调用 `fit_transform`，把 10 维数据降到 2 维。

``` python
# 执行PCA降维
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X)

```

## 6. 特征值与方差解释率

特征值越大，说明对应主成分保留的信息越多。**方差解释率** = 单个特征值 /
特征值总和，**累积解释率**表示前 $k$
个主成分保留了多少信息。通常累积达到 90% 即可认为保留了主要信息。

``` python
# --------------- 新增可视化4：特征值排序与方差解释率 ---------------
plt.figure(figsize=(12, 5))

# 绘制特征值排序
plt.subplot(121)
sorted_eigenvalues = torch.sort(pca.eigenvalues, descending=True)[0]
plt.bar(range(1, len(sorted_eigenvalues)+1), sorted_eigenvalues.numpy())
plt.title('特征值排序（按降序）', fontsize=12)
plt.xlabel('特征值索引')
plt.ylabel('特征值大小')
plt.grid(axis='y', alpha=0.3)

# 绘制方差解释率
plt.subplot(122)
explained_variance_ratio = sorted_eigenvalues / torch.sum(sorted_eigenvalues)
cumulative_ratio = torch.cumsum(explained_variance_ratio, dim=0)
plt.plot(range(1, len(cumulative_ratio)+1), cumulative_ratio.numpy(), 'o-', color='orange')
plt.axhline(y=0.9, color='r', linestyle='--', alpha=0.5, label='90%方差解释率')
plt.title('累积方差解释率', fontsize=12)
plt.xlabel('主成分数量')
plt.ylabel('累积解释率')
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.show()

```

## 7. PCA 降维结果

将降维后的二维结果按类别着色，并用箭头标出前两个主成分在原特征空间中的方向。

``` python
# --------------- 原有可视化：PCA降维结果 ---------------
plt.figure(figsize=(10, 8))
scatter = plt.scatter(X_pca[:, 0], X_pca[:, 1], c=y, cmap='viridis', 
                     alpha=0.7, edgecolors='w', s=100)

# 新增：绘制主成分方向（在中心化数据的前两个特征上投影）
# 缩放主成分向量以便可视化
scale = 5
plt.quiver([0, 0], [0, 0], 
           pca.components[feat1, 0]*scale, pca.components[feat2, 0]*scale, 
           color='red', width=0.003, label='第一主成分方向')
plt.quiver([0, 0], [0, 0], 
           pca.components[feat1, 1]*scale, pca.components[feat2, 1]*scale, 
           color='blue', width=0.003, label='第二主成分方向')

plt.title('PCA降维结果与主成分方向', fontsize=15)
plt.xlabel('主成分 1')
plt.ylabel('主成分 2')
plt.colorbar(scatter, label='类别')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)
plt.show()
```
