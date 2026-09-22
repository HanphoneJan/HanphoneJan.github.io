---
title: NumPy 深度学习实践
_synced: true
---
# NumPy 深度学习实践


本文用一段贴近深度学习的代码，把 NumPy
在神经网络中最常用的操作串起来：**数据表示 → 线性代数 → 激活函数 → 损失
→ 梯度 → 预处理 → 批量处理**。

适合初学者快速掌握 NumPy 的核心 API
以及它们在前向传播、反向传播中的角色。

``` python
import numpy as np

```

## 1. 数据表示与初始化

深度学习中数据用**张量 (Tensor)** 表示。这里演示 4 种常见初始化方式： -
`np.random.randn`：生成标准正态分布随机数，用于初始化**权重矩阵
W**（形状 3×2）。 - `np.zeros`：创建全 0 数组，用于初始化**偏置
b**（形状 1×2）。 - `np.array`：从 Python 列表构造**特征矩阵 X**（3
个样本 × 3 个特征）。 - 标签 `y` 使用**独热编码
(One-hot)**，每行代表一个样本所属的类别。

``` python
# ------------------------------
# 1. 数据表示与初始化 (深度学习中基础数据结构)
# ------------------------------
# np.random.randn: 生成符合标准正态分布(均值0,方差1)的随机数
# 这里创建一个3x2的权重矩阵(输入特征数=3, 输出特征数=2)
W = np.random.randn(3, 2)  # 权重矩阵初始化，形状: (3, 2)

# np.zeros: 创建全为0的数组
# 这里创建1x2的偏置向量，与输出特征数保持一致
b = np.zeros((1, 2))       # 偏置向量初始化，形状: (1, 2)

# np.array: 将Python列表转换为NumPy数组(张量)
# 创建样本特征矩阵，3个样本，每个样本有3个特征
X = np.array([
    [1.2, 3.4, 2.1],
    [0.8, 1.5, 4.2],
    [2.3, 0.9, 1.7]
])  # 特征矩阵，形状: (3, 3)，(样本数, 特征数)

# 创建独热编码标签，3个样本，2个类别
y = np.array([[1, 0], [0, 1], [1, 0]])  # 标签矩阵，形状: (3, 2)，(样本数, 类别数)


```

## 2. 线性代数运算

前向传播的线性部分核心是矩阵乘法 $z = XW + b$，这里展示： -
`np.dot`：矩阵乘法，$(3,3)\cdot(3,2)\to(3,2)$，再借助**广播**加上偏置。 -
`.T`：矩阵转置。 - `np.sum`：按行或按列求和（axis 参数控制）。 -
`np.linalg.norm`：计算 L2 范数，常用于正则化。

``` python
# ------------------------------
# 2. 线性代数运算 (深度学习核心数学操作)
# ------------------------------
# np.dot: 计算两个数组的点积(矩阵乘法)
# 这里实现前向传播的线性部分: z = X·W + b
# 利用广播机制，(3,3)·(3,2)得到(3,2)，再与(1,2)相加(自动广播到3行)
z = np.dot(X, W) + b  # 线性输出，形状: (3, 2)

# .T: 数组转置操作，交换矩阵的行和列
X_T = X.T  # 转置特征矩阵，形状: (3, 3) → (3, 3) (此处行列数相同，转置后不变)

# np.sum: 计算数组元素的和，axis参数指定求和维度
sum_rows = np.sum(X, axis=0)  # 按列求和(axis=0)，结果为每个特征的总和，形状: (3,)
sum_cols = np.sum(X, axis=1)  # 按行求和(axis=1)，结果为每个样本的特征总和，形状: (3,)

# np.linalg.norm: 计算向量或矩阵的范数，默认计算L2范数
l2_norm = np.linalg.norm(W)  # 计算权重矩阵的L2范数，用于正则化


```

## 3. 激活函数实现

引入非线性变换。实现三个常用激活函数并分别应用到前面算出的 $z$： -
**sigmoid**：输出 $(0,1)$，用于二分类。 - **softmax**：输出和为 1
的概率分布，用于多分类（减去最大值防止溢出）。 -
**relu**：$\max(0,x)$，隐藏层默认选择。

``` python
# ------------------------------
# 3. 激活函数实现 (引入非线性变换)
# ------------------------------
def sigmoid(x):
    """Sigmoid激活函数: 将输出映射到(0,1)，适用于二分类输出层"""
    # np.exp: 计算指数函数e^x
    return 1 / (1 + np.exp(-x))

def softmax(x):
    """Softmax激活函数: 将输出转换为概率分布，适用于多分类输出层"""
    # np.max: 计算数组最大值，axis=1按行计算，keepdims保持维度
    # 减去最大值是为了数值稳定，防止指数运算溢出
    exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
    # 按行求和得到每个样本的指数和，再做除法得到概率分布
    return exp_x / np.sum(exp_x, axis=1, keepdims=True)

def relu(x):
    """ReLU激活函数: 引入非线性，适用于隐藏层，计算max(0, x)"""
    # np.maximum: 逐元素比较两个数组，返回较大值
    return np.maximum(0, x)

# 应用激活函数
a_sigmoid = sigmoid(z)  # 经过sigmoid的输出，形状: (3, 2)
a_softmax = softmax(z)  # 经过softmax的输出，形状: (3, 2)
a_relu = relu(z)        # 经过relu的输出，形状: (3, 2)


```

## 4. 损失函数计算

**交叉熵损失**衡量预测概率与真实标签的差异：
$$\text{loss} = -\frac{1}{N}\sum_i y_i\log(\hat y_i + \epsilon)$$
加一个极小的 $\epsilon$ 防止 `log(0)` 导致数值错误。

``` python
# ------------------------------
# 4. 损失函数计算 (衡量预测与真实值的差异)
# ------------------------------
def cross_entropy_loss(y_true, y_pred):
    """交叉熵损失函数: 适用于分类问题"""
    epsilon = 1e-10  # 微小值，防止log(0)导致数值错误
    # np.log: 计算自然对数
    # *: 逐元素乘法(哈达玛积)
    # np.mean: 计算数组平均值，这里对所有元素取平均得到总损失
    return -np.mean(y_true * np.log(y_pred + epsilon))

# 计算损失值
loss = cross_entropy_loss(y, a_softmax)


```

## 5. 梯度计算与反向传播基础

以 softmax + 交叉熵为例，输出层误差简化为
$dz = \hat y - y$。据此反推参数梯度：
$$dW = \frac{1}{m}X^T dz,\qquad db = \frac{1}{m}\sum dz$$
这正是反向传播中最重要的一步——梯度从输出层回传到权重。

``` python
# ------------------------------
# 5. 梯度计算与反向传播基础 (模型优化核心)
# ------------------------------
# 假设已计算输出层梯度(softmax+交叉熵的简化梯度)
dz = a_softmax - y  # 输出层误差，形状: (3, 2)

# 计算权重梯度: 特征矩阵转置与误差的点积，再除以样本数取平均
dW = np.dot(X.T, dz) / X.shape[0]  # 权重梯度，形状: (3, 2)

# np.mean: 计算平均值，axis=0按列求平均，keepdims保持二维结构
db = np.mean(dz, axis=0, keepdims=True)  # 偏置梯度，形状: (1, 2)


```

## 6. 数据预处理

提升训练效果的两类常见操作： - **标准化**：$(X-\mu)/\sigma$
让每个特征均值 0、方差 1。 -
**打乱与切分**：随机打乱样本顺序避免模型记住顺序，再按比例切分为训练集和测试集。

``` python
# ------------------------------
# 6. 数据预处理 (提升模型训练效果)
# ------------------------------
# 标准化: (x - 均值) / 标准差，使特征均值为0，方差为1
# np.mean: 计算每个特征的均值(按列)
X_mean = np.mean(X, axis=0)
# np.std: 计算每个特征的标准差(按列)
X_std = np.std(X, axis=0)
X_normalized = (X - X_mean) / X_std  # 标准化后的特征矩阵

# 打乱数据顺序: 避免模型学习数据顺序而非特征规律
# np.arange: 生成0到n-1的连续整数(样本索引)
indices = np.arange(X.shape[0])
# np.random.shuffle: 原地打乱数组顺序
np.random.shuffle(indices)
# 利用打乱的索引重排样本
X_shuffled = X[indices]  # 打乱后的特征矩阵
y_shuffled = y[indices]  # 对应的打乱后标签

# 分割训练集和测试集
split_idx = 2  # 分割点: 前2个为训练集，剩余为测试集
X_train, X_test = X_shuffled[:split_idx], X_shuffled[split_idx:]  # 切片操作
y_train, y_test = y_shuffled[:split_idx], y_shuffled[split_idx:]


```

## 7. 批量处理

大数据集无法一次全部载入内存，常用**小批量 (mini-batch)**
训练。`batch_generator` 是一个生成器，每次产出一个大小为 `batch_size`
的样本块：

``` python
# ------------------------------
# 7. 批量处理 (高效训练大数据集)
# ------------------------------
def batch_generator(X, y, batch_size=2):
    """生成批量数据的迭代器"""
    n_samples = X.shape[0]  # 获取样本总数
    # np.arange: 生成从0到n_samples，步长为batch_size的索引序列
    for i in range(0, n_samples, batch_size):
        # 切片获取批量数据，yield关键字使函数成为迭代器
        yield X[i:i+batch_size], y[i:i+batch_size]

# 使用生成器获取批量数据
for X_batch, y_batch in batch_generator(X, y, batch_size=2):
    print("Batch shape:", X_batch.shape, y_batch.shape)


# 打印部分结果示例
print("\n线性输出 z:\n", z)
print("\nSoftmax输出:\n", a_softmax)
print("\n交叉熵损失:", loss)
print("\n权重梯度 dW:\n", dW)
    
```

## 8. 广播机制演示

**广播 (Broadcasting)** 是 NumPy
的核心特性：当两个数组形状不一致时，NumPy
会自动把小数组扩展到大数组的形状。
这里用一个具体的矩阵平移示例，直观展示一维平移向量如何被广播到整个矩阵，并逐元素验证结果：

``` python
# 利用广播机制平移矩阵示例
import numpy as np

def matrix_translation_demo(n_samples=3):
    # 设置随机种子，确保结果可复现
    np.random.seed(42)
    
    # 1. 生成标准正态分布的矩阵 (n_samples × 2)
    original_matrix = np.random.randn(n_samples, 2)
    print("1. 原始矩阵 (标准正态分布生成，形状为", original_matrix.shape, "):")
    print(original_matrix.round(4))  # 保留4位小数显示
    print()
    
    # 2. 平移向量
    translation_vector = np.array([2, 2])
    print("2. 平移向量:")
    print(translation_vector)
    print()
    
    # 3. 展示广播机制如何将向量扩展为与原始矩阵同形状的矩阵
    print("3. 广播机制将平移向量扩展为矩阵 (形状为", original_matrix.shape, "):")
    translation_matrix = np.tile(translation_vector, (n_samples, 1))
    print(translation_matrix)
    print()
    
    # 4. 执行矩阵加法（平移操作）
    translated_matrix = original_matrix + translation_vector
    print("4. 平移后的矩阵 (原始矩阵 + 平移向量):")
    print(translated_matrix.round(4))
    print()
    
    # 5. 验证结果（逐元素相加）
    print("5. 逐元素验证:")
    for i in range(n_samples):
        for j in range(2):
            print(f"原始[{i},{j}] + 平移[{j}] = {original_matrix[i,j].round(4)} + {translation_vector[j]} = {translated_matrix[i,j].round(4)}")

```

### 执行广播演示

调用函数，观察广播机制如何把平移向量 \[2,2\]
扩展为与原始矩阵同形状后再逐元素相加：

``` python
# 演示3个样本的情况，便于清晰展示矩阵运算
matrix_translation_demo(n_samples=3)

# 也可以尝试更多样本
# matrix_translation_demo(n_samples=5)
```

## 9. 矩阵乘法：np.matmul 与 @

`np.matmul(a,b)` 与运算符 `a @ b`
都执行矩阵乘法，结果完全相同。比较这两种写法有助于理解 NumPy 数组与
TensorFlow 张量的异同：

``` python
import numpy as np
a = np.array([[1, 2], [3, 4]])
b = np.array([[5, 6], [7, 8]])
result1 = np.matmul(a, b)
result2 = a @ b
print("Result using np.matmul:\n", result1)
print("Result using @ operator:\n", result2)

# numpy使用的是数组，而tensorflow使用张量，这对运算性能有影响
```
