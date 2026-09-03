---
_synced: true
---
# Win11笔记本安装Debian13

我们平时用U盘装系统，本质是让电脑从U盘的“引导文件”启动，进而安装系统。无U盘安装的核心逻辑的是：**把系统镜像（ISO文件）里的引导文件，放到电脑硬盘的EFI分区（专门存引导文件的分区）里**，让电脑开机时能识别到这个引导，从而直接从硬盘启动安装程序，不用依赖U盘。

[选择合适的Linux发行版](https://distrochooser.de/)

## 前期准备

首先记得备份数据，这是第一要务，不多说。

### 准备1：下载系统镜像（ISO文件）

- Debian 13  [清华镜像源](https://mirrors.tuna.tsinghua.edu.cn/debian-cd/current/)  [官方源](https://www.debian.org/download.zh-cn.html)

### 准备2：关闭Windows的2个关键设置（必关，否则启动不了安装程序）

1. 关闭「快速启动」：

   1. 右键点击「此电脑」→ 选择「管理」→ 左侧找到「电源选项」→ 点击「选择电源按钮的功能」；
   2. 点击页面上方「更改当前不可用的设置」；
   3. 取消勾选「启用快速启动（推荐）」，然后点击「保存更改」即可。
2. 关闭「安全启动」（BIOS/UEFI中关闭，不同品牌笔记本操作略有差异）：

   1. 重启笔记本，开机时快速、连续按快捷键（F2、F10、Esc、Del等等，自行搜索）；可以多试几次开机时多按几次，总能进入
   2. 进入后，找到「Boot」或「启动」选项，找到「Secure Boot」（安全启动），设置为「Disabled」（关闭）；
   3. 找到「Save and Exit」（保存并退出），确认退出，电脑会自动重启（重启后先不继续，回到Windows做下一步）。
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E5%85%B3%E9%97%AD%E7%AC%94%E8%AE%B0%E6%9C%AC%E5%BF%AB%E9%80%9F%E5%90%AF%E5%8A%A8.webp)

## 使用Rufus制作U盘启动盘（推荐）

虽然现在很多电脑都可以无U盘重装系统，但强烈建议使用U盘，可以避免很多问题。
启动盘格式要求是FAT32

下载 Rufus 工具，[Rufus 官网](https://rufus.ie/zh/)
运行 Rufus，从「设备」下拉菜单中选择你的 U 盘，「选择」Debian ISO 文件。
使用 Rufus 创建 Debian 安装 U盘：选择格式为FAT32，保持其他默认设置不变，点击「开始」。Rufus 会识别出 Debain 的 ISO 为 ISOHybrid 镜像，这意味着它可以同时用于 DVD 和 U 盘，无需进行转换。

选择 Rufus 写入模式：选择「以 ISO 镜像模式写入」，然后点击「OK」。
Rufus 会提示将清除 U 盘上的所有数据。确认没有重要文件后，点击「确定」开始写入。
Rufus 会开始把 ISO 写入 U 盘，进度条会显示当前进度。
写入完成后，「状态」栏会显示「准备就绪」的绿色提示，点击「关闭」就可以用制作好的 U 盘去安装 Debian 系统了。

然后在开机时进入启动项选择界面，选择从U盘启动（USB Hard Disk，表述可能不同），进入安装界面。跳转到[安装教程](#安装教程)。
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E9%80%89%E6%8B%A9%E4%BB%8EU%E7%9B%98%E5%90%AF%E5%8A%A8.webp)

## 无U盘创建启动盘

如果你像我一样手边没有U盘，还想省一个U盘钱，可以参考下面的步骤，但不保证一定能行。
参考资料：[无U盘安装ubuntu，Debian等发行版 - 青雨染蓑衣的个人小站](https://minetest.top/archives/1709179374142)

#### 在硬盘上创建一个FAT32分区（用来放镜像文件和引导文件）

相当于在电脑硬盘上“开辟一块小空间”，模拟U盘的作用，用来存放系统安装所需的文件，大小建议8G以上（足够放任何一款Linux镜像）。

1. 右键点击「此电脑」→ 选择「管理」→ 左侧找到「磁盘管理」；
2. 找到一个剩余空间较多的磁盘（比如D盘、E盘），右键点击该磁盘 → 选择「压缩卷」；
3. 在「输入压缩空间量（MB）」中，输入「8192」（相当于8G，若想大一点，输入10240就是10G），然后点击「压缩」。记住这个分区的磁盘容量大小，不要与其他盘容量相同，后续要用；
4. 压缩完成后，会出现一块「未分配」的空间（黑色分区），右键点击这块未分配空间 → 选择「新建简单卷」；
5. 按向导下一步：分配驱动器号→ 文件系统选择「FAT32」→ 取消勾选「快速格式化」（彻底清除空间，避免残留文件干扰）→ 点击「完成」；
6. 完成后，电脑中会多出一个FAT32格式的分区，。

#### 复制镜像文件到FAT32分区

1. 找到之前下载好的系统镜像（ISO文件）
2. 右键点击这个ISO文件 → 选择「打开方式」→ 选择「Windows资源管理器」（相当于解压镜像，不用下载额外解压工具）；
3. 打开后，会看到镜像里的所有文件（比如casper、dists、EFI等文件夹）；
4. 全选这些文件（Ctrl+A）→ 复制（Ctrl+C）→ 打开之前创建的FAT32分区（比如E盘）→ 粘贴（Ctrl+V）；

#### 重启电脑，选择从FAT32分区启动

1. 开机时，快速、连续按「启动项选择快捷键」（F12、F8、ESC或者Delete等等），调出启动项选择界面；有可能与BIOS界面一致。总之有Boot选项。
2. 在启动项列表中，选择之前创建的FAT32分区（显示可能不同，比如显示「UEFI: 可移动磁盘 E:」，或显示分区盘符，或者显示HardDisk），选中启动方式启动或者将该启动方式；
3. 回车后，电脑会启动安装程序，稍等1-2分钟，就会进入Debian的安装界面

#### 安装时的关键修改

进入安装界面后，大部分步骤可以默认下一步，但会遇到一个「关键问题」：系统会提示「无法找到安装介质」（因为我们是从硬盘分区安装，不是U盘），这时候按下面的步骤操作，就能解决

1. 当出现「无法找到安装介质」或「探测安装介质失败」的提示时，选择「否」（取消探测）；
2. 此时会进入一个选择界面，找到并选择「运行shell」（相当于打开一个命令窗口，用来手动挂载分区）；
3. 进入shell界面后，屏幕上会显示命令行（类似黑底白字），先输入「ls」，按回车，会看到很多目录；
4. 再输入「cd /dev」，按回车（进入dev目录，这个目录里存放着电脑所有的硬盘分区）；
5. 输入「ls」，按回车，会看到很多类似「nvme0n1p3」或「sda1」的文件名（这些就是硬盘分区的名称）：

   1. 如果你的电脑是NVMe协议的固态硬盘（大部分新笔记本都是），分区名称会是「nvme0n1pX」（X是数字，比如nvme0n1p3、nvme0n1p4）；
   2. 如果是SATA协议的固态硬盘/机 械硬盘，分区名称会是「sdaX」（比如sda1、sda2）；
   3. 输入命令 `cat /proc/partitions`，按回车；按回车后，屏幕会显示所有硬盘和分区的信息，格式简单，重点看「major minor \#blocks name」这几列，核心盯「#blocks」（分区大小，单位是KB）和「name」（分区名称），根据分区大小找磁盘，比如 我之前压缩了20G用作启动盘，20G ≈ 20971520 KB ，找到对应的分区名称是 nvme0n1p7
6. 输入命令「mount nvme0n1p7 /cdrom」（注意：mount后面有空格，nvme0n1p7替换成你自己的分区名称），按回车；
7. 输入「ls /cdrom」，按回车，如果能看到和FAT32分区里一样的文件（比如dists文件夹），说明挂载成功；
8. 输入「exit」，按回车，退出shell界面，回到安装界面；
9. 此时再重新探测安装介质，就能正常识别，继续下一步安装即可。
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E6%89%BE%E5%88%B0%E5%AE%89%E8%A3%85%E4%BB%8B%E8%B4%A8%E6%89%80%E5%9C%A8%E7%A1%AC%E7%9B%98%E5%88%86%E5%8C%BA.webp)

![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E9%80%89%E6%8B%A9%E5%AE%89%E8%A3%85%E7%BB%84%E4%BB%B6.webp)

挂载成功后，安装就和正常用U盘安装一样了

## 安装过程

参考资料：[Debian 13 安装教程：桌面版和服务器，一步步图文指南 - 系统极客](https://www.sysgeek.cn/install-debian-13/)
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E5%AE%89%E8%A3%85%E7%A8%8B%E5%BA%8F%E4%B8%BB%E8%8F%9C%E5%8D%95.webp)

### 语言、地区

语言选择：选「中文（简体）」，地区/键盘布局：默认「中国」「汉语」，下一步；

### 网络配置

一般选择自动配置，连接家里的WiFi（或插网线），下一步；选择WIFI后需要选择加密方式，一般是WPA
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E7%BD%91%E7%BB%9C%E9%85%8D%E7%BD%AE.webp)

### 用户与密码

root密码至少8位，建议创建一个普通用户账户作为日常操作使用，只在需要权限时再临时提权。

### ⭐分区

1. 选择「手动分区」（视情况选择 「清除整个磁盘」，如果选择会删除Windows系统和所有数据，想装双系统就不要选）；
2. 找到之前我们压缩出来的「未分配空间」（不是FAT32分区，是最开始压缩的、除了8G之外的未分配空间，比如你原本压缩了100G，8G用来放镜像，剩下92G就是未分配空间）；
3. 选择「 **对空闲空间进行自动分区** 」，新手推荐选择「将所有文件放在同一个分区中」
4. 分区完成后，确认「安装引导器的设备」：选择你安装Linux的硬盘（比如/dev/sda），如果安装双系统就不要选Windows分区，否则会覆盖Windows引导；
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E9%80%89%E6%8B%A9%E5%88%86%E5%8C%BA%E5%90%91%E5%AF%BC.webp)



![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E9%80%89%E6%8B%A9%E5%88%86%E5%8C%BA%E6%96%B9%E6%A1%88.webp)

#### ⭐我遇到的分区错误

分区的最后一步可能遇到错误：
Partition(s), 7 on /dev/nvme0n1 have been written, but we have been unable to inform the kernel of the change, probably because it/they are in use. As a result, the old partition(s) will remain in use. You should reboot now before making further changes.
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E6%97%A0U%E7%9B%98%E5%AE%89%E8%A3%85%E7%A3%81%E7%9B%98%E5%88%86%E5%8C%BA%E9%94%99%E8%AF%AF.webp)

翻译：分区表已经 **写到磁盘上了** ，但 **内核没法立刻刷新分区信息** ，因为这个磁盘（或其中的分区） **正在被使用** 。所以现在系统内存里还在用“旧的分区表”。你应该 **重启** ，再继续后续操作。

**在这里我的错误做法是：回到安装主界面选择了中止安装，我前面选了清除磁盘，再选了这步就完蛋了，这UEFI启动方式丢失，Windows也无法恢复，只能用U盘重装系统了（哭。**

**复盘分区错误原因：安装器正在使用 /dev/nvme0n1 上的某个分区运行，同时又在修改 /dev/nvme0n1 的分区表，即“边用这块盘启动安装器，边改这块盘的分区表”。**

**GPT推荐做法：直接用电源键重启电脑，再 从 同一个 FAT32 分区 启动安装器，再进入分区步骤。**
![](https://hanphone.top/gh/HanphoneJan/public-pictures/debian%E5%AE%89%E8%A3%85/%E5%AE%8C%E6%88%90%E5%88%86%E5%8C%BA%E6%93%8D%E4%BD%9C.webp)

### 配置软件包管理器：更新源

安装向导会询问你是否扫描额外的安装介质，选择「否」继续。

然后进入配置软件包管理器：选择「是」，启用网络镜像。国家选择「中国」，Debian 仓库镜像站点推荐选择 `tsinghua`清华源。

如果你是直连网络，HTTP 代理信息就「留空」；如果有代理，就填写代理地址和端口号。

启用「软件包流行度调查」后，Debian 会定期收集你的软件使用数据。如果你不想参与，就选择「否」。

### 软件选择

Debian 是一款通用型 Linux 发行版，它不像 Ubuntu 那样，还单独区分桌面和服务器版本的 ISO 镜像。但你可以在「软件选择」时，来决定安装哪种类型：

* 勾选「Debian 桌面环境」，并至少选择一款桌面，就会安装桌面版。
* 如果不选「Debian 桌面环境」，那就是服务器版。

Linux桌面环境很多，可以自行搜索信息比较。我推荐选择GNOME或者KDE。

* **SSH server** ：安装 SSH 服务器，方便远程管理。Homelab 环境可以[启用 root 登录](https://www.sysgeek.cn/enable-ssh-on-debian/)。
* **标准系统工具** ：包括一些常用的基础工具包、命令行工具、网络工具和系统管理工具等。

**这两个必须安装。选择完毕后等待安装完成，这样就可以宣告成功了！**

### 安装 GRUB 启动引导器

选择「是」继续安装 GRUB 启动引导器。选择要安装 GRUB 的磁盘，比如 `/dev/sda`，然后点击「继续」。我安装时没有这一步，不影响。

## 软件安装

推荐资料：[Debian 初学者完全指南](https://www.debian.club/)

### 提升用户权限

debian系统中创建的普通用户是默认不加入sudoers，导致不能使用sudo命令，可以为普通用户提升权限。

参考资料：[解决 Linux 系统，出现“不在sudoers文件中，此事将被报告”的问题 - 知乎](https://zhuanlan.zhihu.com/p/143388819)

1、先切换至root用户，输入命令：`su root`，然后输入密码

2、查看 /etc/sudoers 文件权限，如果只读权限，修改为可写权限
输入查看文件命令：
`ls –l /etc/sudoers`

由此可看，该文件为只读权限
3、设置 /etc/sudoers 文件权限，添加 可写权限
输入修改权限命令：

`chmod u+w /etc/sudoers`

4、编辑/etc/sudoers文件，找到 Allow root to run any commands anywhere，在root ALL=(ALL) ALL 的下一行添加代码：`<username> ALL=(ALL) ALL`
使用VIM编辑
输入编辑文件命令："vim /etc/sudoers"
换行，找到 Allow root to run any commands anywhere ,按i键开始编辑，下面的指令会出现插入的字样。
在root ALL=(ALL) ALL 的下一行添加代码，如果要为用户hanphone添加权限，那就添加：`hanphone ALL=(ALL) ALL`

5、按 ESC 键退出插入模式，然后 键盘输入 :wq 关闭并保存

6、恢复 /etc/sudoers的权限为440
输入回复权限的命令：`chmod 440 /etc/sudoers`

7、查看/etc/sudoers的权限是否恢复
输入查看权限命名：`ll /etc/sudoers`

8、权限恢复正常，切换至普通用户
输入切换用户命令：`su <username>`

9、测试该用户的权限，我们可以使用命令 sudo useradd user3 来创建新用户

### Debian安装软件的三种方式

参考资料：[Debian Linux 安装软件的三种方法](https://www.zzxworld.com/posts/three-methods-to-install-software-on-debian-linux)

#### 使用 apt 命令

说到 apt 不得不提到 apt-get 命令。在一些介绍 Debian 命令的文章中，经常会发现有些用的是 apt-get，有些用的又是 apt。所以到底用哪个合适？

apt-get 命令最老，是最先出现在 Debian 系统中的软件安装命令。而 apt 则是改良版，据说是解决了 apt-get 命令的一些设计错误。答案是推荐使用 apt 命令。

使用 apt 命令安装软件非常便捷，主要分为两步：

使用 `sudo apt update` 命令更新软件库。
使用 `sudo apt install `  命令完成指定软件的安装。
比如想安装 nginx 这个 Web 服务软件，就只需要执行 sudo apt install nginx 命令即可。

由此可见，使用 apt 命令安装软件只需一个必要条件：软件的名称。这通常可以用搜索引擎来解决，或者是通过 apt search 搜索关键词 命令以关键词的方式在软件库中查找。

最后不得不提的是，apt 命令在软件下载环节非常依赖于软件包数据源所在的位置。默认这个位置在国外，所以下载速度会很慢。解决这个问题的方法是使用国内的镜像源。

#### 使用 deb 安装包

在碰到无法使用 apt 命令安装的软件时，deb 安装包就成了另外一个选择。deb 是 Debian 系统专用的软件安装包格式，从形式上说，有点类似于 Windows 下的 exe 安装文件。一些还没能收录到 apt 库中的软件，通常会以 deb 这种安装包的格式来解决安装问题。这也意味着使用 deb 安装需要自己注意一些可能存在的安全风险。

对于一些比较成熟的软件，比如 Docker，可以到官网直接下载 deb 格式的安装包。另外也可以在 Launchpad: 这个最大的 Debian 软件包仓库中搜索并下载。

下载好的 deb 软件包使用 dpkg 命令安装:

`sudo dpkg -i NAME.deb`
上面命令中的 NAME.deb 就是要安装的软件包文件路径。命令执行无任何异常则表示软件安装成功。如果出现一些依赖问题，可以尝试通过以下命令来解决：

`sudo dpkg install -f`

#### 源码编译

通过 apt 和 deb 软件包的方式大概能解决使用 Debian 系统时 90% 的软件安装问题，接下来的 10% 往往就只能靠源码编译的方式来解决了。这也是使用 Linux 安装软件的终极方案。

使用这个方法有一个前提，即软件必须是开源的。这样才能获取到程序源码。有了源码后，还需要在 Debian 系统上准备好源码编译环境，这个通过一条命令就可以解决：

`sudo apt install build-essential`
接下来就只需要使用 configure 来完成编译配置并通过 make 命令来完成编译就好了。整体过程并不复杂，比较麻烦的是需要自己通过编译时的错误信息来解决各种依赖问题。

### GNOME配置

我用的是GNOME桌面环境，需要安装一些插件来美化桌面、增加功能。

参考资料：[Bilibili：Linux Gnome 桌面美化，Gnome 扩展、常用软件推荐](https://www.bilibili.com/opus/1062760133795250179?spm_id_from=333.1391.0.0)

扩展管理：https://extensions.gnome.org/

推荐扩展：**Dash To Dock**、**Caffeine**、**Clipboard Indicator**、**Vitals**、**Input Method Panel**
