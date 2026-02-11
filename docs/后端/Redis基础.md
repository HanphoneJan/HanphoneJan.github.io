redis官方不建议在windows下使用redis，虽然微软维护了windows版本，但是建议使用docker安装

```shell
# 无持久化，容器删除数据丢失
docker run -d --name redis -p 6379:6379 redis
# 持久化+开机自启
docker run -d --name redis -p 6379:6379 -v redis-data:/data --restart always redis redis-server --appendonly yes
```

#### 方法1：将当前用户添加到docker用户组（推荐）

这是长期且安全的解决方案，添加后无需每次都用 `sudo`执行Docker命令。

1. 首先创建 `docker`用户组（如果不存在）：

   ```bash
   sudo groupadd docker
   ```
2. 将当前用户 `hanphone`添加到 `docker`组：

   ```bash
   sudo usermod -aG docker hanphone
   ```
3. 刷新用户组权限（无需重启系统）：

   ```bash
   newgrp docker
   ```
4. 验证是否添加成功：

   ```bash
   docker ps
   ```
   如果没有报错，说明权限配置成功。



你现在遇到的问题是Docker无法从官方镜像仓库拉取redis镜像，核心原因是网络连接被重置，大概率是访问Docker Hub的网络不通导致的。


配置Docker使用国内的镜像源（镜像加速器）

#### 步骤1：创建/修改Docker配置文件
首先创建Docker的配置目录（如果不存在），然后编辑配置文件：
```bash
# 创建配置目录
sudo mkdir -p /etc/docker

# 编辑daemon.json文件（如果文件不存在会新建）
sudo vim /etc/docker/daemon.json
```

#### 步骤2：添加国内镜像源
在打开的`daemon.json`文件中，粘贴以下内容：
```json
{
  "debug": true,
  "experimental": false,
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.m.daocloud.io", 
    "https://lispy.org",
    "https://docker-0.unsee.tech",
    "https://docker.xuanyuan.me"
  ]
}

```

#### 步骤3：重启Docker服务
配置完成后，需要重启Docker守护进程使配置生效：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

