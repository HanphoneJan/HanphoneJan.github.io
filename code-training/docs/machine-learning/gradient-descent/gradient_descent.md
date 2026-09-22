---
title: 梯度下降交互式可视化
_synced: true
---
# 梯度下降交互式可视化


梯度下降是深度学习中最重要的优化算法。本文用交互式 3D
可视化帮助你直观理解它的核心机制：**沿着损失函数下降最快的方向（负梯度方向）逐步逼近最优解**。

你可以拖动滑块实时调整**学习率、迭代次数、初始参数**，观察轨迹和损失曲线的变化。

## 1. 损失函数

我们定义一个二维损失函数 $J(w,b)$，它是参数 $w$、$b$
的函数，形状类似一个带有波纹的碗：

$$J(w,b) = (w-2)^2 + (b+1)^2 + 0.1\sin(5w) + 0.1\sin(5b)$$

**目标**：找到使 $J$ 最小的
$(w,b)$。加上正弦项后形成局部极小值，可用来观察梯度下降可能陷入的陷阱。

先实现损失函数与梯度计算，以及梯度下降的主循环：

``` python
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, Button

# Notebook 交互模式设置
%matplotlib widget

# 设置中文字体，避免中文乱码
plt.rcParams["font.family"] = ["sans-serif", "SimHei"]
plt.rcParams['axes.unicode_minus'] = False  # 正确显示负号
```

### 损失函数与梯度

对 $J$ 求偏导得到梯度，梯度指向损失增长最快的方向，负梯度即下降方向：

``` python
# 定义损失函数
def loss_function(w, b):
    return (w - 2)**2 + (b + 1)** 2 + 0.1 * np.sin(5*w) + 0.1 * np.sin(5*b)

# 计算梯度（对 w、b 的偏导）
def compute_gradient(w, b):
    dw = 2 * (w - 2) + 0.5 * np.cos(5*w)
    db = 2 * (b + 1) + 0.5 * np.cos(5*b)
    return dw, db
```

### 梯度下降主循环

参数更新规则：$\theta \leftarrow \theta - \alpha \cdot \nabla J$，其中
$\alpha$ 是学习率。当损失几乎不再下降时提前停止迭代：

``` python
# 梯度下降迭代
def gradient_descent(w_init, b_init, learning_rate, num_iterations):
    w_history = [w_init]
    b_history = [b_init]
    loss_history = [loss_function(w_init, b_init)]
    
    w_current, b_current = w_init, b_init
    
    for i in range(num_iterations):
        dw, db = compute_gradient(w_current, b_current)
        w_current -= learning_rate * dw
        b_current -= learning_rate * db
        
        w_history.append(w_current)
        b_history.append(b_current)
        loss_history.append(loss_function(w_current, b_current))
        
        if i > 0 and abs(loss_history[-1] - loss_history[-2]) < 1e-6:
            break
            
    return w_history, b_history, loss_history
```

## 2. 绘制损失曲面

先生成网格数据，绘制 3D 损失曲面，并预留红色轨迹线和当前点：

``` python
# 创建图形 - 增加底部边距，为滑块留出空间
fig = plt.figure(figsize=(12, 9))  # 增加高度，避免拥挤
plt.subplots_adjust(bottom=0.3)  # 底部留出30%空间给控件

# 创建子图 - 调整子图位置，避免与滑块重叠
ax1 = fig.add_subplot(121, projection='3d')
ax2 = fig.add_subplot(122)

# 生成网格数据
w_grid = np.linspace(-3, 5, 100)
b_grid = np.linspace(-3, 5, 100)
W, B = np.meshgrid(w_grid, b_grid)
L = loss_function(W, B)

# 绘制3D曲面
surf = ax1.plot_surface(W, B, L, cmap='viridis', alpha=0.7, edgecolor='none')
fig.colorbar(surf, ax=ax1, shrink=0.5, aspect=5)

# 初始化轨迹线和点
trajectory_line, = ax1.plot([], [], [], 'r-', linewidth=2, label='梯度下降轨迹')
current_point, = ax1.plot([], [], [], 'bo', markersize=8, label='当前位置')
optimal_point, = ax1.plot([2], [-1], [loss_function(2, -1)], 'go', markersize=10, label='最优解')

# 设置3D图属性
ax1.set_xlabel('w参数')
ax1.set_ylabel('b参数')
ax1.set_zlabel('损失值')
ax1.set_title('损失函数曲面与梯度下降轨迹')
ax1.legend()

# 初始化损失曲线
loss_line, = ax2.plot([], [], 'b-', linewidth=2)
ax2.set_xlabel('迭代次数')
ax2.set_ylabel('损失值')
ax2.set_title('损失值随迭代变化')
ax2.grid(True)
```

## 3. 添加交互控件

创建 4 个滑块（学习率、迭代次数、初始 $w$、初始
$b$）和一个重置按钮，并通过事件绑定实时刷新图表：

``` python
# 重新设置滑块位置（更靠下，增加间距）
ax_init_b = plt.axes([0.25, 0.22, 0.65, 0.03])    # 最上方滑块
ax_init_w = plt.axes([0.25, 0.17, 0.65, 0.03])
ax_iterations = plt.axes([0.25, 0.12, 0.65, 0.03])
ax_learning_rate = plt.axes([0.25, 0.07, 0.65, 0.03])  # 最下方滑块

# 创建滑块
slider_lr = Slider(ax_learning_rate, '学习率', 0.01, 0.5, valinit=0.1)
slider_iter = Slider(ax_iterations, '迭代次数', 10, 500, valinit=100, valstep=10)
slider_init_w = Slider(ax_init_w, '初始w值', -3, 5, valinit=0)
slider_init_b = Slider(ax_init_b, '初始b值', -3, 5, valinit=0)

# 创建重置按钮（调整位置）
reset_ax = plt.axes([0.05, 0.07, 0.1, 0.04])
button = Button(reset_ax, '重置', hovercolor='0.975')
```

### 更新与重置逻辑

`update` 读取滑块值，重新执行梯度下降并更新 3D 轨迹与损失曲线；`reset`
将所有参数恢复默认值：

``` python
# 更新函数
def update(val):
    """滑块参数变化时触发，重新执行梯度下降并刷新可视化结果"""
    # 1. 从滑块获取当前用户设置的参数值
    learning_rate = slider_lr.val      # 学习率（步长大小）
    num_iterations = int(slider_iter.val)  # 迭代次数
    init_w = slider_init_w.val         # 参数 w 的起点
    init_b = slider_init_b.val         # 参数 b 的起点
    
    # 2. 执行梯度下降，获取迭代过程的历史记录
    w_history, b_history, loss_history = gradient_descent(
        init_w, init_b, learning_rate, num_iterations
    )
    
    # 3. 更新3D图中的梯度下降轨迹线
    trajectory_line.set_data_3d(w_history, b_history, loss_history)
    
    # 4. 更新3D图中的当前点（最后一次迭代的位置）
    current_point.set_data_3d([w_history[-1]], [b_history[-1]], [loss_history[-1]])
    
    # 5. 更新右侧损失值变化曲线
    loss_line.set_data(range(len(loss_history)), loss_history)
    ax2.relim()          # 重新计算坐标轴范围
    ax2.autoscale_view()  # 自动调整坐标轴视图
    
    # 6. 触发画布重绘，使所有更新生效
    fig.canvas.draw_idle()

# 重置函数
def reset(event):
    slider_lr.reset()
    slider_iter.reset()
    slider_init_w.reset()
    slider_init_b.reset()
    update(None)
```

### 绑定事件并初始化

将滑块变化和按钮点击绑定到对应回调，最后执行一次初始更新：

``` python
# 绑定事件
slider_lr.on_changed(update)
slider_iter.on_changed(update)
slider_init_w.on_changed(update)
slider_init_b.on_changed(update)
button.on_clicked(reset)

# 初始更新
update(None)

plt.show()
```

## 4. 观察与思考

- **学习率太小**：收敛缓慢，轨迹绕远路；**学习率太大**：震荡甚至发散。
- **初始值不同**：可能落入不同的局部极小值，这正是神经网络优化的挑战之一。
- 损失曲线平滑下降时说明梯度下降工作正常，出现波动则需调低学习率。
