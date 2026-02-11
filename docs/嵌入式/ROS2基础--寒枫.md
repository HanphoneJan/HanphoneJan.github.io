# ROS2

[ROS 2 Documentation — ROS 2 Documentation: Jazzy documentation](https://docs.ros.org/en/jazzy/)

[ROS 2 文档 — ROS 2 文档：Humble 文档](https://docs.ros.org/en/humble/index.html) 非常成熟的一个版本！本文档默认使用该版本。

[ROS 2 文档 — ROS 2 文档：Jazzy 文档](https://ros-doc.armfun.cn/jazzy/index.html) ros2rolling 滚动版本始终是最新版本

[W《ROS 2 机器人开发：从入门到实践》 书籍配套代码](https://github.com/fishros/ros2bookcode)

## 安装

ubuntu24.04 对应 jazzy，22.04 对应 Humble

鱼香一键安装

```bash
wget http://fishros.com/install -O fishros && . fishros
```

[配置环境 — ROS 2 Documentation： Jazzy 文档](https://docs.ros.org/en/jazzy/Tutorials/Beginner-CLI-Tools/Configuring-ROS2-Environment.html)

开发流程：**创建工作空间 → 创建功能包 → 编写节点 → 管理依赖 → 编译 → 运行。**

常见命令

```bash
ros2 topic list #列出ros2话题
ros2 service list -t
ros2 topic pub [选项] <话题名称> <消息类型> <消息内容> #向指定话题发布
ros2 run rviz2 rviz2 #启动rviz
colcon build #编译命令
urdf_to_garphviz  xxxx.urdf #urdf转pdf图
gz sim #启动gazebo，较新的版本都是这个
```

## ROS2 关键概念

[基本概念 — ROS 2 Documentation： Jazzy documentation](https://docs.ros.org/en/jazzy/Concepts/Basic.html)

1. **节点（Node）** 每个节点代表一个独立进程，负责执行特定任务（如控制电机、处理图像）,各个节点有生命周期管理
2. **通信机制（接口）** ROS2 的通信接口通过**类型定义文件（msg/srv/action）和**跨语言代码生成机制，强制规范了数据传递的结构。**ROS2 中所有通信机制都基于 DDS 的话题通信。**

   • **消息接口：主题/话题（Topic）**：话题是**节点之间进行异步通信**的重要途径。发布者节点（Publisher）会把消息发布到特定的话题上，而订阅者节点（Subscriber）则可以订阅这些话题，接收发布者所发送的消息。
   • **服务和参数通信**：服务是节点之间进行同步通信的机制。客户端节点向服务端节点发送请求，服务端节点处理请求后返回响应，在服务端返回前客户端处于阻塞状态。服务端可以订阅参数更新然后进行参数回调。应用：人脸识别。类似于HTTP。
   • **动作接口**：动作是专门用于处理长时间运行任务的机制，它支持任务的反馈和取消。动作包含目标（Goal）、反馈（Feedback）和结果（Result）三个部分。客户端节点向动作服务器发送目标，动作服务器开始执行任务，并在执行过程中不断返回反馈信息，让客户端了解任务的执行进度。任务完成后，动作服务器返回最终结果。类似于Websocket。
3. **参数服务器（Parameter Server）**
    ROS2 参数服务器是集中化的键值对存储系统，通过命名空间组织，可被所有节点访问，用于存储全局共享的配置数据（配置各个节点，如传感器阈值、控制器参数），支持运行时通过命令行或代码修改参数。

```bash
ros2 param list                # 查看所有参数
ros2 param get /node param_key # 获取参数值
ros2 param set /node param_key value  # 动态修改参数
ros2 param dump /node > params.yaml   # 导出参数文件
ros2 run package node --ros-args --params-file params.yaml #启动文件加载
```

 5.**分布式通信**

 ROS2 基于 DDS（Data Distribution Service）中间件实现分布式通信，无需依赖 ROS1 中的中央主节点（Master），节点间通过自动发现机制直接通信。同一网络中的节点通过设置相同域 ID 实现通信分组，节点需处于同一局域网。默认域 ID 为 0，不同域 ID 的节点无法交互，适用于多机器人协作或隔离场景（如无人机编队与工业机器人分组控制）

**PC 上运行的 ROS2 能够和树莓派等设备上运行的 ROS2 通过局域网通信（而且是话题订阅与发布），这非常关键**

<img src="https://hanphone.top/gh/HanphoneJan/public_pictures/ros/ROS2分布式通信架构图.webp" alt="ROS2分布式通信架构图" style="zoom:80%;" />

## 基本运行

[ROS2 教程 08 ROS2 的功能包、依赖管理、工作空间配置与编译\_ros2 编译-CSDN 博客](https://blog.csdn.net/m0_56661101/article/details/134098153)

工作空间是 ROS2 项目的基础容器，功能包则是功能模块化的核心单元。通过 `colcon`构建工具和环境变量管理，开发者能高效组织代码、编译与调试。

### 工作空间Workspace

**定义与结构** 工作空间是 ROS2 项目开发的顶层目录，包含所有代码、配置和依赖项。
• 核心目录：
 ◦ **`src`**：存放功能包源代码；
 ◦ **`build`**：编译生成的中间文件；
 ◦ **`install`**：编译后的可执行文件与脚本；
**创建与编译**

```bash
mkdir -p ~/dev_ws/src && cd ~/dev_ws/src
rm -rf build install log #清除缓存
colcon build  # 编译所有包
colcon build --packages-select <包名>  # 编译指定包
```

**环境变量配置**

将已经编译好的可执行文件，写入环境变量，方便执行。

临时生效：在工作空间目录下执行 `source install/setup.bash`。永久生效：将命令写入 `~/.bashrc`文件。

### 功能包Package

功能包是 ROS2 的最小功能模块，包含特定功能的代码、依赖和配置文件，支持代码复用与模块化开发。

**创建方式** 在 src 目录下运行以下命令

```bash
  ros2 pkg create --build-type ament_python <package_name>
  ros2 pkg create <包名> --build-type ament_python --dependencies rclpy  增加了rclpy依赖，节点必备
  rm -rf my_package
```

**核心文件**
• **`package.xml`**：定义包名、版本、依赖等元数据；
• **`CMakeLists.txt`（C++）**或** `setup.py`（Python）**：配置编译规则；
• **`src`目录**：存放节点源码。

### 依赖管理工具 rosdepc

能够自动检测依赖与管理依赖，跨平台兼容。应当在 src 目录下执行命令。

```bash
sudo rosdepc init #初始化
rosdepc update #更新
rosdepc info <package_name>  # 例如：rosdepc info turtlesim
rosdepc install <package_name>  # 单包依赖安装
rosdepc install --from-path src --ignore-src -y  # 安装工作空间中所有包的依赖
```

## Launch 配置脚本

**Launch** 是用于简化分布式系统多节点启动、配置及管理的脚本工具，使配置节点更简单，提高代码可移植性。

1. **节点通信基础**

   - **SSH 无密码登录**：通过 SSH 密钥对实现脚本对集群节点的免密访问，确保自动化操作的连续性。
   - **防火墙与端口管理**：需提前规划节点间通信端口（如 RPC、数据传输端口），避免防火墙拦截导致服务异常。
2. **配置文件设计**

   - 集中式配置管理：通过 JSON/XML/YAML 格式文件定义节点列表、角色（如主节点、从节点）、服务参数等，示例结构：

     ```yaml
     nodes:
       - hostname: node1
         ip: 192.168.1.101
         role: master
         services: [hdfs-namenode, yarn-resourcemanager]
       - hostname: node2
         ip: 192.168.1.102
         role: slave
         services: [hdfs-datanode, yarn-nodemanager]
     ```
   - **模板化参数注入**：支持变量替换（如 `{{cluster_name}}`），适配不同环境的动态配置需求。
3. **脚本执行逻辑**

   - 核心命令集：
     - 远程执行命令：通过 `ssh`或 `ansible`实现节点脚本推送与执行（如 `scp script.sh node:/tmp && ssh node "bash /tmp/script.sh"`）。
     - 配置分发：利用 `rsync`同步配置文件至各节点，确保一致性。
     - 服务启停：封装系统服务命令（如 `systemctl start hadoop-namenode`）或自定义服务脚本。
   - **错误处理机制**：添加 `try-catch`逻辑，支持失败节点重试、跳过或终止整个部署流程，并记录详细日志。

## ROS Bridge

![ROS-Bridge连接架构图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/ros/ROS-Bridge连接架构图.webp)

### ROS 2 消息类型与 JSON 转换

```
// ROS Twist消息
linear: x=0.5, y=0.0, z=0.0
angular: x=0.0, y=0.0, z=0.2

// JSON等效表示
{
  "linear": {"x": 0.5, "y": 0.0, "z": 0.0},
  "angular": {"x": 0.0, "y": 0.0, "z": 0.2}
}

// WebSocket发送的消息格式
{
  "op": "publish",
  "topic": "/cmd_vel",
  "msg": {
    "linear": {"x": 0.5, "y": 0.0, "z": 0.0},
    "angular": {"x": 0.0, "y": 0.0, "z": 0.2}
  }
}
```

## TF 坐标变换库

[tf2 — ROS 2 文档： Jazzy 文档](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Tf2-Main.html)

TF（Transform Library）即坐标变换库，是 ROS2（机器人操作系统）中一个强大的工具，用于管理和跟踪机器人及其周围环境中不同坐标系之间的变换关系。

### 关键概念

1. 坐标系（Frame）

   - 坐标系是描述空间中位置和方向的参考系。例如，激光雷达传感器有自己的坐标系，用于描述其测量到的点云数据的位置；而机器人底盘坐标系则用于描述机器人自身的位置和姿态。
   - 平移表示坐标系之间的位置偏移，通常用三维向量 `(x, y, z)` 表示。
   - 旋转表示坐标系之间的朝向差异，TF 中常用以下 2 种方式表示：

     四元数：`(x, y, z, w)`，其中 `(x, y, z)` 是向量部分，`w` 是标量部分。 [四元数基础知识 — ROS 2 文档：Jazzy 文档](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html)

     欧拉角 `(roll, pitch, yaw)`，分别表示绕 X、Y、Z 轴的旋转角度。
2. 变换（Transform）

   - 变换描述了两个坐标系之间的相对位置和方向关系，包括平移和旋转。TF 可以实时计算和维护这些变换关系。
   - 比如，要将激光雷达测量的数据转换到机器人底盘坐标系下，就需要知道激光雷达坐标系相对于机器人底盘坐标系的变换。
3. 时间戳（Timestamp）

   - TF 中的每个变换都与一个时间戳相关联，这使得它能够处理动态环境中坐标系随时间变化的情况。例如，机器人在移动过程中，其底盘坐标系相对于世界坐标系的变换是不断变化的，通过时间戳可以获取特定时刻的变换关系。由于 TF 依赖时间戳来处理动态变换，因此需要确保各个节点的时间同步。可以使用 NTP（网络时间协议）来实现节点之间的时间同步。

#### TF 的工作原理

TF 树（TF Tree）：**TF 将所有的坐标系及其变换关系组织成一个树状结构，每个节点代表一个坐标系，边代表坐标系之间的变换**。TF 树确保了任意两个坐标系之间的变换可以通过树中的路径计算得到。

广播（Broadcasting）：节点通过 TF 广播器（`tf.TransformBroadcaster`）将自己所知道的坐标系变换关系发布到 TF 树中。例如，激光雷达节点会广播激光雷达坐标系相对于机器人底盘坐标系的变换。静态广播则使用 StaticTransformBroadcaster

监听（Listening）：节点使用 TF 监听器（`tf.TransformListener`）来获取 TF 树中不同坐标系之间的变换关系。当需要将数据从一个坐标系转换到另一个坐标系时，节点可以通过监听器查询相应的变换。

#### TF 的应用场景

传感器数据融合：例如，将激光雷达的点云数据和摄像头的图像数据都转换到机器人底盘坐标系下，以便进行目标检测和识别。

运动规划与导航：比如，机器人要移动到地图上的某个目标点，就需要通过 TF 将目标点的坐标转换到自己的坐标系下，计算出移动的方向和距离。

## URDF 建模语言

[从头开始构建可视化机器人模型 — ROS 2 文档： Jazzy 文档](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/URDF/Building-a-Visual-Robot-Model-with-URDF-from-Scratch.html)

URDF（Unified Robot Description Format）即统一机器人描述格式，是 ROS（机器人操作系统）中用于描述机器人结构和运动学信息的**XML 格式文件**。

#### 关键概念

**连杆（Link）** 连杆是机器人的刚性部件，在 URDF 中代表机器人的各个部分，像机器人的手臂、腿部等，描述外观和物理属性。包含质量、惯性矩阵、视觉属性（外观）和碰撞属性（用于碰撞检测）等。每个 Link 会成为一个坐标系。

```xml
<link name="link1">
    <inertial>
        <!-- 惯性矩阵定义 -->
    </inertial>
    <visual>
        <!-- 视觉属性，如形状、颜色 -->
    </visual>
    <collision>
        <!-- 碰撞属性 -->
    </collision>
</link>
```

**关节**（Joint） 关节用于连接两个连杆，规定了它们之间的运动方式，有 6 中类型。常见的关节类型有旋转关节（Revolute）、棱柱关节（Prismatic）、固定关节（Fixed）等。旋转关节允许连杆绕某一轴旋转，棱柱关节允许连杆沿某一轴做直线运动，固定关节则使两个连杆保持相对固定。

```xml
<joint name="joint1" type="revolute">
    <parent link="link1"/>
    <child link="link2"/>
    <axis xyz="0 0 1"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
</joint>
```

**robot** **根标签 `<robot>`** URDF 文件以 `<robot>` 标签作为根标签，在其内部定义机器人的所有连杆和关节

```xml
<robot name="my_robot">
    <!-- 连杆和关节定义 -->
</robot>
```

#### URDF 的应用场景

1. **仿真** 在**Gazebo 等仿真环境中，可使用 URDF 文件构建机器人模型**，模拟机器人在不同场景下的运动和行为，用于算法测试和验证。
2. **可视化** **借助 Rviz 工具，依据 URDF 文件对机器人进行可视化展示**，方便用户观察机器人的结构和运动状态。
3. **运动控制** 在机器人的运动控制中，URDF 提供的运动学信息可用于计算机器人的正逆运动学，进而实现对机器人关节的精确控制。

### XACRO 模型

XACRO（XML Macro）是 ROS（机器人操作系统）中用于简化 URDF（Unified Robot Description Format）模型描述的工具。它通过宏定义和变量机制，大幅减少了重复代码，提高了模型的可维护性。

#### **2. 基本语法**

##### **2.1 宏定义**

使用 `<xacro:macro>` 定义可复用的组件：

```xml
<xacro:macro name="wheel" params="prefix x y z">
  <link name="${prefix}_wheel">
    <visual>
      <geometry>
        <cylinder radius="0.1" length="0.05"/>
      </geometry>
    </visual>
  </link>
  <joint name="${prefix}_wheel_joint" type="continuous">
    <origin xyz="${x} ${y} ${z}" rpy="0 1.570796 0"/>
    <parent link="base_link"/>
    <child link="${prefix}_wheel"/>
  </joint>
</xacro:macro>
```

##### **2.2 宏调用**

使用 `<xacro:call>` 或简化语法调用宏：

```xml
<!-- 标准调用 -->
<xacro:call macro="wheel" prefix="left" x="0.2" y="0.1" z="0"/>

<!-- 简化调用（推荐） -->
<wheel prefix="right" x="0.2" y="-0.1" z="0"/>
```

##### **2.3 参数与变量**

- 参数定义：在宏中用 params 属性定义参数，支持默认值：

  ```xml
  <xacro:macro name="leg" params="length:=0.5 color:='red'">
    <!-- 使用参数 -->
    <cylinder radius="0.05" length="${length}"/>
    <material name="${color}"/>
  </xacro:macro>
  ```
- 变量赋值：使用 xacro:propert 定义全局变量：

  ```xml
  <xacro:property name="wheel_radius" value="0.1"/>
  ```

#### **3. 高级特性**

##### **3.1 文件包含**

使用 `<xacro:include>` 导入其他 XACRO 文件：

```xml
<xacro:include filename="$(find my_package)/urdf/sensors.xacro"/>
```

##### **3.2 数学表达式**

支持算术运算和三角函数：

```xml
<origin xyz="${wheel_radius*2} 0 0" rpy="0 ${pi/2} 0"/>
```

##### **3.3 条件判断**

根据参数值选择性添加内容：

```xml
<xacro:if value="${add_sensor}">
  <sensor type="camera" name="camera"/>
</xacro:if>
```

##### **3.4 命名空间**

使用 `namespace` 属性避免命名冲突：

```xml
<xacro:macro name="robot" params="name">
  <robot name="${name}">
    <xacro:wheel prefix="left" namespace="${name}"/>
  </robot>
</xacro:macro>
```

#### **4. 与 URDF 的关系**

- **XACRO 是 URDF 的超集**：所有 URDF 标签都可直接在 XACRO 中使用。
- 编译生成 URDF：通过命令将 XACRO 转换为标准 URDF：

  ```bash
  ros2 run xacro xacro robot.xacro > robot.urdf
  ```
- 直接加载：ROS 节点可直接加载 XACRO 文件，系统会自动编译：

  ```python
  from launch_ros.actions import Node

  Node(
      package='robot_state_publisher',
      executable='robot_state_publisher',
      arguments=['$(find my_package)/urdf/robot.xacro']
  )
  ```

#### **5. 常用工具**

- 检查语法：

  ```bash
  ros2 run xacro xacro --check robot.xacro
  ```
- 可视化 URDF：

  ```bash
  ros2 run urdf_tutorial display.launch.py model:=robot.xacro
  ```

## RQT 可视化

jazzy 中 rqt 已经预安装。其实是一套框架，用于加载各种可视化插件，如 tf-tree

[RQt 的概述和用法 — ROS 2 Documentation： Jazzy 文档](https://docs.ros.org/en/jazzy/Concepts/Intermediate/About-RQt.html)

```bash
#安装rqt插件
sudo apt install ros-$ROS_DISTRO-rqt-tf-tree -y
#删除配置文件以便重新加载
rm -f ~/.config/ros.org/rqt_gui.ini
#启动
rqt
```

## Rviz 可视化

[RViz 用户指南 — ROS 2 文档：Jazzy 文档](https://docs.ros.org/en/jazzy/Tutorials/Intermediate/RViz/RViz-User-Guide/RViz-User-Guide.html)
Rviz 是 ROS（机器人操作系统）中用于**实时可视化机器人传感器数据、状态及算法输出**的核心工具，支持三维场景渲染与交互，帮助开发者调试、验证机器人系统。 可以直接通过 `rviz2`启动
**数据可视化原理**

- 通过订阅 ROS 话题（Topic）获取数据（如激光雷达点云、摄像头图像、机器人位姿等），并在三维场景中渲染。
- 支持多种显示类型（Display）：
  - **PointCloud2**：点云数据（如 LiDAR 扫描结果）。
  - **TF Tree**：坐标系（TF）树状结构，显示各部件的空间关系。

**坐标系（TF）管理**

- **核心依赖**：需正确配置 TF 树（通过 `tf2` 库发布坐标系变换），否则数据无法正确对齐到三维场景中。
- 操作步骤：
  1. 在 Rviz 中设置 **Fixed Frame**（全局参考系，如 `world` 或 `map`）。
  2. 确保所有数据的坐标系（如 `base_link`、`laser_link`）通过 TF 与 Fixed Frame 建立连接。
     **基础操作流程**

1. 启动 Rviz：
   ```bash
   ros2 run rviz rviz -d <配置文件路径>  # 加载预设配置文件（.rviz）
   ```
2. 添加显示组件：
   - 点击左侧 **Add** 按钮，选择所需的 Display 类型，并关联对应的 ROS 话题。
   - 示例：添加 `PointCloud2` 并指定话题为 `/scan`，即可显示激光雷达点云。
3. 调整显示参数： 修改颜色、尺寸、透明度等视觉属性，或设置数据过滤规则（如点云下采样）。
4. 保存与复用配置： 通过 **File > Save Config As** 保存当前布局，下次启动时直接加载以快速复现调试环境。

## SLAM 建图

## Navigation2 导航

[导航概念 — Nav2 1.0.0 文档](https://docs.nav2.org/concepts/index.html)

```bash
# 安装navigation2
sudo apt install ros-$ROS_DISTRO-navigation2
# 安装示例启动包
sudo apt install ros-$ROS_DISTRO-nav2-bringup
```

# Gazebo 仿真

Gazebo 是一款源三维物理仿真平台，原称 Ignition，能构建高度逼真的物理环境，模拟机器人的各种行为，为机器人算法和系统的开发提供了接近真实场景的测试环境，有效降低实际测试的成本和风险。

##### 安装 Gazebo

[Ubuntu 上的二进制安装 — Gazebo fortress documentation](https://gazebosim.org/docs/fortress/install_ubuntu/)

**Gazebo Fortress**

下载模型

```bash
mkdir -p ~/.gazebo
cd ~/.gazebo
git clone https://gitee.com/ohhuo/gazebo_models.git ~/.gazebo/models
rm -rf ~/.gazebo/models/.git #删除.git防止误识别
```

启动

```bash
gazebo xxx.world

# custom_corridor要求是.sdf文件
ign gazebo  ~/worlds/custom_corridor.world  #测试
ign gazebo ~/worlds/corridor.world  #测试
gazebo ~/worlds/custom_corridor.world
ros2 launch turtlebot4_ignition_bringup turtlebot4_ignition.launch.py world:=~/worlds/corridor
```

ROS 必须通过 `gazebo_ros`这个包来加载 world 场景，**其本质是 `gazebo_ros`包调用 gazebo 仿真器，继而加载 world 场景。**

```
/usr/share/gazebo-11/media/materials/scripts/gazebo.material
```

```bash
# 输入gazebo的命令之后，无响应，要么是命令行下一个输入框，或者单纯空白没反应
gazebo --verbose  #如果报错，则执行以下命令
killall gzserver gzclient
```

将 `custom_corridor.sdf`放入 `~/ros2_ws/src/turtlebot4_ignition_bringup/worlds/`。

##### 安装 GZ Harmonic (LTS)

[使用 ROS 安装 Gazebo — Gazebo 谐波文档](https://gazebosim.org/docs/harmonic/ros_installation/)

[使用 ROS 2 与 Gazebo 交互 — Gazebo ionic 文档，适用于 Harmonic](https://gazebosim.org/docs/latest/ros2_integration/)

[【Gazebo 入门教程】 Gazebo 的安装、UI 界面、SDF 文件介绍_gazebo 教程-CSDN 博客](https://blog.csdn.net/lc1852109/article/details/126082238#:~:text=【Gazebo入门教程】第一讲 Gazebo 的安装、UI 界面、SDF 文件介绍一、Gazebo 的简介与安装)

[gz_ros2_control — ROS2_Control：Jazzy 2025 年 5 月文档](https://control.ros.org/jazzy/doc/gz_ros2_control/doc/index.html)

```bash
# lsb-release：系统信息查询工具,GnuPG 加解密工具
sudo apt-get install lsb-release gnupg
# 添加Gazebo仓库的GPC密钥
sudo curl https://packages.osrfoundation.org/gazebo.gpg --output /usr/share/keyrings/pkgs-osrf-archive-keyring.gpg
# 配置Gazebo的APT仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/pkgs-osrf-archive-keyring.gpg] http://packages.osrfoundation.org/gazebo/ubuntu-stable $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/gazebo-stable.list > /dev/null
sudo apt-get update
sudo apt-get install gz-harmonic
sudo apt-get install ros-${ROS_DISTRO}-ros-gz  安装与ROS配对的gz接口
sudo apt install ros-jazzy-ros-gz  直接安装ROS-Jazzy对应的gz
```

**虚拟机上要关闭 3D 加速，无法使用 nvidia 加速。能够解决黑屏或者闪烁问题。**

```bash
sudo apt install nvidia-utils-535
nvidia-smi
```

**虚拟机跑不动，或者无法使用 GPU，可以尝试安装开源的 GPU 驱动 不过也没什么用，建议双系统**

```bash
glxinfo | grep "OpenGL version"
sudo apt install mesa-utils
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update
sudo ubuntu-drivers autoinstall
sudo reboot
```

**示例**

```bash
gz sim empty.sdf
gz sim shapes.sdf
```

### SDF 模型

安装 ros2 功能包，能够将 xacro 格式文件转为 sdf

```bash
sudo apt install ros-$ROS_DISTRO-gazebo-ros-pkgs
```

### 核心组件

**世界（World）** 世界是 Gazebo 仿真的核心，它定义了仿真环境的各种参数，包括地形、光照、重力等物理参数，以及模型的初始位置和姿态。世界文件通常以 `.world`为扩展名，使用 XML 格式编写。可以使用文本编辑器手动编辑世界文件，也可以通过 Gazebo 的图形界面进行部分参数的设置。

**模型（Model）** 模型代表仿真中的物体，如机器人、障碍物等。模型由连杆（Link）和关节（Joint）组成，可使用 URDF 或 SDF 文件描述。

**插件（Plugin）** 插件是 Gazebo 的扩展机制，用于实现特定的功能。可以使用 C++编写自定义插件，然后将其编译成**动态链接库（`.so`文件）**。编写插件时，需要包含 Gazebo 的头文件，并继承相应的插件基类。以下是一个简单的插件示例：

编译完成后，在模型文件或世界文件中添加插件引用，如：

```xml
<plugin name="my_plugin" filename="libmy_plugin.so"/>
```

- **导入模型**：将模型文件放置在 Gazebo 能识别的路径下，通常是 `~/.gazebo/models`目录。在 Gazebo 的图形界面中，通过“Insert”菜单选择相应的模型添加到仿真场景中；或者在世界文件中使用 `<include>`标签引用模型文件。
- **命令行启动**
- launch 下编写配置文件

  ```bash
  ros2 launch gazebo_ros gazebo.launch.py world:=xxx.world
  ```

```bash
# 查看gazebo话题
gz topic -l
```

[一个集成 ROS 2 和 Gazebo 模拟器的模板项目](https://github.com/gazebosim/ros_gz_project_template)

# Turtlebot

### Turtlebot 4

[TurtleBot 4 模拟器 ·用户使用手册](https://turtlebot.github.io/turtlebot4-user-manual/software/turtlebot4_simulator.html)

[Simulation · User Manual](https://turtlebot.github.io/turtlebot4-user-manual/software/simulation.html)

[生成 Slam 地图](https://turtlebot.github.io/turtlebot4-user-manual/tutorials/generate_map.html#generating-a-map)

[Nav2 导航](https://turtlebot.github.io/turtlebot4-user-manual/tutorials/navigation.html)

#### 全局安装

```bash
sudo apt install ros-jazzy-turtlebot4-simulator ros-jazzy-irobot-create-nodes  安装 debian 包
安装路径位于 /opt/ros/jazzy/share/
sudo apt install ros-dev-tools 安装桌面开发工具
ros2 launch turtlebot4_gz_bringup turtlebot4_gz.launch.py  运行默认模拟器，首次运行需要联网下载
sudo apt install ros-jazzy-turtlebot4-*  安装与ros2相关接口
```

```bash
sudo apt install ros-humble-turtlebot4-simulator ros-humble-irobot-create-nodes
sudo apt remove ros-humble-turtlebot4-simulator ros-humble-irobot-create-nodes
# /opt/ros/humble/share/turtlebot4_ignition_bringup/launch/turtlebot4_ignition.launch.py
```

#### 使用源码安装，方便在具体项目中修改模型

````bash
cd ~/ros2_ws/src  这里的ros2_ws是工作空间所在目录
git clone https://github.com/turtlebot/turtlebot4_simulator.git -b jazzy
git clone https://github.com/turtlebot/turtlebot4.git -b jazzy
# 如果不行就手动下载解压并放到相关目录
unzip turtlebot4_simulator-jazzy.zip -d ~/turtlebot4_ws/src/```


### Turtlebot3

**TurtleBot3** 对 ROS 2 Humble 全面支持

[海龟机器人3](https://emanual.robotis.com/docs/en/platform/turtlebot3/overview/)


# ROS项目

````

ros2 launch turtlebot4_ignition_bringup turtlebot4_ignition.launch.py world:=~/custom_corridor

````


```bash
cd ~/ros2_ws
#如果未初始化则初始化
sudo rosdep init
#更新数据
rosdep update
rosdep install --from-path src -yi
rosdep install --from-path src -yi --rosdistro jazzy
source /opt/ros/jazzy/setup.bash 将 ROS2 Jazzy 版本的环境变量加载到当前终端会话中
echo "source /opt/ros/jazzy/setup.bash" >> ~/.bashrc
colcon build  --allow-overriding turtlebot4_description turtlebot4_msgs turtlebot4_node
--symlink-install  #使用符号链接代替复制文件，使源码修改立即生效，无需重新编译。
--allow-overriding
# 明确允许覆盖系统中已存在的同名包（如 turtlebot4_description），需谨慎使用以避免兼容性问题。
colcon build --packages-select ros_gz_bridge  --allow-overriding ros_gz_bridge
source install/setup.bash
sudo echo "source ~/ros2_ws/install/setup.bash" >> ~/.bashrc
source ~/.bashrc  # 立即生效
````

```bash
rm -rf build install log #清除缓存
colcon build
colcon build --packages-select sensor_fusion
source install/setup.bash
ros2 pkg executables sensor_fusion  查看某个包是否正常生成
ros2 node list
ros2 topic list
ros2 topic list | grep tf
xacro ultrasonic_sensor.xacro  # 无报错即格式正确
# 检查融合节点发布的话题
ros2 topic info /fused_scan
ros2 node info /sensor_fusion_node  查看
ros2 topic echo /fused_scan
ros2 topic info /ultrasonic_front/range
ros2 topic echo /ultrasonic_front/range
```

手动测试 urdf 模型文件是否有误

```bash
ros2 run xacro xacro ~/ros2_ws/src/turtlebot4/turtlebot4_description/urdf/standard/turtlebot4.urdf.xacro > xxx.urdf
check_urdf turtlebot4.urdf
```

## Turtlebot 3

[海龟机器人3](https://emanual.robotis.com/docs/en/platform/turtlebot3/simulation/#gazebo-simulation)

 Fixed Frame [map] does not exist的解决方法以及Fixed Frame无法进行下拉-CSDN博客](https://blog.csdn.net/qq_59860384/article/details/148673855)

```bash
export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
# 启动建图
ros2 launch turtlebot3_cartographer cartographer.launch.py use_sim_time:=True
# 启动导航
ros2 launch turtlebot3_navigation2 navigation2.launch.py use_sim_time:=True map:=$HOME/map.yaml

```
