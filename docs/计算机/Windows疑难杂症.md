---
_synced: true
---
## 系统操作

### 基本命令

#### 以管理员身份打开命令窗口
输入 `win` + `R` 然后输入 cmd，使用 `Ctrl` + `Shift` + `Enter` 通过管理员打开命令窗口

#### 打开 Telnet 客户端
按下 Win + R 键，输入 OptionalFeatures 并按回车。在弹出的"Windows功能"窗口中，找到 Telnet 客户端，勾选后点击"确定"。系统会自动安装 Telnet 客户端

#### 常用命令
```shell
# 检查所有端口的进程关联
netstat -ano

# 过滤特定端口（例如 8080）
netstat -ano | findstr 8080

taskkill /pid 进程号 /F
```

### PowerShell
#### Powershell 提示 因为在此系统上禁止 运行脚本

https://learn.microsoft.com/en-us/answers/questions/1508899/question-1508899
使用“以管理员身份运行”打开 PowerShell。 然后，在 PowerShell 中运行此命令 Set-ExecutionPolicy -ExecutionPolicy RemoteSigned

#### PowerShell 7
相比于 Windows 默认提供的 PowerShell，PowerShell 7 拥有以下几个优势：
- 支持跨平台使用，增强了其灵活性和适用范围
- 提供了更优越的性能表现
- 处于持续更新状态，保证了功能的不断完善和安全性的提升

简而言之，PowerShell 7 是 PowerShell 的升级版

[PowerShell 文档 - PowerShell | Microsoft Learn](https://learn.microsoft.com/zh-cn/powershell/)

```shell
# 查看当前 powershell 版本
$PSVersionTable.PSVersion
```

### BIOS 配置

隐星 P15 24 开机过程按 F2 键进入 BIOS。需要先解 BIOS，否则功能很少

[解锁BIOS教程：七彩虹、神州等蓝天模具BIOS解功耗、降压-哔哩哔哩](https://b23.tv/wMmXMTd)

我的隐星 P15 24 无需刷 BIOS，分盘后导入文件即可

#### Fn+Esc 查看性能

### 网络配置

#### 代理与翻墙

##### 设置开机打开代理
[官网地址 - FlClash](https://flclash.org/official/)

##### TUN 模式/虚拟网卡

**流量拦截范围**
- **仅系统代理**：仅拦截浏览器、部分遵循系统代理设置的 App（如 curl、wget）的 HTTP/HTTPS 流量
- **开启 TUN 模式**：接管设备**所有网络流量**，包括 TCP、UDP 协议，涵盖所有 App（如游戏、视频客户端、终端工具）的流量

**协议支持能力**
- **仅系统代理**：仅支持 HTTP/HTTPS 协议，无法处理 UDP 流量（如视频通话、在线游戏）
- **开启 TUN 模式**：支持 TCP、UDP 等全协议，能解决语音通话、实时游戏等场景的网络问题

**系统级路由接管**
- **仅系统代理**：依赖应用层代理规则，部分 App 可能绕过代理
- **开启 TUN 模式**：通过虚拟网卡修改系统路由表，实现底层流量转发，所有流量必经 VPN 节点，无遗漏

#### WIFI 和有线网络

#### 端口问题

##### 端口莫名奇妙被占用
```less
error when starting dev server:
Error: listen EACCES: permission denied 127.0.0.1:5173
    at Server.setupListenHandle [as _listen2] (node:net:1800:21)
    at listenInCluster (node:net:1865:12)
    at doListen (node:net:2014:7)
    at process.processTicksAndRejections (node:internal/process/task_queues:83:21)
```

这个问题碰到了两次了，第一次设置的是 3000 端口，启动项目是 ok 的，过了一段时间就再起就碰到这个问题

1. 查询端口是否已经被占用，`netstat -ano | findstr pid`
   - 结果显示是：没有显示被占用
2. 确定是不是权限不足，切换管理员身份，重启 vue 项目
   - 结果是：失败，报错原因和上面一样
3. 应该是和下面一样排查端口是不是被占用（当时没记录，一边查一边搞，然后排查出是在某个组件占用的端口范围内）
   - 当时是选择切换端口

这次是 5173，也是运行一段时间以后过一段时间重启就不行了

```yaml
netstat -ano | findstr pid
# 无输出

netsh int ipv4 show excludedportrange protocol=tcp
协议 tcp 端口排除范围

开始端口    结束端口
----------    --------
      5106        5205
      5284        5383
      5384        5483
      5488        5587
      5588        5687
      5688        5787
      5788        5887
      5888        5987
     50000       50059     *

* - 管理的端口排除。

# 5173 端口正好在被系统保留的范围内
```

刚刚查询之前怎么解决是看到这篇文章：[https://stackoverflow.com/questions/62508193/error-listen-eacces-permission-denied-0-0-0-03001?utm_source=chatgpt.com](https://stackoverflow.com/questions/62508193/error-listen-eacces-permission-denied-0-0-0-03001?utm_source=chatgpt.com)

有一个回答介绍对于在尝试将 Node.js 服务器绑定到特定端口时遇到"EACCES： 权限被拒绝"错误的 Windows 用户，之后执行的步骤：

```dos
net stop winnat # 停止 Windows NAT 服务。
net start winnat # 启动 Windows NAT 服务。
```

### 系统更新

#### 卸载补丁
2025年8月 kb5063878 更新有严重 bug

```shell
wusa /uninstall /kb:5063878
```

卸载不了！！

win11 系统，恢复界面里选择（使用 Windows 更新修复问题），重新安装后再进入更新历史记录（卸载更新），就会出现 KB5063878 的卸载选项。

也没用！做好资料备份。

[参考资料](https://www.zhihu.com/question/1940727071828602928)

#### 还原
`sysdm.cpl`

https://learn.microsoft.com/zh-cn/answers/questions/4373312/*

## 文件与存储

### 磁盘操作

#### 常用工具
[傲梅分区助手、轻松备份、数据恢复(恢复之星)、远程控制（AnyViewer）等软件免费下载官网](https://www.disktool.cn/)

#### 分盘与合盘
[【Windows】合并分区教程（解决C盘空间不足）_恢复分区怎么合并到c盘-CSDN博客](https://blog.csdn.net/qq_42951560/article/details/123707915)

WIN+R 打开运行，输入 `diskmgmt.msc` 点击**确定**，打开**磁盘管理**，只能合并分配同一磁盘上相邻的位置

#### 分盘教程
[知乎分盘教程](https://zhuanlan.zhihu.com/p/95133122#:~:text=%E6%9C%AC%E6%96%87%E4%BB%8B%E7%BB%8D%E4%BA%86%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8Windows%E8%87%AA%E5%B8%A6%E7%9A%84%E7%A3%81%E7%9B%98%E7%AE%A1%E7%90%86%E5%B7%A5%E5%85%B7%E5%AF%B9%E7%A3%81%E7%9B%98%E8%BF%9B%E8%A1%8C%E5%88%86%E5%8C%BA%E3%80%81%E5%8E%8B%E7%BC%A9%E3%80%81%E6%96%B0%E5%BB%BA%E3%80%81%E6%9B%B4%E6%94%B9%E9%A9%B1%E5%8A%A8%E5%99%A8%E5%8F%B7%E7%AD%89%E6%93%8D%E4%BD%9C%EF%BC%8C%E9%80%82%E5%90%88%E7%94%B5%E8%84%91%E5%B0%8F%E7%99%BD%E3%80%82%E6%96%87%E7%AB%A0%E9%85%8D%E6%9C%89%E8%AF%A6%E7%BB%86%E7%9A%84%E6%88%AA%E5%9B%BE%E5%92%8C%E6%AD%A5%E9%AA%A4%E8%AF%B4%E6%98%8E%EF%BC%8C%E6%93%8D%E4%BD%9C%E4%B8%8D%E5%BD%B1%E5%93%8D%E5%8E%9F%E6%9C%89%E6%95%B0%E6%8D%AE%E3%80%82)

### C 盘管理

#### C 盘清理
**不要为了清 C 盘而改桌面位置，容易导致系统错误！**

[【电脑必备】4分钟教你如何系统的清理C 盘！我足足释放20多G!](https://www.bilibili.com/video/BV1WYWGzQEwe/?share_source=copy_web&vd_source=186f482d5782bc8b1831fb6379b26ea2)

1. **临时文件夹**
   - **打开临时文件夹**：按下 **Win + R** 键，输入 `%temp%`，然后按回车
   - **删除临时文件**：在打开的文件夹中，按 **Ctrl + A** 选择所有文件，按 **Delete** 键删除

2. **磁盘清理工具**
   - **打开磁盘清理工具**：按下 **Win + R** 键，输入 `cleanmgr`，然后按回车
   - **选择 C 盘**：在弹出的窗口中选择 C 盘，点击"确定"。需要选择清理系统文件

3. **清理临时文件**
   - Win+i，输入存储感知，进入存储感知界面，手动清理大文件，并开启每天自动清理
   - 电脑休眠会生成大文件在 C 盘保存系统状态

4. **转移软件缓存**
   - 很重要！比如 AndroidStdio 的 .android 和 .gradle 等等

#### 关闭 Bitlocker 防止 C 盘爆盘导致数据丢失
在控制台找到"BitLocker 驱动器加密"选项，关闭 C 盘的 bitlocker

### 文件操作

#### 强制删除文件
[操作无法完成，因为其中的文件夹或文件已在另一程序（如PoewrPoint)打开，请关闭该文件夹或文件，然后重试。 - 知乎](https://zhuanlan.zhihu.com/p/356736274)

#### 文件访问控制
访问控制已损坏，请将其删除并创建一个新的访问控制

1. 您可以按以下方法打开 WindowsApps 文件夹
2. 按提示点击安全选项卡
3. 点击高级，进入 Windows 高级安全设置
4. 在 Windows 安全高级设置中点击更改
5. 在选项中输入要选择的对象名称下输入"everyone"并点击确定
6. 随之在 picpick 上点击左上角主页下的"缩放"，选择"图像大小"
7. 回到 WindowsApps 的高级安全设置后，勾选替换子容器和对象的所有者，再点击确定
8. 回到 D 盘后再次双击 WindowsApps 文件夹，出现提示后点击继续
9. 即可正常打开 WindowsApps 文件夹

注意：要想修改图片的长宽比，必须关闭"保持宽高比"

#### 长路径支持
注册表路径：`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`

#### 查找软件安装位置
1. 利用程序的桌面快捷方式
2. 任务管理器
3. 控制面板
4. 在文件资源管理器地址栏中输入"%ProgramFiles%"

### 编码和语言

#### 更改系统默认编码格式
[编码GBK不可映射字符的三种解决方法_编码gbk的不可映射字符-CSDN博客](https://blog.csdn.net/Moum_j/article/details/123251621)

[Windows部分软件乱码教你快速解决_电脑应用突然变乱码了-CSDN博客](https://blog.csdn.net/weixin_45631738/article/details/105148053)

#### 解压文件文件名乱码
[解决解压含有中文的文件名乱码问题_解压中文乱码-CSDN博客](https://blog.csdn.net/QCSYSZQ/article/details/115053039)

#### 查看操作系统支持的语言环境
```bash
locale -a
```

### 注册表

#### 删除注册表
```bash
win+r regedit.exe  编辑>查找>输入
```

[Windows注册表内容详解 - 九月如枫 - 博客园](https://www.cnblogs.com/sepmaple/articles/9401215.html#:~:text=注册表是windows操作系统、硬件设备以及客户应用程序得以正常运行和保存设置的核心"数据库"，也可以说是一个非常巨大的树状分层结构的数据库系统。,注册表记录了用户安装在计算机上的软件和每个程序的相互关联信息，它包括了计算机的硬件配置，包括自动配置的即插即用的设备和已有的各种设备说明、状态属性以及各种状态信息和数据。)

## 应用与软件

### 常用软件安装

#### Git
[Git 详细安装教程（详解 Git 安装过程的每一个步骤）_git安装-CSDN博客](https://blog.csdn.net/mukes/article/details/115693833)

win11 git 卡顿 --> 卸载自带的电脑管家

#### VSCode
以管理员身份运行，终端才有管理员权限

[Vscode解决Setting.json报警告：Problems loading reference ... Unable to load schema from ...-CSDN博客](https://blog.csdn.net/weixin_42837669/article/details/115799340)

右键打开

https://zhuanlan.zhihu.com/p/428704111

#### Prettier
[VSCode 插件 Prettier 安装、配置与使用指南_prettier插件配置-CSDN博客](https://blog.csdn.net/weixin_43391139/article/details/148735932)

#### PotPlayer
网易云音乐、腾讯会议、draw.io，火绒

#### wget
[GNU Wget 1.21.4 for Windows](https://eternallybored.org/misc/wget/)

下载压缩包后将 wget.exe 复制到 C:\Windows\System32 下

### 应用问题

#### 应用模糊
属性 --> 兼容性 --> 高 DPI 设置 --> 勾选替代高 API 缩放行为

快捷方式的属性不一定行，比如 WPS 就需要找到安装的位置。路径：\Program Files\WPS Office\12.1.0.23539\office6 中找到 wps.exe 右键属性

#### 找到麦克风
声音设置下，点开高级中的更多声音设置 -> 录制选项卡下，确认麦克风设备已启用

#### 内存占用率异常高
1. [解决win10，win11一开机内存占用率70%多问题_win11开机内存占用60%-CSDN博客](https://blog.csdn.net/qq_45830276/article/details/126968965)
2. [win10内存占用率过高重启都没用？教你一键解决 99.9％有效_哔哩哔哩_bilibili](https://www.bilibili.com/video/av541616448/?vd_source=d70e94afe69a097aca14b8a5978d641d)
3. 打开开始菜单 Windows 内存诊断 点击运行 选择立即重启

#### 应用存储路径
`C:\Users\beize\AppData\Local`

### 系统性能

#### 卡顿
[电脑卡顿反应慢怎么办？试一下这个方法](https://www.bilibili.com/video/BV1VT4y1a7kL/?share_source=copy_web&vd_source=186f482d5782bc8b1831fb6379b26ea2)

win+r，输入 mrt，快速删除恶意软件，电脑真的流畅

## 显示与硬件

### 副屏

#### 连接设置
确保驱动板屏幕，一般用 edp 屏线。hdmi 或者 dp 线连接到主机，不要用转接头连接。HDMI 线损失比较多，优先用 DP 线。

在屏库网查信息。

在设置 --> 显示设置中应用副屏，设置刷新率，以及分辨率。主屏和副屏该跑什么规格就跑什么。刷新率不要太高，根据屏幕量力而行。

**使用拓展模式时，两个屏幕的渲染方式不同，内部显示器会使用集显！！**

**在 BIOS 或隐星自带的控制中心里面开启 Discreate GPU only 独显直连，这样两个屏幕都能用独立显卡。外接的副屏用核显还没找到方法。**

HDR 高动态渲染光照。建议开启。

#### 副屏间歇性黑屏？
尝试：禁用声音中的驱动板声音（录制），降低刷新率，重新检查插线

**最终办法：把屏幕驱动板电源线插到电脑接口上而不是插座上**

### 屏幕

#### 电脑开机后黑屏只剩鼠标
屏幕变黑，桌面上的所有图形化界面完全消失，但鼠标仍可以移动，命令行亦可以使用

同时按下键盘的 CTRL+ALT+DEL 三个按键。选择"任务管理器"，并点击下图中箭头所指的"运行新任务"，在出现的窗口中输入"explorer.exe"，然后回车。

还不行的话，可以在任务管理器找到火绒安装路径，使用 cmd 打开火绒，进入隔离，将 explorer.exe 恢复并加入信任区即可。

原因可能是：由于是老版本的火绒，病毒库比较落后，故而老火绒与新 win11 形成了代差，容易把 win11 的 explorer.exe 误杀，我们升级一下即可，新版本火绒是不会误杀资源管理器的。

### 驱动

#### 手机 USB 连接驱动
在设备类型中选择移动设备，MTB USB 设备

https://hongmao21.com/post-1329.html

电脑手机之间不要使用剪切操作，很容易丢文件！！千万别在不同的介质中使用剪切

#### 手柄连接
先升级手柄，升级完后拔掉手柄，墨将助手不要关，长按接收器的配对键不放插到电脑上直到墨将助手识别到后再松手，然后点升级就好了
