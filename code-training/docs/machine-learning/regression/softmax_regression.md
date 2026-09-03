---
title: softmax_regression
_synced: true
---


``` python
# 导入PyTorch库，用于构建和训练神经网络
import torch
# 导入PyTorch的神经网络模块，包含各种层和激活函数
import torch.nn as nn
# 导入PyTorch的优化器模块，包含各种优化算法
import torch.optim as optim
# 从torch.utils.data导入数据集和数据加载器类，用于数据处理
from torch.utils.data import TensorDataset, DataLoader
# 从sklearn.datasets导入生成分类数据集的函数
from sklearn.datasets import make_classification
# 从sklearn.model_selection导入数据集拆分函数，用于划分训练集和测试集
from sklearn.model_selection import train_test_split
# 从sklearn.metrics导入评估指标函数，用于模型性能评估
from sklearn.metrics import accuracy_score, classification_report
# 从sklearn.preprocessing导入标准化工具，用于特征预处理
from sklearn.preprocessing import StandardScaler
# 导入NumPy库，用于数值计算和数组操作
import numpy as np

# 设置PyTorch的随机种子，确保实验结果可复现
torch.manual_seed(42)
# 设置NumPy的随机种子，确保实验结果可复现
np.random.seed(42)

# 检查是否有GPU可用，如果有则使用GPU，否则使用CPU
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
# 打印当前使用的计算设备（CPU或GPU）
print(f"使用设备: {device}")

# --------------------------
# 改进的多分类问题实现
# --------------------------
# 打印分隔线，美化输出
print("\n" + "="*50)
# 打印标题，说明当前是改进的多分类问题示例
print("改进的多分类问题示例")
# 打印分隔线，美化输出
print("="*50)

# 生成多分类数据集
X_multi, y_multi = make_classification(
    n_samples=1000,          # 样本数量：1000个
    n_features=20,           # 特征数量：20个
    n_informative=15,        # 信息特征数量：15个（对分类有用的特征）
    n_redundant=5,           # 冗余特征数量：5个（由信息特征组合而成）
    n_classes=5,             # 类别数量：5个（多分类问题）
    random_state=42          # 随机种子，保证结果可复现
)

# 初始化标准化器，用于将特征缩放到均值为0、标准差为1的分布
scaler = StandardScaler()
# 对特征进行标准化处理，改善模型训练效果
X_multi_scaled = scaler.fit_transform(X_multi)

# 将标准化后的特征数据转换为PyTorch张量，并移动到指定设备（CPU或GPU）
X_multi = torch.tensor(X_multi_scaled, dtype=torch.float32).to(device)
# 将标签数据转换为PyTorch长整数张量，并移动到指定设备（CPU或GPU）
y_multi = torch.tensor(y_multi, dtype=torch.long).to(device)

# 将数据集划分为训练集和测试集
X_train_multi, X_test_multi, y_train_multi, y_test_multi = train_test_split(
    X_multi, y_multi,       # 要划分的特征和标签
    test_size=0.2,          # 测试集占比：20%
    random_state=42         # 随机种子，保证划分结果可复现
)

# 创建训练数据集，将特征和标签组合在一起
train_dataset_multi = TensorDataset(X_train_multi, y_train_multi)
# 创建测试数据集，将特征和标签组合在一起
test_dataset_multi = TensorDataset(X_test_multi, y_test_multi)

# 创建训练数据加载器，用于批量加载训练数据
train_loader_multi = DataLoader(
    train_dataset_multi,    # 要加载的训练数据集
    batch_size=32,          # 批处理大小：32个样本 per batch
    shuffle=True            # 加载时打乱数据顺序，增加训练随机性
)
# 创建测试数据加载器，用于批量加载测试数据
test_loader_multi = DataLoader(
    test_dataset_multi,     # 要加载的测试数据集
    batch_size=32,          # 批处理大小：32个样本 per batch
    shuffle=False           # 测试时不打乱数据顺序
)

# 定义改进的神经网络分类器模型
class ImprovedClassifier(nn.Module):
    # 初始化方法，定义模型结构
    def __init__(self, input_dim, num_classes, hidden_dim=64, dropout_rate=0.3):
        # 调用父类nn.Module的初始化方法
        super(ImprovedClassifier, self).__init__()
        # 定义神经网络的层序列
        self.layers = nn.Sequential(
            # 第一个线性层：将输入维度映射到隐藏层维度
            nn.Linear(input_dim, hidden_dim),
            # ReLU激活函数，引入非线性
            nn.ReLU(),
            # 批归一化层：加速训练并提高稳定性
            nn.BatchNorm1d(hidden_dim),
            # Dropout层：随机失活部分神经元，防止过拟合
            nn.Dropout(dropout_rate),
            
            # 第二个线性层：将隐藏层维度减半
            nn.Linear(hidden_dim, hidden_dim//2),
            # ReLU激活函数，引入非线性
            nn.ReLU(),
            # 批归一化层
            nn.BatchNorm1d(hidden_dim//2),
            # Dropout层
            nn.Dropout(dropout_rate),
            
            # 输出层：将最后一个隐藏层映射到类别数量
            nn.Linear(hidden_dim//2, num_classes)
        )
    
    # 前向传播方法，定义数据在模型中的流动路径
    def forward(self, x):
        # 将输入x传入定义好的层序列进行处理
        return self.layers(x)

# 初始化模型、损失函数和优化器
# 获取输入特征的维度（20）
input_dim = X_multi.shape[1]
# 多分类的类别数量（5）
num_classes_multi = 5

# 创建改进的分类器模型实例，并移动到指定设备
model_multi = ImprovedClassifier(input_dim, num_classes_multi).to(device)
# 定义损失函数：交叉熵损失（适用于多分类问题）
criterion_multi = nn.CrossEntropyLoss()
# 定义优化器：Adam优化器（通常比SGD收敛更快）
optimizer_multi = optim.Adam(
    model_multi.parameters(),  # 要优化的模型参数
    lr=0.001,                  # 初始学习率
    weight_decay=1e-4          # L2正则化系数，防止过拟合
)

# 定义学习率调度器：当验证损失不再改善时自动降低学习率
scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer_multi,           # 要调度的优化器
    mode='min',                # 模式：'min'表示当指标停止下降时调整
    factor=0.5,                # 学习率调整因子：新学习率 = 当前学习率 * 0.5
    patience=10                # 耐心值：多少个epoch无改善后调整学习率
)

# 早停策略参数设置
best_val_loss = float('inf')  # 初始化最佳验证损失为无穷大
patience = 20                 # 早停耐心值：20个epoch无改善则停止训练
counter = 0                   # 计数器：记录验证损失无改善的epoch数
# 记录初始学习率，用于跟踪学习率变化
prev_lr = optimizer_multi.param_groups[0]['lr']

# 训练模型
epochs = 300  # 最大训练轮数
# 遍历每个训练轮次
for epoch in range(epochs):
    # 将模型设置为训练模式（启用 dropout 和 batch normalization）
    model_multi.train()
    # 初始化训练损失为0
    train_loss = 0.0
    
    # 遍历训练数据加载器中的每个批次
    for inputs, labels in train_loader_multi:
        # 清零优化器的梯度（防止梯度累积）
        optimizer_multi.zero_grad()
        
        # 前向传播：将输入数据传入模型，得到输出
        outputs = model_multi(inputs)
        # 计算当前批次的损失
        loss = criterion_multi(outputs, labels)
        
        # 反向传播：计算损失对各参数的梯度
        loss.backward()
        # 更新模型参数
        optimizer_multi.step()
        
        # 累加训练损失（乘以批次大小，因为loss是平均值）
        train_loss += loss.item() * inputs.size(0)
    
    # 计算整个训练集的平均损失
    train_loss = train_loss / len(train_loader_multi.dataset)
    
    # 在每个epoch结束时，在验证集上评估模型
    # 将模型设置为评估模式（禁用 dropout 和 batch normalization）
    model_multi.eval()
    # 初始化验证损失为0
    val_loss = 0.0
    # 禁用梯度计算（节省内存和计算资源）
    with torch.no_grad():
        # 遍历测试数据加载器中的每个批次
        for inputs, labels in test_loader_multi:
            # 前向传播：计算模型输出
            outputs = model_multi(inputs)
            # 计算当前批次的损失
            loss = criterion_multi(outputs, labels)
            # 累加验证损失
            val_loss += loss.item() * inputs.size(0)
    
    # 计算整个验证集的平均损失
    val_loss = val_loss / len(test_loader_multi.dataset)
    
    # 根据验证损失调整学习率
    scheduler.step(val_loss)
    
    # 检查学习率是否发生变化，如果变化则打印新的学习率
    current_lr = optimizer_multi.param_groups[0]['lr']
    if current_lr != prev_lr:
        print(f"学习率已调整为: {current_lr:.6f}")
        prev_lr = current_lr
    
    # 早停策略检查
    if val_loss < best_val_loss:
        # 如果当前验证损失优于最佳损失，则更新最佳损失
        best_val_loss = val_loss
        # 重置计数器
        counter = 0
        # 保存当前最佳模型的参数
        torch.save(model_multi.state_dict(), 'best_model.pth')
    else:
        # 如果验证损失没有改善，则计数器加1
        counter += 1
        # 如果计数器达到耐心值，则停止训练
        if counter >= patience:
            print(f"\n早停在第 {epoch+1} 个epoch")
            break
    
    # 每10个epoch打印一次训练信息
    if (epoch + 1) % 10 == 0:
        print(f'Epoch [{epoch+1}/{epochs}], 训练损失: {train_loss:.4f}, 验证损失: {val_loss:.4f}, 学习率: {current_lr:.6f}')

# 加载之前保存的最佳模型参数
model_multi.load_state_dict(torch.load('best_model.pth'))

# 在测试集上评估最佳模型的性能
# 将模型设置为评估模式
model_multi.eval()
# 初始化列表存储所有预测结果和真实标签
all_preds = []
all_labels = []

# 禁用梯度计算
with torch.no_grad():
    # 遍历测试数据加载器中的每个批次
    for inputs, labels in test_loader_multi:
        # 前向传播：计算模型输出
        outputs = model_multi(inputs)
        # 获取每个样本的预测类别（取概率最大的类别）
        _, preds = torch.max(outputs, 1)
        
        # 将预测结果和真实标签添加到列表（转移到CPU并转换为NumPy数组）
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())

# 计算测试集上的准确率
accuracy_multi = accuracy_score(all_labels, all_preds)
# 打印准确率
print(f"\n改进后的多分类问题测试集准确率: {accuracy_multi:.4f}")
# 打印分类报告标题
print("\n分类报告:")
# 打印详细的分类报告（包含精确率、召回率、F1分数等）
print(classification_report(all_labels, all_preds))
```

    使用设备: cpu

    ==================================================
    改进的多分类问题示例
    ==================================================
    Epoch [10/300], 训练损失: 0.9265, 验证损失: 0.8729, 学习率: 0.001000
    Epoch [20/300], 训练损失: 0.7409, 验证损失: 0.7428, 学习率: 0.001000
    Epoch [30/300], 训练损失: 0.6931, 验证损失: 0.6956, 学习率: 0.001000
    Epoch [40/300], 训练损失: 0.6163, 验证损失: 0.6733, 学习率: 0.001000
    Epoch [50/300], 训练损失: 0.5790, 验证损失: 0.6503, 学习率: 0.001000
    Epoch [60/300], 训练损失: 0.4927, 验证损失: 0.6442, 学习率: 0.001000
    学习率已调整为: 0.000500
    Epoch [70/300], 训练损失: 0.5147, 验证损失: 0.6372, 学习率: 0.000500
    Epoch [80/300], 训练损失: 0.4452, 验证损失: 0.6366, 学习率: 0.000500
    Epoch [90/300], 训练损失: 0.4561, 验证损失: 0.6406, 学习率: 0.000500
    学习率已调整为: 0.000250
    Epoch [100/300], 训练损失: 0.4671, 验证损失: 0.6411, 学习率: 0.000250

    早停在第 103 个epoch

    改进后的多分类问题测试集准确率: 0.7950

    分类报告:
                  precision    recall  f1-score   support

               0       0.72      0.70      0.71        30
               1       0.90      0.83      0.86        46
               2       0.83      0.80      0.81        44
               3       0.64      0.76      0.70        38
               4       0.86      0.86      0.86        42

        accuracy                           0.80       200
       macro avg       0.79      0.79      0.79       200
    weighted avg       0.80      0.80      0.80       200

    C:\Users\11955\AppData\Local\Temp\ipykernel_8500\2852974574.py:158: FutureWarning: You are using `torch.load` with `weights_only=False` (the current default value), which uses the default pickle module implicitly. It is possible to construct malicious pickle data which will execute arbitrary code during unpickling (See https://github.com/pytorch/pytorch/blob/main/SECURITY.md#untrusted-models for more details). In a future release, the default value for `weights_only` will be flipped to `True`. This limits the functions that could be executed during unpickling. Arbitrary objects will no longer be allowed to be loaded via this mode unless they are explicitly allowlisted by the user via `torch.serialization.add_safe_globals`. We recommend you start setting `weights_only=True` for any use case where you don't have full control of the loaded file. Please open an issue on GitHub for any issues related to this experimental feature.
      model_multi.load_state_dict(torch.load('best_model.pth'))

``` python
# --------------------------
# 2. 多标签分类问题实现
# --------------------------
print("\n" + "="*50)
print("多标签分类问题示例")
print("="*50)

# 生成多标签分类数据集
X_multi_label, y_multi_label = make_multilabel_classification(
    n_samples=1000,    # 样本数量：1000个
    n_features=20,     # 特征数量：20个
    n_classes=5,       # 总类别数：5个
    n_labels=2,        # 每个样本的平均标签数：2个
    random_state=42    # 随机种子，保证结果可复现
)

# 转换为PyTorch张量并移动到指定设备
X_multi_label = torch.tensor(X_multi_label, dtype=torch.float32).to(device)  # 特征转换为float32类型
y_multi_label = torch.tensor(y_multi_label, dtype=torch.float32).to(device)  # 多标签转换为float32类型

# 划分训练集和测试集（80%训练，20%测试）
X_train_ml, X_test_ml, y_train_ml, y_test_ml = train_test_split(
    X_multi_label, y_multi_label, test_size=0.2, random_state=42
)

# 创建数据集和数据加载器
train_dataset_ml = TensorDataset(X_train_ml, y_train_ml)  # 训练集
test_dataset_ml = TensorDataset(X_test_ml, y_test_ml)  # 测试集

# 创建数据加载器
train_loader_ml = DataLoader(train_dataset_ml, batch_size=32, shuffle=True)  # 训练集打乱
test_loader_ml = DataLoader(test_dataset_ml, batch_size=32, shuffle=False)  # 测试集不打乱

# 定义多标签分类的softmax回归模型
class MultiLabelSoftmaxRegression(nn.Module):
    def __init__(self, input_dim, num_classes):
        super(MultiLabelSoftmaxRegression, self).__init__()
        # 定义线性层：输入维度input_dim，输出维度num_classes
        self.linear = nn.Linear(input_dim, num_classes)
        
    def forward(self, x):
        # 前向传播：线性变换后应用sigmoid激活函数
        # sigmoid将输出映射到[0,1]区间，表示每个标签的概率
        return torch.sigmoid(self.linear(x))

# 初始化模型、损失函数和优化器
num_classes_ml = y_multi_label.shape[1]  # 多标签分类的类别数：5

# 创建模型实例并移动到指定设备
model_ml = MultiLabelSoftmaxRegression(input_dim, num_classes_ml).to(device)
# 定义损失函数：二元交叉熵损失（BCELoss）
criterion_ml = nn.BCELoss()
# 定义优化器：随机梯度下降
optimizer_ml = optim.SGD(model_ml.parameters(), lr=0.03, momentum=0.9)

# 训练模型
epochs = 100  # 训练轮数：100
for epoch in range(epochs):
    model_ml.train()  # 设置为训练模式
    train_loss = 0.0  # 记录训练损失
    
    # 遍历训练数据加载器
    for inputs, labels in train_loader_ml:
        optimizer_ml.zero_grad()  # 清零梯度
        
        outputs = model_ml(inputs)  # 前向传播
        loss = criterion_ml(outputs, labels)  # 计算损失
        
        loss.backward()  # 反向传播
        optimizer_ml.step()  # 更新参数
        
        # 累加损失
        train_loss += loss.item() * inputs.size(0)
    
    # 计算平均训练损失
    train_loss = train_loss / len(train_loader_ml.dataset)
    
    # 每10个epoch打印一次信息
    if (epoch + 1) % 10 == 0:
        print(f'Epoch [{epoch+1}/{epochs}], 训练损失: {train_loss:.4f}')

# 在测试集上评估
model_ml.eval()  # 设置为评估模式
all_preds_ml = []  # 存储多标签预测结果
all_labels_ml = []  # 存储多标签真实标签

with torch.no_grad():  # 关闭梯度计算
    for inputs, labels in test_loader_ml:
        outputs = model_ml(inputs)  # 前向传播
        # 使用0.5作为阈值：大于0.5的预测为1（正例），否则为0（负例）
        preds = (outputs > 0.5).float()
        
        # 保存预测结果和真实标签
        all_preds_ml.extend(preds.cpu().numpy())
        all_labels_ml.extend(labels.cpu().numpy())

# 计算汉明损失（多标签分类常用指标）
hamming = hamming_loss(all_labels_ml, all_preds_ml)
print(f"\n多标签分类汉明损失: {hamming:.4f}")
print("\n每个类别的分类报告:")

# 转换为NumPy数组以便后续处理
all_labels_ml_np = np.array(all_labels_ml)
all_preds_ml_np = np.array(all_preds_ml)

# 为每个标签单独打印分类报告
for i in range(all_labels_ml_np.shape[1]):
    print(f"\n类别 {i}:")
    print(classification_report(all_labels_ml_np[:, i], all_preds_ml_np[:, i]))
    
```
