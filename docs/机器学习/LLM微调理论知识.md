---
title: 大模型微调与部署
description: SFT / RLHF / RAG 的分工、LoRA 与 QLoRA、超参与数据，以及训练完之后怎么用一个镜像把模型服务起来。
---
- **预训练** → 决定“知道什么”（知识）
- **微调（SFT）** → 决定“怎么回答”（基本行为）
- **RLHF** → 决定“回答得好不好”（风格、偏好、礼貌、安全）
## SFT、RLHF、RAG

![hello-agentsLLM%20训练全景图.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/agent/hello-agentsLLM%20%E8%AE%AD%E7%BB%83%E5%85%A8%E6%99%AF%E5%9B%BE.webp)
预训练阶段是 LLM 训练的第一阶段，目标是让模型学习语言的基本规律和世界知识。这个阶段使用海量的文本数据（通常是数 TB 级别），通过自监督学习的方式训练模型。最常见的预训练任务是因果语言建模（Causal Language Modeling），也称为下一个词预测（Next Token Prediction）。

给定一个文本序列 $x_1, x_2, ..., x_t$，模型需要预测下一个词 $x_{t+1}$：

$$
\mathcal{L}_{\text{pretrain}} = -\sum_{t=1}^{T} \log P(x_t \mid x_1, x_2, ..., x_{t-1}; \theta)
$$

其中 $\theta$ 是模型参数，$P(x_t \mid x_1, ..., x_{t-1}; \theta)$ 是模型预测的下一个词的概率分布，目标是最小化负对数似然，即最大化预测正确词的概率。例如，给定文本“The cat sat on the”，模型需要预测下一个词最可能是“mat”。通过在海量文本上进行这样的训练，模型逐渐学会语法规则（什么样的词序是合法的）、语义知识（词与词之间的关系）、世界知识（关于世界的事实性信息）以及基础的推理能力。

预训练阶段的特点是数据量巨大、计算成本高、学到的是通用的语言理解和生成能力、采用无监督学习。

后训练阶段则是要解决预训练模型的不足。预训练后的模型虽然具备了强大的语言能力，但它只是一个“预测下一个词”的模型，并不知道如何遵循人类的指令、生成有帮助无害诚实的回答、拒绝不当的请求，以及以对话的方式与人交互。后训练阶段就是要解决这些问题，让模型对齐人类的偏好和价值观。

后训练通常包含三个步骤。第一步是监督微调（SFT），目标是让模型学会遵循指令和对话格式。训练数据是（prompt, completion）对，训练目标与预训练类似，仍然是最大化正确输出的概率：

$$
\mathcal{L}_{\text{SFT}} = -\sum_{i=1}^{N} \log P(y_i \mid x_i; \theta)
$$

其中 $x_i$ 是输入提示（prompt），$y_i$ 是期望的输出，$N$ 是训练样本数量。SFT 的特点是数据量较小、需要人工标注、快速见效、主要学习任务格式和基本能力。

第二步是奖励建模（RM）。SFT 后的模型虽然能遵循指令，但生成的回答质量参差不齐。我们需要一种方式来评估回答的质量，这就是奖励模型的作用。奖励模型的训练数据是偏好对比数据，包含同一个问题的两个回答，一个更好（chosen），一个更差（rejected）。奖励模型的训练目标是学习人类的偏好：

$$
\mathcal{L}_{\text{RM}} = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma \left( r_\phi(x, y_w) - r_\phi(x, y_l) \right) \right]
$$

其中 $r_\phi(x, y)$ 是奖励模型，输入是（提示，回答）对，输出是质量分数；$y_w$ 是更好的回答（chosen），$y_l$ 是更差的回答（rejected），$\sigma$ 是 sigmoid 函数，目标是让奖励模型给更好的回答更高的分数。

第三步是强化学习微调。有了奖励模型后，我们就可以用强化学习来优化语言模型，让它生成更高质量的回答。最经典的算法是 PPO（Proximal Policy Optimization），训练目标是：

$$
\mathcal{J}_{\text{PPO}} = \mathbb{E}_{x, y \sim \pi_\theta} \left[ r_\phi(x, y) \right] - \beta \cdot D_{\text{KL}} \left( \pi_\theta \parallel \pi_{\text{ref}} \right)
$$

其中 $\pi_\theta$ 是当前策略，即语言模型，$\pi_{\text{ref}}$ 是参考策略，这个场景下可以是 SFT 模型，$r_\phi(x, y)$ 是奖励模型的评分，$D_{\text{KL}}$ 是 KL 散度，目的是为了防止模型偏离太远，$\beta$ 是平衡系数。这个目标函数的含义是：最大化奖励，同时不要偏离原始模型太远。

传统的 RLHF（Reinforcement Learning from Human Feedback）需要大量人工标注偏好数据，成本高昂。为了降低成本，研究者提出了 RLAIF（Reinforcement Learning from AI Feedback），用强大的 AI 模型（如 GPT-4）来替代人类标注员。RLAIF 的工作流程是：用 SFT 模型生成多个候选回答，用强大的 AI 模型对回答进行评分和排序，用 AI 的评分训练奖励模型，用奖励模型进行强化学习。实验表明，RLAIF 的效果接近甚至超过 RLHF，同时成本大幅降低。
### SFT
**Supervised Fine-Tuning有监督微调**，提到 “微调” 时通常是指有监督微调，通过提供**人工标注**的高质量指令 - 响应数据，进一步训练**预训练基座模型**，让模型精准适配**特定领域 / 任务**，对齐基础指令遵循能力。
#### 微调算法分类
**全参数微调（Full Fine-Tuning）**
	更新模型**所有参数**，性能上限最高，适配性强；算力成本极高；数据不足时极易过拟合。	
**部分参数微调（Partial Fine-Tuning）**
仅更新模型**特定层 / 模块**参数（如 Transformer 的 attention 层），大幅降低算力与存储成本；过拟合风险低；迭代速度快
     代表算法：**LoRA**（最主流）、Adapter、IA3
### RLHF
**Reinforcement Learning from Human Feedback，基于人类反馈的强化学习**
核心目标：通过人类偏好信号，让模型生成**更符合人类价值观、更有用、无害**的内容；标准流程为 **SFT 基座模型 → 收集人类偏好数据 → 训练奖励模型 RM → 强化学习优化策略模型**

1. **PPO（Proximal Policy Optimization）**
    - 核心思想：渐进式调整模型策略，通过**奖励信号**（RM 输出分数）优化，同时用**KL 散度约束**防止模型输出偏离原 SFT 模型太远（避免灾难性遗忘）
    - 特点：调整幅度小、稳定可控，是 RLHF 的核心算法
    - 1. 监督微调 (SFT)：用高质量的“指令-回答”数据微调预训练模型，让它先学会基本指令跟随。 2. 训练奖励模型 (RM)：收集偏好数据（如对同一问题，人工标注A回答比B好），然后训练一个独立的奖励模型，给输出打分。 3. PPO 强化学习：用奖励模型作为“裁判”，模型生成回答得高分则奖励，低分则惩罚，逐步调整参数。
2. **DPO（Direct Preference Optimization）**
    - 核心思想：跳过奖励模型与 PPO 的复杂流程，直接用**人类对比偏好数据**（A/B 选项优劣）优化生成模型。直接微调：用特殊损失函数，提高好回答概率，降低坏回答概率，像 SFT 一样简单。
    - 特点：调整幅度大、训练流程简化、算力成本低；适合快速对齐人类偏好
    
注意：对比学习是无监督 / 自监督学习的一种，通过拉近正样本、推远负样本优化模型；RLHF 是强化学习框架，需先训练奖励模型（拟合人类偏好），再通过强化学习优化模型策略。

#### **Align（对齐）**

- **定义**：Align 是指将模型的输出与人类的期望、价值观、道德标准等进行**对齐**，确保模型生成的内容不仅在技术上正确，还能在伦理和社会层面上符合人类的需求。
    
- **Align 通常结合 SFT 和 RLHF 来实现**
### RAG（Retrieval-Augmented Generation）检索增强生成

核心目标：将**外部知识库**的信息融入生成过程，解决大模型**知识过时、幻觉、领域知识不足**的问题

核心流程：
    1. 数据预处理：文档拆分、向量化（通过 Embedding 模型生成向量）
    2. 向量存储：将向量存入向量数据库（如 Pinecone、Milvus、Chroma）
    3. 检索：用户提问向量化后，在向量库中检索**最相关的 Top-K 文档片段**
    4. 生成：将提问 + 检索结果拼接为 Prompt，送入大模型生成答案
    
核心优点：无需微调大模型即可更新知识；降低幻觉；成本低
核心优化点：文档切分策略、Embedding 模型选择、向量数据库检索精度、Prompt 工程
## 超参搜索
手动设置超参效率低，以下为工业界主流超参优化方法，核心是在超参空间中高效找到最优组合

|方法|核心原理|优点|缺点|
|---|---|---|---|
|**网格搜索（Grid Search）**|遍历超参候选值的所有组合，交叉验证评估|简单直观、结果稳定|维度灾难，高维场景算力成本极高|
|**随机搜索（Random Search）**|在超参空间随机采样，评估后保留最优|高维场景效率优于网格搜索|结果有随机性，需足够采样次数|
|**贝叶斯优化**|用概率模型（如高斯过程）建模超参-性能关系，优先评估潜在最优组合|自适应聚焦最优区域，适合高算力成本场景|实现复杂，对初始样本质量敏感|
|**启发式搜索（遗传算法/粒子群）**|借鉴生物进化/群体智能，通过选择、交叉、变异迭代优化|适合非凸、复杂超参空间，鲁棒性强|计算成本高，收敛速度可能较慢|
## 微调算法

### Linear Probe线性探针

**Linear Probe（线性探针）** 是一种用于**评估**预训练模型（尤其是表示学习模型）学到的特征质量的方法。它的核心思想是：冻结**冻结预训练模型的参数**，**仅在其输出的特征之上训练一个简单的线性分类器（或回归器），通过该线性模型的性能来衡量预训练特征的判别能力**。
### LoRA  
LoRA 开山论文：[LORA: LOW-RANK ADAPTATION OF LARGE LAN GUAGE MODELS](https://arxiv.org/pdf/2106.09685)，2021 年 Microsoft Research 提出，首次提出了通过**低秩矩阵分解**的方式来进行**部分参数微调**，极大推动了 AI 技术在多行业的广泛落地应用：

大模型的权重更新矩阵本质具有低秩特性（即高维更新可由低维矩阵近似）。矩阵的秩（Rank of a matrix）是指矩阵中**线性无关**的行或列的最大数量。简单来说它能反映矩阵所包含的**有效信息量**。通过将大矩阵分解为两个小矩阵的乘积，显著减少参数量。LoRA 训练结束后通常需要进行权重合并（升维）。
**核心操作**：在 Transformer 的 attention 层中插入 LoRA 模块；训练时冻结原模型参数，仅更新 LoRA 的 A、B 矩阵；训练后合并 LoRA 权重与原权重（升维）

#### QLoRA
**LoRA 的量化版本**，面向**低资源场景**：将基座模型量化为 4-bit/8-bit，同时结合 LoRA 低秩微调，在极小显存下实现高效微调。
- 核心操作：
    1. 模型量化：用 NF4（NormalFloat4）量化方案压缩模型权重
    2. 冻结量化模型参数，插入 LoRA 模块并使用双量化、分页优化等技术减少显存占用
    3. 训练 LoRA 模块，训练后合并权重
#### 微调常见实现框架
- **Llama-Factory**：由国内北航开源的低代码大模型训练框架，可以实现**零代码微调**
- **transformers.Trainer**：由 **Hugging Face** 提供的高层 **API**，适用于各种 NLP 任务的微调，提供标准化的训练流程和多种监控工具，适合需要更多**定制化**的场景，尤其在**部署和生产环境**中表现出色。
![大模型微调框架表格整理.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/%E5%A4%A7%E6%A8%A1%E5%9E%8B%E5%BE%AE%E8%B0%83%E6%A1%86%E6%9E%B6%E8%A1%A8%E6%A0%BC%E6%95%B4%E7%90%86.webp)

## 数据：标注、清洗与顺序

微调的上限常常是数据定的。三件事的顺序比做法更常出错：**先划分再清洗**（在训练集上统计均值、缺失率，否则测试集信息漏进清洗规则，评估虚高）；**增强只做在训练集内部**，验证/测试集保持原始分布；**去重放在划分之前**，否则同一条样本可能同时落进训练集和测试集。

标注工具选两个够用：**CVAT**（视觉，Web 前端 + 后端服务分离，支持多人协作与权限分配）与 **Label Studio**（通用，文本/图像/音频都能标）。都建议**本地或私有服务器部署**而不是用在线版——数据不出内网，也能改代码定制。

清洗的常规动作：去重（`duplicated` / 近似去重）、缺失值（删除、均值或前后填充、模型填补）、异常值（删除、当缺失处理、盖帽法）、文本规范化（空格、全半角、大小写）、时间格式统一。

## 部署：把模型跑起来

训练完只是拿到权重，服务起来才算落地。这一节从「一个能跑的镜像」开始，再说推理侧还能怎么省。

参考：[infrasys-ai](https://infrasys-ai.github.io/)

### 镜像：CUDA + vLLM + FastAPI

```dockerfile
# 基础镜像选择：构建GPU加速环境的基石
# nvidia/cuda:12.1.1-runtime-ubuntu22.04：包含CUDA 12.1.1运行时和Ubuntu 22.04系统
# 为什么选runtime而非devel？runtime仅含运行依赖（体积小），devel含编译工具（适合开发）
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# 设置工作目录：规范后续指令的执行路径，避免文件散落
# 相当于在容器内执行`mkdir -p /app && cd /app`，后续指令默认在此目录下运行
WORKDIR /app

# 安装系统依赖：构建Python运行环境
# apt-get update：刷新软件源索引（必须前置，否则可能找不到包）
# --no-install-recommends：仅安装核心依赖，不装推荐包（减小镜像体积）
# python3.10：大模型常用Python版本（兼容vLLM/TensorRT-LLM）
# git：用于拉取模型代码或依赖库（如从GitHub安装私有包）
# rm -rf /var/lib/apt/lists/*：清理缓存文件（减少镜像体积约200MB）
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3-pip git && rm -rf /var/lib/apt/lists/*

# 安装Python依赖：部署大模型推理所需的库
# COPY requirements.txt .：将宿主机的依赖清单复制到容器工作目录
# --no-cache-dir：不缓存pip安装包（减少镜像体积约500MB）
# 关键依赖通常包括：vLLM（推理引擎）、torch（GPU加速）、fastapi（API服务）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制模型与代码：将推理服务运行所需的核心文件传入容器
# COPY ./model /app/model：挂载模型权重（假设宿主机./model目录含Llama-3-8B等模型文件）
# 注意：生产环境建议通过Volume挂载模型（避免镜像体积过大，如70B模型>130GB）
COPY ./model /app/model
# 复制推理服务代码（如基于FastAPI封装的api_server.py）
COPY ./api_server.py .

# 暴露端口：声明容器对外提供服务的端口（仅文档作用，实际需运行时-p映射）
# 8000：常用API端口，需与api_server.py中的服务端口保持一致
EXPOSE 8000

# 启动命令：容器启动时执行的指令（不可省略，否则容器会立即退出）
# ["python", "api_server.py", ...]：JSON数组格式（exec模式），避免shell解析带来的信号传递问题
# --model /app/model：指定模型路径（需与COPY的模型目录对应）
# --port 8000：指定服务端口（需与EXPOSE声明一致）
CMD ["python", "api_server.py", "--model", "/app/model", "--port", "8000"]
```

### 算子级优化

算子融合：将多个连续的算子（如 Conv + BN + ReLU）合并为单个算子，减少 GPU 显存读写次数和 Kernel Launch 开销。工具：TensorRT、ONNX Runtime 的 graph optimization、TVM 的算子融合 Pass。

算子替换：用高性能定制算子替换原生算子，例如用 Winograd 算法优化卷积计算，减少乘法运算量；针对 Transformer，替换自注意力算子为 FlashAttention，降低显存占用与访存开销。

硬件指令集优化：针对 CPU/GPU 架构优化算子实现，例如 x86 的 AVX-512、ARM 的 NEON、GPU 的 CUDA Core / Tensor Core 指令集。

### 精度量化

低精度推理：将模型权重和激活值从 FP32 降至 FP16 / BF16（无损或微损）、INT8（需校准）、甚至 INT4 / INT2（极端压缩场景），降低计算量和显存占用。原理：FP16 可使 GPU Tensor Core 算力翻倍；INT8 能减少 75% 显存占用，同时提升吞吐量。工具：TensorRT 量化工具、PyTorch 的 `torch.quantization`、ONNX Runtime 的量化引擎。

注意：需通过校准集避免精度损失，对量化敏感的层（如分类头）可保留高精度。

### 并行策略

模型并行：将大模型的不同层分配到多个 GPU（流水线并行），或拆分同层参数到多个 GPU（张量并行），解决单卡显存不足。典型应用：GPT-3、LLaMA 等，依赖 Megatron-LM、vLLM 等框架。

数据并行：批量输入分配到多个 GPU 同时推理，提升吞吐量，适用于高并发。

任务并行：多模型或多推理任务并行执行，利用 CPU/GPU 的多核资源，需配合高效的任务调度器。

## 上手资源

- [self-llm](https://github.com/datawhalechina/self-llm)：Linux 下全参数 / LoRA 微调与部署国内外开源模型的实操手册
- [llm-action](https://github.com/liguodongiot/llm-action)：大模型工程化与落地的项目经验
- [PyTorch 实用教程（第二版）](https://tingsongyu.github.io/PyTorch-Tutorial-2nd/)
- 算力：[AutoDL](https://www.autodl.com/)（消费级显卡）、[魔搭社区](https://www.modelscope.cn/)（免费算力 + 中文数据集）
- 评测：[Open LLM Leaderboard](https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard)、[LMSYS Chatbot Arena](https://lmarena.ai/)、[OpenCompass](https://opencompass.org.cn/)、[MTEB](https://huggingface.co/spaces/mteb/leaderboard)
- 语音方向：[whisper](https://github.com/openai/whisper)（识别）、[GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS)（合成）

项目目录可以直接抄：

```text
ai_learning_project/
├── data/            # 数据文件
├── notebooks/       # Jupyter notebooks
├── src/
│   ├── models.py
│   ├── dataset.py
│   ├── train.py
│   └── utils.py
├── models/          # 保存的模型
├── results/         # 结果和图表
└── requirements.txt
```
