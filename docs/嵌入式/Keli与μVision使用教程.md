## Keli 与 μVision 的基础知识

keil 有 4 类：C51、C251、C166、ARM

uVision 是由 keil 公司开发的集成开发环境（IDE），可以进行代码编辑，文件管理，程序的编译调试等。

目前 uVision 的版本有 uVision2、uVision3、uVision4、uVision5。

我们常说的 keil4 指的是 uVision4，keil5 指的是 uVision5

MDK：microcontrolor development kit（微控制器开发工具）

每一个 uVision 版本下都有 4 个独立的软件：C51、C251、C166、ARM。

uVision ARM 就是 MDK，或者可以称为 MDK-ARM。

这一款软件主要支持 ARM7，ARM9，Cortex 等 ARM 内核。

## 安装

安装结束时不要打钩

**使用破解版！！**

#### 界面模糊（优化）变清晰

在属性界面–>兼容性–>更改高 DPI 设置–>勾上“替换高 DPI 缩放行为”

#### 新旧版本

MDK 版本 5 以两种不同的方式支持在 MDK 版本 4 中创建的项目：

1. 使用  **MDK 版本 4 旧版包**，提供设备支持的方式与 MDK 版本 4 相同。因此，现有项目无需修改即可维护。
2. 项目可以转换为 MDK 版本 5 项目格式，以使用**设备系列包，设备系列包**以单独下载的形式提供设备支持，独立于 MDK 核心。使用 Keil RTX 或 MDK 版本 4 中间件的项目仍需要安装  **MDK 版本 4 旧版包**。

[μVision 用户指南](https://developer.arm.com/documentation/101407/0543/Creating-Applications/Tips-and-Tricks/Use-MDK-Version-4-Projects)

## Keil ARM 配置

安装高版本 Keil 会导致没有 V5 编译器，可以手动下载后放置到文件夹中。

ARM 和 C51 要在同一文件夹；PACK 要在 keil_v5 下

## μVision 创建项目

#### 设备选择

**创建项目时必须选择目标设备**， **设备选择决定编译工具链和链接脚本**，
μVision 的调试功能（如在线仿真、断点调试、外设寄存器查看）也依赖于对目标设备硬件细节的识别。
常用选择：STM32F103C8。

选择设备后会弹出该界面，需要选择

![1bd4d122-7674-4086-a868-0b6b4b0b9ca9.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/keli%E5%88%9B%E5%BB%BA%E9%A1%B9%E7%9B%AE%E8%AE%BE%E5%A4%87%E6%96%87%E4%BB%B6.webp)

#### 仿真设置

[Keil 环境配置及 stm32 程序的仿真调试\_keil 调试环境介绍-CSDN 博客](https://blog.csdn.net/qq_41675500/article/details/120517476)

**支持软件仿真的设备**（绝大多数 ARM Cortex-M 系列设备均支持，如 STM32F103）

右键点击项目，选择「Options for Target」。
切换到「Debug」选项卡，在「Use」旁边中选择  **「Software Simulation」**（软件仿真）

![f1d85f6a-e288-4ff5-9e75-6efe1c86fe97.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/keli%E4%BB%BF%E7%9C%9Fdebug%E9%80%89%E9%A1%B9.webp)

在 File -> Device Database 中查看设备型号对应的信息，比如 STM32F103C8 对于的 DARMSTM.DLL("-pSTM32F103C8") ，填入 Dialog DLL 与 Parameter
如果这里不进行修改，仿真调试的时候就会一直循环在等待 HSE，这是由于仿真没有外部晶振进行起振。
**HSE（高速外部晶振）**  是常用的时钟源之一（频率通常为 8MHz），启动代码会包含一段 “等待 HSE 就绪” 的逻辑。

- **`Dialog DLL`**：指定用于模拟该芯片的驱动文件（如`DARMSTM.DLL`是 STM32 系列的通用仿真驱动）。
- **`Parameter`**：指定具体的芯片型号（如`-pSTM32F103C8`），让驱动知道要精确模拟哪款芯片的外设特性（包括时钟树、寄存器行为等）。

配置内存数据段：点击工程选项（魔术棒图标）→ **Target**  标签，**IROM1**  和  **IRAM1**  配置
以下是 STM32 默认配置。

- IROM1：起始地址`0x08000000`，大小`0x10000`（64KB，对应 Flash）
- IRAM1：起始地址`0x20000000`，大小`0x5000`（20KB，对应 SRAM）

#### 真机设置

Use Target Driver for Flash Programming

#### 配置链接脚本.sct .scatter file

**分散加载文件（Scatter File）**  是 ARM 编译器（如 ARMCC、ARM GCC）用于指定程序各段（代码段、数据段等）在内存中的**加载地址**和**运行地址**的配置文件。

根据程序的需要来配置.sct，不需要一股脑配置。如代码使用**中断向量表**（`Vectors`），必须被放置在**固定的内存起始地址**（如 0x00000000），则需要配置。需要符合设备型号。

## 构建调试运行

先构建后调试

在 keil 调试的过程中，会出现部分函数断点打不上去、单步调试 step over 功能无法使用的情况。造成该情况的主要原因可能为编译时使用的优化等级过高，导致其调试信息失真的问题。

解决办法，打开魔术棒->c/c++->optimization ->-O0（不优化，保证源码与编译出的汇编完全对应，以保证调试信息的完整性和良好的调试体验）

要想进入中断函数调试，需要在中断函数第一行打上断点

View->System view->Interrupt Controller

### S3C2440A 仿真

创建新项目时：添加项目文件，选择编译器

切换编码格式：Edit-Configuration

指定编译器还是 arm v5 ,v6，是否要自己下载配置编译器

配置魔法棒 options->linker 中的 scatter file，（一般不勾选 use Memory layout from target dialogue）

**ARM9 启动特性**：

- S3C2440A 启动时，CPU 会从 `0x00000000` 读取第一条指令
- 若该地址未正确映射到 Flash/ROM（如未初始化内存控制器），会导致访问违例

##### Error: L6630E: Invalid token start expected number or ( but found

在 options 的 Linker 选项卡中不要选择 【Use Memory Layout from ...】并且把下边自动生成的 Scatter file 文本框清空。

Error: L6286E: Relocation :0 in practice.o(MYCODE) with respect to num1. Value(0x17fffec4) out of range(0 - 0xfff) for (R_ARM_THM_PC12) Not enough information to list load addresses in the image map.

`R_ARM_THM_PC12`  是 Thumb 指令集（STM32 常用的指令集）中的一种重定位类型，对应  **12 位 PC 相对寻址**。这种寻址方式有严格的范围限制：只能访问当前指令地址（PC）±4KB（即  `-2048 ~ +2047`  字节）范围内的地址。
