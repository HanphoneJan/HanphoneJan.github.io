---
title: Qt 基础
sidebar_position: 1
description: Qt 的安装器镜像、组件选择、CMake 最小工程与信号槽，以及 C++ 与 Python 两种绑定的取舍。
---

## 下载与安装

官方在线安装器在[这里](https://www.qt.io/download-qt-installer)，国内直接跑会很慢，加镜像：

```bash
# Windows（PowerShell / CMD）
.\qt-online-installer-windows-x64.exe --mirror https://mirrors.ustc.edu.cn/qtproject/

# Linux
./qt-online-installer-linux-x64.run --mirror https://mirrors.ustc.edu.cn/qtproject/
```

也可以用清华镜像站的归档：<https://mirrors.tuna.tsinghua.edu.cn/qt/official_releases/online_installers/>

## 组件怎么勾

| 用途 | 需要勾的 |
|---|---|
| 桌面 C++ 开发 | Qt 6.x 下的 `MSVC 2019 64-bit` 或 `MinGW 64-bit` |
| 只要 Qt Creator | `Developer and Designer Tools` → Qt Creator |
| Python 绑定 | 装完 Qt 后 `pip install PySide6`，不需要在安装器里勾 |

**别全勾**。一个 Qt 版本 + 一个编译器就够，几十 GB 的组件装完也用不上。

## C++ 还是 Python

- **C++**：能和现有 C++ 代码直接链接，发布时不用带解释器，桌面端和嵌入式都用它。
- **Python（PySide6 / PyQt6）**：写起来快，适合工具和原型；打包体积大，需要额外处理解释器和依赖。
- **PySide6 是 Qt 官方绑定**（LGPL，商用友好），PyQt6 是第三方（GPL 或商业授权），新项目优先 PySide6。

## 最小工程（CMake）

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

## 信号与槽

Qt 的核心机制：一个对象发出信号，另一个对象的槽函数被调用。

```cpp
QObject::connect(sender, &Sender::valueChanged,
                 receiver, &Receiver::updateValue);
```

- 用**函数指针**写法（`&Class::signal`），别用字符串宏 `SIGNAL()` —— 编译期就能查出拼错
- 跨线程连接默认是队列连接，槽会在接收者所在线程执行
- `Q_OBJECT` 宏 + CMake 的 `AUTOMOC`，缺一个都会在链接期报 vtable 错误

## 参考

- [Qt 安装与配置 VS 环境（保姆级图文）](https://blog.csdn.net/qq_40750972/article/details/103261409)
- [Qt 简单使用](https://blog.csdn.net/YANGMILU/article/details/115917895)
