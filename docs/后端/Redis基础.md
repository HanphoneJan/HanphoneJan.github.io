---
title: Redis 基础
description: 用 Docker 起一个 Redis（含持久化开关），以及容器权限和国内镜像加速这两件必做的前置。
---

这一篇目前只到「能起来」：把 Redis 跑起来，再把 Docker 那两件常见的前置（权限、镜像源）处理掉。Redis 的命令、持久化原理、过期与淘汰策略还没整理，别把它当完整速查用。

官方不建议在 Windows 下直接装 Redis（微软维护过 Windows 版本，但已不是主流做法），用 Docker 跑最省事：

```shell
# 无持久化，容器删除数据丢失
docker run -d --name redis -p 6379:6379 redis
# 持久化 + 开机自启
docker run -d --name redis -p 6379:6379 -v redis-data:/data --restart always redis redis-server --appendonly yes
```

第二行比第一行多了三样：`-v redis-data:/data` 把数据落在命名卷里（容器删了数据还在）、`--restart always` 开机自启、`--appendonly yes` 打开 AOF。

## Docker 环境

下面两条不是 Redis 的事，但没有它们 Redis 起不来：权限不对要次次加 `sudo`，镜像源不通则 `docker pull` 直接失败。

### 把当前用户加进 docker 组（免 sudo）

这是长期且安全的解决方案，添加后无需每次都用 `sudo` 执行 Docker 命令。

1. 首先创建 `docker` 用户组（如果不存在）：

   ```bash
   sudo groupadd docker
   ```
2. 将当前用户加入 `docker` 组：

   ```bash
   sudo usermod -aG docker $USER
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

### 拉不动镜像：换国内镜像源

如果 `docker pull` 报网络连接被重置，大概率是访问 Docker Hub 不通，配一个国内镜像源（镜像加速器）。

**步骤 1：创建 / 修改 Docker 配置文件**

```bash
# 创建配置目录
sudo mkdir -p /etc/docker

# 编辑 daemon.json 文件（如果文件不存在会新建）
sudo vim /etc/docker/daemon.json
```

**步骤 2：添加国内镜像源**

在打开的 `daemon.json` 文件中，粘贴以下内容：

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

**步骤 3：重启 Docker 服务**

配置完成后，需要重启 Docker 守护进程使配置生效：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```
