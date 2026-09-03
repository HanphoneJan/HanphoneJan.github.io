---
_synced: true
---
# Linux 系统操作 - 寒枫

## 系统基础

### 虚拟机设置

#### VMware 优化
[bilibili.com/video/BV1TN411X7Jb/?spm_id_from=333.1007.top_right_bar_window_custom_collection.content.click](https://www.bilibili.com/video/BV1TN411X7Jb/?spm_id_from=333.1007.top_right_bar_window_custom_collection.content.click)

删除不必要的硬件
- 编辑 -> 首选项 -> 内存 -> 不交换虚拟机内存
- 编辑 -> 首选项 -> 优先级 高
- 首选项 -> 设备 -> 关闭禁用自动运行
- 虚拟机设置 -> 高级 -> 禁用侧通道
- 关闭自动更新、发送信息等等

#### VMware Tools 安装
手工安装 VMware tools 方法：

```bash
sudo apt-get install open-vm-tools
sudo apt-get install open-vm-tools-desktop
sudo reboot
```

确保虚拟机设置中 --> 客户机隔离 --> 启用拖放和复制粘贴

一般会默认启用复制粘贴

#### 侧通道缓解
[虚拟机启动时出现"已启用侧通道缓解"的解决方法-CSDN博客](https://blog.csdn.net/m0_56006701/article/details/130772861)

### 系统配置

#### 分辨率调整
1. **打开设置**： 点击屏幕左上角的 Ubuntu 图标，选择"设置"。 或者，点击屏幕右上角的系统菜单图标，选择"Settings"。

2. **选择显示设置**： 在设置窗口中，点击"设备"选项，然后选择"显示器"。 或者，在设置窗口中，直接找到并点击"Displays"选项卡。

3. **调整分辨率**： 在右侧的显示器设置窗口中，您会看到可用的分辨率列表。 点击您想要的分辨率，然后点击"应用"。系统会提示您确认更改，点击"保持更改"即可

#### 时间同步
在设置界面选择中国上海时区。如果时间不正确，则

1. 安装 ntpdate工具：
   ```bash
   sudo apt-get install ntpdate
   ```

2. 同步系统时间与网络时间
   ```bash
   sudo ntpdate cn.pool.ntp.org
   ```

#### 中文输入
安装中文语言包，但是不要更改文件夹名字为中文！

```shell
sudo apt-get install ibus-pinyin
```

执行后重启

Keyboard -> Input Source -> Chinese -> Chinese(pinyin)

选择成功后重启

#### Root 用户
Ubuntu 默认 root 是禁用的，**要先重新设置密码才能使用**。

```shell
sudo passwd root
```

#### 一切皆文件
只要某个资源支持 "打开、读取、写入、关闭" 这组核心操作，操作系统就会将其封装成 "文件"，并分配一个唯一的 "文件描述符（File Descriptor, FD）" 来管理。

### 系统更新

#### 禁用自动更新
```bash
systemctl stop unattended-upgrades.service
systemctl disable unattended-upgrades.service
```

#### Ubuntu 系统升级
[Ubuntu 22.04 升级到 Ubuntu 24.04 全流程指南_ubuntu22.04升级到24.04-CSDN博客](https://blog.csdn.net/m0_58648890/article/details/146143873)

Package Configuration 界面，按 Tab 键才能选中 OK

**不要轻易升级系统……很容易失败，尤其是升级过程不要乱操作**

### 磁盘管理

#### 磁盘扩容
VMware 扩容会检查系统"当前大小" 是否 > "系统可用空间"，若大于会提示"文件系统的空间不足，无法执行选定的操作"，猜测扩展时有复制操作！

[虚拟机 Win10 磁盘扩展 "文件系统的空间不足，无法..." VMware 增加 C盘 扩展 磁盘 扩容 容量 VMware Workstation 显示 提示_文件系统的空间不足,无法执行选定的操作-CSDN博客](https://blog.csdn.net/Haidijoya/article/details/127980779)

在 VMware 完成扩容后，还需要在虚拟机扩容，分配磁盘空间。一般使用 gparted，对根目录进行 resize 操作即可：

```bash
sudo apt install gparted
gparted
```

#### 共享文件夹
```bash
vmware-hgfsclient  # 查看虚拟机设置共享文件夹是否开启
sudo mkdir /mnt/hgfs  # 创建挂载目录

# 挂载目录
sudo /usr/bin/vmhgfs-fuse .host:/ /mnt/hgfs -o allow_other -o uid=1000 -o gid=1000 -o umask=022

# 设置开机自动挂载
sudo gedit /etc/fstab
# 在以上文件的最后加入以下这句
.host:/ /mnt/hgfs fuse.vmhgfs-fuse allow_other,uid=1000,gid=1000,umask=022 0 0

sudo umount /mnt/hgfs   # 取消挂载
```

#### Ubuntu 启动
GRUB 菜单 -> Advanced options for Ubuntu -> 内核

##### 磁盘扩容导致启动错误
VmWareWorkstation，Ubuntu20.04 虚拟机磁盘容量不够了，想扩容然后发现宿主机磁盘也不够了。虚拟机在 D 盘，给 D 盘扩容后再打开虚拟机发现启动失败。具体是这样的：

点击屏幕后会卡在一个近乎黑屏的界面。

还好找到了一个有效的帖子，解决方法是先给虚拟机扩容，利用 BIOS 修改开机方式然后开机，进入 Ubuntu 试用完成磁盘分盘，再把 BIOS 中的开机方式改回来，再开机就可以了。

原帖如下：
[虚拟机ubuntu20.04扩容时遇到的问题及解决方法（包含fdisk打不开、开机黑屏无法启动及一种扩容办法） - 知乎](https://zhuanlan.zhihu.com/p/615905268)

## 网络配置

### 联网设置

#### 虚拟机联网
主机需要开启网络共享？
整坏网络了就还原 VMware 的默认虚拟网络设置

##### 配置 NAT 模式
**NAT 网络是 VMware 默认模式**

虚拟机在内部网络中使用私有 IP 地址，并通过主机的 NAT 功能将数据包转换为公共 IP 地址，虚拟机的私有 IP 地址对外不可见。

以下是在 VMware 中配置 Ubuntu 系统使用 NAT 模式的步骤：

1. 关闭 Ubuntu 虚拟机，确保其完全关机
2. 打开 VMware，点击"编辑"菜单，选择"虚拟网络编辑器"
3. 选择"VMnet8"网络，点击"更改设置"
4. 点击"还原默认设置"，确保网络配置正确
5. 在虚拟机设置中，选择网络适配器，选择"NAT 模式"，并确保"启动时连接"被勾选
6. 启动 Ubuntu 虚拟机
7. 打开系统设置中的网络连接，选择自动（DHCP）获取 IP 地址
8. 打开终端，使用 `ping www.google.com` 或 `ping www.baidu.com` 测试网络连接

##### 配置桥接模式
虚拟机和外部网络可以相互直接访问。由于虚拟机具有与主机相同网段的 IP 地址，外部网络可以像访问其他物理计算机一样访问虚拟机，虚拟机也可以主动访问外部网络。

**垃圾校园网！搞得我用不了桥接，改成手机热点就行了！**

[参考教程1：VMware虚拟机配置Ubuntu桥接方式（！！！很简便！！！）_vmjoueu-CSDN博客](https://blog.csdn.net/weixin_42627397/article/details/110826285)

需要确保主机网卡开启桥接，再设置虚拟网络编辑器，以管理员身份打开 VMware

如果您选择桥接模式，步骤如下：

1. 关闭 Ubuntu 虚拟机，确保其完全关机
2. 打开 VMware，点击"编辑"菜单，选择"虚拟网络编辑器"
3. 选择"桥接模式"，点击"更改设置"
4. 选择要用于桥接的物理网络适配器
5. 启动 Ubuntu 虚拟机
6. 在 Ubuntu 系统中，编辑网络配置文件 `/etc/network/interfaces`
7. 设置静态 IP 地址、子网掩码和网关
8. 应用网络配置

##### 教程 2
选中虚拟机 → 右键「设置」→ 「网络适配器」；
勾选「已启用网络连接」→ 连接方式选择「桥接模式」；
下方勾选「复制物理网络连接状态」（可选，增强兼容性）→ 点击「确定」。

```shell
sudo vim /etc/netplan/01-network-manager-all.yaml
```

DHCP 自动获取 IP
```yaml
network:
  version: 2
  renderer: NetworkManager
  ethernets:
      ens33:
      dhcp4: true  # 开启IPv4的DHCP自动获取
      dhcp6: false # 关闭IPv6的DHCP（嵌入式开发无需IPv6，可选）
      optional: true # 网卡启动时无需等待IP获取完成，避免开机卡顿# Let NetworkManager manage all devices on this system
```
```bash
# 应用netplan配置
sudo netplan apply
# 重启NetworkManager确保生效（可选）
sudo systemctl restart NetworkManager
# 再次查看IP，确认是否获取到
ip a show ens33
```

##### 突然连不上网
1. 在虚拟机中执行
```shell
# 查询网络服务
systemctl status network
# 重启网络服务
systemctl start network
```
2. 在主机任务管理器中找到服务 -> 启动/重启 VMware NAT Service

### 内网穿透
[Cpolar快速入门教程：Ubuntu系列 - cpolar 极点云官网](https://www.cpolar.com/blog/cpolar-quick-start-tutorial-ubuntu-series)

## 常用命令

### 命令行基础

#### 快捷键
```
ctrl + c    中断当前进程
ctrl + alt + t  启动终端
tab键       可以自动补全
ctrl + h    显示隐藏文件
```

#### 基本命令
```bash
ls                  # 查询当前目录下文件，绿色为可执行
ls -a               # 会显示.开头的隐藏文件
pwd                 # 查询当前路径
cd ..               # 返回
cd                  # 进入某个文件夹或文件
touch               # create a file
touch file          # 创建文件
mkdir               # 创建文件夹，但是只能逐级创建
mkdir -p            # 递归创建
rm                  # 删除文件
rm -r               # 删除文件夹
clear               # 清屏
sudo reboot         # 重启

# 文件操作
cat                 # 显示文件内容、合并文件以及创建简单文件
vim file            # 编辑文件
echo                # 把文本内容输出到标准输出
grep                # 过滤

# 软件管理
sudo apt install    # 安装软件
sudo dpkg -i        # 安装.db文件
dpkg

# 配置文件
vim ~/.bashrc
source

# 环境变量
printenv            # 打印所有环境变量
~/                  # 代表主目录

# 搜索
sudo find /usr -type d -name "*gz*" 2>/dev/null  搜索

# 系统更新
sudo apt update && sudo apt upgrade
```

### 文件操作类

| 命令      | 用途          | 示例                                   |
| ------- | ----------- | ------------------------------------ |
| `ls`    | 列出目录内容      | `ls -l /home`                        |
| `cd`    | 切换目录        | `cd /var/log`                        |
| `pwd`   | 显示当前路径      | `pwd`                                |
| `mkdir` | 创建目录        | `mkdir newdir`                       |
| `rm`    | 删除文件或目录     | `rm file.txt`，`rm -rf dir/`          |
| `cp`    | 复制文件或目录     | `cp a.txt b.txt`，`cp -r dir1/ dir2/` |
| `mv`    | 移动或重命名文件    | `mv old.txt new.txt`                 |
| `touch` | 创建空文件或修改时间戳 | `touch file.txt`                     |

### 文件内容查看

| 命令              | 用途           | 示例                                       |
| --------------- | ------------ | ---------------------------------------- |
| `cat`           | 查看文件内容       | `cat file.txt`                           |
| `less` / `more` | 分页查看文件内容     | `less file.txt`                          |
| `head`          | 查看前 N 行      | `head -n 10 file.txt`                    |
| `tail`          | 查看后 N 行或实时追踪 | `tail -n 20 file.txt`，`tail -f file.txt` |
| `wc`            | 统计行数/字数/字符数  | `wc -l file.txt`                         |
| `grep`          | 文本搜索         | `grep "error" file.log`                  |
| `find`          | 文件查找         | `find /etc -name "*.conf"`               |
| `file`          | 查看文件类型       | `file image.jpg`                         |

### 权限与用户管理

| 命令 | 用途 | 示例 |
|---|---|---|
| `chmod` | 修改文件权限 | `chmod 755 script.sh` |
| `chown` | 更改文件所有者 | `chown user:group file.txt` |
| `umask` | 设置默认权限掩码 | `umask 022` |
| `whoami` | 显示当前用户名 | `whoami` |
| `id` | 显示当前用户ID信息 | `id` |
| `sudo` | 以超级用户权限执行命令 | `sudo apt update` |
| `passwd` | 修改用户密码 | `passwd` |
| `adduser` / `useradd` | 添加用户 | `adduser newuser` |
| `usermod` / `deluser` | 修改/删除用户 | `usermod -aG sudo user`，`deluser user` |

#### 修改文件权限
```bash
sudo chmod 600 /path/to/file：只有文件拥有者有读取和写入权限。

sudo chmod 644 /path/to/file：文件拥有者有读取和写入权限，群组用户和其他用户只有读取权限。

sudo chmod 700 /path/to/file：只有文件拥有者有读取、写入和执行权限。

sudo chmod 666 /path/to/file：所有用户都有读取和写入权限。

sudo chmod 777 /path/to/file：所有用户都有读取、写入和执行权限。
```

### 网络管理

| 命令                 | 用途          | 英文全称                                                                        | 示例                         |
| ------------------ | ----------- | --------------------------------------------------------------------------- | -------------------------- |
| `ping`             | 测试网络连通性     | **Packet InterNet Groper**                                                  | `ping google.com`          |
| `curl` / `wget`    | 下载网络资源      | `curl`: **Client URL** / `wget`: **Web Get**                                | `curl https://example.com` |
| `ifconfig` / `ip`  | 查看 / 配置网络接口 | `ifconfig`: **interface configuration** / `ip`: **iproute2**（工具集名称，无单独缩写全称） | `ip a`                     |
| `netstat` / `ss`   | 查看网络连接      | `netstat`: **network statistics** / `ss`: **socket statistics**             | `netstat -tuln`，`ss -tuln` |
| `traceroute`       | 路由追踪        | **Trace Route**                                                             | `traceroute google.com`    |
| `nslookup` / `dig` | DNS 查询      | `nslookup`: **name server lookup** / `dig`: **domain information groper**   | `nslookup baidu.com`       |
| `telnet` / `nc`    | 测试端口连接      | `telnet`: **Teletype Network** / `nc`: **netcat**（工具名，无拆分全称）                | `nc -zv 127.0.0.1 80`      |

#### 查看端口占用
在 Linux 中可以使用多种方法来查看端口是否被占用：

- **`netstat`**：使用 `netstat -tuln | grep :<端口号>`
- **`lsof`**：使用 `lsof -i :<端口号>` 查看端口占用情况
- **`ss`**：使用 `ss -tuln | grep :<端口号>`
- **`netcat`**：使用 `nc -zv 127.0.0.1 <端口号>`
- **`fuser`**：使用 `fuser <端口号>/tcp`

### 进程管理

| 命令 | 用途 | 示例 |
|---|---|---|
| `ps` | 查看进程 | `ps aux` |
| `top` / `htop` | 实时进程监控 | `top`（`htop` 更美观） |
| `kill` | 终止进程 | `kill 1234` |
| `killall` | 按名称终止进程 | `killall firefox` |
| `nice` / `renice` | 设置进程优先级 | `nice -n 10 ./run.sh` |
| `bg` / `fg` | 后台/前台任务切换 | `fg %1` |
| `jobs` | 查看当前 shell 的作业 | `jobs` |

### 磁盘与文件系统管理

| 命令                 | 用途            | 英文全称                                         | 示例                     |
| ------------------ | ------------- | -------------------------------------------- | ---------------------- |
| `df`               | 查看磁盘空间        | disk free                                    | `df -h`                |
| `du`               | 查看目录 / 文件大小   | disk usage                                   | `du -sh /var/log`      |
| `mount` / `umount` | 挂载 / 卸载设备     | mount / unmount                              | `mount /dev/sdb1 /mnt` |
| `lsblk`            | 查看磁盘分区结构      | list block devices                           | `lsblk`                |
| `blkid`            | 查看设备 UUID 等信息 | block id                                     | `blkid`                |
| `fdisk` / `parted` | 分区工具          | fdisk: fixed disk / parted: partition editor | `fdisk /dev/sda`       |
| `mkfs`             | 格式化文件系统       | make file system                             | `mkfs.ext4 /dev/sdb1`  |
| `fsck`             | 检查并修复文件系统     | file system check                            | `fsck /dev/sda1`       |

### 软件包管理

#### APT（Ubuntu/Debian）
| 命令 | 用途 | 示例 |
|---|---|---|
| `apt update` | 更新软件源 | `sudo apt update` |
| `apt upgrade` | 升级系统包 | `sudo apt upgrade` |
| `apt install` | 安装软件 | `sudo apt install vim` |
| `apt remove` | 删除软件 | `sudo apt remove nginx` |
| `dpkg -i` | 安装 .deb 包 | `sudo dpkg -i pkg.deb` |

#### YUM（CentOS/Fedora）
yum（Yellow dog Updater, Modified）是一个在 Fedora 和 RedHat 以及 SUSE 中的 Shell 前端软件包管理器。

基于 RPM 包管理，能够从指定的服务器自动下载 RPM 包并且安装，可以自动处理依赖性关系，并且一次安装所有依赖的软件包，无须繁琐地一次次下载、安装。

```bash
- 1. 列出所有可更新的软件清单命令：yum check-update

- 2. 更新所有软件命令：yum update

- 3. 仅安装指定的软件命令：yum install <package_name>

- 4. 仅更新指定的软件命令：yum update <package_name>

- 5. 列出所有可安裝的软件清单命令：yum list

- 6. 删除软件包命令：yum remove <package_name>

- 7. 查找软件包命令：yum search <keyword>

- 8. 清除缓存命令:
    - yum clean packages: 清除缓存目录下的软件包
    - yum clean headers: 清除缓存目录下的 headers
    - yum clean oldheaders: 清除缓存目录下旧的 headers
    - yum clean, yum clean all (= yum clean packages; yum clean oldheaders) :清除缓存目录下的软件包及旧的 headers
```

## 常用软件

### 安装方式

```bash
sudo dpkg -i example.deb
sudo apt --fix-broken install  # 尝试安装缺失的依赖包，或移除冲突的软件包
```

### VIM
Vim 是一款强大的文本编辑器，以下是一些最常用的快捷键：

#### 启动与退出
- **启动 Vim**：在终端输入 `vim filename` 来打开或创建一个文件，其中 `filename` 是你要操作的文件名。若文件不存在，Vim 会创建一个新文件；若已存在，则会打开该文件
- **退出 Vim**
  - **:q**：在命令模式下输入此命令，如果文件未被修改，可直接退出 Vim
  - **:q!**：当你对文件进行了修改但不想保存，想强制退出时，使用此命令
  - **:wq**：若你希望保存对文件所做的修改并退出 Vim，可输入该命令
  - **ZZ**：这是 `:wq` 的快捷键，在命令模式下按下 `Shift` 和 `Z` 两次，也能实现保存并退出

#### 模式切换
- **插入模式**：在命令模式下，按下 `i` 可在当前光标位置前插入文本；按下 `I` 能在当前行的行首插入；按下 `a` 在当前光标位置后插入；按下 `A` 在当前行的行尾插入；按下 `o` 在当前行下方新建一行并进入插入模式；按下 `O` 在当前行上方新建一行并进入插入模式
- **退出插入模式**：按下 `Esc` 键、`Ctrl + [` 组合键或者 `Ctrl + C` 组合键，都能从插入模式回到命令模式

#### 光标移动
- **基本移动**：在命令模式下，`h` 键使光标向左移动一个字符；`j` 键让光标向下移动；`k` 键使光标向上移动；`l` 键使光标向右移动
- **单词间移动**：`w` 键将光标移动到下一个单词的开头；`b` 键把光标移动到上一个单词的开头；`e` 键使光标移动到当前单词或下一个单词的结尾
- **行内移动**：按下数字 `0` 可将光标移动到当前行的行首；按下 `$` 键能把光标移动到当前行的行尾
- **文件内移动**：`gg` 键让光标移动到文件的第一行；`G` 键使光标移动到文件的最后一行

#### 文本编辑
- **删除操作**：`dd` 用于删除当前行；`dw` 删除光标所在位置到当前单词结尾的内容；`x` 删除光标所在位置的字符
- **复制与粘贴**：`yy` 复制当前行；`p` 在光标所在位置之后粘贴复制的内容；`P` 在光标所在位置之前粘贴
- **撤销与重做**：`u` 用于撤销上一步操作；`Ctrl + r` 重做上一步被撤销的操作

#### 搜索与替换
- **搜索**：在命令模式下输入 `/pattern` 向前搜索指定的模式（`pattern` 是你要搜索的内容）；输入 `?pattern` 向后搜索。使用 `n` 跳转到下一个匹配项，`N` 跳转到上一个匹配项
- **替换**：输入 `:%s/old/new/g` 可在整个文件中把所有的 `old` 替换为 `new`；若只想替换当前行的匹配项，使用 `:s/old/new/g`

![img](https://www.runoob.com/wp-content/uploads/2015/10/vi-vim-cheat-sheet-sch.gif)

### VSCode
在 windows 中使用 vscode remote，连接虚拟机即可

vim 可以集成到 vscode 中

```bash
sudo apt update
sudo apt install wget gpg apt-transport-https

wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg

echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list > /dev/null

sudo apt update

sudo apt install code
# 卸载
sudo apt remove code
```

### wget
一般已经安装

### curl
一般已经安装

### GIT
#### 与 github 连接
```bash
ssh -vT git@github.com  // 刷新ssh
sudo vim /etc/hosts   // 添加或者修改ip
```

#### 代码管理
```bash
git intial
git remote add/remove
git commit
git push
git clone 从远程库克隆
```

#### GitHub Desktop
```shell
sudo apt update && sudo apt upgrade
wget https://github.com/shiftkey/desktop/releases/download/release-3.4.13-linux1/GitHubDesktop-linux-amd64-3.4.13-linux1.deb
sudo dpkg -i GitHubDesktop-linux-3.1.7-linux1.deb
```

#### Failed to connect to github.com port 443: 拒绝连接（Connection refused）
```shell
sudo apt update
sudo apt install openssh-server
```

## 其他配置

### 换源

下载一些大文件尽量找镜像网站

#### 常用镜像网站
```bash
清华大学 https://mirrors.tuna.tsinghua.edu.cn/
华为云 https://mirrors.huaweicloud.com/
```

[Ubuntu24.04换源方法（新版源更换方式，包含Arm64）-CSDN博客](https://blog.csdn.net/qq_37344125/article/details/138841559)

[ubuntu | 镜像站使用帮助 | 清华大学开源软件镜像站 | Tsinghua Open Source Mirror](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)

```bash
sudo cp /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list.d/ubuntu.sources.bak  # 备份
sudo vim /etc/apt/sources.list.d/ubuntu.sources
```

### 创建桌面快捷方式
本质上创建的是符号链接

[『ubuntu使用」在桌面建立一个文件夹的快捷方式 - 奥卡修罗 - 博客园](https://www.cnblogs.com/aocshallo1/p/18718667)

```bash
ln -s /home/hanphone/ros2_ws /home/hanphone/桌面/ros2_ws
```

注意权限

### PostgreSQL
#### 卸载 PostgreSQL 的步骤
1. 打开 SSH 命令行终端
2. 运行以下命令，以从 Ubuntu 中删除 PostgreSQL：`sudo apt-get --purge remove postgresql`
3. 删除相关的安装：`sudo apt-get --purge remove postgresql*`
4. 删除配置及文相关件：`sudo rm -r /etc/postgresql/`
5. 删除用户和所在组：`sudo userdel -r postgres`
