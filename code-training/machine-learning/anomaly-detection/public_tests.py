import numpy as np
import random

def select_threshold_test(target):
    """
    测试select_threshold函数的正确性
    参数:
        target: 待测试的select_threshold函数
    """
    # 测试用例1：基础测试
    p_val = np.array([i / 100 for i in range(30)])  # 生成0到0.29的概率值
    y_val = np.array([1] * 5 + [0] * 25)  # 前5个为异常(1)，后25个为正常(0)
    
    best_epsilon, best_F1 = target(y_val, p_val)
    # 验证最佳阈值是否正确（允许微小误差）
    assert np.isclose(best_epsilon, 0.04, atol=0.3 / 1000), \
        f"最佳阈值错误。预期: {0.04} 实际: {best_epsilon}"
    # 验证最佳F1分数是否正确
    assert best_F1 == 1, f"最佳F1分数错误。预期: 1 实际: {best_F1}"
    
    # 测试用例2：带噪声的测试
    y_val = np.array([1] * 5 + [0] * 25)
    y_val[2] = 0  # 引入噪声，将一个异常样本标记为正常
    best_epsilon, best_F1 = target(y_val, p_val)
    assert np.isclose(best_epsilon, 0.04, atol=0.3 / 1000), \
        f"最佳阈值错误。预期: {0.04} 实际: {best_epsilon}"
    assert np.isclose(best_F1, 0.8888888), \
        f"最佳F1分数错误。预期: 0.8888888 实际: {best_F1}"
    
    # 测试用例3：随机排序的测试
    p_val = np.array([i / 1000 for i in range(50)])  # 生成0到0.049的概率值
    y_val = np.array([1] * 8 + [0] * 42)  # 前8个为异常
    y_val[5] = 0  # 引入噪声
    index = [*range(50)]
    random.shuffle(index)  # 随机打乱索引
    p_val = p_val[index]   # 打乱概率值顺序
    y_val = y_val[index]   # 同步打乱标签顺序

    best_epsilon, best_F1 = target(y_val, p_val)
    assert np.isclose(best_epsilon, 0.007, atol=0.05 / 1000), \
        f"最佳阈值错误。预期: {0.0070070} 实际: {best_epsilon}"
    assert np.isclose(best_F1, 0.933333333), \
        f"最佳F1分数错误。预期: 0.933333333 实际: {best_F1}"
    
    print("所有测试通过！")  # 绿色文字提示测试通过
    
def estimate_gaussian_test(target):
    """
    测试estimate_gaussian函数的正确性
    参数:
        target: 待测试的estimate_gaussian函数
    """
    np.random.seed(273)  # 设置随机种子，保证测试可复现
    
    # 测试用例1：完美重合的特征
    X = np.array([[1, 1, 1], 
                  [2, 2, 2], 
                  [3, 3, 3]]).T  # 形状为(3,3)，每行是一个样本
    
    mu, var = target(X)
    
    # 验证返回类型是否正确
    assert type(mu) == np.ndarray, f"mu类型错误。预期: {np.ndarray} 实际: {type(mu)}"
    assert type(var) == np.ndarray, f"var类型错误。预期: {np.ndarray} 实际: {type(var)}"
    
    # 验证形状是否正确
    assert mu.shape == (X.shape[1],), \
        f"mu形状错误。预期: {(X.shape[1],)} 实际: {mu.shape}"
    assert var.shape == (X.shape[1],), \
        f"var形状错误。预期: {(X.shape[1],)} 实际: {var.shape}"
    
    # 验证数值是否正确（均值应为[1,2,3]，方差应为0）
    assert np.allclose(mu, [1., 2., 3.]), \
        f"mu数值错误。预期: {[1, 2, 3]} 实际: {mu}"
    assert np.allclose(var, [0., 0., 0.]), \
        f"var数值错误。预期: {[0, 0, 0]} 实际: {var}"
    
    # 测试用例2：线性相关的特征
    X = np.array([[1, 2, 3], 
                  [2, 4, 6], 
                  [3, 6, 9]]).T  # 每行样本的特征呈线性关系
    
    mu, var = target(X)
    
    # 验证类型和形状
    assert type(mu) == np.ndarray, f"mu类型错误。预期: {np.ndarray} 实际: {type(mu)}"
    assert type(var) == np.ndarray, f"var类型错误。预期: {np.ndarray} 实际: {type(var)}"
    assert mu.shape == (X.shape[1],), \
        f"mu形状错误。预期: {(X.shape[1],)} 实际: {mu.shape}"
    assert var.shape == (X.shape[1],), \
        f"var形状错误。预期: {(X.shape[1],)} 实际: {var.shape}"
    
    # 验证数值（均值应为[2,4,6]，方差按公式计算）
    assert np.allclose(mu, [2., 4., 6.]), \
        f"mu数值错误。预期: {[2., 4., 6.]} 实际: {mu}"
    assert np.allclose(var, [2. / 3, 8. / 3., 18. / 3.]), \
        f"var数值错误。预期: {[2. / 3, 8. / 3., 18. / 3.]} 实际: {var}"
    
    
    # 测试用例3：随机正态分布数据
    m = 500  # 样本数量
    # 生成3个特征，分别服从不同的正态分布
    X = np.array([np.random.normal(0, 1, m),   # 均值0，标准差1
                  np.random.normal(1, 2, m),   # 均值1，标准差2
                  np.random.normal(3, 1.5, m)]).T  # 均值3，标准差1.5
    
    mu, var = target(X)
    
    # 验证类型和形状
    assert type(mu) == np.ndarray, f"mu类型错误。预期: {np.ndarray} 实际: {type(mu)}"
    assert type(var) == np.ndarray, f"var类型错误。预期: {np.ndarray} 实际: {type(var)}"
    assert mu.shape == (X.shape[1],), \
        f"mu形状错误。预期: {(X.shape[1],)} 实际: {mu.shape}"
    assert var.shape == (X.shape[1],), \
        f"var形状错误。预期: {(X.shape[1],)} 实际: {var.shape}"
    
    # 验证数值（允许一定误差，因为是随机数据）
    assert np.allclose(mu, [0., 1., 3.], atol=0.2), \
        f"mu数值错误。预期: {[0, 1, 3]} 实际: {mu}"
    assert np.allclose(var, np.square([1., 2., 1.5]), atol=0.2), \
        f"var数值错误。预期: {np.square([1., 2., 1.5])} 实际: {var}"
    
    print("所有测试通过！")  # 绿色文字提示测试通过