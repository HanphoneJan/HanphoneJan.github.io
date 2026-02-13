# Uniapp
[uni-app 快速入门_w3cschool](https://www.w3cschool.cn/uni_app/uni_app-k8zg370b.html)

使用 Vue.js 语法，搭配 HTML、CSS（支持 Less/Sass），**支持多平台应用编译打包**，无需懂原生开发就能做出完整的跨平台应用，对中国生态适应极强。类似的有taro和kbone。对于APP，flutter、react native是跨Android和IOS的框架，但仍旧需要写两套UI（Google和Apple的应用风格不一致）。
**项目选型**：[uni-app选型评估| uni-app官网](https://uniapp.dcloud.net.cn/select.html)
![](https://hanphone.top/gh/HanphoneJan/public_pictures/frontend/uniapp%E5%8A%9F%E8%83%BD%E6%A1%86%E6%9E%B6%E5%9B%BE.webp)


## 迁移学习

#### 如果熟悉h5，但不熟悉vue和小程序

1. 看完这篇[白话uni-app](https://uniapp.dcloud.net.cn/vernacular.html)
2. DCloud与vue合作，在vue.js官网提供了免费视频教程，直达[教程地址](https://learning.dcloud.io/)
3. 不需要专门去学习小程序的语法，uni-app使用的是vue的语法，不是小程序自定义的语法。

#### 如果熟悉小程序，但不熟悉vue

参考总结[https://segmentfault.com/a/1190000015684864](https://segmentfault.com/a/1190000015684864)


## 权限

[uni.openSetting(OBJECT) | uni-app官网](https://uniapp.dcloud.net.cn/api/other/setting.html#getsetting)

[uni.authorize(OBJECT) | uni-app官网](https://uniapp.dcloud.net.cn/api/other/authorize.html#authorize)

#### 音频视频控制

（`<video/>` 组件编译到 H5 时会替换为标准 html 的 video 标签）
[【报Bug】使用video组件，内置浏览器报错：Uncaught (in promise)DOMException: The element has no supported sources. - DCloud问答](https://ask.dcloud.net.cn/question/117999#:~:text=%E8%BF%99%E4%B8%AA%E9%94%99%E8%AF%AF%E7%9A%84%E5%8E%9F%E5%9B%A0%E9%80%9A%E5%B8%B8%E6%98%AF%20video%20%E7%BB%84%E4%BB%B6%E7%9A%84%20src%20%E5%B1%9E%E6%80%A7%E8%AE%BE%E7%BD%AE%E4%B8%8D%E6%AD%A3%E7%A1%AE%E6%88%96%E8%80%85%E8%A7%86%E9%A2%91%E8%B5%84%E6%BA%90%E8%B7%AF%E5%BE%84%E4%B8%8D%E6%AD%A3%E7%A1%AE%E3%80%82,%E5%8F%AF%E8%83%BD%E6%98%AF%E4%BB%A5%E4%B8%8B%E5%87%A0%E4%B8%AA%E5%8E%9F%E5%9B%A0%E5%AF%BC%E8%87%B4%E7%9A%84%EF%BC%9A%20%E8%A7%86%E9%A2%91%E8%B5%84%E6%BA%90%E8%B7%AF%E5%BE%84%E4%B8%8D%E6%AD%A3%E7%A1%AE%EF%BC%8C%E9%9C%80%E8%A6%81%E6%A3%80%E6%9F%A5%E8%A7%86%E9%A2%91%E6%96%87%E4%BB%B6%E7%9A%84%E8%B7%AF%E5%BE%84%E6%98%AF%E5%90%A6%E6%AD%A3%E7%A1%AE%E3%80%82%20%E8%A7%86%E9%A2%91%E8%B5%84%E6%BA%90%E7%9A%84%E6%A0%BC%E5%BC%8F%E4%B8%8D%E8%A2%AB%E5%86%85%E7%BD%AE%E6%B5%8F%E8%A7%88%E5%99%A8%E6%94%AF%E6%8C%81%EF%BC%8C%E8%BF%99%E7%A7%8D%E6%83%85%E5%86%B5%E4%B8%8B%E9%9C%80%E8%A6%81%E6%A3%80%E6%9F%A5%E8%A7%86%E9%A2%91%E6%96%87%E4%BB%B6%E7%9A%84%E6%A0%BC%E5%BC%8F%E6%98%AF%E5%90%A6%E6%AD%A3%E7%A1%AE%EF%BC%8C%E5%B9%B6%E4%B8%94%E8%A6%81%E6%B3%A8%E6%84%8F%E4%B8%8D%E5%90%8C%E5%86%85%E7%BD%AE%E6%B5%8F%E8%A7%88%E5%99%A8%E6%94%AF%E6%8C%81%E7%9A%84%E8%A7%86%E9%A2%91%E6%A0%BC%E5%BC%8F%E5%8F%AF%E8%83%BD%E4%B8%8D%E5%90%8C%E3%80%82%20%E5%85%B6%E4%B8%AD%E7%9A%84%20type%20%E5%80%BC%E8%A1%A8%E7%A4%BA%E8%A7%86%E9%A2%91%E6%96%87%E4%BB%B6%E7%9A%84%E7%B1%BB%E5%9E%8B%EF%BC%8C%E9%9C%80%E8%A6%81%E6%A0%B9%E6%8D%AE%E5%AE%9E%E9%99%85%E6%83%85%E5%86%B5%E8%BF%9B%E8%A1%8C%E8%AE%BE%E7%BD%AE%E3%80%82)

[camera | uni-app官网](https://uniapp.dcloud.net.cn/component/camera.html)

[uni.createCameraContext() | uni-app官网](https://uniapp.dcloud.net.cn/api/media/camera-context.html#createcameracontext)

[uni.createInnerAudioContext() | uni-app官网](https://uniapp.dcloud.net.cn/api/media/audio-context.html)

[uni-app官网](https://uniapp.dcloud.net.cn/api/media/video.html#choosevideo)


### H5嵌入Uniapp

[前端 - UniApp 加载 Web 页面完整解决方案 - KotlinInMotion - SegmentFault 思否](https://segmentfault.com/a/1190000046864753)

[web-view | uni-app官网](https://uniapp.dcloud.net.cn/component/web-view.html#web-view)

mainfest.json中。本地html页面要放在static中

```json
    "h5" : {

        "sdkConfigs" : {

            "maps" : {

                "tencent" : {

                    "key" : "AMIBZ-6BSWV-W5ZP4-52TMM-ZQW4H-3MBP7"

                }

            }

        },

        "router" : {

            "mode" : "hash",

            "base" : "./"

        },

        "title" : "AI面试助手",

        "devServer" : {

            "port" : 3333

        },

        "publicPath" : "./"

    }
```
## 插件使用
[uni_modules | uni-app官网](https://uniapp.dcloud.net.cn/plugin/uni_modules.html)

[Uniapp接入插件的三种方式_uniapp安装插件-CSDN博客](https://blog.csdn.net/qq_23257451/article/details/129460416)


[manifest.json 应用配置 | uni-app官网](https://uniapp.dcloud.net.cn/collocation/manifest.html#mp-weixin)
## 部署打包

### Web

[【UniApp】-uni-app-打包成网页-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/2373755)

如果使用nginx想要支持相对路径就只能使用hash路由(狗屎)
### 安卓

[超详细！uni-app Android本地打包傻瓜式教程 - 个人文章 - SegmentFault 思否](https://segmentfault.com/a/1190000045693747)

### 微信小程序

[uniapp打包微信小程序详细步骤【前端开发】-CSDN博客](https://blog.csdn.net/qq_52736131/article/details/122400103)

不能使用测试号。游戏类项目建议使用小游戏ID，但是需要game.json等

www.hanphone.top
## Vue项目转Uni

2个前提：1、web站是适合手机屏幕的；2、H5代码是全后端分离的，uni-app只处理前端代码。
一切从新建一个uni-app项目开始。然后依次进行
#### 文件处理

1. 把之前的vue web项目的**前端**代码copy到新项目下
2. 如果之前的文件后缀名是.html，需要改为.vue，并注意遵循[vue单文件组件SFC规范](https://vue-loader.vuejs.org/zh/spec.html)，比如必须一级根节点为template、script、style，template节点下必须且只能有一个根view节点，所有内容写在这个根view节点下。
3. 处理页面路由  
    uni-app默认是小程序的路由方式，在pages.json里管理页面。如果你使用vue router的话，一种是改造为pages.json方式，另一种是使用三方插件，比如[vue router for uni-app](https://ext.dcloud.net.cn/search?q=vue-router)
4. 静态文件（如图片）挪到static目录  
    uni-app工程目录下有个static目录，用于存放静态文件，这个目录不编译，直接整体copy到发行代码里的。  如果你希望自定义静态资源目录，可以在vue.config.js中自定义。
#### 标签代码处理

1. 相同功能的组件自动转换  
    uni-app的标签组件与小程序相同，比如`<div>`变成了`<view>`，`<span>`变成了`<text>`。  
    但**uni-app的编译器已经自动处理了这部分转换**，如果源码中写了可自动转换的组件，在编译到非H5端时会被自动转换（再编译回到H5端时div还是div）。
    - div 改成 [view](https://uniapp.dcloud.io/component/view)
    - span、font 改成 [text](https://uniapp.dcloud.io/component/text)
    - a 改成 [navigator](https://uniapp.dcloud.io/component/navigator)
    - img 改成 [image](https://uniapp.dcloud.io/component/image)
    - select 改成 [picker](https://uniapp.dcloud.io/component/picker)
    - iframe 改成 [web-view](https://uniapp.dcloud.io/component/web-view)
    - ul、li没有了，都用view替代
2. 区域滚动使用scroll-view，不再使用div的区域滚动处理方式
3. 左右、上下滑动切换，有专门的[swiper组件](https://uniapp.dcloud.io/component/swiper)，不要使用div模拟
4. input的search，原来的type没用了，改成confirmtype，[详见](https://uniapp.dcloud.io/component/input)
5. audio组件不再推荐使用，改成api方式，[背景音频api文档](https://uniapp.dcloud.io/api/media/background-audio-manager?id=getbackgroundaudiomanager)
6. 之前的v-html，可以在H5端和App端（需v3编译器）使用，不能在小程序中使用。如需要在小程序使用，请使用rich-text组件或uparse扩展插件，[详见](https://ask.dcloud.net.cn/article/35772)
#### js代码处理

uni-app的非H5端，不管是App还是各种小程序，都不支持window、navigator、document等web专用对象。  
uni-app的API与小程序保持一致，需要处理这些不同的API写法

1. 处理window api
    - ajax 改成 uni.request。（插件市场也有[适配uni-app的axios、flyio等封装拦截器](https://ext.dcloud.net.cn/search?q=%E6%8B%A6%E6%88%AA%E5%99%A8)）
    - cookie、session.storage 没有了，改用 uni.storage 吧；local.storage 也改成 [uni.storage](https://uniapp.dcloud.io/api/storage/storage?id=setstorage)。另外插件市场有一个垫片[mp-storage](https://ext.dcloud.net.cn/plugin?id=280)，可使用之前的代码，兼容运行在uni-app上，
    - alert,confirm 改成 [uni.showmodel](https://uniapp.dcloud.io/api/ui/prompt?id=showmodal)
    - window的resize 改为了 [uni.onWindowResize](https://uniapp.dcloud.io/api/ui/window?id=onwindowresize)
2. 处理navigator api
    - geolocation 的定位方式改为 [uni.getLocation](https://uniapp.dcloud.io/api/location/location?id=getlocation)
    - useragent的设备api没有了，改用[uni.getSystemInfo](https://uniapp.dcloud.io/api/system/info?id=getsysteminfo)
3. 处理dom api
    - 如果使用标准vue的数据绑定，是不需要操作dom来修改界面内容的。如果没有使用vue数据绑定，仍然混写了jquery等dom操作，需要改为纯数据绑定
    - 有时获取dom并不是为了修改显示内容，而是为了获取元素的长宽尺寸来做布局。此时uni-app提供了同小程序的另一种API，[uni.createSelectorQuery](https://uniapp.dcloud.io/api/ui/nodes-info?id=selectorquery)
4. 其他js api  
    web中还有canvas、video、audio、websocket、webgl、webbluetooth、webnfc，这些在uni-app中都有专门的API。
5. 生命周期  
    uni-app补充了一批类小程序的声明周期，包括App的启动、页面的加载，详见[https://uniapp.dcloud.io/collocation/frame/lifetime](https://uniapp.dcloud.io/collocation/frame/lifetime)  
    vue h5一般在created或者mounted中请求数据，而在uni-app的页面中，使用onLoad或者onShow中请求数据。（组件仍然是created或者mounted）
6. 少量不常用的vue语法在非h5端仍不支持，data必须以return的方式编写，[注意事项详见](https://uniapp.dcloud.io/use)

注意：如果你使用了一些三方ui框架、js库，其中引用了包括一些使用了dom、window、navigator的三方库，除非只做H5端，否则需要更换。去uni-app的[插件市场](https://ext.dcloud.net.cn/)寻找替代品。如果找不到对应库，必须使用for web的库，在App端可以使用[renderjs](https://uniapp.dcloud.io/frame?id=renderjs)来引入这些for web的库。

#### css代码处理
uni-app发布到App(非nvue)、小程序时，显示页面仍然由webview渲染，css大部分是支持的。但需要注意
- 不支持 *选择器
- 没有body元素选择器，改用page元素选择器。（编译到非H5时，编译器会自动处理。所以不改也行）
- div等元素选择器改为view、span和font改为text、a改为navigator、img改为image...（编译到非H5时，**编译器会自动处理**。所以不改也行）
- 不同端的浏览器兼容性仍然存在，避免使用太新的css语法，否则发布为App时，Android低端机（Android 4.4、5.x），会有样式错误。当然在App端也可以引用x5浏览器内核来抹平浏览器差异。



# 微信小程序

### 项目基本结构

```
miniprogram/                   # 项目根目录
├── app.js                     # 小程序入口文件，全局逻辑和生命周期函数
├── app.json                   # 全局配置文件，配置页面路径、窗口样式等
├── app.wxss                   # 全局样式文件，定义全局通用样式
├── project.config.json        # 项目配置文件，IDE相关配置
├── sitemap.json               # 小程序URL索引配置，用于搜索引擎收录
├── package.json               # 项目依赖配置文件，管理npm包
├── node_modules/              # 项目依赖模块目录
├── pages/                     # 页面文件夹，存放所有页面
│   ├── index/                 # 首页文件夹
│   │   ├── index.js           # 页面逻辑文件
│   │   ├── index.json         # 页面配置文件
│   │   ├── index.wxml         # 页面结构文件
│   │   └── index.wxss         # 页面样式文件
│   └── logs/                  # 日志页文件夹
│       ├── logs.js            # 页面逻辑文件
│       ├── logs.json          # 页面配置文件
│       ├── logs.wxml          # 页面结构文件
│       └── logs.wxss          # 页面样式文件
├── utils/                     # 工具函数文件夹
│   ├── util.js                # 通用工具函数
│   └── request.js             # 网络请求封装
├── assets/                    # 静态资源文件夹
│   ├── images/                # 图片资源
│   ├── icons/                 # 图标资源
│   └── styles/                # 样式资源
├── components/                # 组件文件夹
│   ├── navbar/                # 导航栏组件
│   │   ├── navbar.js          # 组件逻辑
│   │   ├── navbar.json        # 组件配置
│   │   ├── navbar.wxml        # 组件结构
│   │   └── navbar.wxss        # 组件样式
│   └── footer/                # 页脚组件
│       ├── footer.js          # 组件逻辑
│       ├── footer.json        # 组件配置
│       ├── footer.wxml        # 组件结构
│       └── footer.wxss        # 组件样式
├── services/                  # 服务层文件夹
│   ├── user.js                # 用户服务
│   └── data.js                # 数据服务
├── models/                    # 数据模型文件夹
│   └── user.js                # 用户数据模型
├── stores/                    # 状态管理文件夹（如使用全局状态）
│   └── global.js              # 全局状态管理
└── libs/                      # 第三方库文件夹
    └── wxp.js                 # Promise化API封装库
```


## 页面

每个页面有4个基本组件

```plaintext
.json .wxml .wxss  .js
```

### WXML

WXML 的模板语法和指令系统直接借鉴了 Vue，但功能更简化，专门为微信小程序设计的简化版模板语言，WXML **≈ Vue 的子集**。
#### 与 HTML 的差异

- **标签体系**：WXML 运用的是自定义组件标签，像`<view>``<text>`这类，并非 HTML 标准标签。
- **数据绑定**：采用`{{}}`进行单向数据绑定，和 HTML 的原生方式不同。
- **指令系统**：提供了如`wx:if`、`wx:for`这类特有的指令，不过功能和 HTML 结合 JavaScript 实现的效果类似。
- **事件绑定**：使用`bindtap`、`catchtap`等自定义事件，和 HTML 的`onclick`在写法上有区别。
#### 和VUE更相似  

- **模板语法**：二者都借助`{{}}`实现插值表达式，数据绑定语法相近。
- **条件渲染**：WXML 的`wx:if`和 Vue 的`v-if`作用一样。
- **列表渲染**：WXML 的`wx:for`和 Vue 的`v-for`功能相同。
- **组件化**：WXML 和 Vue 都支持组件化开发，并且有自己的组件通信机制。

### WXSS

#### 与 CSS 的不同点：

1. **尺寸单位**：WXSS 推荐使用 `rpx`（响应式像素），CSS 使用 `px`、`rem`、`em` 等。
2. **选择器**：WXSS 支持的选择器比 CSS 少（如不支持 `*` 通配符）。
3. **样式导入**：WXSS 使用 `@import` 导入样式文件，路径需使用相对路径。
4. **动画实现**：WXSS 动画需通过 JS 调用 `wx.createAnimation` API，CSS 使用 `@keyframes` 和 `animation`。

## 宿主环境

#### 通信模型

通信的主题是渲染层和逻辑层，渲染层和逻辑层之间通信由微信客户端进行转发，逻辑层和第三方服务器的通信也由微信进行转发。

## 运行机制

##### 小程序启动

把小程序的代码包下载到本地，解析app.json全局配置文件，执行app.js小程序入口文件，**调用App()创建小程序实例**，渲染小程序首页，小程序启动完成

##### 页面渲染过程

加载解析页面的.json配置文件，加载页面的.wxml模板和.wxss样式，执行页面的js文件，调用Page()创建页面实例，页面渲染完成



组件

## API

##### 事件监听API

特点：以on开头，用来监听某些事件的触发
举例:Wx.onWindowResize(functioncallback)监听窗口尺寸变化的事件

##### 同步API

特点1：以Sync结尾的API 都是同步 API
特点2：同步API的执行结果，可以通过函数返回值直接获取，如果执行出错会抛出异常
●举例：Wx.setStorageSync('key','value') 向本地存储中写入内容

##### 异步API

特点：类似于jQuery中的$.ajax(options)函数,需要通过success、fail、complete接收调用的结果
●举例：wx.request()发起网络数据请求，通过success回调函数接收数据


## 协同工作


## 发布

先用邮箱申请小程序号，每一个邮箱仅能申请一个，未被微信公众平台注册，未被微信开放平台注册，未被个人微信号绑定的邮箱。一个手机号码只能注册5个小程序。然后填写基本信息

### 发布小游戏

需要软件著作权登记证书等等，备案流程比一般小程序麻烦

如果某个 js 文件被静态分析显示是无依赖文件，在实际运行时又被其他 js 文件 require 引用了，则会在工具模拟器中报错这个错误

[开发者专区 | 微信开放社区](https://developers.weixin.qq.com/community/business/CategorySearch?cid=1204)