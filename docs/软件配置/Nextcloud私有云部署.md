---
title: Nextcloud 私有云部署（Docker Compose）
description: 用 Docker Compose 部署 Nextcloud + MariaDB：目录规划、信任域名、备份与常见报错。
---

在自己的服务器上用 Docker Compose 拉起 Nextcloud + MariaDB 的完整过程，包括国内镜像加速、信任域名配置、数据目录规划，以及部署完之后一定会遇到的几个报错。

文中的 IP 与密码已替换成占位符，照着做时需要换成自己的。

## 📋 部署环境
- **操作系统**: OpenCloudOS 9_4
- **部署方式**: Docker + Docker Compose
- **数据库**: MariaDB 10_6
- **访问端口**: 8080

## 🚀 部署步骤

### 1. 系统准备
```bash
## 更新系统
dnf update -y

## 安装必要工具
dnf install -y iptables iptables-services
ln -sf /usr/sbin/iptables-legacy /usr/sbin/iptables
```

### 2. 安装Docker
```bash
## 安装Docker和Docker Compose
dnf install -y docker docker-compose

## 配置Docker环境变量（解决iptables路径问题）
sed -i 's|ExecStart=/usr/bin/dockerd|Environment=PATH=/usr/sbin:$PATH\nExecStart=/usr/bin/dockerd|' /usr/lib/systemd/system/docker_service

## 配置国内镜像加速
cat > /etc/docker/daemon_json << 'EOF'
{
  "registry-mirrors": [
    "https://docker_m.daocloud_io",
    "https://hub-mirror_c.163_com",
    "https://mirror_baidubce_com",
    "https://registry_docker-cn_com"
  ]
}
EOF

## 启动Docker服务
systemctl daemon-reload
systemctl start docker
systemctl enable docker
```

### 3. 创建部署目录和配置文件
```bash
mkdir -p /opt/nextcloud
cd /opt/nextcloud
```

创建 `docker-compose_yml`：
```yaml
version: '3'

services:
  db:
    image: mariadb:10_6
    command: --transaction-isolation=READ-COMMITTED --log-bin=binlog --binlog-format=ROW
    restart: always
    volumes:
      - db_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=<数据库root密码>
      - MYSQL_PASSWORD=<数据库密码>
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud

  app:
    image: nextcloud:latest
    restart: always
    ports:
      - "8080:80"
    depends_on:
      - db
    volumes:
      - nextcloud_data:/var/www/html
    environment:
      - MYSQL_HOST=db
      - MYSQL_PASSWORD=<数据库密码>
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - NEXTCLOUD_ADMIN_USER=admin
      - NEXTCLOUD_ADMIN_PASSWORD=<管理员密码>

volumes:
  db_data:
  nextcloud_data:
```

### 4. 启动Nextcloud
```bash
## 拉取镜像并启动服务
docker-compose up -d

## 检查服务状态
docker ps
```

### 5. 配置信任域名
```bash
## 添加内网IP
docker exec nextcloud-app-1 php occ config:system:set trusted_domains 0 --value="localhost"
docker exec nextcloud-app-1 php occ config:system:set trusted_domains 1 --value="<内网IP>"
docker exec nextcloud-app-1 php occ config:system:set trusted_domains 2 --value="<内网IP>:8080"

## 添加公网IP（根据实际情况修改）
docker exec nextcloud-app-1 php occ config:system:set trusted_domains 3 --value="<服务器公网IP>"
docker exec nextcloud-app-1 php occ config:system:set trusted_domains 4 --value="<服务器公网IP>:8080"

## 重启服务
docker restart nextcloud-app-1
```

## 🔧 访问信息
- **访问地址**: `http://服务器IP:8080`
- **管理员账号**: `admin`
- **管理员密码**: `<管理员密码>`
- **数据库信息**:
  - 主机: `db` (容器内部)
  - 数据库: `nextcloud`
  - 用户: `nextcloud`
  - 密码: `<数据库密码>`

## 📊 常用管理命令
```bash
## 查看容器状态
docker ps
docker-compose ps

## 查看日志
docker-compose logs -f
docker logs nextcloud-app-1

## 进入容器
docker exec -it nextcloud-app-1 bash

## Nextcloud管理命令
docker exec nextcloud-app-1 php occ status
docker exec nextcloud-app-1 php occ maintenance:mode --on
docker exec nextcloud-app-1 php occ maintenance:mode --off

## 备份数据
docker-compose stop
cp -r /opt/nextcloud/volumes/ /backup/nextcloud/
docker-compose start

## 更新Nextcloud
docker-compose pull
docker-compose up -d
```

## ⚠️ 注意事项
1. **数据持久化**: 所有数据存储在Docker卷中，确保定期备份
2. **安全设置**: 默认密码较弱，首次登录后请修改
3. **防火墙**: 确保8080端口对外开放
4. **SSL证书**: 生产环境建议配置HTTPS
5. **内存要求**: Nextcloud建议至少2GB内存

## 🔄 故障排除
1. **无法访问**:
   - 检查防火墙: `firewall-cmd --list-ports`
   - 检查容器状态: `docker ps`
   - 查看日志: `docker logs nextcloud-app-1`

2. **信任域名错误**:
   ```bash
   docker exec nextcloud-app-1 php occ config:system:get trusted_domains
   docker exec nextcloud-app-1 php occ config:system:set trusted_domains X --value="你的域名或IP"
   ```

3. **数据库连接问题**:
   ```bash
   docker exec nextcloud-db-1 mysql -u nextcloud -p <数据库密码> -e "SHOW DATABASES;"
   ```

## 📈 性能优化建议
1. 配置Redis缓存
2. 启用APCu内存缓存
3. 配置Cron任务处理后台作业
4. 启用文件缓存
5. 配置OPcache
