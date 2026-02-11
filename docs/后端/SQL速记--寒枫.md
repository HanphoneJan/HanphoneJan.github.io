[SQL语法基础知识总结 | JavaGuide](https://javaguide.cn/database/sql/sql-syntax-summary.html)
## SQL语法

### 基本

```mysql
show databases;	--查看当前所有的数据库
use 数据库名;	--打开指定的数据库
show tables;	--查看所有的表
describe/desc 表名;	--显示表的信息
create database 数据库名;	--创建一个数据库
exit	--退出连接

--		--单行注释
#		--单行注释
/*...*/		--多行注释

```

### 创建数据库表

```mysql
CREATE TABLE IF NOT EXISTS `student`(
	`id` INT(4)	NOT NULL AUTO_INCREMENT COMMENT '学号',
	`name` VARCHAR(30) NOT NULL DEFAULT '匿名' COMMENT '姓名',
	`pwd` VARCHAR(20) NOT NULL DEFAULT '123456' COMMENT '密码',
	`sex` VARCHAR(2) NOT NULL DEFAULT '女' COMMENT '性别',
	`birthday` DATETIME DEFAULT NULL COMMENT '出生日期',
	`address` VARCHAR(100) DEFAULT NULL COMMENT '家庭住址',
	`email` VARCHAR(50) DEFAULT NULL COMMENT '邮箱',
	PRIMARY KEY (`id`)
)ENGINE=INNODB DEFAULT CHARSET=utf8

CREATE TABLE IF NOT EXISTS `student`(
	'字段名' 列类型 [属性] [索引] [注释],
    '字段名' 列类型 [属性] [索引] [注释],
    ......
    '字段名' 列类型 [属性] [索引] [注释]
)[表的类型][字符集设置][注释]
```

### 修改数据库

```mysql
-- 修改表名
-- ALTER TABLE 旧表名 RENAME AS 新表名
ALTER TABLE teacher RENAME AS teachers;

-- 增加表的字段
-- ALTER TABLE 表名 ADD 字段名 列属性
ALTER TABLE teachers ADD age INT(11);

-- 修改表的字段(重命名，修改约束)
-- ALTER TABLE 表名 MODIFY 字段名 [列属性];
ALTER TABLE teachers MODIFY age VARCHAR(11);-- 修改约束
-- ALTER TABLE 表名 CHANGE 旧名字 新名字 [列属性];
ALTER TABLE teachers CHANGE age age1 INT(1);-- 字段重命名

-- 删除表的字段
-- ALTER TABLE 表名 DROP 字段名
ALTER TABLE teachers DROP age1;
```

### DML数据操作语言

```mysql
insert
-- 普通用法
INSERT INTO `student`(`name`) VALUES ('zsr');

-- 插入多条数据
INSERT INTO `student`(`name`,`pwd`,`sex`) VALUES ('zsr','200024','男'),('gcc','000421','女');

-- 省略字段
INSERT INTO `student` VALUES (5,'Bareth','123456','男','2000-02-04','武汉','1412@qq.com',1); 

update
-- 修改学员名字,指定条件
UPDATE `student` SET `name`='zsr204' WHERE id=1;
-- 不指定条件的情况,会改动所有表
UPDATE `student` SET `name`='zsr204'
-- 修改多个属性
UPDATE `student` SET `name`='zsr',`address`='湖北' WHERE id=1;
-- 通过多个条件定位数据
UPDATE `student` SET `name`='zsr204' WHERE `name`='zsr' AND `pwd`='200024';

delete
-- 删除数据(避免这样写,会全部删除)
DELETE FROM `student`;
-- 删除指定数据
DELETE FROM `student` WHERE id=1;
```

### DQL数据查询语言

#### 基本查询语法

```mysql
SELECT 分组函数，分组后的字段
FROM 表
【WHERE 筛选条件】
GROUP BY 分组的字段
【HAVING 分组后的筛选】
【ORDER BY 排序列表】
【LIMIT 分页子句】
```

#### SELECT 查询

```mysql
-- 查询指定字段
SELECT `name`,`pwd` FROM `student`;

-- 查询所有字段
SELECT * FROM `student`;

-- 查询不重复的记录
SELECT DISTINCT `address` FROM `student`;

-- 使用别名
SELECT `name` AS '姓名',`pwd` AS '密码' FROM `student`;

-- 计算列
SELECT `name`,`id`+1 AS '新ID' FROM `student`;
```

#### WHERE 条件查询

```mysql
-- 逻辑运算符: AND OR NOT
SELECT * FROM `student` WHERE `name`='zsr' AND `pwd`='200024';

-- 比较运算符: > < >= <= = <> !=
SELECT * FROM `student` WHERE id > 3;

-- BETWEEN AND (闭区间)
SELECT * FROM `student` WHERE id BETWEEN 2 AND 5;

-- IN 包含
SELECT * FROM `student` WHERE id IN (1,3,5);

-- IS NULL / IS NOT NULL
SELECT * FROM `student` WHERE `address` IS NULL;

-- LIKE 模糊查询
-- %: 任意多个字符
-- _: 单个任意字符
SELECT * FROM `student` WHERE `name` LIKE '张%';
SELECT * FROM `student` WHERE `name` LIKE '张_';
```

#### GROUP BY 分组

```mysql
-- 按字段分组
SELECT `sex`,COUNT(*) FROM `student` GROUP BY `sex`;

-- 多字段分组
SELECT `sex`,`address`,COUNT(*) FROM `student` GROUP BY `sex`,`address`;
```

#### HAVING 分组后筛选

```mysql
-- HAVING放在GROUP BY之后
SELECT `sex`,COUNT(*) AS `num` FROM `student` GROUP BY `sex` HAVING `num` > 2;
```

#### ORDER BY 排序

```mysql
-- ASC 升序(默认) | DESC 降序
SELECT * FROM `student` ORDER BY id DESC;

-- 多字段排序
SELECT * FROM `student` ORDER BY `sex` ASC, id DESC;
```

#### LIMIT 分页

```mysql
-- LIMIT 起始索引,每页条数 (索引从0开始)
-- 第一页
SELECT * FROM `student` LIMIT 0,5;

-- 第二页
SELECT * FROM `student` LIMIT 5,5;
```

#### 聚合函数

```mysql
SELECT COUNT(*) FROM `student`; -- 统计行数
SELECT SUM(`id`) FROM `student`; -- 求和
SELECT AVG(`id`) FROM `student`; -- 平均值
SELECT MAX(`id`) FROM `student`; -- 最大值
SELECT MIN(`id`) FROM `student`; -- 最小值
```

#### 多表连接查询

```mysql
-- 内连接(INNER JOIN) - 只返回匹配的行
SELECT s.name,s.address,c.classname
FROM `student` s
INNER JOIN `class` c ON s.classid = c.id;

-- 左连接(LEFT JOIN) - 返回左表所有行和右表匹配的行
SELECT s.name,s.address,c.classname
FROM `student` s
LEFT JOIN `class` c ON s.classid = c.id;

-- 右连接(RIGHT JOIN) - 返回右表所有行和左表匹配的行
SELECT s.name,s.address,c.classname
FROM `student` s
RIGHT JOIN `class` c ON s.classid = c.id;

-- 自连接 - 同一张表连接
SELECT a.name AS '员工',b.name AS '上级'
FROM `employee` a
INNER JOIN `employee` b ON a.managerid = b.id;
```

#### 子查询

```mysql
-- WHERE子句中的子查询
SELECT * FROM `student` WHERE id IN (
    SELECT studentid FROM `score` WHERE score > 80
);

-- FROM子句中的子查询
SELECT * FROM (
    SELECT * FROM `student` WHERE id > 2
) AS t WHERE t.name LIKE '张%';

-- SELECT子句中的子查询
SELECT `name`,(
    SELECT COUNT(*) FROM `score` WHERE studentid = `student`.id
) AS `course_count` FROM `student`;
```

#### UNION 联合查询

```mysql
-- UNION - 去除重复行
SELECT `name` FROM `student1`
UNION
SELECT `name` FROM `student2`;

-- UNION ALL - 保留所有行
SELECT `name` FROM `student1`
UNION ALL
SELECT `name` FROM `student2`;
```

### 常用函数

```mysql
-- 数学运算
SELECT ABS(-8); -- 绝对值
SELECT CEIL(5.1); -- 向上取整
SELECT CEILING(5.1); -- 向上取整
SELECT RAND(); -- 返回0~1之间的一个随机数
SELECT SIGN(-10); -- 返回一个数的符号;0返回0;正数返回1;负数返回-1

-- 字符串函数
SELECT CHAR_LENGTH('我喜欢你'); -- 字符串长度
SELECT CONCAT('我','喜欢','你'); -- 拼接字符串
SELECT INSERT('我喜欢',1,1,'超级') -- INSERT(str,pos,len,newstr) 从str的pos位置开始替换为长度为len的newstr
SELECT UPPER('zsr'); -- 转大写
SELECT LOWER('ZSR'); -- 转小写
SELECT INSTR('zsrs','s'); -- 返回第一次出现字串索引的位置
SELECT REPLACE('加油就能胜利','加油','坚持'); -- 替换出现的指定字符串
SELECT SUBSTR('坚持就是胜利',3,6); -- 返回指定的字符串(源字符串,截取位置,截取长度)
SELECT REVERSE('rsz'); -- 反转字符串

-- 时间日期函数
SELECT CURRENT_DATE(); -- 获取当前日期
SELECT CURDATE(); -- 获取当前日期
SELECT now(); -- 获取当前时间
SELECT LOCALTIME(); -- 本地时间
SELECT SYSDATE(); -- 系统时间

SELECT YEAR(NOW());
SELECT MONTH(NOW());
SELECT DAY(NOW());
SELECT HOUR(NOW());
SELECT MINUTE(NOW());
SELECT SECOND(NOW());

-- 系统信息
SELECT SYSTEM_USER();
SELECT USER();
SELECT VERSION();
```

### 删除数据库和表

```mysql
-- 删除数据库
DROP DATABASE IF EXISTS 数据库名;

-- 删除表
DROP TABLE IF EXISTS 表名;

-- 清空表数据(TRUNCATE)
TRUNCATE TABLE 表名;
```

### drop、delete 与 truncate

- `drop`(丢弃数据): `drop table 表名` ，直接将表都删除掉，在删除表的时候使用。
- `truncate` (清空数据) : `truncate table 表名` ，只删除表中的数据，再插入数据的时候自增长 id 又从 1 开始，在清空表中数据的时候使用。
- `delete`（删除数据） : `delete from 表名 where 列名=值`，删除某一行的数据，如果不加 `where` 子句和 `truncate table 表名`作用类似。

`truncate` 和不带 `where`子句的 `delete`、以及 `drop` 都会删除表内的数据，但是 **`truncate` 和 `delete` 只删除数据不删除表的结构(定义)，执行 `drop` 语句，此表的结构也会删除，也就是执行 `drop` 之后对应的表不复存在**

`truncate` 和 `drop` 属于 DDL(数据定义语言)语句，操作立即生效，原数据不放到 rollback segment 中，不能回滚，操作不触发 trigger。而 `delete` 语句是 DML (数据库操作语言)语句，这个操作会放到 rollback segment 中，事务提交之后才生效。

## 数据类型

### 数值类型

```mysql
-- 整型
TINYINT    -- 1字节，-128到127
SMALLINT   -- 2字节，-32768到32767
MEDIUMINT  -- 3字节
INT        -- 4字节
BIGINT     -- 8字节

-- 浮点型
FLOAT      -- 4字节
DOUBLE     -- 8字节

-- 定点型
DECIMAL(M,D) -- M总位数，D小数位数
```

### 字符串类型

```mysql
CHAR(M)      -- 固定长度字符串，M个字符
VARCHAR(M)   -- 可变长度字符串，最多M个字符
TEXT         -- 长文本数据
LONGTEXT     -- 超长文本数据
TINYBLOB     -- 不超过255个字符的二进制数据
BLOB         -- 二进制形式的长文本数据
```

### 日期时间类型

```mysql
DATE         -- YYYY-MM-DD，日期值
TIME         -- HH:MM:SS，时间值
DATETIME     -- YYYY-MM-DD HH:MM:SS，日期时间值
TIMESTAMP    -- YYYY-MM-DD HH:MM:SS，时间戳
YEAR         -- YYYY，年份值
```

## 约束

```mysql
-- 创建表时添加约束
CREATE TABLE `student`(
    `id` INT NOT NULL AUTO_INCREMENT,           -- NOT NULL 非空约束
    `name` VARCHAR(30) DEFAULT '匿名',          -- DEFAULT 默认约束
    `age` INT CHECK (age >= 0 AND age <= 120),  -- CHECK 检查约束(MySQL 8.0+)
    `email` VARCHAR(50) UNIQUE,                 -- UNIQUE 唯一约束
    `class_id` INT,                             -- 外键字段
    PRIMARY KEY (`id`),                         -- PRIMARY KEY 主键约束
    FOREIGN KEY (`class_id`) REFERENCES `class`(`id`) -- FOREIGN KEY 外键约束
)ENGINE=INNODB DEFAULT CHARSET=utf8;

-- 修改表时添加约束
ALTER TABLE `student` ADD CONSTRAINT `fk_class` FOREIGN KEY (`class_id`) REFERENCES `class`(`id`);
ALTER TABLE `student` ADD CONSTRAINT `uq_email` UNIQUE (`email`);
```

## 外键约束

```mysql
-- 创建表时定义外键
CREATE TABLE `score`(
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `course_id` INT,
    `score` DECIMAL(5,2),
    FOREIGN KEY (`student_id`) REFERENCES `student`(`id`),
    FOREIGN KEY (`course_id`) REFERENCES `course`(`id`)
);

-- 修改表添加外键
ALTER TABLE `score` ADD CONSTRAINT `fk_student`
FOREIGN KEY (`student_id`) REFERENCES `student`(`id`);

-- 删除外键
ALTER TABLE `score` DROP FOREIGN KEY `fk_student`;
```

## 表关系

一对多： 在多的一方建立外键指向单方

多对多：建立一张中间表，关联双方主键

一对一：在任意一方建立外键指向另一方，并设置 UNIQUE 约束

## 索引

### 索引的作用
- 提高查询速度
- 加速排序和分组

### 索引的缺点
- 占用存储空间
- 降低增删改的速度

```mysql
-- 创建索引
CREATE INDEX index_name ON table_name(column_name);

-- 唯一索引
CREATE UNIQUE INDEX index_name ON table_name(column_name);

-- 复合索引
CREATE INDEX index_name ON table_name(column1, column2);

-- 全文索引
CREATE FULLTEXT INDEX index_name ON table_name(column_name);

-- 删除索引
DROP INDEX index_name ON table_name;

-- 查看索引
SHOW INDEX FROM table_name;
```

## 视图

视图是虚拟表,内容由查询定义

```mysql
-- 创建视图
CREATE VIEW view_name AS
SELECT `name`, `address` FROM `student` WHERE id > 5;

-- 查看视图
SELECT * FROM view_name;

-- 修改视图
CREATE OR REPLACE VIEW view_name AS
SELECT * FROM `student`;

-- 删除视图
DROP VIEW view_name;
```

## 事务

事务是一组命令，一起向系统提交，同时成功，同时失败

### 事务的特性(ACID)
- **原子性(Atomicity)**: 事务是最小的工作单位,要么全做,要么全不做
- **一致性(Consistency)**: 事务执行前后,数据库的完整性约束没有被破坏
- **隔离性(Isolation)**: 多个事务并发执行时,一个事务的执行不应影响其他事务
- **持久性(Durability)**: 事务一旦提交,对数据库的修改是永久性的

```mysql
-- 开启事务
START TRANSACTION;
-- 或
BEGIN;

-- 执行SQL
UPDATE `account` SET balance = balance - 100 WHERE name = '张三';
UPDATE `account` SET balance = balance + 100 WHERE name = '李四';

-- 提交事务(成功)
COMMIT;

-- 回滚事务(失败)
ROLLBACK;

-- 设置事务隔离级别
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 查看事务隔离级别
SELECT @@TRANSACTION_ISOLATION;
```

### 事务隔离级别

1. **READ UNCOMMITTED**(读未提交): 可能读取到其他事务未提交的数据(脏读)
2. **READ COMMITTED**(读已提交): 只能读取已提交的数据,避免脏读
3. **REPEATABLE READ**(可重复读): MySQL默认级别,避免脏读、不可重复读
4. **SERIALIZABLE**(串行化): 最高隔离级别,强制事务串行执行

## 存储过程

```mysql
-- 创建存储过程
DELIMITER //
CREATE PROCEDURE proc_name(IN param1 INT, OUT param2 VARCHAR(50))
BEGIN
    -- SQL语句
    SELECT `name` INTO param2 FROM `student` WHERE id = param1;
END //
DELIMITER ;

-- 调用存储过程
CALL proc_name(1, @result);
SELECT @result;

-- 删除存储过程
DROP PROCEDURE IF EXISTS proc_name;
```

## 触发器

```mysql
-- 创建触发器
DELIMITER //
CREATE TRIGGER trigger_name
BEFORE INSERT ON `student`
FOR EACH ROW
BEGIN
    -- 触发器执行的SQL
    INSERT INTO `log` VALUES (NULL, '新增学生', NOW());
END //
DELIMITER ;

-- 查看触发器
SHOW TRIGGERS;

-- 删除触发器
DROP TRIGGER trigger_name;
```
