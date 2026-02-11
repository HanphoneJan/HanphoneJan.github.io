非常好的入门教学视频！！[Bilibili：40分钟的Docker实战攻略，一期视频精通Docker](https://www.bilibili.com/video/BV1THKyzBER6/?share_source=copy_web&vd_source=186f482d5782bc8b1831fb6379b26ea2)
以下笔记中大部分也是转载了该视频评论区的一条热评。
该UP主给出的资源 [tech-shrimp/docker_installer： Docker官方安装包，用来解决因国内网络无法安装使用Docker的问题](https://github.com/tech-shrimp/docker_installer)
## 常用docker命令
```shell
# 查看运行状态
docker ps

# 查看日志
docker logs qdrant -f

# 停止容器
docker stop qdrant

# 启动容器
docker start qdrant

# 删除容器（数据仍在卷中）
docker rm qdrant
```
## 架构
Docker 是一种容器化技术，能将应用及其依赖打包成标准化容器，确保在任何支持 Docker 的环境中都能一致运行。**Docker与虚拟机的区别就在于Docker不同容器共用一个系统内核！容器(Container)与镜像(Image)的关系类似于面向对象编程中的对象与类，容器是镜像的实例。容器包含了程序、依赖库和文件系统。** 

Docker是基于Linux的，运行在Windows和Mac上的Docker都虚拟了一个Linux子系统。所以Windows上需要开启Virtual Machine Platform和WSL功能。
### 技术原理
**Cgroups (Control Groups)** 用于限制和隔离进程的资源使用（CPU、内存、网络带宽等），确保容器资源消耗不影响宿主机或其他容器。
**Namespaces** 用于隔离进程的资源视图，使得容器只能看到自己内部的进程ID、网络资源和文件目录，而看不到宿主机的。
Docker容器本质上是一个特殊的进程，但进入容器内部后，其表现如同一个独立的操作系统。
**Docker仓库 (Registry)** 用于存放和分享Docker镜像，Docker Hub是Docker的官方公共仓库。
![docker命令架构.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/docker%E6%9E%B6%E6%9E%84.webp)

### Docker镜像格式
面试被问到这个了，不会，没绷住。
#### 归档 / 导出格式（可直接文件传输的格式）
这类格式是将镜像打包为可存储、可传输的文件，最常见的就是 `.tar` 衍生格式，也是日常运维中最常接触的类型：
1. 纯 `.tar` 格式（Docker 早期 / 通用导出）
- **生成方式**：通过 `docker save <镜像名:标签> > 镜像名.tar` 命令导出，本质是将镜像的多层文件系统、元数据打包为 tar 归档文件。
- **特点**：
    - 可包含多个镜像（如 `docker save 镜像1 镜像2 > all.tar`）；
    - 文件名可自定义（`.tar` 是后缀，也可写成 `.tar.gz` 压缩）；
    - 导入需用 `docker load < 镜像名.tar` 命令，会恢复镜像的完整信息（包括层、标签、ID）。
2. `.tar.gz`/`.tgz`（压缩版 tar 格式）
- **生成方式**：在 `docker save` 后通过 `gzip` 压缩，如 `docker save 镜像名 | gzip > 镜像名.tar.gz`。
- **特点**：体积更小，适合网络传输 / 长期存储；导入时需先解压（`gzip -d 镜像名.tar.gz`）再 `docker load`，或直接 `zcat 镜像名.tar.gz | docker load`。
3. `.docker` 格式（OCI 标准归档）
- **定义**：OCI（Open Container Initiative）规范定义的镜像归档格式，本质是符合 OCI 规范的 tar 包，后缀常为 `.docker`（也可仍用 `.tar`）。
- **生成方式**：通过 `docker save --format oci 镜像名 > 镜像名.docker` 或 `buildah push 镜像名 oci-archive:镜像名.docker`。
- **特点**：跨容器运行时兼容（如支持 containerd、CRI-O），比 Docker 原生 tar 更标准化。

#### 核心存储格式（Docker 内部 / 仓库存储的格式）

这类格式是 Docker 镜像在本地存储、推送到镜像仓库（如 Docker Hub、Harbor）时的底层格式，用户不直接接触，但决定了镜像的兼容性和效率：
1. Docker V2 Schema 1（早期格式，已废弃）
- **特点**：镜像元数据和层信息耦合，不支持内容寻址，安全性和扩展性差，Docker 1.10 后被 Schema 2 取代，目前几乎不再使用。
1. Docker V2 Schema 2（Docker 主流格式）
- **定义**：Docker 1.10+ 主推的镜像格式，也是 Docker Hub 存储的默认格式，核心是「内容寻址」（通过层的 SHA256 哈希标识）。
- **核心组成**：
    - 镜像层：每个层是一个只读的文件系统快照，以 `sha256:<哈希>` 命名；
    - 配置文件（config）：JSON 格式，包含镜像的元数据（如 CMD、ENTRYPOINT、环境变量、层哈希）；
    - 清单文件（manifest）：JSON 格式，描述镜像的配置文件地址、各层地址、架构（amd64/arm64）等。
- **特点**：支持多架构镜像（manifest list）、层共享、校验和验证（防止篡改）。

1. OCI Image Format（OCI 标准存储格式）
- **定义**：OCI 制定的容器镜像标准（兼容 Docker V2 Schema 2），是行业通用规范，确保镜像可在不同容器运行时（Docker、containerd、CRI-O）间兼容。
- **核心组成**：
    - `blobs/`：存储镜像层（layer）、配置文件（config）的二进制数据；
    - `index.json`：对应 Docker 的 manifest list，描述多架构镜像；
    - `manifest.json`：对应 Docker 的 manifest，描述单架构镜像；
- **特点**：完全开源、无厂商锁定，是云原生场景的主流格式，Docker 20.10+ 已全面支持。

## 安装

### 在Ubuntu/Debian系统上安装Docker

##### 更新软件包

在开始安装Docker之前，建议先更新系统的软件包。

```bash
sudo apt update && sudo apt upgrade -y
```

##### 安装依赖包

安装一些必要的依赖包，这些依赖包在安装Docker时会用到。

```bash
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release -y
```

##### 添加Docker GPG密钥

为了验证从Docker仓库下载的软件包，我们需要添加Docker的官方GPG密钥。

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

##### 添加Docker仓库

将Docker的仓库添加到APT源列表中。

```bash
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

对于Debian系统，请替换`ubuntu`为`debian`。

##### 安装Docker引擎

更新APT包索引，然后安装Docker引擎。

```bash
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y
```

##### 启动并验证Docker

启动Docker服务并设置开机自启动，然后验证Docker是否安装成功。

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo docker --version
```

如果看到Docker的版本信息，说明Docker成功安装。

### 在CentOS/RHEL系统上安装Docker

##### 更新软件包

同样，建议先更新系统的软件包。

```bash
sudo yum update -y
```

##### 安装依赖包

安装必要的依赖包。

```bash
sudo yum install -y yum-utils device-mapper-persistent-data lvm2
```

##### 添加Docker仓库

使用`yum-config-manager`添加Docker CE仓库。

```bash
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

对于RHEL系统，请将`centos`替换为`rhel`。

##### 安装Docker引擎

安装Docker CE和`containerd`。

```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io
```

##### 启动并验证Docker

启动Docker服务并设置开机自启动，然后验证Docker是否安装成功。

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo docker --version
```

如果看到Docker的版本信息，说明Docker成功安装。

### Windows系统安装
首先启用Windows功能，勾选“Virtual Machine Platform”（虚拟机平台）和“适用于Linux的Windows子系统”（WSL）；根据提示重启电脑；
安装WSL时，以管理员身份打开命令提示符（CMD），执行`wsl --set-default-version 2`将WSL默认版本设为2，执行`wsl --update`安装WSL（国内网络建议添加`--web-download`参数减少下载失败）；
从官方网站下载对应CPU架构的Docker Desktop安装包（Windows通常为AMD64），按提示完成安装；启动Docker Desktop，且需保持该软件运行；
在Windows终端输入`docker --version`，若能打印版本号则表示安装成功。
## Docker镜像管理命令
### `docker pull` - 下载镜像
**功能**是从Docker仓库下载镜像到本地。
**镜像构成**：一个完整的镜像名称包含四部分：`[registry_address/][namespace/] image_name[:tag]`。其中，`registry_address`是Docker仓库的注册表地址，`docker.io`表示Docker Hub官方仓库，可省略；`namespace`是命名空间，通常是作者或组织名称，`Library`是Docker官方仓库的命名空间，可省略；`image_name`是镜像的名称；`tag`是镜像的标签名，通常表示版本号，`latest`表示最新版本，可省略。

**示例**：`docker pull docker.io/Library/nginx:latex`，即从Docker Hub官方仓库下载最新版Nginx镜像，也可简化为`docker pull nginx`。
#### Registry (注册表) 与 Repository (镜像库)
**Registry**指整个Docker Hub网站可视为一个Registry；**Repository**如Nginx，存储了同一个镜像的不同版本。
#### 网络问题解决方案
**Linux**需修改`/etc/docker/daemon.json`文件，添加`"registry-mirrors": ["https://<your-mirror-address>"]`，然后重启Docker服务（`sudo systemctl restart docker`）；**Windows/Mac**在Docker Desktop的设置中，进入“Docker Engine”配置项，在`registry-mirrors`中添加镜像站地址，点击“Apply & Restart”。

#### 镜像CPU架构  (`--platform`)
使用--platform参数可以指定镜像的CPU架构，`docker pull`命令默认会自动选择最适合当前宿主机CPU架构的镜像。

### `docker images` - 列出本地镜像

### `docker rmi` - 删除镜像
即remove image，删除本地的Docker镜像。参数指定镜像名称或ID。
## Docker容器管理命令
### `docker run` - 创建并运行容器 (最重要命令)
**功能**是使用指定的镜像创建并运行一个容器。
**自动拉取**：如果本地不存在指定镜像，`docker run`会先自动拉取镜像，再创建并运行容器。
**`docker ps`** 用于查看正在运行的容器，输出信息包括`Container ID`（容器唯一ID）、`Image`（基于哪个镜像创建）、`Names`（容器名称）；`docker ps -a`则查看所有容器（包括正在运行和已停止的）。
#### `-d` (Detached Mode)
**功能**是让容器在后台执行，不阻塞当前终端窗口；
**效果**为控制台只打印容器ID，容器日志不会直接输出到终端。

#### `-p` (Port Mapping / 端口映射)
**背景**：Docker容器运行在独立的虚拟网络环境中，默认无法直接从宿主机访问容器内部网络；
**功能**是将宿主机的端口映射到容器内部的端口；
**语法**为`-p <宿主机端口>:<容器内部端口>`（先外后内）；
**示例**：`-p 80:80`将宿主机的80端口转发到容器内的80端口。
#### `-v` (Volume Mounting / 挂载卷)
**功能**是将宿主机的文件目录与容器内的文件目录进行绑定；**目的**是实现数据的**持久化保存**，当容器被删除时，容器内的数据也会被删除，但**挂载卷可确保数据保存在宿主机上**。

**类型**包括绑定挂载 (Bind Mount) 和命名卷挂载 (Named Volume)。绑定挂载是直接将宿主机目录路径写入命令，语法为`-v <宿主机目录路径>:<容器内部目录路径>`，注意宿主机目录内容会覆盖容器内对应目录的原始内容。命名卷挂载是让Docker自动创建一个存储空间，并为其命名，创建命名卷使用`docker volume create <卷名称>`，使用命名卷的语法为`-v <卷名称>:<容器内部目录路径>`，其特点是命名卷在第一次使用时，Docker会将容器的文件夹内容同步到命名卷进行初始化（绑定挂载无此功能）。
##### 卷管理命令
`docker volume ls`用于列出所有创建过的卷；
`docker volume inspect <卷名称>`查看卷的详细信息，包括在宿主机的真实目录；
`docker volume rm <卷名称>`删除一个卷；`docker volume prune`删除所有未被任何容器使用的卷。
#### `-e` (Environment Variables / 环境变量)
**功能**是向容器内部传递环境变量；
**语法**为`-e <KEY>=<VALUE>`；
**用途**常用于配置数据库账号密码等；
**查找**可在Docker Hub镜像文档或开源项目的GitHub仓库中查找可用的环境变量。

#### `--name` (自定义容器名称)
**功能**是为容器指定一个自定义的、在宿主机上唯一的名称。

#### `-it` (Interactive & TTY / 交互式终端)
**功能**是让控制台进入容器内部，获得一个交互式的命令行环境，一般用于临时调试容器，执行Linux命令；**语法**为`docker run -it <镜像名称> /bin/bash` (或`/bin/sh`)。

#### `--rm` (运行结束后自动删除)
**功能**是当容器停止时，自动将其从宿主机上删除，一般与`-it`联用，用于临时调试场景。

#### `--restart` (重启策略)
**功能**是配置容器停止时的重启行为；**常用策略**有`always`（只要容器停止，包括内部错误崩溃、宿主机断电等，就会立即重启）和`unless-stopped`（除非手动停止容器，否则都会尝试重启，对于生产环境非常有用，可自动重启因意外停止的容器，而手动停止的容器不会再重启）。

### 容器启停与管理
`docker stop <容器ID或名称>`用于停止一个正在运行的容器；
`docker start <容器ID或名称>`重新启动一个已停止的容器；使用`stop`和`start`启停容器时，之前`docker run`时设置的端口映射、挂载卷、环境变量等参数都会被Docker记录并保留，无需重新设置；
`docker inspect <容器ID或名称>`查看容器的详细配置信息，输出内容复杂，可借助AI辅助分析；
`docker create <镜像名称>`只创建容器，但不立即启动，若要启动，需后续执行`docker start`命令。

### 容器内部操作与调试
`docker logs <容器ID或名称>`用于查看容器的运行日志，`-f`参数可滚动查看日志，实时刷新。
`docker exec`用于在容器内部执行命令，
**功能**是在一个正在运行的Docker容器内部执行Linux命令；
**语法**为`docker exec <容器ID或名称> <命令>`；
**示例**：`docker exec my_nginx ps -ef`查看容器内进程；进入交互式环境可使用`docker exec -it <容器ID或名称> /bin/sh`（或`/bin/bash`），获得容器内部交互式命令行环境，进行文件系统查看、进程管理或深入调试；注意容器内部通常是极简操作系统，可能缺失`vi`等常用工具，需要自行安装，需先在容器内部执行`cat /etc/os-release`查询系统发行版本（如Debian系容器使用`apt update`和`apt install vim`）。

## Dockerfile - 构建镜像的蓝图
Dockerfile是一个文本文件，详细列出了如何制作Docker镜像的步骤和指令，可类比为制作模具的图纸。

### 基本结构与指令
`FROM <基础镜像>`是所有Dockerfile的第一行，选择一个基础镜像，表示新镜像在此基础上构建；`WORKDIR <目录路径>`设置镜像内的工作目录，后续命令在此目录下执行；
`COPY <源路径> <目标路径>`将宿主机的文件或目录拷贝到镜像内的指定路径；
`RUN <命令>`在镜像构建过程中执行的命令（例如安装依赖）；
`EXPOSE <端口号>`声明镜像提供服务的端口（仅为声明，非强制，实际端口映射仍由`-p`参数决定）；
`CMD <命令>`是容器运行时默认执行的启动命令，一个Dockerfile只能有一个`CMD`指令；
`ENTRYPOINT <命令>`与`CMD`类似，但优先级更高，不易被`docker run`命令覆盖。
dockerfile文件示例
```dockerfile
# 选择基础镜像（Python 3.9官方镜像）
FROM python:3.9-slim
# 设置工作目录为/app
WORKDIR /app
# 将宿主机当前目录下的requirements.txt拷贝到镜像的/app目录
COPY requirements.txt .
# 安装Python依赖包
RUN pip install --no-cache-dir -r requirements.txt
# 将宿主机当前目录下的所有文件拷贝到镜像的/app目录
COPY . .
# 声明容器对外暴露8000端口
EXPOSE 8000
# 设置入口点（固定启动命令前缀）
ENTRYPOINT ["python", "app.py"]
# 设置默认命令参数（可被docker run命令覆盖）
CMD ["--port", "8000"]
```

#### `docker build` - 构建镜像
**功能**是根据Dockerfile构建Docker镜像；
**语法**为`docker build -t <镜像名称>[:<版本号>] <Dockerfile所在目录>`；
**示例**：`docker build -t docker-test .` (在当前目录构建名为`docker-test`的镜像)。

#### 镜像推送至Docker Hub
首先登录Docker Hub：`docker login`；
重新标记镜像：`docker tag <本地镜像名称> <你的用户名>/<镜像名称>[:<版本号>]`，推送时镜像名称必须包含用户名作为命名空间；
推送镜像：`docker push <你的用户名>/<镜像名称>[:<版本号>]`；
验证可在Docker Hub网站上搜索到已推送的镜像，其他用户即可通过`docker pull`下载使用。

## Docker网络模式
与虚拟机类似。
### Bridge 桥接模式
所有容器默认连接到此网络，每个容器被分配一个内部IP地址（通常是`172.17.x.x`开头）。**通信**方面，同一Bridge网络内的容器可以通过内部IP地址互相访问，容器网络与宿主机网络默认隔离，需通过端口映射（`-p`）才能从宿主机访问。

**自定义子网**：创建使用`docker network create <子网名称>`，加入使用`docker run --network <子网名称> ...`。同一子网内的容器可以使用**容器名称**互相访问（Docker内部DNS机制），不同子网之间默认隔离。

![docker入门桥接网络子网.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/docker%E5%85%A5%E9%97%A8%E6%A1%A5%E6%8E%A5%E7%BD%91%E7%BB%9C%E5%AD%90%E7%BD%91.webp)

### Host 主机模式
**功能**是Docker容器直接共享宿主机的网络命名空间；**IP地址**为容器直接使用宿主机的IP地址；**端口**无需端口映射（`-p`），容器内的服务直接运行在宿主机的端口上，通过宿主机的IP和端口即可访问；**用途**是解决一些复杂的网络问题；**语法**为`docker run --network host ...`。

### None 无网络模式
**功能**是容器不连接任何网络，完全隔离；**语法**为`docker run --network none ...`。

#### 网络管理命令
`docker network ls`用于列出所有Docker网络（包括默认的bridge、host、none以及自定义子网）；`docker network rm <网络名称>`删除自定义子网（默认网络不可删除）。

## Docker Compose - 多容器编排
**背景**：当一个完整的应用由多个模块（如前端、后端、数据库）组成时，若将所有模块打包成一个巨大容器，会导致故障蔓延、伸缩性差；若每个模块独立容器化，则管理多个容器（创建、网络配置）会增加复杂性。
**解决方案**：Docker Compose是一种轻量级的容器编排技术，用于管理多个容器的创建和协同工作。使用YAML文件（通常命名为`docker-compose.yml`）定义多服务应用，可视为多个`docker run`命令按照特定格式组织在一个文件中。
`services`是顶级元素，每个服务对应一个容器；
服务名称（如`mongodb`）对应`docker run`中的`--name`，作为容器名的一部分；
`image`对应`docker run`中的镜像名；`environment`对应`docker run`的`-e`参数；
`volumes`对应`docker run`的`-v`参数；`ports`对应`docker run`的`-p`参数。
**网络**方面，Docker Compose会自动为每个Compose文件创建一个默认子网，文件中定义的所有容器都会自动加入此子网，并可通过服务名称互相访问；`depends_on`定义容器的启动顺序，确保依赖服务先启动。
![dockercompose入门示例对比.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/dockercompose%E5%85%A5%E9%97%A8%E7%A4%BA%E4%BE%8B%E5%AF%B9%E6%AF%94.webp)
compose文件示例
```yaml
# 版本声明（根据Docker Compose版本选择，常用3.x）
version: '3.8'
# 定义所有服务（容器）
services:
  # 服务1：Web应用（基于Python）
  webapp:
    # 使用的镜像（可替换为自定义镜像或官方镜像）
    image: python:3.9-slim
    # 端口映射：宿主机8000端口 -> 容器8000端口（对应-p 8000:8000）
    ports:
      - "8000:8000"
    # 环境变量（对应-e参数）
    environment:
      - DATABASE_URL=mongodb://mongodb:27017/mydb  # 连接下方的mongodb服务
      - DEBUG=True
    # 数据卷：宿主机当前目录的app文件夹 -> 容器内的/app（对应-v ./app:/app）
    volumes:
      - ./app:/app
    # 工作目录（容器内执行命令的目录）
    working_dir: /app
    # 容器启动命令
    command: python app.py
    # 依赖关系：启动webapp前先启动mongodb
    depends_on:
      - mongodb

  # 服务2：MongoDB数据库
  mongodb:
    # 使用官方MongoDB镜像
    image: mongo:5.0
    # 端口映射：宿主机27017 -> 容器27017（可选，本地调试用）
    ports:
      - "27017:27017"
    # 数据卷：持久化数据库数据（宿主机的mongodb_data目录 -> 容器内的数据目录）
    volumes:
      - mongodb_data:/data/db
    # 环境变量：设置数据库root用户密码
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=123456
# 声明命名卷（需在顶级volumes下定义，用于持久化数据）
volumes:
  mongodb_data:
```
### Docker Compose命令
`docker compose up`用于启动当前目录下YAML文件中定义的所有服务（容器），该文件命名需要标准规范（docker-compose.yaml或compose.yaml），而命名为test.yaml是无法启动的；`-d`参数可实现后台运行，且会自动创建子网和容器。
`docker compose down`停止并删除由Compose文件定义的所有服务和网络；`docker compose stop`仅停止服务，不删除容器；`docker compose start`启动已停止的服务；`docker compose -f <文件名.yml> up`指定非标准文件名的Compose文件进行操作。
```shell
docker compose up -d  # -d 是 --detach 的简写，代表后台运行；
docker compose stop
docker compose down
```
## 安装Docker desktop
教程：[Docker Desktop For Windows 完整安装教程-CSDN博客](https://blog.csdn.net/qq_38444844/article/details/156200858)
安装docker默认在c盘，界面没有修改安装目录的选项，所以可以用命令安装到d盘，准备d盘安装目录：
D:\install_package
├── Docker_Desktop
│ ├── install_path\ ← Docker将安装在这里
│ ├── downloads\ ← 存放安装包
│ └── data\ ← 后续存放数据文件

```shell
# 在PowerShell中执行，创建文件夹
New-Item -ItemType Directory -Path "D:\install_package\Docker_Desktop\install_path" -Force
New-Item -ItemType Directory -Path "D:\install_package\Docker_Desktop\downloads" -Force
New-Item -ItemType Directory -Path "D:\install_package\Docker_Desktop\data" -Force

# 给文件夹完全控制权限（避免安装失败）
icacls "D:\install_package\Docker_Desktop\install_path" /grant "Everyone:F" /T
icacls "D:\install_package\Docker_Desktop\install_path" /grant "Users:F" /T

#将安装包移动到：D:\install_package\Docker_Desktop\downloads\ ，
# 以管理员身份打开PowerShell
# 切换到下载目录
cd "D:\install_package\Docker_Desktop\downloads"

# 查看安装包文件名（通常是 Docker Desktop Installer.exe）
dir *.exe

# 运行安装命令，指定安装路径
# 注意：根据你的实际文件名调整
.\"Docker Desktop Installer.exe" install --installation-dir="D:\install_package\Docker_Desktop\install_path"

# 1、在系统上搜索 docker.exe目录
Get-Command docker -ErrorAction SilentlyContinue

# 2、设置docker.exe路径变量
$dockerCliPath = "D:\install_package\Docker_Desktop\install_path\resources\bin"
# 3、将Docker添加到系统PATH
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$dockerCliPath", "Machine")
Write-Host "已将 $dockerCliPath 添加到系统 PATH"

# 4、检查Docker版本
docker --version
```
## 什么项目适合打包为单一镜像？

|特征|说明|示例|
|---|---|---|
|**无外部依赖**|不需要外部配置文件或密钥|静态网站、纯计算工具|
|**数据内嵌**|模型数据、配置文件打包在镜像内|微调后的 LLM、NLP 模型|
|**无状态**|运行时不产生持久化数据|API 服务、批处理任务|
|**可替换**|更新时直接替换整个镜像|定期更新的算法模型|
# k8s
Kubernetes，适用于跨节点（物理机 / 虚拟机）的容器集群管理，让应用部署从 “单容器 / 单主机” 升级为 “分布式容器集群”。
Docker Compose适合个人使用和单机运行的轻量级容器编排需求。Kubernetes是企业级服务器集群和大规模容器编排的解决方案，功能更为复杂。
