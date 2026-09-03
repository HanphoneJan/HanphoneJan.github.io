"""
第2题-基于 AdamW 优化的网络带宽预测模型 - AdamW 优化算法

在华为网络通信业务中，网络带宽预测模型是保障数据传输稳定性的核心模块之一，
通过历史数据拟合的带宽模型为：y = w1 * x1 + w2 * x2 + b。
请实现 AdamW 优化算法，基于给定样本数据迭代更新模型参数。

输入格式：
- 第1行：整数 N，表示样本数量
- 接下来 N 行：每行3个浮点数 x1, x2, y_true

输出格式：
- 一行3个浮点数，依次为 w1, w2, b，保留6位小数

核心思路：
1. 对每个样本计算预测值和梯度
2. 使用 AdamW 算法更新一阶/二阶动量
3. 进行偏差修正后更新参数
4. 权重衰减直接作用于参数而非动量

时间复杂度：O(N)
空间复杂度：O(1)
"""

# https://codefun2000.com/p/P4779
import sys
import math

# @sample-start
"""
样例输入 1:
3
1.0 1.0 2.0
2.0 2.0 4.0
3.0 3.0 6.0

样例输出 1:
0.002750 0.002750 0.002923
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1
0.0 0.0 0.0

样例输出 2:
0.000000 0.000000 0.000000
"""
# @sample-end

def main():
    data = sys.stdin.read().strip().split()  # 把标准输入中的所有内容一次性读取出来，按空白字符（空格、换行等）分割，得到一个字符串列表
    if not data:
        return
    it = iter(data)
    N = int(next(it))
    
    # 初始化参数和动量
    w1 = w2 = b = 0.0
    mw1 = mw2 = mb = 0.0
    vw1 = vw2 = vb = 0.0
    
    beta1, beta2 = 0.9, 0.999
    lam, alpha, eps = 0.01, 0.001, 1e-8
    t = 0
    
    for _ in range(N):
        x1 = float(next(it))
        x2 = float(next(it))
        y_true = float(next(it))
        t += 1
        
        y_pred = w1 * x1 + w2 * x2 + b
        grad_w1 = 2.0 * (y_pred - y_true) * x1
        grad_w2 = 2.0 * (y_pred - y_true) * x2
        grad_b = 2.0 * (y_pred - y_true)
        
        mw1 = beta1 * mw1 + (1 - beta1) * grad_w1
        mw2 = beta1 * mw2 + (1 - beta1) * grad_w2
        mb = beta1 * mb + (1 - beta1) * grad_b
        
        vw1 = beta2 * vw1 + (1 - beta2) * (grad_w1 * grad_w1)
        vw2 = beta2 * vw2 + (1 - beta2) * (grad_w2 * grad_w2)
        vb = beta2 * vb + (1 - beta2) * (grad_b * grad_b)
        
        m_hat_w1 = mw1 / (1 - beta1 ** t)
        m_hat_w2 = mw2 / (1 - beta1 ** t)
        m_hat_b = mb / (1 - beta1 ** t)
        
        v_hat_w1 = vw1 / (1 - beta2 ** t)
        v_hat_w2 = vw2 / (1 - beta2 ** t)
        v_hat_b = vb / (1 - beta2 ** t)
        
        w1 -= alpha * (m_hat_w1 / (math.sqrt(v_hat_w1) + eps) + lam * w1)
        w2 -= alpha * (m_hat_w2 / (math.sqrt(v_hat_w2) + eps) + lam * w2)
        b  -= alpha * (m_hat_b / (math.sqrt(v_hat_b) + eps) + lam * b)
    
    print(f"{w1:.6f} {w2:.6f} {b:.6f}") # python默认使用银行家舍入，round(数字，精度)输出数值

def run_tests():
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("3\n1.0 1.0 2.0\n2.0 2.0 4.0\n3.0 3.0 6.0\n", "0.002750 0.002750 0.002923"),
        ("1\n0.0 0.0 0.0\n", "0.000000 0.000000 0.000000"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            main()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={output} {status}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        main()