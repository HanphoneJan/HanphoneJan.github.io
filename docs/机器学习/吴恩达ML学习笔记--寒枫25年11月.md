本博客是以下视频课程的学习笔记
[耗费巨量时间翻译！全网最佳学习体验的吴恩达2025机器学习深度学习课程中英双语字幕版本，酣畅淋漓的学习体验！-神经网络/Pytorch/卷积神经网络](https://www.bilibili.com/video/BV1DzANeaEDW/?share_source=copy_web&vd_source=186f482d5782bc8b1831fb6379b26ea2)
代码部分我都用了Pytorch[简介 · PyTorch 实用教程（第二版）](https://tingsongyu.github.io/PyTorch-Tutorial-2nd/)
### 监督学习 Supervised Learning
监督学习是**机器学习三大核心范式**（监督、无监督、强化学习）中应用最广、技术最成熟的一种。其核心思想是 “从标注数据中学习规律”，就像学生在老师的指导下学习 —— 数据中的 “标注” 就是 “老师给出的答案”，模型通过学习 “输入数据” 与 “标注答案” 的对应关系。主要用于**回归和分类**。
本质是**学习一个从 “输入空间” 到 “输出空间” 的映射函数**。
监督学习的实现依赖三个关键要素：标注数据集（Labeled Dataset），模型，损失函数和优化算法。
## 常见的回归
### 线性回归 Linear

#### 损失函数 LossFunction

损失函数是对单个样本而言的，对于包含  n  个样本的数据集，**总损失为所有样本损失的平均值**，也就是**代价/成本函数 CostFunction**。在计算应该将损失函数视作参数w,b的函数。
可以通过绘制 Loss function 图判断模型收敛情况
#### 优化算法--梯度下降 Gradient Descent
**用梯度下降法最小化损失函数**，找到函数的全局最小点（这要求损失函数为凸函数，因为梯度下降只能确保找到局部最小点）
**梯度就是对于当前点下降速率最快的方向**
$$w_j = w_j - \alpha \frac{\partial J(w, b)}{\partial w_j} = w_j - \alpha \frac{1}{n} \sum_{i=1}^{n} (\hat{y}_i - y_i) x_{i,j}, \alpha 为学习率$$
$$b = b - \alpha \frac{\partial J(w, b)}{\partial b} = b - \alpha \frac{1}{n} \sum_{i=1}^{n} (\hat{y}_i - y_i)$$
![image.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%B9%B3%E6%96%B9%E6%8D%9F%E5%A4%B1%E5%87%BD%E6%95%B0%E4%B8%89%E7%BB%B4%E5%8F%AF%E8%A7%86%E5%8C%96%E7%A4%BA%E4%BE%8B.webp)
#### 多项式特征
线性回归不只适用于单变量，对于多维特征同样使用。关键在于线性关系。但是无法绘制出函数图像。可以绘制散点图展示模型预测值与实际值的关系或者为每个特征单独绘制图表。
#### 多项式回归 Polynomial
使用多项式代替线性公式。- 若原始特征是  `[x1, x2]`，则生成  `[x1, x2, x1², x1x2, x2²]`（二次多项式）等组合特征。生成的多项式特征可以让线性回归模型（本质是对特征做线性组合）拟合出非线性的关系。
### 逻辑回归 Logistic

线性回归不适合分类问题：线性回归的目标是**最小化 “预测值与真实值的误差”**（如均方误差 MSE），输出的是连续数值（例如预测房价、销售额）；而分类问题的目标是**最大化 “类别判断的准确率”**，输出的是离散类别（例如判断 “是猫 / 狗”“患病 / 健康”）。逻辑回归是 Softmax 回归在二分类情况下的特例。
#### Sigmoid S 形函数
引入 sigmoid 函数代替 ReLU 函数，能将任意实数映射到(0,1)区间，且趋势合理。
$$p=\sigma(z) = \frac{1}{1 + e^{-z}},z=wX+b$$
逻辑回归通过 sigmoid 函数将**线性决策边界**转化为**概率输出**，既保留了线性模型的可解释性，又满足了分类任务的需求。
训练目标是**找到最优的权重  `w`  和偏置  `b`**，使模型对训练数据的预测概率尽可能接近真实标签。
#### 可视化决策边界
在数据散点图中绘制类别的分界线，满足 "预测概率 = 0.5" 的点集.
#### 交叉熵损失
逻辑回归不使用线性回归中的 均方误差（MSE），而是采用**交叉熵损失（Cross-Entropy Loss）**，原因是 MSE 对于 sigmoid 函数来说是非凸的（存在多个局部最小值，难以找到全局最优）。通过最大似然估计可以推导得到交叉熵损失函数对逻辑回归是较好的。
$$H(p, q) = \sum_{x} p(x) \log \frac{1}{q(x)} $$

$$
L(f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)}), y^{(i)}) = \begin{cases} -\log\left(f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)})\right) & \text{if } y^{(i)} = 1 \\ -\log\left(1 - f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)})\right) & \text{if } y^{(i)} = 0 \end{cases}
$$

$$
L(f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)}), y^{(i)}) = -y^{(i)}\log\left(f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)})\right) - (1 - y^{(i)})\log\left(1 - f_{\overrightarrow{w},b}(\overrightarrow{x}^{(i)})\right)
$$

```python
#对损失函数用链式法则求导,X.T是特征矩阵的转置,点乘后得到每个特征的梯度总和,除以样本数得到平均值
dw = (1/n_samples) · X.T · (ŷ - y)
#偏置可以看作是一个恒为 1 的特征的权重，所有预测误差的平均值
db = (1/n_samples) · Σ(ŷ - y)
```

### Softmax 回归
稀疏分类交叉熵损失回归，解决分类问题 MultiClass Classification。
**Softmax 函数的核心是将任意实数输入映射为 0-1 之间的概率值，且所有输出概率之和为 1。**
对于一个输入向量 $\boldsymbol{x} \in \mathbb{R}^d$，Softmax 回归首先计算每个类别的得分（logits）：$\boldsymbol{z} = \boldsymbol{W}\boldsymbol{x} + \boldsymbol{b}$
其中 $\boldsymbol{W} \in \mathbb{R}^{k \times d}$ 是权重矩阵，$\boldsymbol{b} \in \mathbb{R}^k$ 是偏置向量，$k$ 是类别数量。
然后在输出层通过 Softmax 函数将得分转换为概率分布：
$$\hat{y}_i = \text{softmax}(\boldsymbol{z})_i = \frac{e^{z_i}}{\sum_{j=1}^k e^{z_j}} \quad \text{for } i = 1, 2, \ldots, k$$
其中 $\hat{y}_i$ 表示预测为第 $i$ 类的概率，且满足 $\sum_{i=1}^k \hat{y}_i = 1$ 和 $0 \leq \hat{y}_i \leq 1$。
使用交叉熵损失函数：$L(\boldsymbol{y}, \hat{\boldsymbol{y}}) = -\sum_{i=1}^k y_i \log(\hat{y}_i)$
其中 $\boldsymbol{y}$ 是真实标签的独热编码表示（$y_i = 1$ 表示样本属于第 $i$ 类，否则为 0）。

#### 多输出分类

Multi-label Classification

## 常见的层
按训练过程分：输入层、输出层、隐藏层

### 全连接层Fully Connected Layer

前馈神经网络

### 卷积层Convolutional Nerual Layer


## 模型训练思路
![](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E6%A8%A1%E5%9E%8B%E8%AE%AD%E7%BB%83%E6%80%9D%E8%B7%AF.webp)
**对于大型神经网络用小数据集训练，使用合适的正则化可以使其至少与小模型表现相当。一个神经网络，尤其是大型，通常是低偏差机器，适合拟合复杂函数。**
#### 学习曲线
学习曲线是**以训练轮次、训练数据大小等等为横轴，模型的性能指标（如损失值、准确率）为纵轴的折线图**，**解读Bias 和 Vriance**。

![](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%9F%BA%E4%BA%8E%E5%81%8F%E5%B7%AE%E5%92%8C%E6%96%B9%E5%B7%AE%E7%9A%84%E8%AE%AD%E7%BB%83%E8%BF%87%E7%A8%8B.webp)



## 模型训练技巧
### 向量化 Vectorization

```python
# 无向量化时效率低
f=0
for i in range(n):
	f = f + w[i]*x[i]
f=f+b
# numpy中的函数能充分利用硬件的并行能力，运行效率高
np.dot(w,x)+b
```

### 特征缩放 Feature scaling
使梯度下降更平滑稳定，防止反复

### 独热编码
如果一个分类特征有k个取值，则将其拆分为k个分类特征。
#### 归一化 Mean Normalization

$x_i := \dfrac{x_i - \mu_i}{max - min}$

#### Z-SCORE Normalization

### 选择合适的学习率
太小会导致收敛太慢，太大可能会导致震荡无法收敛。

### 欠拟合与过拟合overfit
![image.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E8%BF%87%E6%8B%9F%E5%90%88%E4%BE%8B%E5%9B%BE1.webp)
![image.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E8%BF%87%E6%8B%9F%E5%90%88%E4%BE%8B%E5%9B%BE2.webp)
**高偏差 High Bias, Underfit 欠拟合 ，高方差 High Variance Overfit过拟合。**
解决办法：1.收集更多数据；2.选择只使用部分特征作为输入；3.正则化。
#### 正则化 Regularization
目标是限制参数的大小，一般只限制 w。在每次迭代的作用一般是让 w 乘以一个略小于 1 的$\lambda$（正则化系数）。参数的绝对值越大，平方和越大，正则化项对总损失的贡献就越大。
$\lambda$ 选择方法：选择不同的$\lambda$，训练，在验证集上计算损失然后比较。
**正则化线性回归**
$$J(\mathbf{w},b) = \frac{1}{2m} \sum_{i=0}^{m-1} \left( f_{\mathbf{w},b}(\mathbf{x}^{(i)}) - y^{(i)} \right)^2 + \frac{\lambda}{2m} \sum_{j=0}^{n-1} w_j^2$$
$$w_j = w_j · (1 - α·λ/m) - α·(1/m)·Σ(f_{w,b}(x^{(i)}) - y^{(i)})·x_j^{(i)}$$
**正则化逻辑回归**
$$J(\mathbf{w},b) = \frac{1}{m}  \sum_{i=0}^{m-1} \left[ -y^{(i)} \log\left(f_{\mathbf{w},b}\left( \mathbf{x}^{(i)} \right) \right) - \left( 1 - y^{(i)}\right) \log \left( 1 - f_{\mathbf{w},b}\left( \mathbf{x}^{(i)} \right) \right) \right] + \frac{\lambda}{2m}  \sum_{j=0}^{n-1} w_j^2$$
$$w_j = w_j - α · [ (1/m) · Σ( f_{\mathbf{w},b}(\mathbf{x}^{(i)}) - y^{(i)} ) · x_j^{(i)} + (λ/m) · w_j ]$$
#### 建立基准性能
常用人类表现水平作为基准性能，根据训练集、验证集损失与人类水平比较，确定学习效果。
### 梯度下降优化
##### Adam算法
是**为每个参数单独计算专属的学习率，动态调整**。对每个参数，算法会持续记录两样东西：一是梯度的 “方向趋势”（一阶矩），二是梯度的 “波动大小”（二阶矩）。对梯度小且稳定的参数，则增大学习率。对梯度大或波动大的参数，缩小有效学习率。
```python
import torch.optim as optim # 导入PyTorch的优化器模块，包含各种优化算法
optimizer_multi = optim.Adam(
    model_multi.parameters(),  # 要优化的模型参数
    lr=0.001,                  # 初始学习率
    weight_decay=1e-4          # L2正则化系数，防止过拟合
)
```
### 模型测试
对于测试集，其损失函数不一定要用训练时的相同。比如可以直接使用未成功预测的比例。
#### 交叉验证集Cross Validation Set
即验证集，也称Dev Set。主要用于计算泛化误差，方便选择模型，同时防范过拟合和欠拟合。而测试集只用于最终评估。
#### 错误分析
人类手动查看导致错误结果产生的原因，并针对性调整训练

### 增加数据
增加数据、增加数据类型、
数据增强Data Augmentation：通过扭曲原有数据来增加数据，比如增加背景噪声（尽量使用数据集）
数据合成    Data Synthesis
### 迁移学习Transfer Learning
迁移学习是**把从一个任务中学到的知识，迁移到另一个相关但不同的任务中**，因为不同任务间往往存在共性，比如识别猫和识别狗都需要先学习边缘、纹理等通用图像特征。有两种方式：
- **特征提取**：冻结预训练模型的大部分层（通常是卷积层），只替换最后几层分类器（shu），用新任务数据训练分类器部分。这种方式适用于新任务数据少、与原任务相似度高的场景。
- **微调（Fine-tuning）**：不冻结预训练模型，而是用新任务数据对整个模型或部分高层进行小幅训练。这种方式适用于新任务数据较多、与原任务有差异但相关的场景。

### 处理倾斜数据集

| 真实类别 \ 预测类别         | 预测为正类（Positive）                 | 预测为负类（Negative）                 |
| ------------------- | ------------------------------- | ------------------------------- |
| **真实为正类（Positive）** | TP（True Positive）<br><br>（真阳性）  | FN（False Negative）<br><br>（假阴性） |
| **真实为负类（Negative）** | FP（False Positive）<br><br>（假阳性） | TN（True Negative）<br><br>（真阴性）  |
精确率Precision = TP / (TP + FP)，核心是**降低误判（FP）**。
召回率Recall = TP / (TP + FN)，核心是**不遗漏正类（FN）**。 
精确率和召回率是**反向变化**的，为达到平衡，使用F1 Score衡量。F1 Score 是精确率（Precision）和召回率（Recall）的调和平均数，调和平均对较小值更敏感，能强制精确率和召回率都达到较高水平，才会给出高 F1 值。
## 训练过程
### 前向传播 forward propagation

前向传播指的是从输入数据开始，按照网络层的连接顺序（从输入层 → 隐藏层 → 输出层），依次计算每一层的输出，最终得到网络预测结果的过程。
具体来说，输入数据通过与各层权重矩阵相乘、加上偏置项，再经过激活函数处理后，得到该层的输出；这个输出作为下一层的输入，重复上述计算，直到通过最后一层输出最终结果。
本质是通过网络的参数（权重和偏置）对输入数据进行一系列线性变换和非线性映射，实现从输入空间到输出空间的特征转换。
![image.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%89%8D%E5%90%91%E4%BC%A0%E6%92%AD%E7%A4%BA%E4%BE%8B.webp)

#### 密集层 Dense

密集层（Dense Layer），也称为全连接层（Fully Connected Layer），是神经网络中最基础的层结构之一。
在密集层中，每个神经元会与前一层的**所有神经元**建立连接（即 "全连接"），其计算过程为：对前一层的输出进行线性变换（权重矩阵相乘 + 偏置），再通过激活函数生成当前层的输出。
这种层结构的核心特点是参数密集（每个连接对应一个权重参数），能学习输入特征间的复杂关联，是提取高阶特征的基础组件，广泛用于神经网络的各个部分。

```python
import numpy as np

def dense(a_in, w, b, g):
    units = w.shape[1]
    a_out = np.zeros(units)
    for j in range(units):
        w_j = w[:, j]
        z = np.dot(w_j, a_in) + b[j]
        a_out[j] = g(z)
    return a_out

def sequential(x):
    a1 = dense(x, W1, b1)
    a2 = dense(a1, W2, b2)
    a3 = dense(a2, W3, b3)
    a4 = dense(a3, W4, b4)
    f_x = a4
    return f_x
```

### 激活函数 Activate Function
**为什么要使用激活函数：多层神经网络直接退化为一个线性函数**
二分类问题：sigmoid
预测值可正可负：linear（no activation）
预测值只能是正值或 0：ReLU
隐藏层默认使用 ReLU
使用 ReLU 函数会比使用 Sigmoid 更快一些，因为 Sigmoid 过于平滑导致梯度下降较慢。
![image.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%9B%9B%E4%B8%AA%E5%B8%B8%E7%94%A8%E6%BF%80%E6%B4%BB%E5%87%BD%E6%95%B0%E7%9A%84%E5%9B%BE%E5%83%8F.webp)

### 反向传播 backward propagation
**基于链式法则，反向传播更有利于计算导数。** 
### 计算图computational graph

![计算图](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%90%B4%E6%81%A9%E8%BE%BE%E8%AE%A1%E7%AE%97%E5%9B%BE%E7%A4%BA%E4%BE%8B.webp)

将模型的正向计算（如矩阵乘法、激活函数）拆解为节点（运算）和边（数据 / 张量流向）构建计算图，然后沿路径进行反向传播，可快速进行梯度计算（因为计算是基于链式求导法则）。
在pytorch中执行执行张量运算（如 `model(x)` 中的线性变换、`loss` 计算）时，会自动记录每个运算的输入、输出和运算本身，形成一张临时的计算图，这张图仅在本次前向传播中存在，`loss.backward()` 完成后，除非有张量被 `retain_grad()`保留，否则图会被自动释放（节省内存）。
#### 使用torchviz实现可视化
对于在代码中构建的计算图，我始终有种不够直观的理解，毕竟对我来说无法绘制的图便不是图。看了一些教程也没看到模型训练中绘制计算图，于是搜索资料，发现torchviz库可以实现。
##### 安装
`torchviz` 依赖底层工具 Graphviz，需要单独安装
[官方网址：Download | Graphviz](https://graphviz.org/download/) 根据官方教程安装，安装后需要确保被添加到环境变量中。
在虚拟环境中用pip安装torchviz，因为torchviz没有在conda默认安装通道 
```shell
pip install torchviz
```
##### 绘制
编写代码，绘制成功，会生成一个中间文件和一个最终的pdf文件。
![计算图编码](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/torchviz%E7%BB%98%E5%88%B6%E8%AE%A1%E7%AE%97%E5%9B%BE%E7%A4%BA%E4%BE%8B.webp)
##### 附录
[参考博客](https://blog.csdn.net/Wenyuanbo/article/details/118525079?fromshare=blogdetail&sharetype=blogdetail&sharerId=118525079&sharerefer=PC&sharesource=Janhizian&sharefrom=from_link)
### 推理 Inference/Prediction


### 训练 Training

 

## 决策树模型
**与深度学习算法同级的机器学习算法**，看起来混乱复杂但工作得很好。用于分类或回归。 **一般只用于结构化数据**，训练速度比神经网络更快，小型决策树人类可解释。 
### 测量样本纯度
使用熵来衡量，熵越小越纯。 
![测量样本纯度](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%86%B3%E7%AD%96%E6%A0%91%E6%A8%A1%E5%9E%8B%E4%BF%A1%E6%81%AF%E5%A2%9E%E7%9B%8A%E5%88%86%E8%A3%82%E6%96%B9%E5%BC%8F.webp)

如何分裂节点：选择具有最大信息增益的节点分裂方式
如何决定何时停止：已经达到理想状态或者节点深度超过阈值或者分裂的信息增益小于某个阈值
构建决策树在代码上使用递归算法实现。
### 处理连续值特征
尝试不同的阈值，取某个阈值进行分割，比如体重、身高，将其从具体数值变为是否比某个值大或者小。
![决策树回归](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%86%B3%E7%AD%96%E6%A0%91%E5%9B%9E%E5%BD%92%E8%8A%82%E7%82%B9%E5%88%86%E5%89%B2.webp)

### 使用多个决策树
单个决策树对单一数据变化很敏感，办法是使用多个决策树同时进行预测最后投票。
#### 随机森林算法Random Forest
袋装决策树算法：使用有放回抽样构建随机替换采样的新训练集，然后训练出新的决策树。最后多个决策树集成。
随机森林算法由袋装决策树算法改进而来：在树的每个节点分裂时，**不使用所有特征，而是随机选择部分特征（如总特征数的√n 或 1/2）作为候选分裂特征**，从这些候选特征中选择最优分裂点。
通过限制每个节点的候选特征，进一步降低树之间的相关性（若所有树都依赖少数强特征，集成效果会下降），增强模型的多样性。
#### XGBoost(extreme gradient boosting)
boost：可以理解在选择特征时强迫选择了原本做的不那么好的，尝试训练。
梯度提升树算法：基于 boosting 框架，通过迭代方式逐步构建模型，每棵新树都专注于修正前序所有树的预测误差（残差），最终将多棵树的预测结果加权求和得到最终输出。
XGBoost 是梯度提升树的极致优化版本，核心改进包括：
正则化优化：在目标函数中加入树结构复杂度的正则项（如叶子节点数量、叶子节点权重平方和），控制模型过拟合，增强泛化能力。
分裂点优化：采用近似算法高效寻找最优分裂点（分位数切割候选特征值），同时支持缺失值自动处理（将缺失值分配到增益最大的分支），提升计算效率。
并行化加速：在特征粒度上并行计算分裂增益，利用缓存优化数据存储，大幅提升训练速度。
梯度优化：使用二阶泰勒展开近似目标函数，相比传统梯度提升（一阶导数）能更精准地优化损失，加速模型收敛。
会用即可。
```python
from xgboost import XGBClassifier,XGBRegressor
# 初始化模型
model = XGBClassifier() #分类
model = XGBRegressor() #回归
# 训练模型
model.fit(X_train, y_train)
# 预测
y_pred = model.predict(X_test)
```


## 无监督学习Unsupervised Learning
关键在于数据无标注，即没有y_train，让算法自行挖掘，核心价值是 “从混乱的数据中提取有用信息”，
### 聚类Clustering
聚类是无监督学习最经典的任务之一，目标是根据数据的“相似性”，将无标签样本自动划分为多个互不重叠的“簇”（Cluster），使得同一簇内的样本高度相似，不同簇的样本差异显著。
电商用户分群、新闻/内容聚类、生物分类
#### K-均值算法
实质是在最小化一个特定的代价函数$$J(c^{(1)},\dots,c^{(m)},\mu_1,\dots,\mu_K) = \frac{1}{m}\sum_{i=1}^{m} \|x^{(i)} - \mu_{c^{(i)}}\|^2$$ 步骤如下：
	1. 确定聚类数量 K（根据后续的目标选择，比如需要设计三个尺码的衣服）
	2. 初始化：从样本中随机选择 K 个点作为初始聚类中心（多次随机初始化可减少因初始中心选择不当导致的局部最优问题，最终选择代价函数最小的结果）。
	3. 分配样本：计算每个样本到各聚类中心的距离，将样本划分到距离最近的中心所属聚类。
	4. 更新中心：计算每个聚类中所有样本的均值，将其作为新的聚类中心。
	5. 重复步骤 3 和 4，直到聚类中心位置不再显著变化（或达到预设迭代次数），此时算法收敛
### 降维Dimensionality Reduction
现实中的数据往往具有“高维度”特征（如一张 100×100 像素的图片有 10000 个维度，一份用户行为数据可能包含数十个特征），高维度会导致“维度灾难”——数据稀疏、计算成本高、模型易过拟合。
降维的目标是**在损失少量信息的前提下，将高维数据映射到低维空间**，既简化数据结构，又保留数据的核心特征，一般用于高维数据可视化、图像/文本预处理、特征压缩。
![](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E6%95%B0%E6%8D%AE%E5%8E%8B%E7%BC%A9%E4%B9%8B%E9%AB%98%E7%BB%B4%E6%95%B0%E6%8D%AE%E5%8F%AF%E8%A7%86%E5%8C%96.webp)

#### 主成分分析PCA
Principle component analysis，**首先应该做特征归一化到均值 0**（即中心化，使每个特征的均值为 0，消除量纲对协方差计算的影响）。
主成分：投影到某一个轴后，数据具有最大方差，则是主成分轴。每一个主成分轴都与其他主成分轴垂直。**最大化投影分布等于最小化这些数据点到投影轴的距离**。
PCA 的核心逻辑是通过对数据协方差矩阵进行特征值分解，将特征值从大到小排序，其对应的特征向量即为按重要性排序的主成分。取前 k 个主成分可将高维数据投影到 k 维空间实现降维，保留数据中最具区分度的信息（方差越大，信息越重要）。降维过程中会损失部分信息，损失程度由被舍弃的特征值总和（对应次要主成分）决定，特征值之和越小，信息损失越少。
**步骤1：准备数据**
假设有3个二维样本数据（已做均值归一化，即每个特征的均值为0），构成矩阵X，数据分布在直线 $y=x$ 附近，两个特征高度相关）
1. 协方差矩阵：  
    $X^T X = \begin{bmatrix} -1&0&1 \\ -1&0&1 \end{bmatrix} \begin{bmatrix} -1&-1 \\ 0&0 \\ 1&1 \end{bmatrix} = \begin{bmatrix} 2 & 2 \\ 2 & 2 \end{bmatrix}$  
    $\Sigma = \frac{1}{n-1} X^T X = \begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}$
2. 特征值与主成分：  
    特征值 $\lambda_1 = 2$ ，$\lambda_2 = 0$；主成分矩阵为 $u_1 = \begin{bmatrix} 1/\sqrt{2} \\ 1/\sqrt{2} \end{bmatrix}$
3. 压缩到一维：  
    $z = X \cdot u_1 = \begin{bmatrix} -1 & -1 \\ 0 & 0 \\ 1 & 1 \end{bmatrix} \begin{bmatrix} 1/\sqrt{2} \\ 1/\sqrt{2} \end{bmatrix} = \begin{bmatrix} -2/\sqrt{2} \\ 0 \\ 2/\sqrt{2} \end{bmatrix} = \begin{bmatrix} -\sqrt{2} \\ 0 \\ \sqrt{2} \end{bmatrix}$
4. 重构数据：  
    $\hat{X} = z \cdot u_1^T = \begin{bmatrix} -\sqrt{2} \\ 0 \\ \sqrt{2} \end{bmatrix} \begin{bmatrix} 1/\sqrt{2} & 1/\sqrt{2} \end{bmatrix} = \begin{bmatrix} -1 & -1 \\ 0 & 0 \\ 1 & 1 \end{bmatrix}$
### 异常检测Anomaly Detection
异常检测（也称离群点检测）的目标是从大量正常数据中，自动识别出“不符合常规模式”的样本（异常样本），这些样本通常代表“异常事件”，比如金融欺诈检测、 工业设备故障预警、医疗异常诊断。
其核心逻辑是：**正常样本会形成特定的分布或模式，异常样本会显著偏离该模式**。
#### 密度检测DensityEstimation
通过估计数据的概率密度分布，将密度低于某一阈值的样本判定为异常。
常见的密度估计方法包括参数化方法（如基于高斯正态分布的估计）和非参数化方法（如 K 近邻密度估计，通过计算样本周围一定范围内的邻居数量或距离来衡量该样本所在区域的密度，邻居越少、距离越远，密度越低，越可能是异常样本）。
#### 高斯正态分布Normal Distribution
对每一个特征都使用高斯分布拟合。因而关键在于调整参数$\varepsilon$，当数据点概率小于$\varepsilon$时，则为异常。
#### 使用评估算法
划分出交叉验证集与测试集，标注异常数据，借此评估已经训练的算法效果。那为什么不直接用监督学习呢？异常检测算法更适用于正样本（即异常数据）很少的时候，非常适合用于检测全新的异常。
#### 选择特征
选择特征对于异常检测算法相比对于监督学习算法来说更重要。**确保特征数据近似高斯分布。**
```python
# 快速绘制图像以调整特征数据分布
plt.hist(np.log(x),bins=50,color='b')
```
一般遇到的错误是 p(x)普遍偏大，通过改变特征来修正。
![异常检测算法错误分析](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%BC%82%E5%B8%B8%E6%A3%80%E6%B5%8B%E7%AE%97%E6%B3%95%E9%94%99%E8%AF%AF%E5%88%86%E6%9E%90.webp)
### 推荐系统Recommendation System
#### 协同过滤算法Collaborative filtering
根据与你给出相似评分的用户的评分，向你推荐物品。**将x也作为参数进行学习**。
协同过滤推荐系统的目标是生成两个向量：针对每个用户，生成一个 “参数向量”，用以体现该用户的电影偏好；针对每部电影，生成一个尺寸相同的特征向量，用以体现该电影的相关描述信息。两个向量的点积加上偏置项，应能得出用户可能给予该电影的评分估计。
![协同过滤算法示例1.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%8D%8F%E5%90%8C%E8%BF%87%E6%BB%A4%E7%AE%97%E6%B3%95%E7%A4%BA%E4%BE%8B1.webp)

现有评分以矩阵形式呈现。矩阵$Y$包含评分值：范围为0.5到5（以0.5为间隔），未评分的电影记为0。矩阵$R$在有评分的位置标记为1。矩阵中，**行代表电影，列代表用户**。每个用户有一个参数向量$w^{user}$和偏置项，每部电影有一个特征向量$x^{movie}$。这些向量通过现有用户-电影评分作为训练数据进行联合学习。上方展示了一个训练样本：$\mathbf{w}^{(1)} \cdot \mathbf{x}^{(1)} + b^{(1)} = 4$。值得注意的是，电影的特征向量$x^{movie}$必须适配所有用户，而用户的参数向量$w^{user}$必须适配所有电影。
1. **数据矩阵定义**
    - $Y$：评分矩阵，$Y[i,j]$表示用户$j$对电影$i$的评分（0.5~5分，0表示未评分）。
    - $R$：指示矩阵，$R[i,j]=1$表示用户$j$对电影$i$有评分，用于筛选有效训练数据。
2. **向量学习逻辑**
    - 电影特征向量$x^{movie}$需兼顾所有评价过该电影的用户偏好（即对不同用户的评分都要拟合）。
    - 用户参数向量$w^{user}$需匹配该用户评价过的所有电影特征（即对不同电影的评分都要拟合）。
3. **“协同”的含义**  
    算法通过所有用户的历史评分共同优化向量：每个用户的评分会影响电影特征向量的学习，而电影特征又反过来约束其他用户参数向量的优化，最终形成全局一致的偏好-特征匹配关系。
4. **训练样本示例**  
    $\mathbf{w}^{(1)} \cdot \mathbf{x}^{(1)} + b^{(1)} = 4$ 表示：用户1的参数向量与电影1的特征向量的点积加偏置项，应等于用户1对电影1的实际评分4分，这是单个训练样本的拟合目标。
5. 将对w,b优化的代价函数与对x优化的代价函数合并得到最终的代价函数
$$ \frac{1}{2} \sum_{(i,j): r(i,j)=1} \left( w^{(j)} \cdot x^{(i)} + b^{(j)} - y^{(i,j)} \right)^2 + \frac{\lambda}{2} \sum_{j=1}^{n_u} \sum_{k=1}^{n} \left( w_k^{(j)} \right)^2 + \frac{\lambda}{2} \sum_{i=1}^{n_m} \sum_{k=1}^{n} \left( x_k^{(i)} \right)^2 $$
6. 梯度下降
- $w_i^{(j)} = w_i^{(j)} - \alpha \frac{\partial}{\partial w_i^{(j)}} J(w, b, x)$
- $b^{(j)} = b^{(j)} - \alpha \frac{\partial}{\partial b^{(j)}} J(w, b, x)$
- $x_k^{(i)} = x_k^{(i)} - \alpha \frac{\partial}{\partial x_k^{(i)}} J(w, b, x)$
协同过滤不适用于冷启动问题（新物品、新用户）
##### 处理二进制标签
- 单个样本的损失函数（交叉熵损失）： $$ L\left(f_{(w,b,x)}(x), y^{(i,j)}\right) = -y^{(i,j)} \log\left(f_{(w,b,x)}(x)\right) - \left(1 - y^{(i,j)}\right) \log\left(1 - f_{(w,b,x)}(x)\right) $$
- 整体代价函数： $$ J(w, b, x) = \sum_{(i,j): r(i,j)=1} L\left(f_{(w,b,x)}(x), y^{(i,j)}\right) $$
-  均值归一化
对物品的数据归一化更有利于处理对全新用户的推荐
对用户的数据归一化更有利于处理对全新物品的推荐

##### 发现相关物品
**基于物品特征向量的相似性检索方法**，常用于推荐系统、信息检索等领域：
物品$i$的特征 $x^{(i)}$ 很难解释。 要找到与之相关的其他物品， 找到物品 $k$，其 $x^{(k)}$ 与 $x^{(i)}$ 相似， 即（两者）距离最小， 距离的计算式为 $\sum_{l=1}^{n} \left( x_l^{(k)} - x_l^{(i)} \right)^2$， 也可表示为 $| x^{(k)} - x^{(i)} |^2$。

#### 关联规则挖掘Association Rule Mining
关联规则挖掘的目标是从大量数据中，发现“不同物品/事件之间的频繁关联关系”。
其核心是找到“频繁项集”（即同时出现频率高的物品组合），再基于频繁项集生成关联规则（如“购买 A → 很可能购买 B”）。商品推荐、医疗诊断关联、网页浏览行为分析
#### 基于内容的过滤算法Content-base filtering
**根据用户和物品的特征来寻找良好匹配**，从而向你推荐物品。相比协同过滤，冷启动更好。
#### 大型目录推荐
先检索后排序，
检索：根据规则给出项目候选列表（比如根据用户最近看过的十部电影给出十部最相似的 ）
排序：将项目候选列表输入用户相关的神经网络，按预测评分排序。
## 强化学习Reinforcement Learning
强化学习目前在模拟世界、游戏等领域中表现好，但在真实机器人领域还不太行。
在某些领域使用监督学习效果不好，因为状态很多（如环境变量、自身姿态等组合爆炸），很难穷尽所有状态并给出精确动作示范，也难以定义“绝对正确”的动作（因环境动态变化）。强化学习的关键是激励函数Reward Function——通过奖励/惩罚信号引导智能体学习（类似巴普洛夫的狗通过奖惩形成条件反射）。
四个要素：状态（智能体感知的环境信息，如机器人当前位置）、动作（智能体可执行的操作，如移动、抓取）、奖励（执行动作后的即时反馈，如完成任务得正奖、碰撞得负奖）、下一个状态（执行动作后环境的新状态）
discount factor折扣因子：衡量未来奖励的当前价值（0<γ<1），γ越小越关注即时奖励，γ越大越重视长期收益。
### 回报Return
从当前状态开始，所有未来状态奖励的加权和（含折扣因子），即奖励函数$R_s = r_{s+1} + \gamma r_{s+2} + \gamma^2 r_{s+3} + ...$，反映长期累积收益。
### 决策Policy
智能体的行为策略函数，通常表示为$\pi(a|s)$，即给定状态s时选择动作a的概率分布（或确定性选择），目标是找到最大化长期回报 $R$ 的最优策略$\pi$
![强化学习概念示例.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%BC%BA%E5%8C%96%E5%AD%A6%E4%B9%A0%E6%A6%82%E5%BF%B5%E7%A4%BA%E4%BE%8B.webp)
#### Markov Decision Process（MDP）
在马尔可夫决策过程中，未来只取决于当前状态和动作，与历史无关（无记忆性），可用状态转移概率$P(s'|s,a)$描述从状态s执行动作a后到s'的概率，是强化学习的核心数学模型。
State action value function 动作状态值函数 即Q(s,a)，表示在状态s下执行动作a后，遵循当前策略能获得的期望回报；最优Q值$Q^*(s,a)$则指遵循最优策略时的期望回报。
##### 贝尔曼方程Bellman Equation
将当前状态的价值与未来状态的价值关联的递归方程。公式表达为： $$ Q(s,a) = R(s) + \gamma \max_{a'} Q(s',a') $$通过分解即时奖励和未来最优价值，解决了价值函数的循环定义问题.
#### 随机环境/处理错误
在随机环境中，动作执行和状态转移存在不确定性（如误步概率），因此计算奖励时需考虑奖励期望（即所有可能结果的概率加权平均），而非单一确定性结果。这要求价值函数（如 Q 值）的更新需基于 “动作 - 状态转移的概率分布”，通过贝尔曼方程的期望形式（引入状态转移概率 $P(s'|s,a)$）处理随机性，使策略在不确定环境中仍能学习到稳健的长期收益。
### 连续状态空间应用
连续状态空间中，状态通常是一个高维向量（包含环境的连续特征，如机器人的位置坐标、速度、传感器数据等），无法像离散状态那样枚举。此时需通过**函数近似方法**（如神经网络）对价值函数或策略进行建模，用参数化模型（如输入状态向量、输出 Q 值或动作概率的网络）拟合状态与价值 / 动作的映射关系。
对于离散型，可以用表格、有限状态机、决策树等建模。
### DQN算法
深度Q算法，即使用深度学习来训练Q函数，对Q进行随机初始化在状态 $s$ 下，将 $s$ 输入神经网络，选择能使 $Q(s,a)$ 最大化的动作 $a$。
#### $\varepsilon$ -贪心策略
（$\varepsilon = 0.05$）
- 以0.95的概率，选择使 $Q(s,a)$ 最大化的动作 $a$。“贪心（Greedy）”，即“利用（Exploitation）”
- 以0.05的概率，随机选择一个动作 $a$。“探索（Exploration）”
初始时 $\varepsilon$ 设得较高（如 1.0），随着训练推进从 1.0 逐渐降低到 0.01 左右，平衡前期探索与后期利用。
#### 小批量mini-batch
训练时，从经验回放池中随机抽取一小批样本（如 32 或 64 个）进行梯度下降更新，减少样本间的相关性，提升训练稳定性。
![小批量梯度下降与普通梯度下降对比图示例.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/%E5%B0%8F%E6%89%B9%E9%87%8F%E6%A2%AF%E5%BA%A6%E4%B8%8B%E9%99%8D%E4%B8%8E%E6%99%AE%E9%80%9A%E6%A2%AF%E5%BA%A6%E4%B8%8B%E9%99%8D%E5%AF%B9%E6%AF%94%E5%9B%BE%E7%A4%BA%E4%BE%8B.webp)
#### 软更新softup update
为了提升训练稳定性，会设置目标网络（用于计算目标Q值），解耦目标计算与参数更新的强耦合关系。软更新是指**以很小的学习率（这里是0.01）将新网络的参数比如权重 $W_{new}$、偏置 $B_{new}$ 缓慢融合到目标网络的权重 $W$、偏置 $B$ 中**，公式为 $W = 0.01W_{new} + 0.99W$、 $B = 0.01B_{new} + 0.99B$。
这种方式让目标网络的参数更新更平滑，减少训练过程中的波动，帮助模型更稳定地收敛。
#### 库gym
[Gymnasium 文档](https://gymnasium.org.cn/introduction/basic_usage/) 内置上百种实验环境，每个环境就代表着一类强化学习问题，用户通过设计和训练自己的智能体来解决这些强化学习问题。
**旧版本库是gym，python版本建议选择3.10**
```bash
pip install gym #基础安装
pip install gym[box2d] #带box2d扩展安装
pip install gym[all] #全量安装
```
安装swig
SWIG（Simplified Wrapper and Interface Generator）是一个开源工具，主要用于连接 C/C++ 代码与其他编程语言（如 Python、Java、Ruby、C# 等），帮助开发者在不同语言中调用 C/C++ 的函数、类或库，[安装swig网址](https://www.swig.org/download.html)
将下载文件解压，放到某个目录，然后将这个路径添加到系统PATH
**新版本gymnasium**
```shell
pip install swig
pip install gymnasium[box2d]
```
