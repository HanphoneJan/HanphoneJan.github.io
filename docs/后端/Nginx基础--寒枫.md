视频入门：[Nginx是什么？Nginx高并发架构拆解指南_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1gMX1YSEtm/?spm_id_from=333.337.search-card.all.click&vd_source=d70e94afe69a097aca14b8a5978d641d)
教程参考：[Nginx是什么 | Nginx 教程](https://nginx.mosong.cc/guide/nginx_intro.html)
Nginx 是一个高性能的反向代理和 Web 服务器软件，由C语言编写，同时兼具负载均衡、静态资源托管、反向代理、缓存等功能，采用异步非阻塞的事件驱动模型，能以极低的资源占用支撑超高并发的网络请求，是现代 Web 架构中核心的中间件。

## 五个功能

#### ① 访问路由

Nginx 可通过访问路径、URL 关键字、客户端 IP、灰度分流等实现访问路由分配。

#### ② 反向代理

Nginx 本身并不产生响应数据，只是应用自身的异步非阻塞事件驱动架构，高效、稳定地将请求反向代理给后端的目标应用服务器，并把响应数据返回给客户端。其不仅可以代理 HTTP 协议，还支持 HTTPS、HTTP/2、FastCGI、uWSGI、SCGI、gRPC 及 TCP/UDP 等目前大部分协议的反向代理。
#### ③ 负载均衡

Nginx 在反向代理的基础上集合自身的上游（upstream）模块支持多种负载均衡算法，使后端服务器可以非常方便地进行横向扩展，从而有效提升应用的处理能力，使整体应用架构可轻松应对高并发的应用场景。

#### ④ 内容缓存

动态处理与静态内容分离是应用架构优化的主要手段之一，Nginx 的内容缓存技术不仅可以实现预置静态文件的高速缓存，还可以对应用响应的动态结果实现缓存，为响应结果变化不大的应用提供更高速的响应能力。

#### ⑤ 可编程

Nginx 模块化架构支持定制化，除 C 语言开发模块外，还兼容 Perl、JavaScript 及第三方模块支持的 Lua 语言，增强了可编程能力。
## 常用命令

```shell
start nginx  启动
nginx -s stop：立即停止Nginx，不保存会话信息，适用于紧急停机。
nginx -s quit：优雅退出，等待当前请求处理完成后关闭，生产环境优先使用。
```
`-s`是 Nginx 命令中的**信号（signal）参数标识**，作用是**指定要向 Nginx 主进程发送的控制信号**，用来触发对应的操作（比如停止、重启等）。
```shell
nginx -s reload：修改配置后重新加载生效，基于Master-Worker模型，不中断服务。   
nginx -s reopen：重新打开日志文件，用于日志切割（如按日期归档）。
nginx -t -c /path/nginx.conf：测试配置文件语法正确性，返回错误位置，修改配置后必执行。
```
## 架构分析
Nginx 采用的是固定数量的多进程模型（见下图），由一个主进程（Master Process）和数量与主机 CPU 核数相同的工作进程协同处理各种事件。主管理进程负责工作进程的配置加载、启停等操作，工作进程负责处理具体请求。
进程间的资源都是独立的，每个工作进程处理多个连接，每个连接由一个工作进程全权处理，不需要进行进程切换，也就不会产生由进程切换引起的资源消耗问题。默认配置下，工作进程的数量与主机 CPU 核数相同，充分利用 CPU 和进程的亲缘性（affinity）将工作进程与 CPU 绑定，从而最大限度地发挥多核 CPU 的处理能力。
Nginx 主进程负责监听外部控制信号，通过频道机制将相关信号操作传递给工作进程，多个工作进程间通过共享内存来共享数据和信息。
![nginx多进程模型架构图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/nginx%E5%A4%9A%E8%BF%9B%E7%A8%8B%E6%A8%A1%E5%9E%8B%E6%9E%B6%E6%9E%84%E5%9B%BE.webp)


## 关键配置模块

### 1. 缓存配置

#### 客户端缓存控制

通过`add_header`设置HTTP响应头，控制浏览器缓存行为：

```nginx
add_header Cache-Control "private, no-store, no-cache, must-revalidate, proxy-revalidate";
# private：仅客户端缓存，代理不缓存；no-store：禁止缓存；must-revalidate：过期后必须验证
```

浏览器清除缓存方式：F12打开开发者工具 → Network → 勾选「Disable cache」刷新页面。

#### 服务端缓存清除

Nginx代理缓存需先定位缓存存储路径，再删除对应目录：

```shell
# 1. 搜索所有配置中的缓存路径（proxy_cache_path为缓存配置核心指令）
sudo grep -r "proxy_cache_path" /www/server/nginx/conf/
# 示例返回：proxy_cache_path /var/nginx/cache levels=1:2 keys_zone=cache_one:10m max_size=10g;
# 2. 删除缓存目录（需替换为实际路径）
sudo rm -rf /var/nginx/cache/*
# 3. 重新加载配置
nginx -s reload
```

### 2. 负载均衡配置

通过`upstream`模块定义后端服务集群，配合`proxy_pass`实现负载分发：

```nginx
# 全局配置段（与server同级）
upstream backend_servers {
    # 权重配置：weight值越大，分配请求越多
    server 127.0.0.1:3000 weight=5;
    server 127.0.0.1:3001 weight=3;
    # 备用节点：仅当主节点全部故障时启用
    server 127.0.0.1:3002 backup;
    # 健康检查：失败3次后标记为不可用，30秒后重试
    server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
}

# server配置段内引用
location / {
    proxy_pass http://backend_servers;  # 指向upstream定义的集群
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# 负载均衡策略（默认轮询，可选以下策略）
# 1. ip_hash：按客户端IP哈希分配，确保同一客户端访问同一节点（解决会话保持问题）
# upstream backend_servers { ip_hash; server 127.0.0.1:3000; }
# 2. least_conn：优先分配给连接数最少的节点
# upstream backend_servers { least_conn; server 127.0.0.1:3000; }
```

### 3. Location匹配规则

Location用于匹配请求URI，决定请求的处理方式，匹配优先级从高到低：

1. **精确匹配**：`location = /uri`，仅匹配完全一致的URI
    
2. **正则匹配**：`location ~ /uri`（区分大小写）、`location ~* /uri`（不区分大小写）
    
3. **前缀匹配**：`location ^~ /uri`，优先于正则匹配
    
4. **普通前缀匹配**：`location /uri`，最长匹配优先
    

```nginx
# 示例：不同匹配规则的应用
location = /login {  # 仅匹配https://domain/login
    proxy_pass http://127.0.0.1:8080/login;
}

location ~* \.(jpg|png|css)$ {  # 匹配所有图片和CSS文件（不区分大小写）
    root /www/static;  # 静态资源根目录
    expires 7d;  # 缓存7天，减轻服务压力
}

location ^~ /api {  # 前缀匹配/api，优先于正则
    proxy_pass http://127.0.0.1:8090;
}
```

### 4. 动静分离配置

静态资源直接返回，动态请求转发至后端，核心是通过Location区分资源类型：

```nginx
server {
    listen 80;
    server_name www.hanphone.top;

    # 静态资源：JS、CSS、图片等，Nginx直接处理
    location ~* \.(js|css|png|jpg|gif|ico)$ {
        root /www/wwwroot/static;  # 静态资源存放路径
        expires 30d;  # 缓存30天
        etag on;  # 启用实体标签，优化缓存验证
    }

    # 动态请求：API接口，转发至Node.js服务
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 单页应用(SPA)：前端路由跳转处理
    location / {
        root /www/wwwroot/spa;
        index index.html;
        try_files $uri $uri/ /index.html;  # 刷新404问题解决
    }
}
```

## 完整配置模板示例

```nginx
# =================================================================
# 全局缓存配置（与http块同级）
# =================================================================
# 定义缓存路径和相关参数
proxy_cache_path /var/nginx/cache levels=1:2 keys_zone=cache_one:10m max_size=10g inactive=7d use_temp_path=off;
# levels=1:2: 缓存目录层级结构，1级目录1个字符，2级目录2个字符
# keys_zone=cache_one:10m: 定义缓存区域名称和大小（10MB）
# max_size=10g: 缓存最大总大小（10GB）
# inactive=7d: 7天未访问的缓存自动清理
# use_temp_path=off: 禁用临时目录，直接写入缓存目录，提升性能

# =================================================================
# HTTP重定向到HTTPS（优化SEO和安全性）
# =================================================================
server {
    listen 80;
    listen [::]:80;  # IPv6支持
    server_name www.hanphone.top hanphone.top;  # 处理带www和不带www的域名
    
    # Let's Encrypt验证目录（证书续签时需要）
    location /.well-known/acme-challenge/ {
        root /www/wwwroot/server_blog3;
        try_files $uri =404;
    }
    
    # 其他所有请求重定向到HTTPS
    location / {
        return 301 https://$host$request_uri;  # 301永久重定向
    }
}

# =================================================================
# 主服务器配置（HTTPS）
# =================================================================
server {
    # 监听端口配置
    listen 443 ssl http2;  # 启用HTTP/2协议
    listen [::]:443 ssl http2;  # IPv6支持
    listen 443 quic reuseport;  # 启用QUIC协议（HTTP/3）
    listen [::]:443 quic reuseport;  # IPv6支持
    
    # 域名配置
    server_name www.hanphone.top;
    
    # =================================================================
    # 安全头设置（增强安全性）
    # =================================================================
    # HSTS（HTTP严格传输安全）- 强制浏览器使用HTTPS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    # max-age=31536000: 有效期1年
    # includeSubDomains: 包含所有子域名
    # preload: 允许浏览器预加载到HSTS列表
    # always: 确保所有响应都包含此头
    
    # 防止点击劫持
    add_header X-Frame-Options "SAMEORIGIN" always;
    # SAMEORIGIN: 只允许同源页面嵌入
    
    # 防止MIME类型混淆攻击
    add_header X-Content-Type-Options "nosniff" always;
    
    # 控制引用信息泄露
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # 内容安全策略（CSP）- 防止XSS攻击
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # QUIC/HTTP3支持
    add_header Alt-Svc 'quic=":443"; h3=":443"; h3-29=":443"; h3-32=":443";' always;
    
    # =================================================================
    # SSL配置（增强安全性）
    # =================================================================
    ssl_certificate /www/server/panel/vhost/cert/server_blog3/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/server_blog3/privkey.pem;
    
    # SSL协议版本（禁用不安全的旧版本）
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # 优先使用服务器加密套件
    ssl_prefer_server_ciphers on;
    
    # 加密套件配置（优先使用更安全的套件）
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384';
    
    # SSL会话缓存（减少握手开销）
    ssl_session_cache shared:SSL:50m;  # 50MB共享缓存
    ssl_session_timeout 1d;  # 会话超时1天
    ssl_session_tickets off;  # 禁用会话票据（更安全）
    
    # OCSP装订（在线证书状态协议）
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;  # DNS解析器
    resolver_timeout 5s;
    
    # =================================================================
    # 基础配置
    # =================================================================
    # 根目录设置
    root /www/wwwroot/server_blog3;
    index index.html index.htm default.htm default.html;
    
    # =================================================================
    # 错误页面配置
    # =================================================================
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /404.html {
        internal;  # 只允许内部重定向
        root /www/wwwroot/error_pages;
    }
    
    location = /50x.html {
        internal;
        root /www/wwwroot/error_pages;
    }
    
    # =================================================================
    # 安全访问控制
    # =================================================================
    # 禁止访问敏感文件/目录
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.svn|\.env|\.project|LICENSE|README.md) {
        deny all;
        return 404;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;  # 不记录访问日志
        log_not_found off;  # 不记录404日志
        return 404;
    }
    
    # 限制访问备份文件
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
        return 404;
    }
    
    # =================================================================
    # 伪静态配置
    # =================================================================
    include /www/server/panel/vhost/rewrite/node_server_blog3.conf;
    
    # =================================================================
    # 缓存清理接口（增强安全性）
    # =================================================================
    location ~ /purge(/.*) {
        allow 127.0.0.1;  # 仅允许本地访问
        allow ::1;  # IPv6本地地址
        deny all;  # 拒绝其他所有访问
        proxy_cache_purge cache_one $host$request_uri$is_args$args;
        access_log off;  # 不记录访问日志
    }
    
    # =================================================================
    # 静态资源处理（优化性能）
    # =================================================================
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf|eot)$ {
        expires 1y;  # 缓存1年
        access_log off;  # 不记录访问日志
        add_header Cache-Control "public";  # 公共缓存
        add_header Vary "Accept-Encoding";  # 根据编码方式变化
        
        # 启用gzip压缩
        gzip_static on;
        
        # 跨域配置（根据实际需求调整）
        add_header Access-Control-Allow-Origin "*";  # 生产环境建议指定具体域名
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        
        # 处理预检请求
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
            add_header Access-Control-Max-Age 1728000;  # 预检请求缓存20天
            add_header Content-Type "text/plain; charset=utf-8";
            add_header Content-Length 0;
            return 204;  # 无内容返回
        }
    }
    
    # =================================================================
    # 前端服务反向代理（增强WebSocket支持）
    # =================================================================
    location / {
        proxy_pass http://127.0.0.1:3000;  # 转发到本地3000端口
        proxy_http_version 1.1;  # HTTP/1.1支持长连接
        
        # WebSocket支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 请求头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;  # 真实客户端IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # 代理链IP
        proxy_set_header X-Forwarded-Proto $scheme;  # 协议(http/https)
        proxy_set_header X-Forwarded-Host $host;  # 原始主机名
        proxy_set_header X-Forwarded-Port $server_port;  # 原始端口
        
        proxy_cache_bypass $http_upgrade;  # WebSocket请求不缓存
        
        # 超时设置
        proxy_connect_timeout 60s;  # 连接超时
        proxy_send_timeout 60s;  # 发送超时
        proxy_read_timeout 60s;  # 读取超时
        
        # 缓冲区设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # =================================================================
    # API接口代理（增强安全性）
    # =================================================================
    location /api/ {
        proxy_pass http://127.0.0.1:8090/;  # 转发到本地8090端口，末尾/表示去除/api前缀
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 请求体设置
        client_max_body_size 20M;  # 允许上传最大文件大小
        client_body_buffer_size 2M;  # 请求体缓存大小
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 限制请求频率（防止API滥用）
        limit_req zone=api burst=20 nodelay;
        # zone=api: 使用名为api的限制区域
        # burst=20: 允许突发20个请求
        # nodelay: 不延迟处理突发请求
    }
    
    # =================================================================
    # 日志配置（优化格式）
    # =================================================================
    # 访问日志（combined格式，带缓冲）
    access_log /www/wwwlogs/server_blog3.log combined buffer=32k flush=1m;
    # buffer=32k: 32KB缓冲区
    # flush=1m: 每1分钟刷新一次
    
    # 错误日志（只记录warn及以上级别）
    error_log /www/wwwlogs/server_blog3.error.log warn;
}

# =================================================================
# 限制请求频率（与http块同级）
# =================================================================
# 定义API请求限制区域
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
# $binary_remote_addr: 使用客户端IP作为键
# zone=api:10m: 定义名为api的区域，大小10MB
# rate=10r/s: 每秒最多10个请求
```
