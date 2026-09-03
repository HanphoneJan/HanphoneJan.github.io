---
_synced: true
---
### 大模型云端部署
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

### 模型推理系统层面优化
**算子级优化**
算子融合：将多个连续的算子（如 Conv + BN + Relu）合并为单个算子，减少 GPU 显存读写次数和 Kernel Launch 开销。
工具：TensorRT、ONNX Runtime 的graph optimization、TVM 的算子融合 Pass。
算子替换：用高性能定制算子替换原生算子，例如用 Winograd 算法优化卷积计算，减少乘法运算量；针对 Transformer 模型，替换自注意力算子为 FlashAttention，降低显存占用和访存开销。
硬件指令集优化：针对 CPU/GPU 架构优化算子实现，例如 x86 的 AVX-512、ARM 的 NEON、GPU 的 CUDA Core/Tensor Core 指令集。
**精度量化**
低精度推理：将模型权重和激活值从 FP32 降至 FP16/ BF16（无损或微损）、INT8（需校准）、甚至 INT4/INT2（极端压缩场景），降低计算量和显存占用。
原理：FP16 可使 GPU Tensor Core 算力翻倍；INT8 能减少 75% 显存占用，同时提升吞吐量。
工具：TensorRT 量化工具、PyTorch 的torch.quantization、ONNX Runtime 的量化引擎。
注意：需通过校准集避免精度损失，对量化敏感的层（如分类头）可保留高精度。
**并行计算策略**
模型并行：将大模型的不同层分配到多个 GPU（流水线并行）或拆分同层参数到多个 GPU（张量并行），解决单卡显存不足问题。
典型应用：GPT-3、LLaMA 等大模型推理，依赖 Megatron-LM、vLLM 等框架。
数据并行：批量输入数据分配到多个 GPU 同时推理，提升吞吐量，适用于高并发场景。
任务并行：多模型或多推理任务并行执行，利用 CPU/GPU 的多核资源，需配合高效的任务调度器。

