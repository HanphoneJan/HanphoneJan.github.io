---
title: K-Means 聚类与图像压缩
_synced: true
---
# K-Means 聚类：从零实现 + 图像压缩


**K-Means** 是最经典的无监督聚类算法，它把数据点自动分成 $K$
个簇（cluster），每个簇用一个**质心（centroid）** 代表。本笔记分两部分：

1.  从零实现 K-Means 的两个核心步骤，并在二维数据上运行；
2.  把 K-Means 应用到**图像压缩**：一张 128×128 的彩色图片有 16384
    个像素，每个像素有 R、G、B 三个值，用 K-Means 把颜色聚成 16 类，用
    16 种颜色近似整张图片，实现压缩。

算法核心只有两步，反复交替进行：

1.  **分配（Assign）**：把每个样本分给离它最近的质心；
2.  **更新（Update）**：把每个质心移动到它名下所有样本的平均位置。

重复以上两步直到质心几乎不再变化。

## 1. 导入工具库

导入所需的库。`utils` 模块提供数据加载与绘图辅助函数（`load_data`
用于加载练习用的二维数据）。

设置中文字体，确保图表中的中文标签正常显示。

``` python
import numpy as np
import matplotlib.pyplot as plt
from utils import *  # 该模块包含数据加载和绘图辅助函数

%matplotlib inline

# 设置中文字体
plt.rcParams["font.family"] = ["sans-serif","SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号
```

## 2. 步骤一：分配最近的质心

`find_closest_centroids` 实现「分配」步骤：对每个样本
$x^{(i)}$，计算它到所有 $K$
个质心的**欧氏距离**，取距离最小的那个质心的下标作为它的归属：

$$c^{(i)} = \arg\min_k \, \| x^{(i)} - \mu_k \|^2$$

关键点：

- `X[i] - centroids` 借助广播，同时算出该样本到所有质心的差值；
- 差值平方后按特征求和（`axis=1`），再开根号即得欧氏距离；
- `np.argmin` 返回距离最小的质心索引。

``` python
def find_closest_centroids(X, centroids):
    """
    计算每个样本所属的最近质心
    
    参数:
        X (ndarray): (m, n) 输入数据，m个样本，每个样本n个特征    
        centroids (ndarray): (k, n) k个质心的坐标
    
    返回:
        idx (array_like): (m,) 每个样本对应的最近质心的索引
    """

    # 设置质心数量
    K = centroids.shape[0]

    # 初始化返回结果
    idx = np.zeros(X.shape[0], dtype=int)

    ### 开始代码 ###
    # 遍历每个样本
    for i in range(X.shape[0]):
        # 计算当前样本到每个质心的距离
        distances = np.sqrt(np.sum((X[i] - centroids) ** 2, axis=1))
        # 找到距离最近的质心索引
        idx[i] = np.argmin(distances)
    ### 结束代码 ###
    
    return idx

```

### 验证「分配」步骤

加载练习数据集 `X`（300 个二维点），手动指定 3
个初始质心，为每个样本分配最近的质心，并打印形状信息确认结果。最后调用单元测试验证函数实现正确。

``` python
# 加载数据
X = load_data()

# 选择初始质心（3个质心）
initial_centroids = np.array([[3,3], [6,2], [8,5]])

# 使用初始质心找到最近的质心
idx = find_closest_centroids(X, initial_centroids)
print("X的形状为:",X.shape)
print("X.shape[0]的值为:",X.shape[0])
print("质心集合形状为:",initial_centroids.shape)
print("最近质心索引idx的形状为:", idx.shape)
# 打印前三个样本的最近质心索引
print("前三个元素的最近质心索引为:", idx[:3])

# 单元测试
from public_tests import *
find_closest_centroids_test(find_closest_centroids)

```

## 3. 步骤二：更新质心

`compute_centroids`
实现「更新」步骤：对每个簇，把质心移到该簇所有样本的**平均值**位置：

$$\mu_k = \frac{1}{|S_k|} \sum_{x \in S_k} x$$

关键点：

- `idx == k` 生成布尔数组，用来筛选出被分给第 $k$ 个质心的所有样本；
- `np.mean(samples, axis=0)` 沿样本轴求平均，得到新质心的每个坐标。

``` python
def compute_centroids(X, idx, K):
    """
    根据每个质心所分配到的样本计算新的质心（取平均值）
    
    参数:
        X (ndarray):   (m, n) 输入数据点
        idx (ndarray): (m,) 每个样本对应的最近质心索引数组
        K (int):       质心/聚类的数量
    
    返回:
        centroids (ndarray): (K, n) 计算得到的新质心
    """
    
    # 有用的变量
    m, n = X.shape
    
    # 初始化返回结果
    centroids = np.zeros((K, n))
    
    ### 开始代码 ###
    # 遍历每个质心
    for k in range(K):
        # 找到分配给当前质心的所有样本
        #idx == k 是一个布尔数组（形状与idx相同），其中每个元素为True表示对应样本被分配给了第 k 个质心，False则表示没有。
        # 例如，若idx = [0,1,0,2]，则idx == 0的结果是[True, False, True, False]。
        samples = X[idx == k]  # samples.shape = (num_samples_assigned_to_k, n)
        # 计算这些样本的平均值作为新的质心
        centroids[k] = np.mean(samples, axis=0) #axis=0表示按列计算均值，即对每个特征计算均值
    ### 结束代码 ###
    
    return centroids

```

### 验证「更新」步骤

用第 2 步得到的分簇结果 `idx` 计算新的质心，打印结果并交给单元测试验证。

``` python
K = 3
centroids = compute_centroids(X, idx, K)

print("计算得到的质心为:", centroids)

# 单元测试
compute_centroids_test(compute_centroids)

```

## 4. 组装完整的 K-Means

`run_kMeans` 把「分配」和「更新」两步交替执行 `max_iters` 次，这就是
K-Means 的完整训练过程：

1.  初始化质心（此处先手动指定）；
2.  重复 `max_iters` 次：为所有样本分配最近质心 → 根据分配结果更新质心。

（代码里注释掉了逐步绘制的部分，可按需开启，观察质心逐步移动的轨迹。）

在练习数据集上运行 10 次迭代，质心会逐步移动到数据分布的中心位置。

``` python
def run_kMeans(X, initial_centroids, max_iters=10, plot_progress=False):
    """
    在数据矩阵X上运行K-Means算法，其中X的每一行是一个样本
    """
    
    # 初始化变量
    m, n = X.shape
    K = initial_centroids.shape[0]
    centroids = initial_centroids.copy()
    previous_centroids = centroids.copy()    
    idx = np.zeros(m)
    
    # 运行K-Means
    for i in range(max_iters):
        
        # 输出进度
        print(f"K-Means迭代 {i}/{max_iters-1}")
        
        # 为每个样本分配最近的质心
        idx = find_closest_centroids(X, centroids)
        
        # 可选：绘制进度
        # if plot_progress:
        #     plot_progress_kMeans(X, centroids, previous_centroids, idx, K, i)
        #     previous_centroids = centroids.copy()
            
        # 根据分配结果计算新的质心
        centroids = compute_centroids(X, idx, K)
    
    plt.show() 
    return centroids, idx

```

### 在示例数据集上运行

加载示例数据集并运行完整的 K-Means 训练，观察质心如何在迭代中收敛。

``` python
# 加载示例数据集
X = load_data()

# 设置初始质心
initial_centroids = np.array([[3,3],[6,2],[8,5]])
K = 3

# 迭代次数
max_iters = 10

# 运行K-Means算法
centroids, idx = run_kMeans(X, initial_centroids, max_iters, plot_progress=True)

```

## 5. 随机初始化质心

质心的初始位置会影响聚类结果。`kMeans_init_centroids`
使用常见的**随机初始化**策略：

- 用 `np.random.permutation` 随机打乱样本下标；
- 取前 $K$ 个样本作为初始质心（相当于随机挑选 $K$ 个真实样本点）。

``` python
def kMeans_init_centroids(X, K):
    """
    初始化K个质心，用于在数据集X上运行K-Means算法
    
    参数:
        X (ndarray): 数据点 
        K (int):     质心/聚类的数量
    
    返回:
        centroids (ndarray): 初始化的质心
    """
    
    # 随机重排样本索引
    randidx = np.random.permutation(X.shape[0])
    
    # 选取重排后的前K个索引取样本作为初始质心
    centroids = X[randidx[:K]]
    
    return centroids

```

## 6. 应用：用 K-Means 压缩图像

图像压缩的核心思想：**用少量颜色近似海量颜色**。

- 原始图片 `bird_small.png` 的形状为 `(128, 128, 3)`，共 16384
  个像素，每个像素是一个 RGB 三元组；
- 把像素值归一化到 $[0, 1]$，再重塑成 `(16384, 3)` 的矩阵，每行就是一个
  3 维样本；
- 取 $K = 16$，用 K-Means 把 16384 种颜色聚成 16
  类，每个像素只需记录「属于哪一类」。

训练完成后，`idx` 记录了每个像素所属的颜色类别。

``` python
# 加载鸟类图像
original_img = plt.imread('bird_small.png')

# 显示原始图像
plt.imshow(original_img)
print("原始图像的形状为:", original_img.shape)

# 将像素值归一化到0-1范围
original_img = original_img / 255

# 将图像重塑为m x 3的矩阵，其中m是像素数量
# 这里m = 128 x 128 = 16384
# 每行包含红、绿、蓝三个通道的像素值
# 这就是我们将用于K-Means的数据集矩阵X_img
X_img = np.reshape(original_img, (original_img.shape[0] * original_img.shape[1], 3))

# 在图像数据上运行K-Means算法
# 可以尝试不同的K值和最大迭代次数
K = 16                       
max_iters = 10               

# 使用上面实现的函数初始化质心
initial_centroids = kMeans_init_centroids(X_img, K) 

# 运行K-Means
centroids, idx = run_kMeans(X_img, initial_centroids, max_iters) 

print("idx的形状:", idx.shape)
print("前五个像素的最近质心:", idx[:5])

```

### 重建压缩后的图像

用质心颜色替换每个像素（`centroids[idx, :]`），再把数据重塑回原始图像尺寸，与原图并排显示：

- 左图：原始图像；
- 右图：仅用 16 种颜色重建的图像。

肉眼可见压缩后的图像依然清晰，而每个像素只需 1
个索引即可表示，存储量大幅下降——这就是 K-Means 图像压缩的原理。

``` python
# 用质心索引表示图像
X_recovered = centroids[idx, :] 

# 将恢复的图像重塑为原始尺寸
X_recovered = np.reshape(X_recovered, original_img.shape) 

# 显示原始图像和压缩后的图像
fig, ax = plt.subplots(1, 2, figsize=(8, 8))
plt.axis('off')

ax[0].imshow(original_img * 255)
ax[0].set_title('原始图像')
ax[0].set_axis_off()

# 显示压缩后的图像
ax[1].imshow(X_recovered * 255)
ax[1].set_title(f'用{K}种颜色压缩后的图像')
ax[1].set_axis_off()

plt.show()
```
