---
title: Qt 与 Flutter：环境与最小工程
sidebar_label: Qt 与 Flutter
description: 两个非 Web 的桌面/跨端 GUI 工具链：Qt 的安装器、组件与 CMake 最小工程，Flutter 的排障顺序与 pub 镜像。
---

Qt 和 Flutter 都不是 Web 技术，但踩的坑很像：官方下载器慢、组件一勾几十 GB、跑不起来时十有八九是环境而不是代码。这一篇把两者的安装、最小工程与排障放在一起，按需跳读。

## Qt

Qt 的安装器有两个坑：下载慢和组件选多。前者换镜像，后者先想清楚用 C++ 还是 Python 绑定。

### 下载与安装

官方在线安装器在[这里](https://www.qt.io/download-qt-installer)，国内直接跑会很慢，加镜像：

```bash
# Windows（PowerShell / CMD）
.\qt-online-installer-windows-x64.exe --mirror https://mirrors.ustc.edu.cn/qtproject/

# Linux
./qt-online-installer-linux-x64.run --mirror https://mirrors.ustc.edu.cn/qtproject/
```

也可以用清华镜像站的归档：<https://mirrors.tuna.tsinghua.edu.cn/qt/official_releases/online_installers/>

### 组件怎么勾

| 用途 | 需要勾的 |
|---|---|
| 桌面 C++ 开发 | Qt 6.x 下的 `MSVC 2019 64-bit` 或 `MinGW 64-bit` |
| 只要 Qt Creator | `Developer and Designer Tools` → Qt Creator |
| Python 绑定 | 装完 Qt 后 `pip install PySide6`，不需要在安装器里勾 |

**别全勾**。一个 Qt 版本 + 一个编译器就够，几十 GB 的组件装完也用不上。

### 最小工程（CMake）

```cmake
cmake_minimum_required(VERSION 3.16)
project(hello LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)          # 有 Q_OBJECT 就必须开
find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(hello main.cpp)
target_link_libraries(hello PRIVATE Qt6::Widgets)
```

```cpp
#include <QApplication>
#include <QPushButton>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QPushButton button("点我");
    QObject::connect(&button, &QPushButton::clicked,
                     [] { qDebug("clicked"); });
    button.show();
    return app.exec();
}
```

```bash
cmake -B build -DCMAKE_PREFIX_PATH=/path/to/Qt/6.x/gcc_64
cmake --build build
```

### 信号与槽

Qt 的核心机制：一个对象发出信号，另一个对象的槽函数被调用。

```cpp
QObject::connect(sender, &Sender::valueChanged,
                 receiver, &Receiver::updateValue);
```

- 用**函数指针**写法（`&Class::signal`），别用字符串宏 `SIGNAL()` —— 编译期就能查出拼错
- 跨线程连接默认是队列连接，槽会在接收者所在线程执行
- `Q_OBJECT` 宏 + CMake 的 `AUTOMOC`，缺一个都会在链接期报 vtable 错误

### 参考

- [Qt 安装与配置 VS 环境（保姆级图文）](https://blog.csdn.net/qq_40750972/article/details/103261409)
- [Qt 简单使用](https://blog.csdn.net/YANGMILU/article/details/115917895)

## Flutter

Flutter 的问题八成出在环境而不是代码。排障顺序：先 flutter clean，再 flutter doctor -v 看哪一项红了，最后才怀疑依赖和源码。国内还需要配 pub 镜像。

[手动安装 | Flutter 框架](https://docs.fluttercn.cn/install/manual)
```bash
# 清理Flutter构建缓存
flutter clean
# 清空Flutter pub缓存（彻底删除旧插件版本）
flutter pub cache clean
flutter channel stable
flutter upgrade
flutter doctor --verbose #检查CMake是否符合版本要求
```

### 国内镜像配置（全平台通用）

推荐使用 CFUG（China Flutter User Group）维护的镜像，配置方式如下：

#### 临时配置（仅当前终端生效）

```bash
# Windows（PowerShell）
$env:PUB_HOSTED_URL="https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL="https://storage.flutter-io.cn"

# macOS/Linux（终端）
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
```

#### 永久配置（推荐）

- Windows：通过“此电脑 → 右键属性 → 高级系统设置 → 环境变量”，在“用户变量”或“系统变量”中新增两个变量：`PUB_HOSTED_URL`（值：https://pub.flutter-io.cn）、`FLUTTER_STORAGE_BASE_URL`（值：https://storage.flutter-io.cn）。
- macOS/Linux：编辑 shell 配置文件（bash 为 ~/.bash_profile，zsh 为 ~/.zshrc），添加上述两条 export 指令，保存后执行 `source ~/.bash_profile` 或 `source ~/.zshrc` 生效。
