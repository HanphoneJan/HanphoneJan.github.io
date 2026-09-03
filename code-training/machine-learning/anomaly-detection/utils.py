import numpy as np
import matplotlib.pyplot as plt

def load_data():
    """
    加载单特征异常检测数据集（第一部分）
    
    返回值:
        X (ndarray): 训练集数据，包含多个样本的特征值
        X_val (ndarray): 验证集数据，用于确定异常检测阈值
        y_val (ndarray): 验证集标签，1表示异常样本，0表示正常样本
    """
    # 从本地文件加载数据（假设数据文件存储在data目录下）
    X = np.load("data/X_part1.npy")
    X_val = np.load("data/X_val_part1.npy")
    y_val = np.load("data/y_val_part1.npy")
    return X, X_val, y_val

def load_data_multi():
    """
    加载多特征异常检测数据集（第二部分）
    
    返回值:
        X (ndarray): 高维训练集数据
        X_val (ndarray): 高维验证集数据
        y_val (ndarray): 高维验证集标签（1表示异常，0表示正常）
    """
    X = np.load("data/X_part2.npy")
    X_val = np.load("data/X_val_part2.npy")
    y_val = np.load("data/y_val_part2.npy")
    return X, X_val, y_val


def multivariate_gaussian(X, mu, var):
    """
    计算样本X在多元高斯分布下的概率密度
    
    参数:
        X (ndarray): (m, n) 输入样本，m个样本，每个样本有n个特征
        mu (ndarray): (n,) 高斯分布的均值向量，每个元素对应一个特征的均值
        var (ndarray): 高斯分布的方差参数
                       - 若为向量(n,)：表示对角协方差矩阵（特征间独立）
                       - 若为矩阵(n,n)：表示完整协方差矩阵（特征间可能相关）
    
    返回值:
        p (ndarray): (m,) 每个样本的概率密度值
    """
    
    k = len(mu)  # 获取特征数量n
    
    # 处理方差参数：若输入为向量，则转换为对角矩阵（特征独立假设）
    if var.ndim == 1:
        var = np.diag(var)  # 对角矩阵的对角线元素为各特征的方差
        
    # 数据中心化：每个样本减去均值向量
    X = X - mu
    
    # 计算多元高斯概率密度函数
    # 公式：p(x) = (2π)^(-k/2) * |Σ|^(-1/2) * exp(-0.5*(x-μ)^T Σ^(-1)(x-μ))
    p = (2 * np.pi) ** (-k / 2) * np.linalg.det(var) ** (-0.5) * \
        np.exp(-0.5 * np.sum(np.matmul(X, np.linalg.pinv(var)) * X, axis=1))
    
    return p
        
def visualize_fit(X, mu, var):
    """
    可视化高斯分布的拟合效果，绘制数据点和高斯分布的等高线
    
    参数:
        X (ndarray): (m, 2) 二维特征的样本数据（仅支持二维可视化）
        mu (ndarray): (2,) 二维特征的均值向量
        var (ndarray): 二维特征的方差参数（向量或矩阵）
    """
    
    # 生成网格数据用于绘制等高线
    # 生成从0到35.5，步长0.5的网格点（覆盖数据可能的取值范围）
    X1, X2 = np.meshgrid(np.arange(0, 35.5, 0.5), np.arange(0, 35.5, 0.5))
    
    # 将网格点转换为样本格式（每行一个样本），计算每个网格点的概率密度
    Z = multivariate_gaussian(np.stack([X1.ravel(), X2.ravel()], axis=1), mu, var)
    Z = Z.reshape(X1.shape)  # 将概率密度值重塑为网格形状

    # 绘制训练数据点（蓝色x标记）
    plt.plot(X[:, 0], X[:, 1], 'bx')

    # 绘制高斯分布的等高线（仅当概率值非无穷时）
    # 等高线级别设置为10的幂次，覆盖从10^-20到10^0的范围，步长为3
    if np.sum(np.isinf(Z)) == 0:
        plt.contour(X1, X2, Z, levels=10**(np.arange(-20., 1, 3)), linewidths=1)
        
    # 设置图表标题
    plt.title("拟合数据集的高斯分布等高线")
    # 设置y轴标签
    plt.ylabel('吞吐量 (mb/s)')
    # 设置x轴标签
    plt.xlabel('延迟 (ms)')