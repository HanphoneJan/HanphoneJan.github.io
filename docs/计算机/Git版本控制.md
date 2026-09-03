---
_synced: true
---
# Git

Git是重要的版本控制和资源管理工具，是团队协作开发的重要工具，我个人用来同步文档和个人项目也很好用，可以当作一个云盘。

## Git版本管理模式

![Git推送.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/git%E6%8E%A8%E9%80%81%E6%9C%BA%E5%88%B6.webp)

Git使用过程中一般会涉及到**工作区、暂存区、本地仓库、远程仓库四个部分**。远程仓库一般位于云端（服务器），比如Github、Gitee、阿里云等都可以是Git的远程仓库。各个部分之间的操作正如上图所示，常用的就是add、commit、push、fetch、pull。

## 仓库结构

Git管理下的代码仓库实际上由以下三个部分组成。

- 工作目录 （ working directory ）：操作系统上的文件，所有代码开发编辑都在这上面完成。
- 索引（ index or staging area ）：可以理解为一个暂存区域，这里面的代码会在下一次 commit 被提交到 Git 仓库。
- Git 仓库（ git repository ）：由 Git object 记录着每一次提交的快照，以及链式结构记录的提交变更历史。
  git本身的管理文件在仓库中.git隐藏文件夹中，删除该文件则代表删除了git仓库。
  ![git结构.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/git%E7%BB%93%E6%9E%84.webp)

### 增量存储

Git 采用**内容哈希存储**和**差异计算**相结合的方式：

1. **对象存储**：所有文件内容（blob）、目录结构（tree）和提交记录（commit）都通过 SHA-1 哈希值唯一标识
2. **增量存储**：
   - 首次提交时存储完整文件内容
   - 修改后仅存储文件差异（delta），通过引用原始版本和差异生成新版本
3. **自动去重**：相同内容的文件只存储一次，节省空间

## Commit原理

一般运行 `git commit -m 'message'`提交本地仓库修改推送到远程仓库，原理如下。

1. Git 首先根据当前的索引生产一个tree object，充当新提交的一个快照。
2. 创建一个新的commit object，将这次 commit 的信息储存起来，并且 parent 指向上一个 commit，组成一条链记录变更历史。
3. 将 master 分支的指针移到新的 commit 结点。
   commit中的message是很重要的，用于告知仓库协作者新推送的文件有何变动。

## .gitignore

.gitignore 文件是一个纯文本文件，包含了项目中所有指定的文件和文件夹的列表，这些文件和文件夹是 Git 应该忽略和不追踪的。

#### 文件的状态

在任何当前工作的 Git 仓库中，每个文件都有三种状态：
1、追踪的（tracked）- 这些是 Git 所知道的所有文件或目录。这些是新添加（用 git add 添加）和提交（用 git commit 提交）到主仓库的文件和目录。
2、未被追踪的（untracked） - 这些是在工作目录中创建的，但还没有被暂存（或用 git add 命令添加）的任何新文件或目录。
3、被忽略的（ignored） - 这些是 Git 知道的要全部排除、忽略或在 Git 仓库中不需要注意的所有文件或目录。本质上，这是一种告诉 Git 哪些未被追踪的文件应该保持不被追踪并且永远不会被提交的方法。
所有被忽略的文件都会被保存在一个 .gitignore 文件中。

#### 在 .gitignore 文件中应包括什么

添加到 .gitignore 文件中的文件类型是任何不需要被提交的文件。
其中一些可能包括：

1. 操作系统文件。每个操作系统（如 macOS、Windows 和 Linux）都会生成系统特定的隐藏文件，其他开发者不需要使用这些文件，因为他们的系统也会生成这些文件。例如，在 macOS 上，Finder 会生成一个 .DS_Store 文件，其中包括用户对文件夹的外观和显示的偏好，如图标的大小和位置。
2. 由代码编辑器和 IDE（IDE 代表集成开发环境）等应用程序生成的配置文件。
3. 从项目中使用的编程语言或框架自动生成的文件，以及编译后的代码特定文件，如 .o 文件。
4. 由软件包管理器生成的文件夹，如 npm 的 node_modules 文件夹。
5. 包含敏感数据和个人信息的文件，如 .env 文件（.env 文件含有需要保持安全和隐私的 API 密钥）。
6. 运行时文件，如 .log 文件。它们提供关于操作系统的使用活动和错误的信息，以及在操作系统中发生的事件的历史

#### .gitignore语法

```gitignore
# 注释（以#开头，不生效）
# 忽略指定文件
file.txt               # 忽略根目录下的file.txt
/path/to/file.txt      # 精确忽略指定路径的文件

# 忽略指定目录
dir/                   # 忽略根目录下的dir目录（末尾/表示目录）
/path/to/dir/          # 精确忽略指定路径的目录

# 通配符匹配
*.log                  # 忽略所有.log后缀的文件

# 匹配多级目录
**/node_modules/       # 忽略所有目录下的node_modules（包括子目录）
src/**/*.js            # 忽略src目录及其子目录下的所有.js文件

# 否定规则（不忽略指定内容）
!src/main.js           # 不忽略src/main.js（即使已用src/**/*.js忽略）
```

## 日常使用

### GithubDesktop

一般我用Github作为Git的远程仓库，经常连不上，建议挂梯子，是成功率最高的方法，其他的方法诸如使用瓦特加速器、手动添加IP解析等等，都不够稳定。
这里推荐是使用GithubDesktop，图形化界面做的是真好，比Git GUI好多了，功能很方便，界面很好看，而且连上Github的成功率在我的使用体验中明显高于直接用终端（原因未知），非常推荐使用。

### 常用命令

可以在系统终端或者Git Bash中输入命令操作Git仓库。

```bash


# 查看工作区和暂存区状态（显示修改、新增、删除的文件）
git status

# 将指定文件添加到暂存区（. 表示所有修改文件）
git add .           # 添加所有修改

# 关联远程仓库
git remote add origin xxx/xxx.git # 不需要引号

# 提交暂存区内容到本地仓库（-m 后跟提交说明
# 直接使用git commit比较麻烦，一般用以下这条
git commit -m "feat: 新增用户登录功能"

# 拉取远程仓库最新代码并合并到当前分支（同步远程更新）
git pull

# 将本地提交推送到远程仓库（首次推送新分支需加 -u 关联）
git push
git push --set-upstream origin master # 追踪分支关系
git push --force #强制推送

# 查看本地所有分支（当前分支前有 * 标记）
git branch
# 查看远程分支
git branch -r
git branch -M main  # 修改当前分支名为main

# 切换到指定分支（Git 2.23+ 推荐用 switch，更直观）
git switch <分支名>  # 例如: git switch main
# 旧版本用法
git checkout <分支名>

# 将指定分支合并到当前分支（如合并功能分支到主分支）
git merge <分支名>  # 例如: git merge feature/payment

# 查看提交历史记录（--oneline 简化输出，--graph 显示分支图）
git log

git rm -r --cached .idea

# 全局设置
git config --list
git config --global user.name "<username>"
git config --global user.email "<email>"
git config --global credential.helper 'cache --timeout=0'  # 设置凭据缓存时间（单位：秒，0 表示永不过期，3600 表示 1 小时）

# 目前 GitHub、GitLab 等平台已禁用密码直接登录，需要使用 个人访问令牌（Personal Access Token，PAT）
```

#### 清除已经提交中的敏感文件

**核心原理就是删除相关文件的历史，然后强制推送。如果需要删除的过多，可以重新初始化然后强制推送。**

1. 删除本地 `.env` 文件并提交更改到本地
2. 在项目根目录的 `.gitignore` 文件中添加 `.env`，防止未来该文件被再次跟踪。
3. 从 git 历史记录中清除 `.env` 文件
   若远程仓库已存在包含 `.env` 的提交，需彻底从历史中移除（使用 `git filter-branch`）：

```bash
git filter-branch --force \
  --index-filter "git rm --cached --ignore-unmatch .env" \
  --prune-empty \          # 删除因移除文件而空的提交
  --tag-name-filter cat \  # 保留标签名不变
  -- --all                 # 作用于所有分支
# 是一行命令
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all
```

4. 推送更改到远程仓库
   强制推送改写后的历史到远程（**注意：此操作会重写远程历史**）

```bash
git push origin --force --all
```

5. 通知团队成员
   历史强制重写会影响所有克隆仓库的开发者，需通知团队成员重新克隆仓库或重置到新历史记录。

### 删除所有历史

以main分支为例子，过程为：创建孤儿分支→添加文件→提交→删除原分支→重命名→强制推送

```bash
git checkout --orphan temp_branch && git add -A && git commit -m "Initial commit" && git branch -D main && git branch -m main && git push -f origin main
```

### 添加远程仓库

要将本地代码库连接到远程仓库，可以使用以下 git 命令：
首先，将本地代码库初始化为 Git 仓库（如果尚未完成）：`git init`
添加远程仓库的 URL，其中 `<remote-name>`是自定义名称，`<remote-url>`是远程仓库的 URL：

```bash
git remote add <remote-name> <remote-url>
```

可以使用以下命令确认远程仓库是否已成功添加：

```bash
git remote -v
```

此后，就可以使用 git push 命令将代码推送到远程仓库，或使用 git pull 命令从远程仓库拉取代码。

### Git 配置 SSH 秘钥

1. 在 Git Bash 窗口中输入以下命令进行全局配置

```bash
git config --global user.name "你的Git账号"
git config --global user.email "你的Git邮箱"
ssh-keygen -t rsa -C "你的Git邮箱"
```

输入以下指令测试

```bash
ssh -T git@github.com
```

### 解决代码冲突

本地代码和远程代码可能出现冲突的情况，这时候需要打开两个冲突的文件，在编辑器中进行逐行对比，然后确定保留的版本，**合并一般指保留本地修改，覆盖则是不保留本地**。

## Github玩法

[GitHub中文社区](https://www.github-zh.com/)

### 维护个人主页

建立和用户名同名的仓库，该仓库的README.md会显示在个人主页。比如：
https://github.com/HanphoneJan/

### GithubPage文档

创建一个新的仓库，仓库名设置为如下格式：`<username>.github.io`
可以在仓库设置中选择Change Theme，选择自己喜欢的主题。在Pages选择分支才能正确显示，一般单独开一个分支用来显示网页。
每个账户最多一页网站，每个仓库最多一页网站

```plaintext
http(s)://<owner>.github.io
http(s)://<owner>.github.io/<repositoryname>
```

[HanphoneJan.github.io |寒枫](https://hanphonejan.github.io/)

### 如何在Github上维护公开项目

每个开发者拥有自己仓库的写权限和其他所有人仓库的读权限。这种情形下通常会有个代表“官方”项目的权威的仓库。
要为这个项目做贡献，你需要从该项目克隆出一个自己的公开仓库，然后将自己的修改推送上去到某个分支。接着你可以请求官方仓库的维护者拉取更新合并到主项目。
维护者可以将你的仓库作为远程仓库添加进来，在本地测试你的变更，将其合并入他们的分支并推送回官方仓库。
[三分钟让你也拥有一个很酷炫的GitHub展示页面(保姆级教程)-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1866501)

### 下载 Github 仓库的某个文件夹

Github不提供直接下载某个文件夹的功能，但是有这里一个非常好用的工具，推荐：[GtiHub 仓库文件夹下载 | DownGit](https://tool.mkblog.cn/downgit/#/home)

# SVN

Subversion，集中式版本控制系统，许多 2010 年前的开源项目（如早期 Apache 项目）仅支持 SVN 托管，SVN 支持显式文件锁定（`svn lock`），**适合二进制文件协作**（如 PSD/AI 设计稿），

## Git与SVN对比

| 对比维度           | Git                                                               | SVN                                                           |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| **版本模型** | 分布式版本控制（Distributed VCS），每个开发者本地有完整代码库副本 | 集中式版本控制（Centralized VCS），依赖中央服务器存储完整版本 |
| **工作流程** | 本地提交 → 分支协作 → 远程同步                                  | 中央服务器 → 本地修改 → 提交到中央服务器                    |
| **离线操作** | 完全支持，本地可提交、查看历史、创建分支                          | 仅支持本地修改，提交 / 查看历史需联网                         |

1. **分支创建与管理**

- Git：分支创建为轻量级操作（仅创建指针），耗时毫秒级，支持并行开发多特性分支（如 `feature/login` `fix/bug123`）
- SVN：分支为文件复制操作，需占用大量存储空间，分支管理成本高

2. **协作模式**

- Git：支持分布式协作，开发者可从任意远程仓库拉取代码，通过 `pull request`机制审核合并
- SVN：所有变更需提交到中央服务器，协作依赖单一代码库，冲突解决更复杂

Git的主要缺点在于：1. **大文件存储**： 普通 Git 对大文件不友好（每次修改需存储完整差异），推荐使用 Git LFS（Large File Storage）将大文件单独管理 2. **二进制文件**：对二进制文件控制精度低。

## 版本控制

![SVN版本管理.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/SVN%E7%89%88%E6%9C%AC%E6%8E%A7%E5%88%B6.webp)

![SVN开发者与服务器提交获取.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/learn/SVN%E6%9C%BA%E5%88%B6.webp)

# DAM

Digital Assets Management，即数字资产管理。帮助企业高效管理海量数字资产，提升内容复用率、协作效率和品牌一致性。
数字资产是 DAM 流程的一个关键组件。 它是归企业或个人所有的有价值的任何文件类型，采用数字格式，可以通过元数据进行搜索，包括访问权限和使用权限。 数字资产种类很多，包括但不限于：文件，图像，音频，视频，动画，媒体文件，图形，PPT 演示文稿，PDF 文档，Office 文档，任何包含使用权限的数字媒体
