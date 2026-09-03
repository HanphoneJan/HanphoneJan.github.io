/**
 * @nc app=nowcoder id=a158fa6e79274ac497832697b4b83658 topic=82 question=29781 lang=MySQL
 * 2026-04-30 10:08:56
 * https://www.nowcoder.com/practice/a158fa6e79274ac497832697b4b83658?tpId=82&tqId=29781
 * [SQL228] 使用join查询方式找出没有分类的电影id以及名称
 */

/**
 * 题目描述：
 * 使用 JOIN 查询方式，找出没有分类的电影 id 以及电影名称。
 *
 * 涉及表：
 * - film (film_id, title, description) —— 电影信息表
 * - category (category_id, name, last_update) —— 电影分类表
 * - film_category (film_id, category_id, last_update) —— 电影与分类关联表
 *
 * 核心思路：
 * 1. 通过 LEFT JOIN 将 film 表与 film_category 表关联
 * 2. 没有分类的电影在 film_category 一侧会匹配为 NULL
 * 3. 筛选出 film_category.film_id IS NULL 的记录
 * 4. 只返回 film_id 和 title
 *
 * 使用到的 SQL 语法：
 * - LEFT JOIN（左外连接）
 * - IS NULL 判断
 * - 多表连接
 */

/** @nc code=start */

-- 方法一：LEFT JOIN + IS NULL —— 题目要求的 JOIN 方式
-- film 表左连接 film_category，没有匹配的分类记录时 film_category.film_id 为 NULL
SELECT
    f.film_id,
    f.title
FROM film AS f
LEFT JOIN film_category AS fc
    ON f.film_id = fc.film_id
WHERE fc.film_id IS NULL;

-- 方法二：NOT IN —— 另一种思路（非 JOIN 方式，供参考）
SELECT film_id, title
FROM film
WHERE film_id NOT IN (
    SELECT film_id FROM film_category WHERE film_id IS NOT NULL
);

-- 方法三：NOT EXISTS —— 效率通常优于 NOT IN，尤其在数据量大时
SELECT film_id, title
FROM film AS f
WHERE NOT EXISTS (
    SELECT 1 FROM film_category AS fc WHERE fc.film_id = f.film_id
);

/** @nc code=end */
