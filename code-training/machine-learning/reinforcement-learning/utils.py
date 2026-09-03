import base64
import random
from itertools import zip_longest
import os  # 新增：用于创建目录

import imageio
import IPython
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import torch
from statsmodels.iolib.table import SimpleTable
plt.rcParams["font.family"] = ["sans-serif","SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号

SEED = 0              # 伪随机数生成器种子
MINIBATCH_SIZE = 64   # 小批量样本大小
TAU = 1e-3            # 软更新参数
E_DECAY = 0.995       # ε-贪婪策略的ε衰减率
E_MIN = 0.01          # ε-贪婪策略的最小ε值


random.seed(SEED)


def get_experiences(memory_buffer):
    """从记忆缓冲区中随机采样小批量经验"""
    experiences = random.sample(memory_buffer, k=MINIBATCH_SIZE)
    # 提取经验中的各个部分并转换为PyTorch张量
    states = torch.FloatTensor(np.array([e.state for e in experiences if e is not None]))
    actions = torch.LongTensor(np.array([e.action for e in experiences if e is not None]))  # 动作使用长整数类型
    rewards = torch.FloatTensor(np.array([e.reward for e in experiences if e is not None]))
    next_states = torch.FloatTensor(np.array([e.next_state for e in experiences if e is not None]))
    done_vals = torch.FloatTensor(np.array([e.done for e in experiences if e is not None]).astype(np.uint8))
    return (states, actions, rewards, next_states, done_vals)


def check_update_conditions(t, num_steps_upd, memory_buffer):
    """检查是否满足网络更新条件"""
    # 每num_steps_upd步更新一次，且记忆缓冲区大小大于小批量大小
    if (t + 1) % num_steps_upd == 0 and len(memory_buffer) > MINIBATCH_SIZE:
        return True
    else:
        return False
    
    
def get_new_eps(epsilon):
    """更新ε值（ε-贪婪策略）"""
    return max(E_MIN, E_DECAY * epsilon)


def get_action(q_values, epsilon=0):
    """基于ε-贪婪策略选择动作"""
    # 检查输入是PyTorch张量还是NumPy数组
    if isinstance(q_values, torch.Tensor):
        # 如果是PyTorch张量，先分离计算图，再转换为NumPy数组
        q_values_array = q_values.detach().numpy()
    else:
        # 如果已经是NumPy数组，直接使用
        q_values_array = q_values
        
    if random.random() > epsilon:
        # exploitation：选择Q值最大的动作
        return np.argmax(q_values_array[0])
    else:
        # exploration：随机选择动作
        return random.choice(np.arange(4))  # 假设动作空间为0-3
    
    
def update_target_network_pytorch(q_network, target_q_network):
    """软更新目标网络权重"""
    # 目标网络权重 = TAU * Q网络权重 + (1-TAU) * 目标网络旧权重
    for target_param, q_param in zip(target_q_network.parameters(), q_network.parameters()):
        target_param.data.copy_(TAU * q_param.data + (1.0 - TAU) * target_param.data)
    

def plot_history(reward_history, rolling_window=20, lower_limit=None,
                 upper_limit=None, plot_rw=True, plot_rm=True):
    """绘制奖励历史和滚动平均值"""
    if lower_limit is None or upper_limit is None:
        rh = reward_history
        xs = [x for x in range(len(reward_history))]
    else:
        rh = reward_history[lower_limit:upper_limit]
        xs = [x for x in range(lower_limit, upper_limit)]
    
    df = pd.DataFrame(rh)
    rollingMean = df.rolling(rolling_window).mean()

    plt.figure(figsize=(10,7), facecolor='white')
    
    if plot_rw:
        plt.plot(xs, rh, linewidth=1, color='cyan')  # 绘制原始奖励
    if plot_rm:
        plt.plot(xs, rollingMean, linewidth=2, color='magenta')  # 绘制滚动平均值

    text_color = 'black'
        
    ax = plt.gca()
    ax.set_facecolor('black')
    plt.grid()
    plt.xlabel('回合数', color=text_color, fontsize=30)
    plt.ylabel('总奖励', color=text_color, fontsize=30)
    yNumFmt = mticker.StrMethodFormatter('{x:,}')
    ax.yaxis.set_major_formatter(yNumFmt)
    ax.tick_params(axis='x', colors=text_color)
    ax.tick_params(axis='y', colors=text_color)
    plt.show()
    
    
def display_table(initial_state, action, next_state, reward, done):
    """显示状态转换信息表格"""
    action_labels = ["不动作", "右侧引擎点火", "主引擎点火", "左侧引擎点火"]  # 动作标签
    
    # 不使用列标题
    column_headers = None

    with np.printoptions(formatter={'float': '{:.3f}'.format}):
        table_info = [("初始状态:", [f"{initial_state}"]),
                      ("动作:", [f"{action_labels[action]}"]),
                      ("下一状态:", [f"{next_state}"]),
                      ("获得奖励:", [f"{reward:.3f}"]),
                      ("回合是否终止:", [f"{done}"])]

    # 生成表格  
    row_labels, data = zip_longest(*table_info)
    table = SimpleTable(data, column_headers, row_labels)

    return table


def embed_mp4(filename):
    """在Notebook中嵌入mp4视频"""
    video = open(filename, 'rb').read()
    b64 = base64.b64encode(video)
    tag = '''
    <video width="840" height="480" controls>
    <source src="data:video/mp4;base64,{0}" type="video/mp4">
    您的浏览器不支持视频标签。
    </video>'''.format(b64.decode())
    return IPython.display.HTML(tag)
        
        
def create_video_pytorch(filename, env, q_network, fps=30):
    """创建智能体运行视频（PyTorch版本）"""
    # 确保目录存在
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with imageio.get_writer(filename, fps=fps) as video:
        done = False
        # 正确处理reset返回的元组 (state, info)
        state, _ = env.reset()
        # 渲染时不指定mode参数，因为已在创建环境时指定
        frame = env.render()
        video.append_data(frame)
        
        while not done:    
            # 将状态转换为PyTorch张量并增加批次维度
            state_tensor = torch.FloatTensor(state).unsqueeze(0)
            # 不计算梯度，获取Q值
            with torch.no_grad():
                q_values = q_network(state_tensor)
            # 直接传递PyTorch张量，让get_action函数处理转换
            action = get_action(q_values, epsilon=0)  # 视频生成时不使用探索
            # 正确处理step返回的5个值
            next_state, _, done, truncated, _ = env.step(action)
            # 合并done和truncated
            done = done or truncated
            state = next_state
            frame = env.render()
            video.append_data(frame)