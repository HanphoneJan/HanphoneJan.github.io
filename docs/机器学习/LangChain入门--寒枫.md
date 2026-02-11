[官方教程](https://python.langchain.com/docs/tutorials/)
[LangChain home | LangChain Reference](https://reference.langchain.com/python/langchain/langchain/)
[Awesome-langchain](https://github.com/kyrolabs/awesome-langchain)


Langchain的理念是简化基于 LLM 的应用开发（如对话系统、问答机器人、智能代理等）。作为一个LLM应用的基建工程，从底向上主要分为四个部分
## 结构

#### LangChain Lib 库

主要包括core/community/experimental等Python库，源码位置 langchain-ai/langchain/libs/

LangChain Lib从底向上主要包括LangChain-Core/LangChain-Community/LangChain(本身)三大部分
分
LangChain-Core ：LangChain-Core是整个LangChain生态的抽象，比如LangChain Expression Language（LCEL）language models, document loaders, embedding models, vectorstores, retrievers等模块的抽象

LangChain-Community ：LangChain-Community是对Core层抽象的实现，比如对LangChain Expression Language（LCEL）language models, document loaders, embedding models, vectorstores, retrievers等模块抽象的实现

LangChain ：对LangChain-Community部分进行整合和适配，就构成了LangChain这个单一项目。只通过这一个LangChain项目就可以快速构建LLM应用了，它主要由LLMs and Prompts, Chains, Data Augmented Generation, Agents, Memory组成。

#### LangChain Template 模板库

主要包括各种可参考和借鉴的LLM生产级别应用，源码位置 langchain-ai/langchain/templates

#### LangServe REST服务支持

主要用于将LLM应用部署为REST服务，源码位置 langchain-ai/langserve

#### LangSmith 开发者平台

主要包括LL应用从开发、测试、部署、运维于一体的Devops平台

## 六大组件

### 模型（Models）

包含各大语言模型的LangChain接口和调用细节，以及输出解析机制。

LangChain 将模型分为三大类，每类对应不同的功能和接口规范：

| 模型类型                      | 功能描述            | 核心接口方法                                                         |
| ------------------------- | --------------- | -------------------------------------------------------------- |
| **LLM（文本生成模型）**           | 接收文本输入，输出连续文本   | `predict(text: str) -> str`                                    |
| **ChatModel（对话模型）**       | 接收对话消息列表，输出对话回复 | `predict_messages(messages: List[ChatMessage]) -> ChatMessage` |
| **TextEmbedding（文本嵌入模型）** | 将文本转为向量（用于语义匹配） | `embed_documents(texts: List[str]) -> List[List[float]]`       |
通过 API 密钥（如 OpenAI 的`OPENAI_API_KEY`）或本地模型路径（如 LLaMA 的`model_path`）初始化，支持环境变量或显式参数传入。

#### 输出解析

模型输出默认是原始字符串，LangChain 提供解析工具将其转换为结构化数据（如 JSON、字典），核心解析器包括：
StructuredOutputParser：通过提示词指定格式（如"输出应为JSON，包含name和age字段"），自动解析为字典。
CommaSeparatedListOutputParser：解析为逗号分隔的列表
自定义解析器：通过继承BaseOutputParser实现复杂逻辑（如解析 HTML、Markdown 表格）。


### 提示模板（Prompts）

提示模板的核心是将 “提示词” 抽象为可复用、可动态配置的模板，解决提示词编写的重复性和复杂性，让模型输出更可控。


#### 1. 核心模板类型

- **基础文本模板（PromptTemplate）**：适用于 LLM，支持变量插入，格式为`template + input_variables`。

    ```python
from langchain.prompts import PromptTemplate
prompt = PromptTemplate(
    template="请用{'{'}style{'}'}风格总结：{'{'}text{'}'}",
    input_variables=["style", "text"]  # 动态变量
)
formatted_prompt = prompt.format(style="幽默", text="今天天气很好...")
    ```

- **对话模板（ChatPromptTemplate）**：适用于 ChatModel，需指定消息角色（系统、用户、助手），确保对话格式正确。

    ```python
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate  
chat_prompt = ChatPromptTemplate.from_messages([  
	("system", "你是一个翻译助手，将{source_lang}译为{target_lang}"),  # 系统提示  
	HumanMessagePromptTemplate.from_template("{text}")  # 用户输入  
])  
    ```

- **少样本模板（FewShotPromptTemplate）**：通过示例（examples）引导模型输出，适用于需要 “参考案例” 的场景（如分类、格式转换）。

    ```python
    from langchain.prompts import FewShotPromptTemplate, PromptTemplate  
    examples = [{"input": "1+1", "output": "2"}, {"input": "2+3", "output": "5"}]  
    example_template = "输入：{input}\n输出：{output}"  
    few_shot_prompt = FewShotPromptTemplate(examples=examples, ...)  
    ```

#### 2. 模板组合与复用

- **PipelinePromptTemplate**：将多个模板按顺序组合，前一个模板的输出作为后一个的输入（如先生成背景，再生成结论）。
- **动态格式控制**：通过`partial_variables`预填充部分变量

### 数据检索（Indexes）

**数据检索（Indexes）** 是连接外部文档（如本地文件、知识库）与大语言模型（LLM）的核心组件，其核心目标是将非结构化数据（文本、PDF、文档等）转化为可高效检索的格式，让 LLM 能基于 “私有知识” 生成回答（而非仅依赖预训练数据）。实现RAG的关键。

### 记忆（Memory）

Langchain 的 Memory 组件用于维持对话上下文，核心是存储和提取对话历史，使模型能基于过往交互生成连贯回应。

- **核心分类**：
    - 短时记忆：如`ConversationBufferMemory`，直接存储最近对话内容，适合短对话。
    - 长时记忆：如`VectorStoreRetrieverMemory`，通过向量存储长期对话，支持语义检索。
- **关键功能**：
    - 自动整合对话历史到 prompt。
    - 支持记忆清理、截断（如`ConversationSummaryMemory`通过摘要压缩记忆）。
    - 可与外部存储（如 Redis、数据库）结合，实现跨会话持久化。

### 链（Chains）

LangChain 中的链根据功能和组合方式可分为**基础链**、**组合链**、**工具链**三大类，每类下有具体实现，覆盖从简单到复杂的任务场景。

#### 1. 基础链（Basic Chains）

基础链是最底层的功能封装，直接连接 “模型” 与 “输入输出”，用于实现单一维度的任务（如文本生成、简单问答）。

- **LLMChain（最核心基础链）**  
    由 “PromptTemplate（提示模板）” 和 “LLM/chat model（大语言模型）” 组成，是所有链的基础单元。
    - 作用：接收用户输入，通过 prompt 模板格式化后传递给模型，输出模型的响应。
    - 示例：用`PromptTemplate`定义 “生成指定主题的诗句”，结合`ChatOpenAI`模型，通过`LLMChain`直接生成结果。


#### 2. 组合链（Combination Chains）

当任务需要多个步骤（多个基础链协同）时，组合链用于定义步骤间的依赖关系（如 “前一步输出作为后一步输入”“按条件选择步骤”）。

- **SequentialChain（顺序链）**  
    按固定顺序执行多个链，前一个链的输出作为后一个链的输入，适用于 “分步处理” 的任务（如 “先分析问题→再生成回答→最后检查格式”）。

**RouterChain（路由链）**  
根据输入内容的 “类型” 或 “特征”，动态选择对应的链执行，适用于 “多场景适配” 的任务（如 “用户可能问问题、翻译、生成摘要，需自动判断类型并调用对应链”）。

- 核心组件：
    - `RouterChain`：负责 “判断输入类型” 并选择目标链；
    - `DestinationChain`：被选择的目标链（如问答链、翻译链等）；
    - `RouterOutputParser`：解析模型对 “输入类型” 的判断结果，确定路由方向

#### 3. 工具链（Tool Chains）

用于集成外部工具（如 API、数据库、搜索引擎），让链具备 “调用工具获取信息” 的能力，是实现 “增强型 LLM 应用” 的核心（如 “检索式问答”“数据分析”）。
### 代理（Agents）

LangChain中的核心机制，通过“代理”让大模型自主调用外部工具和内部工具，使智能Agent成为可能。
1. **观察（Observation）**：接收用户输入和环境上下文
2. **思考（Thought）**：LLM 生成推理过程
3. **行动（Action）**：选择工具并生成调用参数    
4. **工具执行（Tool Execution）**：
    - 同步调用：等待工具返回结果
    - 异步调用：支持并行工具调用（v0.1+新增特性）
5. **循环判断**：根据返回决定继续或终止
6. 输出结果

LangChain 针对不同场景设计了多种 Agent 类型，核心区别在于 “推理模式” 和 “工具调用方式”：

|类型|核心逻辑|适用场景|
|---|---|---|
|**ReAct Agent**|基于 “思考（Reason）- 行动（Act）” 模式，先输出 “思考过程”，再决定调用工具。|复杂推理任务（如逻辑题、多步骤问题），需明确中间思考过程。|
|**Structured Tool Agent**|专注于结构化工具调用（如 API、数据库查询），支持严格参数校验。|调用有明确参数要求的工具（如 “调用天气 API，参数：城市 = 北京，日期 = 今天”）。|
|**Self-ask Agent**|通过 “内部提问” 分解任务（如 “要回答 A，需先知道 B；要知道 B，需调用工具 C”）。|任务可拆解为子问题的场景（如 “分析某事件影响→先查事件起因→再查关联方反应”）。|
|**Conversational Agent**|结合对话记忆（Memory），保持上下文连贯性，优先用自然语言交互。|多轮对话场景（如客服机器人、聊天助手），需记住历史对话内容。|
|**Plan-and-Execute Agent**|先规划整体步骤（如 “第一步查数据，第二步分析，第三步可视化”），再分步执行。|长流程任务（如 “写一份行业报告”），需要全局规划避免步骤混乱。|
## 安装与使用

```bash
pip install langchain  # 会自动安装langchain-community和core
pip install langchain_openai # 第三方集成库
```


# Langflow

 [LangFlow](https://github.com/langflow-ai/langflow) 是 LangChain 的 UI  ， 是针对 LangChain 的可视化低代码开发平台，其核心价值是通过拖拽式操作，帮助开发者快速构建、调试和部署基于 LangChain 的 LLM 应用（如聊天机器人、问答系统、智能代理等）

# Langchain4j

即 Langchain for java，langchain基于基于 Python 开发，Python 生态为主，Langchain4j 基于 Java/Kotlin 开发。SpringAI同为Java语言的AI应用开发框架。