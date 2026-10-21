---
_synced: true
---
## 一、Shell 概述

Shell 是 UNIX/Linux 系统的命令解释器，也是一门功能强大的脚本编程语言，作为用户与操作系统内核之间的交互桥梁。

- **命令解释器**：解析用户输入的操作系统命令，调用内核执行并返回结果。
- **编程语言**：支持变量、函数、条件判断、循环等语法，可兼容引用所有系统命令和可执行程序。

系统依据 `/etc/passwd` 文件中的配置参数，为登录用户启动指定类型的 Shell 进程，专门负责解释执行该用户输入的所有命令。

## 二、输入输出重定向与管道

### 2.1 标准文件描述符

Shell 默认打开三个标准文件，每个文件对应唯一文件描述符（fd）：

- 标准输入（stdin）：对应键盘，fd=0
- 标准输出（stdout）：对应屏幕，fd=1
- 标准错误输出（stderr）：对应屏幕，fd=2

### 2.2 标准输出重定向

将命令输出结果写入文件，而非默认屏幕，分两种方式：

- `command > filename`：覆盖写入，若文件存在则清空原有内容。
- `command >> filename`：追加写入，在文件末尾添加内容，不覆盖原有数据。

示例：

- `cat myfile > newfile`：将 myfile 内容拷贝到 newfile（覆盖模式）。
- `cat myfile >> newfile`：将 myfile 内容追加到 newfile 末尾。

### 2.3 标准输入重定向

让命令从文件读取输入，而非默认键盘，语法：`command < filename`。

示例：`cat < file1`：读取 file1 内容并输出到屏幕，效果等同于 `cat file1`。

### 2.4 标准错误输出重定向

单独捕获命令执行的错误信息，语法：`command 2> filename`（2 代表 stderr 描述符）。

示例：`cat file1 file2 > file3 2> errfile`

- 命令正常执行：file1 和 file2 内容合并写入 file3。
- 命令执行出错：错误信息写入 errfile，不影响标准输出。

### 2.5 管道重定向

将前一个命令的标准输出作为后一个命令的标准输入，语法：`command1 | command2`，实现命令串联执行。

示例：`ps e | grep student2`：查询所有进程，过滤出包含 student2 的进程信息。

### 2.6 重定向组合示例

| 命令                | 输入来源 | 输出目标 | 效果                                              |
| ------------------- | -------- | -------- | ------------------------------------------------- |
| cat                 | 键盘     | 屏幕     | 将键盘输入内容实时显示在屏幕                      |
| cat file1 > file2   | file1    | file2    | 将 file1 内容覆盖写入 file2                       |
| cat < file1 > file2 | file1    | file2    | 将 file1 内容覆盖写入 file2（输入输出双重重定向） |

## 三、Shell 命令形式

Shell 支持单条、多条、复合及后台命令，满足不同执行场景：

- **单条命令**：独立执行单个命令，示例：`cat file1`。
- **多条命令**：用分号（;）分隔，依次执行，示例：`pwd ; who ; date`。
- **复合命令**：结合管道、重定向等，示例：`ps e | grep student2`。
- **后台命令**：用 & 结尾，命令在后台运行，不阻塞终端，示例：`ls -lR > file_list `&。

后台命令输出说明：`[1] 7981` 中，[1] 是作业编号，7981 是进程 ID（PID），可通过 `kill 7981` 终止该进程。

## 四、Shell 变量与引用符

### 4.1 变量分类

按作用域和来源，Shell 变量分为环境变量和局部变量。

#### 4.1.1 环境变量

系统预定义或用户配置的全局变量，作用于当前 Shell 及所有子 Shell。

- **配置文件**：系统级环境变量存于 `/etc/profile`，用户级存于主目录 `.profile`；Shell 启动时先加载 `/etc/profile`，再加载用户 `.profile`。
- **常用环境变量**：

```shell

HOME=/usr/computer/student6  # 用户主目录，登录初始目录
PATH=/bin:/usr/bin:$HOME/bin:./  # 命令搜索路径，按顺序查找可执行文件
SHELL=/bin/sh  # 用户默认 Shell 路径
TERM=vt100  # 终端类型
PS1=$  # Shell 主提示符（普通用户默认 $，root 用户为 #）
IFS  # 域分隔符，默认空白符，用于拆分命令行参数
```

#### 4.1.2 局部变量

用户自定义的变量，仅作用于当前 Shell，子 Shell 不可见，语法：`变量名=值`（等号两侧无空格）。

示例：

```shell

AA=123  # 定义局部变量 AA
echo $AA  # 引用变量，输出 123
```

### 4.2 系统变量（特殊环境变量）

Shell 内置的只读变量，用于获取命令行参数、进程信息等，仅可引用不可修改：

```shell

$0    # 当前 Shell 程序名或脚本名
$1~$9 # 命令行第 1 至第 9 个参数
$#    # 命令行参数总个数
$*    # 所有命令行参数，视为一个整体
$@    # 所有命令行参数，每个参数独立用双引号包裹
$$    # 当前进程 PID
$?    # 上一条命令退出状态（0 成功，非 0 失败）
$!    # 最后一个后台进程 PID
```

示例：`echo $?` 可查看上一条命令是否执行成功，非 0 时可结合错误重定向排查问题。

### 4.3 引用符用法

Shell 支持单引号、双引号、反撇号和花括号，用于处理变量替换、字符串界定等场景：

- **单引号（'）**：强引用，禁止变量替换和元字符（$、*等）解析，仅保留字符本身。示例：`b='The value of a is $a'`，echo $b 输出原字符串，不替换 $a。
- **双引号（"）**：弱引用，允许变量替换，保留空格和换行，元字符仅 $、`、\ 可解析。示例：`a="he is a student"`，echo "She said: $a" 输出替换后内容。
- **反撇号（`）**：命令替换，将括号内命令执行结果赋值给变量，等价于 $(命令)。示例：`b=`date``，echo $b 输出当前系统时间。
- **花括号（{}）**：区分变量名与后续字符串，避免变量名歧义。示例：`c="There is a teach"`，echo "${c}er" 输出 "There is a teacher"。

### 4.4 变量导出命令 export

将当前 Shell 变量导出为环境变量，使其作用于子 Shell，语法：`export 变量名`（变量名前不加 $）。

- 未导出的变量仅在当前 Shell 有效，子 Shell 无法访问。
- 子 Shell 中修改导出变量，仅影响子 Shell 本身，不改变父 Shell 变量值。
- 示例：`PATH=$PATH:./; export PATH`，将当前目录添加到命令搜索路径并导出。

### 4.5 echo 命令

在标准输出打印字符串或变量值，字符串含空格/控制字符时需用引号包裹。

```shell

echo "department computer"  # 输出字符串
echo "My home is: $HOME"    # 输出变量值，结果为 My home is: /usr/david
```

## 五、Shell 内部命令

内置命令集成于 Shell 内部，非独立可执行文件，执行效率高，常用如下：

- `cd`：改变当前工作目录，示例：`cd /home`。
- `pwd`：显示当前工作目录绝对路径。
- `time`：统计后续命令执行耗时，输出真实时间、用户时间、系统时间。
- `read`：从标准输入读取一行内容，赋值给变量（详见下文脚本语句）。

## 六、进程监控

进程是可运行程序在内存中的一次运行实例，Shell 提供多种命令管理进程。

### 6.1 查看进程：ps 命令

常用选项：

- `-e/-a`：显示系统所有活动进程。
- `-f`：显示进程完整信息（UID、PID、PPID 等）。

示例输出与字段说明：

```shell

UID   PID    PPID    C    STIME      TTY    TIME     COMMAND
liu   298    1       0    14:57:02    02      0:02      sh
liu   395    298     16   16:31:19    02      0:00      ps -f
```

- UID：进程所有者用户标识；PID：进程ID；PPID：父进程ID。
- C：CPU 占用率；STIME：进程启动时间；TTY：启动进程的终端。

### 6.2 暂停进程：sleep 命令

使当前进程暂停指定秒数，语法：`sleep 秒数`，示例：`sleep 5`（暂停 5 秒）。

### 6.3 终止进程：kill 命令

通过 PID 终止进程，支持不同信号（默认发送 TERM 信号）：

- `kill PID`：正常终止进程，完成善后工作（类似 Del 键）。
- `kill -1 PID`：挂起进程，终止子进程，完成善后再终止主进程。
- `kill -9 PID`：强制终止进程，不做善后工作，可能产生孤儿进程或资源泄露。

进程终止场景：正常运行完成、用户按 Ctrl+C/Del 中断、kill 命令强制终止。

## 七、Shell 编程

### 7.1 脚本文件基础

Shell 脚本以 `.sh` 为后缀，是包含多条 Shell 命令的文本文件，执行需三步：

1. 创建脚本文件：写入命令和语法，首行需指定解释器 `#!/bin/sh`（指定用 sh 解释）。
2. 赋予执行权限：`chmod +x 脚本名.sh`（初始文本文件无执行权限）。
3. 执行脚本：指定路径（`./脚本名.sh`）或添加到 PATH 后直接输入脚本名。

### 7.2 脚本语句分类

Shell 脚本语句包括三类，共同构成完整逻辑：

- **说明性语句（注释）**：以 # 开头，至行尾结束，不被执行，用于标注逻辑。
- **功能性语句**：系统命令、内部命令、自编程序等可执行指令。
- **结构性语句**：条件判断、分支、循环、控制语句，控制脚本执行流程。

### 7.3 常用功能性语句

- **read 语句**：从标准输入读取一行，赋值给变量，支持多变量赋值。

  - 变量数 < 输入参数数：剩余参数赋值给最后一个变量。
  - 变量数 > 输入参数数：多余变量赋值为空。
  - 示例：`read name age; echo "Name: $name, Age: $age"`。
- **expr 语句**：执行简单整数运算（加+、减-、乘\*、整除/、求模%），运算符两侧需空格。

  - 示例：`expr 12 + 5 \* 3`，输出 27（先乘后加）。
- **tput 语句**：设置终端模式或控制光标，常用选项：

| 选项  | 功能     | 选项      | 功能               |
| ----- | -------- | --------- | ------------------ |
| clear | 清屏     | cup r c   | 光标移至 r 行 c 列 |
| bold  | 粗体显示 | smul/rmul | 启动/结束下划线    |
| bel   | 终端响铃 | sgr0      | 关闭所有终端属性   |

### 7.4 结构性语句

#### 7.4.1 条件语句（if…then…else…fi）

根据表达式结果执行不同命令块，else 可选，表达式常用 test 语句或 [] 包裹。

```shell

if [ -d $1 ]; then  # 测试 $1 是否为目录（[] 两侧需空格）
  echo "$1 is a directory"
  exit  # 退出脚本
elif [ -f $1 ]; then  # 测试 $1 是否为普通文件
  echo "$1 is a common file"
else
  echo "unknown file type"
fi
```

#### 7.4.2 测试语句（test）

测试字符串、整数、文件属性，条件成立返回 0（真），否则返回非 0（假），语法：`test 表达式` 或 `[ 表达式 ]`。

- 字符串测试：`test "$a" = "$b"`（判断 a 与 b 相等）。
- 整数测试：`test $num -eq 18`（判断 num 等于 18，-eq 等价于 ==）。
- 文件测试：`test -d tmp`（判断 tmp 为目录）、`test -f file1`（判断 file1 为普通文件）。

#### 7.4.3 多路分支语句（case…esac）

根据字符串变量匹配模式，执行对应命令块，模式支持通配符，每个分支以 ;; 结束。

```shell

case $answer in
  [Yy]*)  # 匹配以 Y/y 开头的字符串
    echo "Correct"
    ;;
  [Nn]*)  # 匹配以 N/n 开头的字符串
    echo "Incorrect"
    ;;
  *)  # 匹配所有其他情况
    echo "Invalid input"
    ;;
esac
```

#### 7.4.4 循环语句

- **for 循环**：适合循环次数已知场景，遍历单词表执行命令块。
  `for file in `ls `; do  # 遍历当前目录所有文件 cp $file $HOME/backup  # 拷贝文件到备份目录 echo "$file copied" done`
- **while 循环**：条件为真时重复执行，适合循环次数未知场景。`count=1 while [ $count -le 5 ]; do  # 计数小于等于 5 时循环 echo "Count: $count" count=$(expr $count + 1) done`
- **until 循环**：条件为假时重复执行，与 while 逻辑相反。
- **循环控制**：`break` 跳出当前循环，`continue` 跳过本次循环进入下一次。

## 八、Shell 函数

### 8.1 函数定义与调用

Shell 函数类似其他语言函数，用于封装可复用逻辑，仅在当前 Shell 有效，无法导出到子 Shell。

```shell

# 定义函数
function_name() {
  command1  # 函数体命令
  command2
  return 0  # 可选返回值（0 成功，非 0 失败）
}

# 调用函数
function_name arg1 arg2  # 传递参数，通过 $1~$n 接收
value=$(function_name arg1)  # 捕获函数输出结果
```

### 8.2 函数示例

查找指定用户是否在线的函数：

```shell

check_user() {
  user=`who | grep $1`  # 查找用户登录信息
  if [ -n "$user" ]; then
    return 0  # 找到用户，返回成功
  else
    return 1  # 未找到用户，返回失败
  fi
}

# 调用函数
read -p "Input username: " uname
check_user $uname
if [ $? -eq 0 ]; then  # $? 获取函数返回值
  echo "user $uname online"
else
  echo "user $uname offline"
fi
```

## 九、Shell 编程实例

### 实例 1：为文件添加行号（numberit.sh）

```shell

#!/bin/sh
# 功能：为文件所有行添加行号，覆盖原文件
if [ $# -ne 1 ]; then  # 检查参数个数是否为 1
  echo "Usage: $0 filename " >&2  # 错误信息写入 stderr
  exit 1
fi

count=1
cat $1 | while read line; do
  [ $count -eq 1 ] && echo "Processing file $1..." > /dev/tty  # 终端提示
  echo "$count $line"
  count=$(expr $count + 1)  # 修正原语法错误，用 $(expr) 替代 `expr`
done > tmp$$  # 输出到临时文件（PID 确保唯一性）
mv tmp$$ $1  # 临时文件覆盖原文件
```

### 实例 2：拼写检查与修正（speller.sh）

```shell

#!/bin/sh
# 功能：检查文件单词拼写，允许用户修正并生成新文件
> file.new  # 清空或创建新文件

while read line; do
  echo $line  # 显示当前行
  read -p "Is this word correct? [Y/N] " answer < /dev/tty  # 从终端读输入
  case "$answer" in
    [Yy]*)
      echo $line >> file.new  # 正确则写入新文件
      ;;
    *)
      read -p "What is the correct spelling? " word < /dev/tty
      echo $word >> file.new  # 写入修正后的内容
      echo "$line has been changed to $word."
      ;;
  esac
done < file.old  # 从原文件读取内容
```

