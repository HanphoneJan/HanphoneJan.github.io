---
title: 最优多项式阶数选择
_synced: true
---
# 最优多项式阶数选择


多项式回归中，**阶数 (degree)**
决定模型复杂度：阶数太低拟合不足（欠拟合），阶数太高则过度拟合训练集（过拟合）。

本文做法：对每个可能的阶数分别训练模型，同时计算它在**训练集 (train)**
和**交叉验证集 (CV)**
上的均方误差，最后选择**交叉验证误差最小**的阶数作为最优阶数。

## 1. 初始化存储数组

`max_degree=9` 表示最多尝试 9 阶。用 `err_train`、`err_cv`
分别记录各阶数在训练集、交叉验证集上的误差；`y_pred`
的每一列存放对应阶数模型的拟合曲线：

``` python
max_degree = 9
err_train = np.zeros(max_degree)    
err_cv = np.zeros(max_degree)      
x = np.linspace(0,int(X.max()),100)  
y_pred = np.zeros((100,max_degree))  #columns are lines to plot

```

## 2. 遍历各阶数训练模型并记录误差

对每个阶数 $d$（1 到 9 阶）调用 `lin_model(d)`
训练，然后在训练集和交叉验证集上分别计算 MSE，并保存该模型的拟合曲线：

``` python
for degree in range(max_degree):
    lmodel = lin_model(degree+1)
    lmodel.fit(X_train, y_train)
    yhat = lmodel.predict(X_train)
    err_train[degree] = lmodel.mse(y_train, yhat)
    yhat = lmodel.predict(X_cv)
    err_cv[degree] = lmodel.mse(y_cv, yhat)
    y_pred[:,degree] = lmodel.predict(x)
    
```

## 3. 选出交叉验证误差最小的阶数

`np.argmin(err_cv)` 返回交叉验证误差最小的下标，加 1
得到对应的多项式阶数。这就是泛化能力最好的模型复杂度：

``` python
optimal_degree = np.argmin(err_cv)+1
```

## 4. 关键点

- 训练误差通常随阶数增大而持续下降，但交叉验证误差会先降后升，拐点附近即为最优阶数。
- 用交叉验证误差而非训练误差选模型，是为了评估模型对**新数据**的泛化能力，避免过拟合。
