---
title: Stable Diffusion 与 ComfyUI
description: 扩散模型的原理、SD 的三块拼图，以及用 ComfyUI 把流程搭成节点图之后的目录与模型管理。
---

前半段是原理：DDPM 的前向加噪与反向去噪、Attention 怎么把文本条件注进去、Autoencoder 为什么在潜空间里算。后半段是工程：ComfyUI 的目录结构、自定义节点与模型文件的存放。


[CompVis/stable-diffusion: A latent text-to-image diffusion model](https://github.com/CompVis/stable-diffusion)
[介绍 - Stable Diffusion WebUI使用手冊 - Stable Diffusion文档中心](https://docs.stablediffusion.cn/article/1/592976247571611648.html)
Stable Diffusion涉及的技术有**Diffusion Model（DDPM）**，**Attention**，**Autoencoder。**

[(50 封私信 / 80 条消息) 一文读懂Stable Diffusion 论文原理+代码超详细解读 - 知乎](https://zhuanlan.zhihu.com/p/640545463)
**2.1 DDPM**

扩散模型包括两个过程：前向过程（forward process）和反向过程（reverse process），其中前向过程又称为扩散过程（diffusion process）。无论是前向过程还是反向过程都是一个参数化的马尔可夫链（Markov chain），其中反向过程可用于生成数据样本（它的作用类似GAN中的生成器，只不过GAN生成器会有维度变化，而DDPM的反向过程没有维度变化）。

Diffusion Model： [超详细的扩散模型（Diffusion Models）原理+代码]([蓝色仙女：超详细的扩散模型（Diffusion Models）原理+代码](https://zhuanlan.zhihu.com/p/624221952))

## ComfyUI
官网：[ComfyUI | 用AI生成视频、图像、音频](https://www.comfy.org/zh-cn/)

ComfyUI本质上是一个基于Python的本地服务程序，前端是浏览器界面，后端负责调度模型推理。它的所有状态都由文件系统承载：没有数据库，没有注册表，也没有云端同步。
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
