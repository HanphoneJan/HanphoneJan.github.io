---
title: 特征缩放 (Z-score 标准化)
_synced: true
---
# 特征缩放：Z-score 标准化


当不同特征的取值范围差异很大时（如年龄 0~100、收入
0~1000000），梯度下降收敛会很慢，甚至难以收敛。

**Z-score 标准化**把每个特征变换为均值 0、标准差 1：
$$x_{\text{norm}} = \frac{x - \mu}{\sigma}$$ 其中 $\mu$
为该特征均值，$\sigma$
为标准差。这样各特征处于同一量纲，梯度下降更快、更稳。

## 1. 导入 NumPy

``` python
import numpy as np
```

## 2. 定义标准化函数

`zscore_normalize_features` 按列（axis=0）对每个特征分别计算均值 $\mu$
和标准差 $\sigma$，再逐元素做
$(X-\mu)/\sigma$，返回标准化后的矩阵及均值、标准差（供后续测试集复用同一参数）：

``` python
# z-score normalization 
def zscore_normalize_features(X):
    """
    computes  X, zcore normalized by column
    
    Args:
      X (ndarray): Shape (m,n) input data, m examples, n features
      
    Returns:
      X_norm (ndarray): Shape (m,n)  input normalized by column
      mu (ndarray):     Shape (n,)   mean of each feature
      sigma (ndarray):  Shape (n,)   standard deviation of each feature
    """
    # find the mean of each column/feature
    mu     = np.mean(X, axis=0)                 # mu will have shape (n,)
    # find the standard deviation of each column/feature
    sigma  = np.std(X, axis=0)                  # sigma will have shape (n,)
    # element-wise, subtract mu for that column from each example, divide by std for that column
    X_norm = (X - mu) / sigma      

    return (X_norm, mu, sigma)
```

## 3. 关键点

- 标准化后每个特征的分布约为 $\mathcal{N}(0,1)$，取值范围大致落在
  $[-3,3]$。
- 返回的 `mu`、`sigma`
  必须由**训练集**计算，并用同一组参数缩放测试集，避免信息泄漏。
- 对于稀疏数据或树模型，通常不适用标准化；深度学习与梯度下降类模型则几乎必做。
