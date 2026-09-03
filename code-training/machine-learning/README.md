# 深度学习练习代码

<p align="center">
  <a href="#项目简介">项目简介</a> •
  <a href="#内容目录">内容目录</a> •
  <a href="#知识手册">知识手册</a> •
  <a href="#快速开始">快速开始</a> •
</p>

---

## 项目简介

本仓库收录了深度学习与机器学习的核心算法实现，包含 19+ 个交互式 Jupyter Notebook 教程。从基础回归算法到深度强化学习，提供从 NumPy 底层实现到 PyTorch 高效开发的完整学习路径。

## 内容目录

| 模块                   | 算法/主题                        | 文件                                                |
| ---------------------- | -------------------------------- | --------------------------------------------------- |
| **监督学习**     | 线性回归、逻辑回归、Softmax 回归 | `regression/`                                     |
| **优化算法**     | 梯度下降、特征缩放、正则化       | `gradient-descent/`, `practice/`                |
| **无监督学习**   | K-Means 聚类、PCA、异常检测      | `k-means/`, `practice/`, `anomaly-detection/` |
| **决策树**       | 决策树算法                       | `decision-trees/`                                 |
| **推荐系统**     | 协同过滤、基于内容的过滤         | `unsupervised-learning/`                          |
| **强化学习**     | 深度 Q 学习 (DQN)                | `reinforcement-learning/`                         |
| **深度学习模板** | U-Net 架构、训练流程             | `templates/`                                      |

## 知识手册

各模块详细知识点总结请参考 [**KNOWLEDGE.md**](KNOWLEDGE.md)

## 快速开始

```bash
# 安装依赖
pip install torch numpy pandas matplotlib jupyter scikit-learn

# 启动 Jupyter
jupyter notebook
```

## 项目结构

```
deep-learning-code/
├── regression/           # 回归算法
├── gradient-descent/     # 梯度下降
├── practice/             # 核心概念：激活函数、PCA、正则化等
├── k-means/              # K-Means 聚类
├── decision-trees/       # 决策树
├── anomaly-detection/    # 异常检测
├── unsupervised-learning/# 推荐系统
├── reinforcement-learning/ # 深度强化学习
├── templates/            # 深度学习代码模板
└── python_practice.ipynb # Python 基础练习
```
