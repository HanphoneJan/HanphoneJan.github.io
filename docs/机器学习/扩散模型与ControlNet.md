---
title: 扩散模型与 ControlNet
description: DDPM 的前向加噪与反向去噪、Stable Diffusion 的三块拼图、ComfyUI 的目录管理，以及用 ControlNet 把构图、姿态、线稿约束住。
---

扩散模型是「从噪声里一步步还原出图」，Stable Diffusion 把它搬进潜空间，ComfyUI 把它搭成节点图，ControlNet 再给它加一条结构约束。这一篇按这四层顺序读。

## 扩散模型（DDPM）

[CompVis/stable-diffusion: A latent text-to-image diffusion model](https://github.com/CompVis/stable-diffusion)

扩散模型包括两个过程：前向过程（forward process）和反向过程（reverse process），其中前向过程又称为扩散过程（diffusion process）。无论是前向过程还是反向过程都是一个参数化的马尔可夫链（Markov chain），其中反向过程可用于生成数据样本（它的作用类似 GAN 中的生成器，只不过 GAN 生成器会有维度变化，而 DDPM 的反向过程没有维度变化）。

延伸阅读：[蓝色仙女：超详细的扩散模型（Diffusion Models）原理+代码](https://zhuanlan.zhihu.com/p/624221952)

## Stable Diffusion

Stable Diffusion 涉及的技术有三块：**Diffusion Model（DDPM）**、**Attention**、**Autoencoder**。DDPM 负责去噪，Attention 把文本条件注入每一步，Autoencoder 让整套计算发生在潜空间而不是像素空间——这是它能在消费级显卡上跑起来的原因。

[Stable Diffusion WebUI 使用手册](https://docs.stablediffusion.cn/article/1/592976247571611648.html) · [一文读懂 Stable Diffusion 论文原理+代码](https://zhuanlan.zhihu.com/p/640545463)

## ComfyUI

官网：[ComfyUI | 用 AI 生成视频、图像、音频](https://www.comfy.org/zh-cn/)

ComfyUI 本质上是一个基于 Python 的本地服务程序，前端是浏览器界面，后端负责调度模型推理。它的所有状态都由文件系统承载：没有数据库，没有注册表，也没有云端同步。

```shell
ComfyUI/
├── comfyui_core/              # 【重点备份】程序+配置+插件
│   ├── main.py
│   ├── config.json
│   ├── workflows/
│   └── custom_nodes/
│
├── models -> /mnt/nas/models  # 符号链接指向共享存储
│
└── output                     # 可定期清理
```

## ControlNet

[深入浅出完整解析 ControlNet 核心基础知识 - 知乎](https://zhuanlan.zhihu.com/p/660924126)

ControlNet 解决的是「生成的图结构不受控」：喂一张姿态图、深度图或线稿，结果就会沿着这张图的结构走。代价是推理时要同时加载两套权重。

**Stable Diffusion / FLUX.1 + LoRA + ControlNet**：ControlNet 是一种「辅助式」的神经网络结构，通过在 Stable Diffusion / FLUX.1 中加辅助模块，引入「额外条件」来控制生成过程。

流程分两步：

1. **预处理**：输入一张参考图，用**预处理器（Preprocessor）**按某种模式提取控制信息，通常是传统 CV 算法——边缘检测、人体姿态估计、深度估计——得到**条件图像（Conditioning Image）**。
2. **注入**：条件图通过 ControlNet 注入扩散模型，与原本的文本信息、图像信息（可选的图生图）一起参与去噪，最终生成受条件信息控制的图像。

一句话：它给扩散模型提供一个额外的「约束」条件，让构图、姿态、结构按预期走，减少随机性。

代价在显存：推理阶段要同时加载 Stable Diffusion / FLUX.1 与 ControlNet 两套权重，参数量大约多 **0.7B**。
