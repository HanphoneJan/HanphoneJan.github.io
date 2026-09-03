# 《动手学深度学习》学习笔记

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/) [![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-orange.svg)](https://pytorch.org/) [![D2L](https://img.shields.io/badge/D2L-Book-green.svg)](https://zh.d2l.ai/)

本项目是我在学习[《动手学深度学习》(Dive into Deep Learning)](https://zh.d2l.ai/)过程中的代码实践记录。包含从基础线性回归到BERT预训练模型的完整实现，每个章节都提供了**基础实现**（从零开始手写）和**简洁实现**（调用 PyTorch 高级 API）两种版本。

---

## 项目结构

```
.
├── d2l_1_2.ipynb                          # 第1-2章：预备知识
├── d2l_3.ipynb                            # 第3章：线性神经网络
├── d2l_4.ipynb                            # 第4章：多层感知机
├── d2l_5.ipynb                            # 第5章：深度学习计算
├── d2l_ssd.ipynb                          # 目标检测：SSD
├── d2l_fully_convolutional_network.ipynb  # 语义分割：FCN
├── d2l_semantic-segmentation.ipynb        # 语义分割
├── d2l_style-transfer.ipynb               # 风格迁移
├── d2l_word2vec.ipynb                     # 词嵌入：Word2Vec
├── d2l_sentiment-analysis.ipynb           # 情感分析
├── d2l_natural-language-inference.ipynb   # 自然语言推理
├── d2l_bert.ipynb                         # BERT 预训练
├── d2l_bert-natural-language-inference.ipynb  # BERT 自然语言推理
└── REVIEW.md                              # 学习回顾与总结
```

---

## 内容概览

### 基础篇

| 章节 | 主题         | 核心内容                                      |
| ---- | ------------ | --------------------------------------------- |
| 1-2  | 预备知识     | PyTorch 基础、自动求导、向量化计算、概率基础  |
| 3    | 线性神经网络 | 线性回归、Softmax 回归、损失函数、梯度下降    |
| 4    | 多层感知机   | 激活函数、MLP、正则化、Dropout、梯度消失/爆炸 |
| 5    | 深度学习计算 | 层与块、参数管理、自定义层、GPU 计算          |

### 计算机视觉

| 章节     | 主题         | 核心内容                               |
| -------- | ------------ | -------------------------------------- |
| SSD      | 目标检测     | 锚框机制、多尺度检测、边界框回归       |
| FCN      | 全卷积网络   | 上采样、转置卷积、像素级预测           |
| 语义分割 | 图像分割     | 数据集处理、分割评价指标               |
| 风格迁移 | 神经风格迁移 | Gram 矩阵、内容/风格损失、VGG 特征提取 |

### 自然语言处理

| 章节         | 主题       | 核心内容                            |
| ------------ | ---------- | ----------------------------------- |
| Word2Vec     | 词嵌入     | Skip-gram、负采样、词向量训练       |
| 情感分析     | 文本分类   | 循环神经网络、文本情感分类          |
| 自然语言推理 | NLI        | 注意力机制、文本蕴含判断            |
| BERT         | 预训练模型 | Transformer、MLM、NSP、下游任务微调 |

---
