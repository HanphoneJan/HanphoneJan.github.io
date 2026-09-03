/**
 * @nc app=nowcoder id=048ed413ac0e4cf4a774b906fc87e0e7 topic=82 question=38864 lang=MySQL
 * 2026-04-30 10:09:28
 * https://www.nowcoder.com/practice/048ed413ac0e4cf4a774b906fc87e0e7?tpId=82&tqId=38864
 * [SQL292] 网易云音乐推荐(网易校招笔试真题)
 */

/**
 * 题目描述：
 * 查询向 user_id = 1 的用户，推荐其关注的人喜欢的音乐。
 * 要求：
 * - 不要推荐该用户已经喜欢的音乐
 * - 按 music_id 升序排列
 * - 结果中不应当包含重复项
 * 输出：music_name（音乐名称）
 *
 * 涉及表：
 * - follow (user_id, follower_id) —— 关注关系表，user_id 关注 follower_id
 * - music_likes (user_id, music_id) —— 用户喜欢的音乐
 * - music (id, music_name) —— 音乐信息表
 *
 * 核心思路：
 * 1. 先找到 user_id = 1 关注的所有人（follow 表中 user_id = 1 的 follower_id）
 * 2. 找到这些人喜欢的音乐（通过 music_likes 表）
 * 3. 排除 user_id = 1 自己已经喜欢的音乐
 * 4. 去重并按 music_id 升序输出音乐名称
 *
 * 使用到的 SQL 语法：
 * - JOIN（多表连接）
 * - NOT IN / LEFT JOIN + IS NULL（排除已喜欢的音乐）
 * - DISTINCT（去重）
 * - ORDER BY（排序）
 */

/** @nc code=start */

-- 方法一：NOT IN + DISTINCT —— 清晰直观
-- 先找到用户1关注的人喜欢的音乐，再用 NOT IN 排除已喜欢的
SELECT DISTINCT
    m.music_name
FROM follow AS f
JOIN music_likes AS ml
    ON f.follower_id = ml.user_id
JOIN music AS m
    ON ml.music_id = m.id
WHERE f.user_id = 1
  AND ml.music_id NOT IN (
      SELECT music_id FROM music_likes WHERE user_id = 1
  )
ORDER BY m.id ASC;

-- 方法二：LEFT JOIN + IS NULL —— 避免 NOT IN 的 NULL 陷阱
-- 用 LEFT JOIN 找出用户1喜欢的音乐，再通过 IS NULL 排除
SELECT DISTINCT
    m.music_name
FROM follow AS f
JOIN music_likes AS ml
    ON f.follower_id = ml.user_id
JOIN music AS m
    ON ml.music_id = m.id
LEFT JOIN music_likes AS my_ml
    ON my_ml.user_id = f.user_id
    AND my_ml.music_id = ml.music_id
WHERE f.user_id = 1
  AND my_ml.music_id IS NULL
ORDER BY m.id ASC;

-- 方法三：NOT EXISTS —— 大数据量时性能更优
SELECT DISTINCT
    m.music_name
FROM follow AS f
JOIN music_likes AS ml
    ON f.follower_id = ml.user_id
JOIN music AS m
    ON ml.music_id = m.id
WHERE f.user_id = 1
  AND NOT EXISTS (
      SELECT 1
      FROM music_likes AS my_ml
      WHERE my_ml.user_id = f.user_id
        AND my_ml.music_id = ml.music_id
  )
ORDER BY m.id ASC;

/** @nc code=end */
