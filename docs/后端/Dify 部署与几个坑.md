---
title: Dify 部署与几个坑
description: 用 Docker Compose 起 Dify、改默认端口、以及「模板创建不了」「聊天助手总是先检索知识库」这类问题。
---

Dify 把「知识库 + 模型 + 工作流」做成了一个可视化 IDE，适合快速验证一个想法。下面是部署过程，以及实际用下来会踩到的几处。

## 部署

Windows 上先启动 Docker Desktop，然后：

```bash
cd dify/docker
cp .env.example .env
docker compose up -d
```

默认占 80 端口。如果 80 已经被 Nginx 或别的服务占了，改 `.env`：

```ini
EXPOSE_NGINX_PORT=22080
```

改完 `docker compose up -d` 重新拉起，访问 `http://localhost:22080/apps`。

## 踩过的坑

**模板入口在「探索」，不在「工作室」。** 在工作室里点「从模板创建」是走不通的，得去探索页选模板。

**普通聊天助手会无条件检索知识库。** 哪怕用户问的是「你好」，系统也会先跑一次检索再回答——延迟和 token 都白花。解决办法是换成「Agent」或加一个意图判断节点。

**改了 `.env` 里的端口不一定生效**，容器有缓存。先 `docker compose down` 再 `up -d`，别只 `restart`。

## 一点看法

可视化工作流适合**演示和联调**：把 RAG 的召回、重排、生成串起来看效果，比写代码快得多。但节点一多，连线本身就变成了程序，而它没有版本控制、没有单元测试、diff 也看不懂。

所以实际项目里的边界大概是：**用 Dify 验证，用代码落地**。验证阶段定下来的 Prompt、检索参数、切分策略，最后都要搬回代码里。
