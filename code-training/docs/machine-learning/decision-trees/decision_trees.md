---
title: 决策树：从零实现与可视化
_synced: true
---
# 决策树：从零实现与可视化


决策树是一种直观的监督学习算法，它通过一系列 **「是 / 否」问题**
不断划分数据，最终用一棵树做出分类决策。本笔记基于一个经典的示例数据集——**判断蘑菇是否有毒**：

- 每个样本用 3 个二元特征描述（`1` = 是，`0` = 否）：
  - **特征 0**：棕色帽子
  - **特征 1**：锥形茎形状
  - **特征 2**：单独生长
- 标签 `y`：`1` 表示可食用，`0` 表示有毒

我们将从零实现决策树的三个核心部分——**熵**、**信息增益**、**最佳分割**，最后用递归构建出整棵树。

## 1. 导入工具库

先导入需要用到的库：

- `numpy`：数值计算
- `matplotlib`：可视化
- `public_tests`：提供随堂练习的单元测试函数，用来验证我们写的函数是否正确

其中 `%matplotlib inline` 让图表直接嵌入 Notebook
显示，后面两行设置中文字体，避免绘图时中文乱码。

``` python
import numpy as np
import matplotlib.pyplot as plt
from public_tests import *

%matplotlib inline

# 设置中文字体
plt.rcParams["font.family"] = ["sans-serif","SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号

```

## 2. 数据集

数据集共 10 个蘑菇样本，每个样本用 3 个二元特征描述，标签表示「可食用(1)
/ 有毒(0)」。把数据整理成 NumPy 数组并打印形状信息确认：

- `X_train` 的形状是 `(10, 3)`：10 个样本、3 个特征
- `y_train` 的形状是 `(10,)`：10 个标签

``` python
X_train = np.array([[1,1,1],[1,0,1],[1,0,0],[1,0,0],[1,1,1],[0,1,1],[0,0,0],[1,0,1],[0,1,0],[1,0,0]])
y_train = np.array([1,1,0,0,1,0,0,1,1,0])

print ('训练集X_train的形状:', X_train.shape)
print ('训练集y_train的形状: ', y_train.shape)
print ('训练样本数量 (m):', len(X_train))

```

## 3. 熵：衡量「混乱程度」

**熵（Entropy）** 用来衡量一个节点中样本类别的混乱程度，公式为：

$$H = -p_1 \log_2(p_1) - p_0 \log_2(p_0)$$

其中 $p_1$ 是可食用样本的比例，$p_0$ 是有毒样本的比例。直觉理解：

- 节点里全是同一类（如全是可食用）时，熵 = 0，最「纯」；
- 两类各占一半时，熵 = 1，最「混乱」；
- 熵越高，说明这个节点越需要继续分割。

实现要点：当 $p_1$ 或 $p_0$ 为 0 时，对应的 $p\log_2 p$ 这一项按 0
处理，避免 `log(0)` 报错。

``` python
def compute_entropy(y):
    """
    计算给定节点的熵
    
    参数:
       y (ndarray): Numpy数组，表示节点中每个样本是否可食用(1)或有毒(0)
       
    返回:
        entropy (float): 该节点的熵值
    """
    # 需要正确返回以下变量
    entropy = 0.
    
    ### START CODE HERE ###
    if len(y) == 0:
        return 0.0
    
    # 计算正样本(1)和负样本(0)的比例
    p1 = np.sum(y == 1) / len(y)
    p0 = 1 - p1
    
    # 计算熵: -p1*log2(p1) - p0*log2(p0)
    # 处理log(0)的情况，当p1或p0为0时，该项为0
    if p1 > 0:
        entropy -= p1 * np.log2(p1)
    if p0 > 0:
        entropy -= p0 * np.log2(p0)
    ### END CODE HERE ###        
    
    return entropy

print("根节点的熵: ", compute_entropy(y_train)) 

# 单元测试
compute_entropy_test(compute_entropy)

```

## 4. 分割数据集

决策树的每个节点都在某个特征上提问（例如「帽子是棕色的吗？」），把样本分到左右两个子节点。`split_dataset`
实现这一逻辑：

- **左子节点**：该特征值为 `1` 的样本
- **右子节点**：该特征值为 `0` 的样本

注意 `node_indices`
是当前节点包含的样本索引列表，函数返回的也是索引列表，而不是数据本身。

``` python
def split_dataset(X, node_indices, feature):
    """
    根据给定特征将节点数据分割为左右子节点
    
    参数:
        X (ndarray):             形状为(n_samples, n_features)的数据矩阵
        node_indices (ndarray):  包含活动索引的列表，即当前步骤考虑的样本
        feature (int):           用于分割的特征索引
    
    返回:
        left_indices (ndarray): 特征值为1的索引
        right_indices (ndarray): 特征值为0的索引
    """
    
    # 需要正确返回以下变量
    left_indices = []
    right_indices = []
    
    ### START CODE HERE ###
    # 遍历节点中的所有样本索引
    for i in node_indices:
        # 如果该样本在指定特征上的值为1，则加入左子节点
        if X[i, feature] == 1:
            left_indices.append(i)
        # 否则加入右子节点
        else:
            right_indices.append(i)
    ### END CODE HERE ###
        
    return left_indices, right_indices

root_indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# 可以随意尝试这些变量
# 数据集只有三个特征，所以这个值可以是0(棕色帽)、1(锥形茎形状)或2(单独生长)
feature = 0

left_indices, right_indices = split_dataset(X_train, root_indices, feature)

print("左子节点索引: ", left_indices)
print("右子节点索引: ", right_indices)

# 单元测试
split_dataset_test(split_dataset)

```

## 5. 信息增益：如何挑选特征

有了分割方法，还要知道「用哪个特征分割更好」。**信息增益（Information
Gain）** 衡量的是分割前后混乱程度降低了多少：

$$IG = H(父节点) - \left( w_{左} \cdot H(左子) + w_{右} \cdot H(右子) \right)$$

其中 $w_{左} = \frac{|左子节点样本数|}{|父节点样本数|}$
是样本占比权重。信息增益越大，说明这个特征越能把数据分得「干净」，就越值得选它。

打印结果：在根节点上分割，特征 0（棕色帽）增益最小，特征
2（单独生长）增益最大。

``` python
def compute_information_gain(X, y, node_indices, feature):
    """
    计算在给定特征上分割节点的信息增益
    
    参数:
        X (ndarray):            形状为(n_samples, n_features)的数据矩阵
        y (array like):         包含n_samples目标变量的列表或ndarray
        node_indices (ndarray): 包含活动索引的列表，即当前步骤考虑的样本
   
    返回:
        information_gain (float): 计算得到的信息增益
    """    
    # 分割数据集
    left_indices, right_indices = split_dataset(X, node_indices, feature)
    
    # 一些有用的变量
    X_node, y_node = X[node_indices], y[node_indices]
    X_left, y_left = X[left_indices], y[left_indices]
    X_right, y_right = X[right_indices], y[right_indices]
    
    # 需要正确返回以下变量
    information_gain = 0
    
    ### START CODE HERE ###
    # 计算节点熵
    node_entropy = compute_entropy(y_node)
    
    # 计算左右子节点的熵
    left_entropy = compute_entropy(y_left)
    right_entropy = compute_entropy(y_right)
    
    # 计算权重
    w_left = len(left_indices) / len(node_indices)
    w_right = len(right_indices) / len(node_indices)
    
    # 计算加权熵
    weighted_entropy = w_left * left_entropy + w_right * right_entropy
    
    # 计算信息增益: 父节点熵 - 加权子节点熵
    information_gain = node_entropy - weighted_entropy
    ### END CODE HERE ###  
    
    return information_gain

info_gain0 = compute_information_gain(X_train, y_train, root_indices, feature=0)
print("在棕色帽特征上分割根节点的信息增益: ", info_gain0)
    
info_gain1 = compute_information_gain(X_train, y_train, root_indices, feature=1)
print("在锥形茎形状特征上分割根节点的信息增益: ", info_gain1)

info_gain2 = compute_information_gain(X_train, y_train, root_indices, feature=2)
print("在单独生长特征上分割根节点的信息增益: ", info_gain2)

# 单元测试
compute_information_gain_test(compute_information_gain)

```

## 6. 选择最佳分割特征

`get_best_split`
遍历所有特征，分别计算它们的信息增益，选出增益最大的那个作为当前节点的分割依据。

输出结果显示：在根节点上 **特征 2（单独生长）**
的信息增益最大，因此根节点优先用它来分割。

``` python
def get_best_split(X, y, node_indices):   
    """
    返回分割节点数据的最佳特征
    
    参数:
        X (ndarray):            形状为(n_samples, n_features)的数据矩阵
        y (array like):         包含n_samples目标变量的列表或ndarray
        node_indices (ndarray): 包含活动索引的列表，即当前步骤考虑的样本

    返回:
        best_feature (int):     最佳分割特征的索引
    """    
    
    # 一些有用的变量
    num_features = X.shape[1]
    
    # 需要正确返回以下变量
    best_feature = -1
    
    ### START CODE HERE ###
    max_info_gain = 0
    
    # 遍历所有特征
    for feature in range(num_features):
        # 计算当前特征的信息增益
        info_gain = compute_information_gain(X, y, node_indices, feature)
        
        # 如果当前特征的信息增益大于最大值，则更新最佳特征
        if info_gain > max_info_gain:
            max_info_gain = info_gain
            best_feature = feature
    ### END CODE HERE ##    
   
    return best_feature

best_feature = get_best_split(X_train, y_train, root_indices)
print("最佳分割特征: %d" % best_feature)

# 单元测试
get_best_split_test(get_best_split)

```

## 7. 递归构建整棵树

有了以上三个函数，就可以用递归把决策树搭起来。`build_tree_recursive`
在每个节点执行：

1.  达到最大深度 → 停止分割，记为叶子节点；
2.  节点已「纯」（所有样本同类）→ 停止分割，记为纯叶子节点；
3.  否则选出最佳分割特征，把数据分成左右两部分，递归处理左右子节点。

运行结果打印出整棵树的结构：根节点用特征 2 分割，左右子树分别在特征
0、特征 1
上继续分割，最终所有叶子节点都是纯节点——说明这棵决策树把训练数据完全分开了。

``` python
# 不评分
tree = []

def build_tree_recursive(X, y, node_indices, branch_name, max_depth, current_depth):
    """
    使用递归算法构建树，将数据集在每个节点分割为2个子组。
    此函数仅打印树结构。
    
    参数:
        X (ndarray):            形状为(n_samples, n_features)的数据矩阵
        y (array like):         包含n_samples目标变量的列表或ndarray
        node_indices (ndarray): 包含活动索引的列表，即当前步骤考虑的样本。
        branch_name (string):   分支名称。['Root', 'Left', 'Right']
        max_depth (int):        结果树的最大深度。 
        current_depth (int):    当前深度。递归调用期间使用的参数。
    """ 

    # 达到最大深度 - 停止分割
    if current_depth == max_depth:
        formatting = " "*current_depth + "-"*current_depth
        print(formatting, "%s 叶子节点，索引为" % branch_name, node_indices)
        return
    
    # 检查是否所有样本都属于同一类别
    if len(np.unique(y[node_indices])) == 1:
        formatting = " "*current_depth + "-"*current_depth
        print(formatting, "%s 纯节点，所有样本属于类别 %d" % (branch_name, y[node_indices][0]))
        return
    
    # 否则，获取最佳分割并分割数据
    # 获取此节点的最佳特征
    best_feature = get_best_split(X, y, node_indices) 
    tree.append((current_depth, branch_name, best_feature, node_indices))
    
    formatting = "-"*current_depth
    print("%s 深度 %d, %s: 基于特征 %d 分割" % (formatting, current_depth, branch_name, best_feature))
    
    # 在最佳特征上分割数据集
    left_indices, right_indices = split_dataset(X, node_indices, best_feature)
    
    # 继续分割左右子节点。增加当前深度
    build_tree_recursive(X, y, left_indices, "左", max_depth, current_depth+1)
    build_tree_recursive(X, y, right_indices, "右", max_depth, current_depth+1)

# 构建决策树
build_tree_recursive(X_train, y_train, root_indices, "根", max_depth=4, current_depth=0)
```
