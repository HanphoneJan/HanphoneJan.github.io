/**
 * @nc app=nowcoder id=218ae58dfdcd4af195fff264e062138f topic=82 question=29753 lang=MySQL
 * 2026-04-30 10:08:23
 * https://www.nowcoder.com/practice/218ae58dfdcd4af195fff264e062138f?tpId=82&tqId=29753
 * [SQL200] 查找最晚入职员工的所有信息
 */

/**
 * 题目描述：
 * 查找 employees 表中最晚入职员工的所有信息。
 *
 * 涉及表：
 * - employees (emp_no, birth_date, first_name, last_name, gender, hire_date)
 *
 * 核心思路：
 * 1. 先找出最晚的入职日期（hire_date 的最大值）
 * 2. 再查询该日期对应的所有员工信息
 *
 * 使用到的 SQL 语法：
 * - 子查询（WHERE 条件中使用 SELECT）
 * - 聚合函数 MAX()
 * - ORDER BY + LIMIT（替代写法）
 */

/** @nc code=start */

-- 方法一：子查询 + MAX() —— 最直观的写法
-- 先通过子查询获取最晚入职日期，再匹配该日期的所有员工
SELECT *
FROM employees
WHERE hire_date = (SELECT MAX(hire_date) FROM employees);

-- 方法二：ORDER BY + LIMIT —— 简洁写法
-- 按入职日期降序排列，取第一条。注意：如果有多人同一天最晚入职，只返回一人
SELECT *
FROM employees
ORDER BY hire_date DESC
LIMIT 1;

-- 方法三：窗口函数 —— 如果有多人同一天最晚入职，也能全部返回
-- ROW_NUMBER() 按 hire_date 降序给每行编号，取出编号为 1 的所有记录
WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY hire_date DESC) AS rn
    FROM employees
)
SELECT * FROM ranked WHERE rn = 1;

/** @nc code=end */
