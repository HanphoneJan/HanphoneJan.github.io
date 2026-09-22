---
title: 深度 Q 学习
_synced: true
---
# 深度 Q 学习（Deep Q-Learning）


深度 Q
学习（DQN）是强化学习中一个里程碑式的算法：它用**深度神经网络**来近似「在某个状态下做某个动作，未来能获得多少回报」——也就是
**Q
值**。智能体通过与环境的不断交互、试错，学会在每个状态选择能最大化长期回报的动作。

本 notebook 使用 [Gymnasium](https://gymnasium.farama.org/) 的
**LunarLander（月球着陆器）** 环境，一步步实现并训练一个 DQN
智能体，让它学会安全地把飞船降落在着陆区。

先理解几个基本概念：

- **状态（State）**：飞船的 8 维观测（位置、速度、角度、角速度等）。
- **动作（Action）**：4 个离散动作（不动、点火左侧 / 右侧 / 主引擎）。
- **奖励（Reward）**：成功降落到着陆区获得奖励，消耗燃料、坠毁等会受到惩罚。

## 1. 准备工作

导入需要的库，设置随机种子（保证结果可复现），并定义关键超参数：

- `MEMORY_SIZE`：经验回放缓冲区的大小。
- `GAMMA`（$\gamma$）：折扣因子，衡量未来奖励的重要程度，满足
  $0<\gamma<1$。
- `ALPHA`：学习率。
- `NUM_STEPS_FOR_UPDATE`：每多少个时间步更新一次网络。

Q 值更新的理论依据是 **Bellman 方程**：

$$Q(s,a) = r + \gamma \max_{a'} Q(s', a')$$

它表示：当前状态动作的价值 = 立即奖励 + 折扣后的未来最大价值。

``` python
import time
from collections import deque, namedtuple

import gymnasium as gym
import numpy as np
import PIL.Image
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F

import utils

# 设置随机种子
torch.manual_seed(utils.SEED)
np.random.seed(utils.SEED)

MEMORY_SIZE = 100_000     # 记忆缓冲区大小
GAMMA = 0.995             # 折扣因子
ALPHA = 1e-3              # 学习率
NUM_STEPS_FOR_UPDATE = 4  # 每C步执行一次学习更新

```

## 2. 认识环境：LunarLander

创建 **LunarLander-v3**
环境，并查看它的状态维度（`state_size`）和动作数量（`num_actions`）。

下面直接用 `PIL` 渲染出一帧画面，让我们直观地「看到」环境长什么样。

``` python
# 创建环境时指定渲染模式为rgb_array
env = gym.make('LunarLander-v3', render_mode='rgb_array')

# 直接渲染，无需指定mode参数
env.reset()
PIL.Image.fromarray(env.render())

state_size = env.observation_space.shape
num_actions = env.action_space.n

print('状态形状:', state_size)
print('动作数量:', num_actions)

```

### 2.1 环境交互测试

强化学习的一切都来自「状态 → 动作 → 奖励 →
新状态」的循环。这里我们先手动执行一步：`reset()`
获取初始状态，`step(action)` 让环境推进一个时间步，返回
`(next_state, reward, done, truncated, info)`。

> Gymnasium 的 `reset()` 返回 `(state, info)` 元组，`step()` 返回 5
> 个值，且需要把 `done` 和 `truncated`
> 合并使用。这些细节代码里都已经处理好。

``` python
# 重置环境并获取初始状态（注意：Gymnasium的reset返回(state, info)元组）
initial_state, _ = env.reset()

# 选择一个动作
action = 0

# 用给定的动作运行环境动态的单个时间步
next_state, reward, done, truncated, info = env.step(action)
# 合并done和truncated（如果需要）
done = done or truncated

with np.printoptions(formatter={'float': '{:.3f}'.format}):
    print("初始状态:", initial_state)
    print("动作:", action)
    print("下一状态:", next_state)
    print("获得的奖励:", reward)
    print(" episode是否终止:", done)
    print("信息:", info)


```

## 3. 定义 Q 网络

Q 网络是一个简单的三层全连接神经网络，输入是 8 维状态，输出是 4
个动作各自的 Q 值：

- 输入层 → 64 个神经元 → ReLU
- 64 → 64 个神经元 → ReLU
- 64 → 4 个神经元（对应 4 个动作）

输出中**最大值对应的动作**，就是智能体认为当前最优的动作。

``` python
# 创建Q网络
class QNetwork(nn.Module):
    def __init__(self, state_size, num_actions):
        super(QNetwork, self).__init__()
        self.fc1 = nn.Linear(state_size[0], 64)
        self.fc2 = nn.Linear(64, 64)
        self.fc3 = nn.Linear(64, num_actions)
        
    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)

```

### 3.1 初始化 Q 网络与目标网络

DQN 的稳定训练依赖**两个**结构相同的网络：

- **Q 网络（`q_network`）**：实时更新，负责选择动作、计算当前预测。
- **目标网络（`target_q_network`）**：用来计算目标值
  $\max_{a'} \hat Q(s',a')$。它的参数不直接按梯度更新，而是**缓慢地向 Q
  网络靠拢**（软更新）。这样目标值不会随每一步剧烈变化，训练更稳定。

随后用 `Adam` 优化器更新 Q 网络参数，并运行单元测试验证实现正确。

``` python
# 初始化Q网络和目标Q网络
q_network = QNetwork(state_size, num_actions)
target_q_network = QNetwork(state_size, num_actions)

# 复制Q网络权重到目标Q网络
target_q_network.load_state_dict(q_network.state_dict())
target_q_network.eval()  # 目标网络设为评估模式

# 定义优化器
optimizer = optim.Adam(q_network.parameters(), lr=ALPHA)

# 单元测试
from public_tests import *

test_network_pytorch(q_network)
test_network_pytorch(target_q_network)
test_optimizer_pytorch(optimizer, ALPHA)

```

## 4. 经验回放与损失函数

**经验回放（Experience Replay）**：把智能体与环境的每一次交互经验
$(s, a, r, s')$
存入一个固定大小的缓冲区。训练时**随机采样**一小批经验，而不是按时间顺序使用，从而打破样本之间的时间相关性，让网络学到更泛化的规律。

`Experience` 用命名元组封装每一步经验。`compute_loss` 计算 Q
网络预测与目标值之间的**均方误差**：

$$y = r + (1 - done) \cdot \gamma \max_{a'} \hat Q(s',a')$$

$$\mathcal{L} = \frac{1}{N}\sum \left( y - Q(s,a) \right)^2$$

当 `done` 为真（episode 结束）时，未来没有后续奖励，目标值退化为 $r$。

``` python
# 用命名元组存储经验
Experience = namedtuple("Experience", field_names=["state", "action", "reward", "next_state", "done"])

# 计算损失的函数
def compute_loss(experiences, gamma, q_network, target_q_network):
    """
    计算损失
    
    参数:
      experiences: (元组) 包含["state", "action", "reward", "next_state", "done"]的命名元组
      gamma: (float) 折扣因子
      q_network: (PyTorch模型) 预测q值的模型
      target_q_network: (PyTorch模型) 预测目标值的模型
          
    返回:
      loss: (PyTorch张量) y目标与Q(s,a)值之间的均方误差
    """
    
    # 解包小批量经验元组
    states, actions, rewards, next_states, done_vals = experiences
    
    # 转换为PyTorch张量
    states = torch.FloatTensor(states)
    actions = torch.LongTensor(actions).unsqueeze(1)  # 增加维度以便gather操作
    rewards = torch.FloatTensor(rewards)
    next_states = torch.FloatTensor(next_states)
    done_vals = torch.FloatTensor(done_vals)
    
    # 计算max Q^(s,a)
    with torch.no_grad():  # 目标网络不计算梯度
        max_qsa = target_q_network(next_states).max(1)[0]
    
    # 设置y = R如果episode终止，否则y = R + γ max Q^(s,a)
    y_targets = rewards + (1 - done_vals) * gamma * max_qsa
    
    # 获取q值
    q_values = q_network(states)
    q_values = q_values.gather(1, actions).squeeze(1)  # 选择对应动作的Q值
    
    # 计算损失
    loss = F.mse_loss(q_values, y_targets)
    
    return loss

# 单元测试
test_compute_loss_pytorch(compute_loss)

```

## 5. 智能体学习：agent_learn

`agent_learn` 把「计算损失 → 清零梯度 → 反向传播 →
更新参数」串成一个标准的训练步骤，最后用**软更新**把 Q
网络的参数缓慢复制给目标网络：

$$\theta_{target} \leftarrow \tau \cdot \theta_{Q} + (1-\tau) \cdot \theta_{target}$$

其中 $\tau$（TAU）是很小的系数（这里为
$10^{-3}$），确保目标网络变化平缓。

``` python
def agent_learn(experiences, gamma):
    """
    更新Q网络的权重
    
    参数:
      experiences: (元组) 包含["state", "action", "reward", "next_state", "done"]的命名元组
      gamma: (float) 折扣因子
    """
    
    # 计算损失
    loss = compute_loss(experiences, gamma, q_network, target_q_network)
    
    # 清零梯度
    optimizer.zero_grad()
    
    # 反向传播
    loss.backward()
    
    # 更新权重
    optimizer.step()
    
    # 更新目标Q网络的权重
    utils.update_target_network_pytorch(q_network, target_q_network)

```

## 6. 训练主循环

训练采用 **ε-贪婪（ε-greedy）策略** 来平衡探索与利用：

- 以概率 $\varepsilon$ **随机**选动作（探索，尝试未知的行为）。
- 以概率 $1-\varepsilon$ 选 Q 值**最大**的动作（利用，选择已知最优）。

$\varepsilon$ 会随训练逐渐衰减（从 1.0 降到
0.01），让智能体前期多探索、后期多利用。每 `NUM_STEPS_FOR_UPDATE`
步，就从经验缓冲区随机采样一个小批量，调用 `agent_learn` 更新一次网络。

当最近 100 个 episode 的平均得分达到 200
时，我们认为环境已被「解决」，保存模型并停止训练。**这一步运行时间较长（约
18 分钟），建议直接运行后耐心等待。**

``` python
start = time.time()

num_episodes = 2000
max_num_timesteps = 1000

total_point_history = []

num_p_av = 100    # 用于平均的总点数
epsilon = 1.0     # ε-贪婪策略的初始ε值

# 创建容量为N的记忆缓冲区D
memory_buffer = deque(maxlen=MEMORY_SIZE)

for i in range(num_episodes):
    
    # 重置环境到初始状态并获取初始状态（Gymnasium返回(state, info)）
    state, _ = env.reset()
    total_points = 0
    
    for t in range(max_num_timesteps):
        
        # 从当前状态S使用ε-贪婪策略选择动作A
        state_tensor = torch.FloatTensor(state).unsqueeze(0)  # 状态需要符合q_network的输入形状
        with torch.no_grad():
            q_values = q_network(state_tensor)
        action = utils.get_action(q_values.numpy(), epsilon)
        
        # 执行动作A并接收奖励R和下一状态S'（Gymnasium的step返回5个值）
        next_state, reward, done, truncated, _ = env.step(action)
        # 合并done和truncated
        done = done or truncated
        
        # 将经验元组(S,A,R,S')存储在记忆缓冲区中
        memory_buffer.append(Experience(state, action, reward, next_state, done))
        
        # 仅每NUM_STEPS_FOR_UPDATE时间步更新网络
        update = utils.check_update_conditions(t, NUM_STEPS_FOR_UPDATE, memory_buffer)
        
        if update:
            # 从D中随机采样小批量经验元组(S,A,R,S')
            experiences = utils.get_experiences(memory_buffer)
            
            # 设置y目标，执行梯度下降步骤，并更新网络权重
            agent_learn(experiences, GAMMA)
        
        state = next_state.copy()
        total_points += reward
        
        if done:
            break
            
    total_point_history.append(total_points)
    av_latest_points = np.mean(total_point_history[-num_p_av:]) if i >= num_p_av else np.mean(total_point_history)
    
    # 更新ε值
    epsilon = utils.get_new_eps(epsilon)

    print(f"\rEpisode {i+1} | 最近{num_p_av}个episode的平均得分: {av_latest_points:.2f}", end="")

    if (i+1) % num_p_av == 0:
        print(f"\rEpisode {i+1} | 最近{num_p_av}个episode的平均得分: {av_latest_points:.2f}")

    # 如果最近100个episode的平均得分为200分，我们认为环境被解决了
    if av_latest_points >= 200.0 and i >= num_p_av:
        print(f"\n\n环境在{i+1}个episode内被解决!")
        torch.save(q_network.state_dict(), 'lunar_lander_model.pth')
        break
        
tot_time = time.time() - start

print(f"\n总运行时间: {tot_time:.2f}秒 ({(tot_time/60):.2f}分钟)")

```

## 7. 结果可视化

绘制每个 episode
的总奖励历史。可以看到奖励曲线随训练逐渐上升并趋于稳定，说明智能体正在学会降落。

``` python
# 绘制得分历史
utils.plot_history(total_point_history)

```

## 8. 生成演示视频

最后，让训练好的智能体（不再随机探索，$\varepsilon=0$）完整运行一轮，把画面录制为
mp4 视频并嵌入本 notebook，直观展示它的降落技巧。

``` python
# 抑制imageio的警告
import logging
logging.getLogger().setLevel(logging.ERROR)

filename = "./videos/lunar_lander.mp4"

utils.create_video_pytorch(filename, env, q_network)
utils.embed_mp4(filename)
```

## 9. 小结与思考

- DQN 的三大核心要素：**深度神经网络 + 经验回放 + 目标网络**。
- 经验回放打破了样本之间的时间相关性，目标网络稳定了学习目标。
- ε-贪婪策略保证了探索与利用的平衡。
- 训练收敛较慢、超参数较多（学习率、$\gamma$、$\varepsilon$
  衰减、缓冲区大小），需要耐心调参。

进阶方向：Double DQN、Dueling DQN、Prioritized Experience Replay
等改进算法。
