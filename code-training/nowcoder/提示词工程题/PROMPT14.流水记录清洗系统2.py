# @nc app=nowcoder id=f1fcf492ca7e4923b16db3800e23e58d topic=408 question=51253 lang=Python3
# 2026-10-15 20:11:23
# https://www.nowcoder.com/practice/f1fcf492ca7e4923b16db3800e23e58d?tpId=408&tqId=51253
# [PROMPT14] 流水记录清洗系统2

"""
PROMPT14. 流水记录清洗系统2 —— 提示词工程题

本题的「答案」是一段提示词（Prompt），由大模型评测，不是可运行的 Python 代码。
这里把提示词存成一个字符串常量，方便版本管理与复用。

题目：从自然语言财务信息中提取最终金额、货币与资金流向，输出 JSON。
"""

# @nc code=start

PROMPT = """你是财务流水清洗助手。请从一段自然语言财务信息中提取字段并输出 JSON。

# 计算 final_amount
final_amount = 总金额(Total) + 税费/服务费等费用 − 折扣/优惠等金额 − 积分抵扣
- 积分抵扣：每 100 积分抵 1 元（5000 积分 = 50 元）。
- 金额写法：1.000,50 与 1,000.50 都表示 1000.50，注意区分千分位分隔符与小数点。
- 结果保留两位小数。

# 货币 currency
- $ → USD，€ → EUR，£ → GBP。
- ¥ 后面的数字带小数点（如 ¥10.50）→ CNY；是整数（如 ¥2000）→ JPY。

# 流向 flow_dir
- 购买、付款、消费、扣款 → OUT（出账）。
- 收入、收款、退款到账 → IN（进账）。

# 输出格式（严格 JSON，不要代码块，不要解释）
{"final_amount": float, "currency": "CNY 或 JPY 或 USD 或 EUR 或 GBP", "flow_dir": "IN 或 OUT"}

# 输入
{{input}}"""

# @nc code=end
