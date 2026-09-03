/**
 * @nc app=nowcoder id=f257dfc1b55e42e19eec004aa3cb4174 topic=82 question=38863 lang=MySQL
 * 2026-04-30 10:09:37
 * https://www.nowcoder.com/practice/f257dfc1b55e42e19eec004aa3cb4174?tpId=82&tqId=38863
 * [SQL291] 商品交易(网易校招笔试真题)
 */

/**
 * 题目描述：
 * 查找"购买个数超过20，质量小于50的商品，按照商品id升序排序"。
 * 输出格式：商品id、商品名、质量、购买总数（total）
 *
 * 涉及表：
 * - goods (id, name, weight) —— 商品表，id 为主键
 * - trans (id, goods_id, count) —— 交易表，记录每笔交易购买的商品数量
 *
 * 核心思路：
 * 1. 将 goods 表和 trans 表通过 goods_id 关联
 * 2. 按商品分组（GROUP BY goods.id），汇总每个商品的购买总数（SUM(trans.count)）
 * 3. 筛选条件：SUM(trans.count) > 20（购买总数超过20）且 weight < 50（质量小于50）
 * 4. 按商品 id 升序排列
 *
 * 使用到的 SQL 语法：
 * - JOIN（内连接）
 * - GROUP BY（分组聚合）
 * - SUM() 聚合函数
 * - HAVING（分组后过滤）
 * - ORDER BY（排序）
 */

/** @nc code=start */

-- 核心解法：JOIN + GROUP BY + HAVING
-- 先关联两表，再按商品分组求和，最后用 HAVING 过滤聚合结果
SELECT
    g.id,
    g.name,
    g.weight,
    SUM(t.count) AS total
FROM goods AS g
JOIN trans AS t
    ON g.id = t.goods_id
GROUP BY g.id, g.name, g.weight
HAVING SUM(t.count) > 20 AND g.weight < 50
ORDER BY g.id ASC;

/** @nc code=end */
