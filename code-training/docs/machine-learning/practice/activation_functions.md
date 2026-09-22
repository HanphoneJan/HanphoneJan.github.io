---
title: 激活函数
_synced: true
---
# 激活函数


激活函数是神经网络中引入**非线性**的关键部件。如果没有激活函数，无论网络有多深，所有线性变换叠加起来仍然是线性变换，无法拟合复杂函数。

本文用代码实现并可视化 4 种最常见的激活函数：**线性
(Linear)**、**ReLU**、**Sigmoid** 和
**Softmax**，帮助你直观理解它们的形状与适用场景。

## 1. 导入库并设置中文字体

``` python
import numpy as np
import matplotlib.pyplot as plt

# 设置中文显示
plt.rcParams["font.family"] = ["sans-serif","SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号

```

## 2. 定义激活函数

用 NumPy 实现 4 个激活函数： -
**linear**：$f(x)=x$，恒等映射，只做线性变换。 -
**relu**：$f(x)=\max(0,x)$，负数置零，正数保持不变，计算简单、不易梯度消失。 -
**sigmoid**：$f(x)=\frac{1}{1+e^{-x}}$，输出映射到
$(0,1)$，适合二分类输出层。 - **softmax**：把一组分数转成和为 1
的概率分布，适合多分类输出层。

``` python
# 定义激活函数
def linear(x):
    """线性激活函数"""
    return x

def relu(x):
    """ReLU激活函数"""
    return np.maximum(0, x)

def sigmoid(x):
    """Sigmoid激活函数"""
    return 1 / (1 + np.exp(-x))

def softmax(x):
    """Softmax激活函数"""
    # 为了数值稳定性，减去最大值
    exp_x = np.exp(x - np.max(x))
    return exp_x / np.sum(exp_x, axis=0)

```

### 创建输入数据并计算函数值

为每个激活函数生成一段输入区间。其中 Softmax 需要**多个输入维度**（构造
3 个类别），才能展示它输出的概率分布特性：

``` python
# 创建数据
x_linear = np.linspace(-10, 10, 100)
x_relu = np.linspace(-10, 10, 100)
x_sigmoid = np.linspace(-10, 10, 100)
x_softmax = np.linspace(-5, 5, 100)

# 计算函数值
y_linear = linear(x_linear)
y_relu = relu(x_relu)
y_sigmoid = sigmoid(x_sigmoid)

# 为softmax创建多个输入维度以展示其特性
x1 = np.linspace(-5, 5, 100)
x2 = np.full_like(x1, 0.5)
x3 = np.full_like(x1, -0.5)
softmax_input = np.vstack([x1, x2, x3])
y_softmax = softmax(softmax_input)

```

## 3. 创建画布

准备一个一行四列的画布，用于并排展示 4 个激活函数：

``` python
# 创建图像
fig, axes = plt.subplots(1, 4, figsize=(20, 5))
fig.suptitle('常用激活函数', fontsize=16)

```

### 分别绘制 4 个激活函数

每个子图都加上坐标轴参考线（虚线）和网格，便于观察曲线形状。注意 Sigmoid
的 $y$ 轴范围在 $0\sim1$ 之间，Softmax 的三条曲线之和恒为 1：

``` python
# 绘制Linear激活函数
axes[0].plot(x_linear, y_linear)
axes[0].axhline(y=0, color='k', linestyle='--', alpha=0.3)
axes[0].axvline(x=0, color='k', linestyle='--', alpha=0.3)
axes[0].set_title('Linear Activation')
axes[0].set_xlabel('输入')
axes[0].set_ylabel('输出')
axes[0].grid(True, alpha=0.3)
axes[0].set_ylim(-10, 10)

# 绘制ReLU激活函数
axes[1].plot(x_relu, y_relu)
axes[1].axhline(y=0, color='k', linestyle='--', alpha=0.3)
axes[1].axvline(x=0, color='k', linestyle='--', alpha=0.3)
axes[1].set_title('ReLU Activation')
axes[1].set_xlabel('输入')
axes[1].set_ylabel('输出')
axes[1].grid(True, alpha=0.3)
axes[1].set_ylim(-1, 10)

# 绘制Sigmoid激活函数
axes[2].plot(x_sigmoid, y_sigmoid)
axes[2].axhline(y=0, color='k', linestyle='--', alpha=0.3)
axes[2].axvline(x=0, color='k', linestyle='--', alpha=0.3)
axes[2].axhline(y=1, color='k', linestyle='--', alpha=0.3)
axes[2].axhline(y=0.5, color='k', linestyle='--', alpha=0.3)
axes[2].set_title('Sigmoid Activation')
axes[2].set_xlabel('输入')
axes[2].set_ylabel('输出')
axes[2].grid(True, alpha=0.3)
axes[2].set_ylim(-0.1, 1.1)

# 绘制Softmax激活函数
axes[3].plot(x_softmax, y_softmax[0], label='类别1')
axes[3].plot(x_softmax, y_softmax[1], label='类别2')
axes[3].plot(x_softmax, y_softmax[2], label='类别3')
axes[3].axvline(x=0, color='k', linestyle='--', alpha=0.3)
axes[3].set_title('Softmax Activation')
axes[3].set_xlabel('输入（类别1）')
axes[3].set_ylabel('概率输出')
axes[3].grid(True, alpha=0.3)
axes[3].legend()
axes[3].set_ylim(-0.1, 1.1)

```

### 调整布局并显示

``` python
plt.tight_layout()
plt.subplots_adjust(top=0.85)
plt.show()
```

## 4. 观察与思考

- **Linear**：一条直线，无法引入非线性，通常只用于回归输出层。
- **ReLU**：输入为负时输出
  0，为正时线性输出，计算高效，是现代网络默认的隐藏层激活函数。
- **Sigmoid**：S 形曲线，能把输出压缩到 $(0,1)$，但两端梯度接近
  0，容易梯度消失。
- **Softmax**：把多类分数归一化为概率，且所有类概率之和恒等于 1。
