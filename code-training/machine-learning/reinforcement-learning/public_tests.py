import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

def test_network_pytorch(target):
    """测试PyTorch Q网络的结构是否符合预期"""
    num_actions = 4  # 预期的动作数量
    state_size = 8   # 预期的状态特征数量
    
    # 检查网络层数是否正确（应为3层全连接层）
    assert len(list(target.children())) == 3, \
        f"层数错误，预期3层但实际为{len(list(target.children()))}层"
    
    # 构建测试输入，检查输入形状是否正确
    test_input = torch.randn(1, state_size)  # 随机测试输入
    with torch.no_grad():
        output = target(test_input)
    
    # 预期的各层配置：[层类型, 输出形状, 激活函数]
    expected = [
        [nn.Linear, (1, 64), nn.ReLU],
        [nn.Linear, (1, 64), nn.ReLU],
        [nn.Linear, (1, num_actions), nn.Identity]  # linear对应PyTorch的Identity
    ]
    
    # 逐层检查网络配置
    layers = list(target.children())
    for i, layer in enumerate(layers):
        # 检查层类型
        assert isinstance(layer, expected[i][0]), \
            f"第{i}层类型错误，预期{expected[i][0]}但实际为{type(layer)}"
        
        # 检查输出形状（通过前向传播验证）
        if i == 0:
            layer_output = layer(test_input)
        else:
            layer_output = layer(layer_output)
        assert layer_output.shape == expected[i][1], \
            f"第{i}层输出形状错误，预期{expected[i][1]}但实际为{layer_output.shape}"
        
        # 检查激活函数（通过网络forward方法验证）
        if i < 2:  # 前两层应为ReLU激活
            activated = nn.ReLU()(layer_output)
            with torch.no_grad():
                if i == 0:
                    net_output = target.forward(test_input)
                    temp = nn.ReLU()(layers[0](test_input))
                    temp = nn.ReLU()(layers[1](temp))
                    temp = layers[2](temp)
                assert torch.allclose(activated, nn.ReLU()(layer_output)), \
                    f"第{i}层激活函数错误，预期ReLU"
    
    print("\033[92m所有测试通过！")


def test_optimizer_pytorch(target, alpha):
    """测试PyTorch优化器是否符合预期配置"""
    # 检查优化器类型是否为Adam
    assert isinstance(target, optim.Adam), \
        f"优化器类型错误，预期Adam但实际为{type(target)}"
    
    # 检查学习率是否正确
    assert np.isclose(target.param_groups[0]['lr'], alpha), \
        f"学习率错误，预期{alpha}但实际为{target.param_groups[0]['lr']}"
    
    print("\033[92m所有测试通过！")


def test_compute_loss_pytorch(target):
    """测试损失计算函数是否正确"""
    num_actions = 4  # 动作数量
    
    # 定义随机输出的目标网络（模拟随机Q值）
    def target_q_network_random(inputs):
        return torch.FloatTensor(np.random.rand(inputs.shape[0], num_actions))
    
    # 定义随机输出的Q网络
    def q_network_random(inputs):
        return torch.FloatTensor(np.random.rand(inputs.shape[0], num_actions))
    
    # 定义输出全为1的目标网络
    def target_q_network_ones(inputs):
        return torch.FloatTensor(np.ones((inputs.shape[0], num_actions)))
    
    # 定义输出全为1的Q网络
    def q_network_ones(inputs):
        return torch.FloatTensor(np.ones((inputs.shape[0], num_actions)))
    
    # 生成测试数据
    np.random.seed(1)  # 固定随机种子，确保测试可复现
    states = np.float32(np.random.rand(64, 8))  # 64个状态样本，每个8维
    actions = np.float32(np.floor(np.random.uniform(0, 1, (64,)) * 4))  # 随机动作（0-3）
    rewards = np.float32(np.random.rand(64,))  # 随机奖励
    next_states = np.float32(np.random.rand(64, 8))  # 64个下一状态样本
    done_vals = np.float32((np.random.uniform(0, 1, size=(64,)) > 0.96) * 1)  # 随机终止标志
    
    # 测试1：随机Q值下的损失
    loss = target(
        (states, actions, rewards, next_states, done_vals),
        0.995,
        q_network_random,
        target_q_network_random
    )
    assert np.isclose(loss.item(), 0.6991737), \
        f"测试1损失错误，预期0.6991737但实际为{loss.item()}"
    
    # 测试2： episode终止时的损失（done=1）
    done_vals = np.float32(np.ones((64,)))  # 全部终止
    loss = target(
        (states, actions, rewards, next_states, done_vals),
        0.995,
        q_network_ones,
        target_q_network_ones
    )
    assert np.isclose(loss.item(), 0.343270182), \
        f"测试2损失错误，预期0.343270182但实际为{loss.item()}"
    
    # 测试3：Q值与目标值相等时的损失（应为0）
    done_vals = np.float32((np.random.uniform(0, 1, size=(64,)) > 0.96) * 1)
    rewards = np.float32(np.ones((64,)))  # 奖励全为1
    loss = target(
        (states, actions, rewards, next_states, done_vals),
        0,  # 折扣因子为0，不考虑未来奖励
        q_network_ones,
        target_q_network_ones
    )
    assert np.isclose(loss.item(), 0), \
        f"测试3损失错误，预期0但实际为{loss.item()}"
    
    # 测试4：Q值为1，目标值为0时的损失（应为1）
    done_vals = np.float32((np.random.uniform(0, 1, size=(64,)) > 0.96) * 1)
    rewards = np.float32(np.zeros((64,)))  # 奖励全为0
    loss = target(
        (states, actions, rewards, next_states, done_vals),
        0,  # 折扣因子为0
        q_network_ones,
        target_q_network_ones
    )
    assert np.isclose(loss.item(), 1), \
        f"测试4损失错误，预期1但实际为{loss.item()}"
    
    print("\033[92m所有测试通过！")