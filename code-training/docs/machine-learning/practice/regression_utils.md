---
title: regression_utils
_synced: true
---


``` python
import copy
import math
import numpy as np
np.set_printoptions(precision=2)

dlc = dict(dlblue = '#0096ff', dlorange = '#FF9300', dldarkred='#C00000', dlmagenta='#FF40FF', dlpurple='#7030A0')
dlblue = '#0096ff'; dlorange = '#FF9300'; dldarkred='#C00000'; dlmagenta='#FF40FF'; dlpurple='#7030A0'
dlcolors = [dlblue, dlorange, dldarkred, dlmagenta, dlpurple]
```

``` python
def sigmoid(z):
    """
    Compute the sigmoid of z

    Parameters
    ----------
    z : array_like
        A scalar or numpy array of any size.

    Returns
    -------
     g : array_like
         sigmoid(z)
    """
    z = np.clip( z, -500, 500 )           # protect against overflow
    g = 1.0/(1.0+np.exp(-z))

    return g
```

``` python
def compute_cost_logistic(X, y, w, b, lambda_=0, safe=False):
    """
    Computes cost using logistic loss, non-matrix version

    Args:
      X (ndarray): Shape (m,n)  matrix of examples with n features
      y (ndarray): Shape (m,)   target values
      w (ndarray): Shape (n,)   parameters for prediction
      b (scalar):               parameter  for prediction
      lambda_ : (scalar, float) Controls amount of regularization, 0 = no regularization
      safe : (boolean)          True-selects under/overflow safe algorithm
    Returns:
      cost (scalar): cost
    """

    m,n = X.shape
    cost = 0.0
    for i in range(m):
        z_i    = np.dot(X[i],w) + b                                             #(n,)(n,) or (n,) ()
        if safe:  #avoids overflows
            cost += -(y[i] * z_i ) + log_1pexp(z_i)
        else:
            f_wb_i = sigmoid(z_i)                                                   #(n,)
            cost  += -y[i] * np.log(f_wb_i) - (1 - y[i]) * np.log(1 - f_wb_i)       # scalar
    cost = cost/m

    reg_cost = 0
    if lambda_ != 0:
        for j in range(n):
            reg_cost += (w[j]**2)                                               # scalar
        reg_cost = (lambda_/(2*m))*reg_cost

    return cost + reg_cost
```

``` python
def log_1pexp(x, maximum=20):
    '''
    数值稳定地近似计算 log(1 + exp(x)) 的值
    解决当 x 取值过大时直接计算导致的数值溢出问题
    参考：https://stats.stackexchange.com/questions/475589/numerical-computation-of-cross-entropy-in-practice
    
    参数:
    x       : 输入的 NumPy 数组，形状为 (n,1) 或 (n,)
    maximum : 阈值（默认值为 20），用于判断是否启用近似计算
    
    返回:
    out     : 与 x 形状相同的 NumPy 数组，存储 log(1 + exp(x)) 的近似结果
    '''

    # 创建一个与输入 x 形状相同、数据类型为浮点型的数组，用于存储计算结果
    out = np.zeros_like(x, dtype=float)
    
    # 创建布尔索引数组，标记 x 中所有小于等于阈值 maximum 的元素
    # 对于这些元素，我们可以直接计算 log(1 + exp(x)) 而不会溢出
    i = x <= maximum
    
    # 创建布尔索引数组，标记 x 中所有大于阈值 maximum 的元素
    # 对于这些元素，我们需要使用近似计算来避免数值溢出
    ni = np.logical_not(i)
    
    # 对 x 中小于等于阈值的元素，直接计算 log(1 + exp(x))
    # 这部分计算精度高，且不会出现数值溢出问题
    out[i] = np.log(1 + np.exp(x[i]))
    
    # 对 x 中大于阈值的元素，使用 x 本身作为近似值
    # 数学原理：当 x 很大时，exp(x) 远大于 1，因此 log(1 + exp(x)) ≈ log(exp(x)) = x
    # 这样处理可以有效避免 exp(x) 过大导致的数值溢出
    out[ni] = x[ni]
    
    # 返回计算得到的近似结果
    return out
```

``` python
import numpy as np

def compute_cost_matrix(X, y, w, b, logistic=False, lambda_=0, safe=True):
    """
    使用矩阵运算计算成本（损失）值，支持线性回归和逻辑回归，并可添加正则化项
    
    参数:
      X : (ndarray, 形状 (m,n))          输入特征矩阵，m个样本，n个特征
      y : (ndarray, 形状 (m,) 或 (m,1))  目标值数组，每个样本对应的真实标签
      w : (ndarray, 形状 (n,) 或 (n,1))  模型的权重参数
      b : (scalar)                       模型的偏置参数
      logistic : (Boolean)               如果为True，计算逻辑回归的成本；否则计算线性回归的成本
      lambda_ : (float)                  正则化系数，控制正则化强度，默认为0（无正则化）
      safe : (Boolean)                   如果为True，使用数值稳定的计算方式避免溢出；仅对逻辑回归有效
      
    返回:
      total_cost: (scalar)               总成本值，包含基础成本和正则化成本
    """
    # 获取样本数量
    m = X.shape[0]
    
    # 确保y是二维数组（形状为(m,1)），便于矩阵运算
    y = y.reshape(-1, 1)
    # 确保w是二维数组（形状为(n,1)），便于矩阵运算
    w = w.reshape(-1, 1)
    
    # 逻辑回归的成本计算
    if logistic:
        # 使用数值稳定的方式计算，避免指数溢出
        if safe:
            # 计算线性组合 z = X·w + b，形状为(m,1)
            z = X @ w + b
            # 计算每个样本的成本：-y·z + log(1+exp(z))
            # 这里利用了logistic损失的等价变换，避免直接计算sigmoid
            cost = -(y * z) + log_1pexp(z)
            # 求所有样本的平均成本
            cost = np.sum(cost) / m
        
        # 不使用安全模式，直接计算（可能存在溢出风险）
        else:
            # 计算sigmoid激活值 f = σ(X·w + b)，形状为(m,1)
            f = sigmoid(X @ w + b)
            # 计算交叉熵损失：平均(-y·log(f) - (1-y)·log(1-f))
            cost = (1/m) * (np.dot(-y.T, np.log(f)) - np.dot((1-y).T, np.log(1-f)))
            # 将二维数组结果转换为标量
            cost = cost[0, 0]
    
    # 线性回归的成本计算（均方误差）
    else:
        # 计算预测值 f = X·w + b，形状为(m,1)
        f = X @ w + b
        # 计算均方误差成本：(1/(2m))·Σ(f - y)²
        cost = (1/(2*m)) * np.sum((f - y) **2)
    
    # 计算L2正则化成本：(λ/(2m))·Σ(w²)
    reg_cost = (lambda_ / (2 * m)) * np.sum(w** 2)
    
    # 总成本 = 基础成本 + 正则化成本
    total_cost = cost + reg_cost
    
    return total_cost
```

``` python
def compute_gradient_matrix(X, y, w, b, logistic=False, lambda_=0):
    """
    使用矩阵运算计算模型参数的梯度，支持线性回归和逻辑回归，并可添加正则化项

    参数:
      X : (ndarray, 形状 (m,n))          输入特征矩阵，包含m个样本和n个特征
      y : (ndarray, 形状 (m,) 或 (m,1))  目标值数组，每个样本对应的真实标签
      w : (ndarray, 形状 (n,) 或 (n,1))  模型的权重参数
      b : (scalar)                       模型的偏置参数
      logistic : (boolean)               若为True，计算逻辑回归的梯度；否则计算线性回归的梯度
      lambda_ : (float)                  正则化系数，控制正则化强度，默认为0（无正则化）
      
    返回:
      dj_db: (scalar)                     成本函数对偏置b的梯度
      dj_dw: (array_like, 形状 (n,1))     成本函数对权重w的梯度
    """
    # 获取样本数量
    m = X.shape[0]
    
    # 确保y是二维数组（形状为(m,1)），便于矩阵运算
    y = y.reshape(-1, 1)
    # 确保w是二维数组（形状为(n,1)），便于矩阵运算
    w = w.reshape(-1, 1)

    # 计算模型预测值
    # 逻辑回归使用sigmoid激活函数：f_wb = σ(X·w + b)
    # 线性回归直接使用线性组合：f_wb = X·w + b
    f_wb = sigmoid(X @ w + b) if logistic else X @ w + b  # 结果形状为(m,1)
    
    # 计算预测值与真实值的误差：err = f_wb - y，形状为(m,1)
    err = f_wb - y
    
    # 计算权重w的梯度：dj_dw = (1/m)·X^T·err，形状为(n,1)
    # X^T是X的转置（形状为(n,m)），与err（形状为(m,1)）相乘得到(n,1)
    dj_dw = (1/m) * (X.T @ err)
    
    # 计算偏置b的梯度：dj_db = (1/m)·Σ(err)，为标量
    dj_db = (1/m) * np.sum(err)
    
    # 添加L2正则化项对权重梯度的影响（偏置b不参与正则化）
    # 正则化梯度：(lambda_/m)·w，形状为(n,1)
    dj_dw += (lambda_ / m) * w

    # 返回偏置梯度和权重梯度
    return dj_db, dj_dw
```

``` python
def gradient_descent(X, y, w_in, b_in, alpha, num_iters, logistic=False, lambda_=0, verbose=True):
    """
    Performs batch gradient descent to learn theta. Updates theta by taking
    num_iters gradient steps with learning rate alpha

    Args:
      X (ndarray):    Shape (m,n)         matrix of examples
      y (ndarray):    Shape (m,) or (m,1) target value of each example
      w_in (ndarray): Shape (n,) or (n,1) Initial values of parameters of the model
      b_in (scalar):                      Initial value of parameter of the model
      logistic: (boolean)                 linear if false, logistic if true
      lambda_:  (float)                   applies regularization if non-zero
      alpha (float):                      Learning rate
      num_iters (int):                    number of iterations to run gradient descent

    Returns:
      w (ndarray): Shape (n,) or (n,1)    Updated values of parameters; matches incoming shape
      b (scalar):                         Updated value of parameter
    """
    # An array to store cost J and w's at each iteration primarily for graphing later
    J_history = []
    w = copy.deepcopy(w_in)  #avoid modifying global w within function
    b = b_in
    w = w.reshape(-1,1)      #prep for matrix operations
    y = y.reshape(-1,1)

    for i in range(num_iters):

        # Calculate the gradient and update the parameters
        dj_db,dj_dw = compute_gradient_matrix(X, y, w, b, logistic, lambda_)

        # Update Parameters using w, b, alpha and gradient
        w = w - alpha * dj_dw
        b = b - alpha * dj_db

        # Save cost J at each iteration
        if i<100000:      # prevent resource exhaustion
            J_history.append( compute_cost_matrix(X, y, w, b, logistic, lambda_) )

        # Print cost every at intervals 10 times or as many iterations if < 10
        if i% math.ceil(num_iters / 10) == 0:
            if verbose: print(f"Iteration {i:4d}: Cost {J_history[-1]}   ")

    return w.reshape(w_in.shape), b, J_history  #return final w,b and J history for graphing
```

``` python
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

    return X_norm, mu, sigma
```
