---
title: ControlNet
description: 让扩散模型听指挥：条件图怎么注入、常用预处理器有哪些、推理时的显存与权重开销。
---

ControlNet 解决的是「生成的图结构不受控」：喂一张姿态图、深度图或线稿，结果就会沿着这张图的结构走。代价是推理时要同时加载两套权重。

[深入浅出完整解析ControlNet核心基础知识 - 知乎](https://zhuanlan.zhihu.com/p/660924126)
**Stable Diffusion/FLUX.1 + LoRA + ControlNet**
**ControlNet是一种“辅助式”的神经网络模型结构，通过在Stable Diffusion/FLUX.1模型中添加辅助模块，从而引入“额外条件”来控制AIGC图像/AI绘画的生成过程。**

在以Stable Diffusion和FLUX.1为核心的AIGC图像生成过程中，想要ControlNet起作用，首先我们需要输入一张参考图，通过**预处理器 (Preprocessor)**对输入参考图按一定的模式进行预处理，通常是使用传统的计算机视觉算法（如边缘检测、人体姿态估计、深度估计等）来从输入参考图中提取出纯粹的控制信息，也就是我们常说的**条件图像(Conditioning Image)**。

接着条件图像信息通过ControlNet再注入到Stable Diffusion和FLUX.1中，再加上原本就直接注入到Stable Diffusion和FLUX.1中的文本信息和图像信息（可选，进行图生图任务），综合作用进行扩散过程，最终生成受条件信息控制的图像。

总的来说，ControlNet做的就是这样一件事：**它为扩散模型（如 Stable Diffusion/FLUX.1）提供一种额外的“约束”条件，引导AIGC大模型按照我们期望的构图、姿态或结构来生成图像，减少图像生成的随机性。**

与此同时，**在推理阶段需要同时加载Stable Diffusion/FLUX.1模型权重以及ControlNet模型权重，整体参数量要比仅使用Stable Diffusion/FLUX.1大约多0.7B**，因此加载ControlNet需要占用更多的显存。
