内容主要参考自：[SSE协议深度解析：被低估的HTTP服务器推送标准 - 若-飞 - 博客园](https://www.cnblogs.com/zhanchenjin/p/19449682)

- 官方定位：W3C正式推荐标准（2015年2月发布），非HTTP hack用法，浏览器通过原生EventSource接口支持
- 协议栈：基于HTTP构建，传输层依赖HTTP/1.1或HTTP/2（Keep-Alive连接），底层为TCP/IP协议
- 核心作用：实现服务器向客户端的单向实时数据推送，适用于实时通知（用户登录提醒）、数据流推送（传感器数据）、实时监控面板、新闻更新等单向推送场景
## HTTP、WebSocket与SSE对比表

| 对比维度  | HTTP                       | WebSocket                | SSE                      |
| ----- | -------------------------- | ------------------------ | ------------------------ |
| 对比维度  | HTTP                       | WebSocket                | SSE                      |
| 协议基础  | HTTP/1.1/2/3               | 独立WebSocket协议（RFC 6455）  | 基于HTTP，属HTTP应用层扩展        |
| 通信方向  | 客户端→服务器（请求-响应），单向          | 全双工，双向通信                 | 半双工，仅服务器→客户端单向推送         |
| 连接特性  | 短连接（默认），可通过Keep-Alive实现长连接 | 持久化长连接，需特殊握手             | 基于HTTP Keep-Alive的持久化长连接 |
| 浏览器支持 | 所有浏览器原生支持                  | 现代浏览器原生支持                | 现代浏览器原生支持（EventSource接口） |
| 自动重连  | 无，需手动实现                    | 无，需手动实现                  | 内置自动重连，支持重试间隔配置          |
| 消息格式  | 任意格式（需指定Content-Type）      | 文本、二进制（Blob/ArrayBuffer） | 仅UTF-8文本，遵循SSE字段格式       |
| 头部开销  | 每个请求/响应均带完整HTTP头，开销大       | 仅握手阶段有HTTP头开销，后续无额外头     | 连接建立有HTTP头开销，后续消息无额外头    |
| 适用场景  | 常规请求-响应（页面加载、接口调用）         | 双向实时通信（聊天、游戏、视频会议）       | 单向实时推送（通知、监控数据、新闻更新）     |
| 运维成本  | 低，兼容现有HTTP基础设施             | 高，需额外处理协议、端口、负载均衡        | 低，复用HTTP基础设施，防火墙友好       |

## SSE协议的三要素

![sse连接过程图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/network/sse%E8%BF%9E%E6%8E%A5%E8%BF%87%E7%A8%8B%E5%9B%BE.webp)



### 1. 必备响应头：text/event-stream

http

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream      # 核心标识
Cache-Control: no-cache               # 禁止缓存
Connection: keep-alive                # 保持连接
Transfer-Encoding: chunked            # 分块传输（可选）
```

**关键点**：`text/event-stream`是IANA注册的标准MIME类型（RFC 2046），不是随意字符串。

### 2. 数据格式规范：严格的文本协议

```javascript
// 一个完整的SSE消息单元
data: 这是消息内容\n            // 数据行（可多行）
data: 继续上一消息的第二行\n
id: 42\n                         // 消息ID（用于重连）
event: message\n                 // 事件类型
retry: 10000\n                   // 重连间隔（毫秒）
\n                               // 空行表示消息结束

// 浏览器接收到的对象：
{
  data: "这是消息内容\n继续上一消息的第二行",
  lastEventId: "42",
  type: "message"
}
```

### 3. 连接管理：HTTP Keep-Alive的创造性应用

基于HTTP Keep-Alive实现长连接，服务器持续推送数据，连接随客户端断开或服务器终止而结束；服务器需通过Flusher强制立即发送数据。

## 协议工作原理：一次握手，无限推送

### 建立连接流程

```
客户端->服务器: GET /stream HTTP/1.1
客户端->服务器: Accept: text/event-stream
服务器->客户端: HTTP/1.1 200 OK
服务器->客户端: Content-Type: text/event-stream
服务器->客户端: Connection: keep-alive
服务器->客户端: 
服务器->客户端: data: 欢迎连接\n\n
服务器->客户端: data: 实时数据...\n\n
服务器->客户端: data: 持续推送...\n\n
Note right of 客户端: 连接保持打开
Note left of 服务器: 可随时推送新消息
```

### 消息流示例

```
客户端请求：
GET /api/events HTTP/1.1
Host: example.com
Accept: text/event-stream

服务器响应流：
HTTP/1.1 200 OK
Content-Type: text/event-stream
Connection: keep-alive

: 心跳保持连接
data: 用户alice登录
event: user-login
id: 101

data: {"temperature": 23.5}
event: sensor-data
id: 102

data: 系统即将维护
event: system-alert
id: 103
retry: 30000

... 持续不断 ...
```

## 重要特性与机制

- 自动重连：浏览器内置机制，断线后按retry间隔重试（默认3秒），重连自动携带Last-Event-ID
    
- 事件ID追踪：通过id字段记录消息序列，重连时服务器可补发遗漏消息
    
- 多事件类型：支持自定义event字段，客户端可针对性监听
    
- HTTP/2适配：HTTP2支持多路复用，一个TCP连接可并行多个SSE流，规避HTTP/1.1并发连接限制（每个域名最多6个并发HTTP/1.1连接）    
