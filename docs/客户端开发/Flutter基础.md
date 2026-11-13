---
title: Flutter 基础
sidebar_position: 2
description: Flutter 的 SDK 安装、flutter doctor 排障顺序、国内 pub 镜像、最小工程与目录结构，以及打包和常见报错。
---

Flutter 是 Google 的跨端 UI 框架，用 Dart 写界面，自带渲染引擎（Skia / Impeller），不经过平台原生控件，所以 Android、iOS、Web、桌面端画出来的东西一致。

## 安装

三样东西分开装，别混：

| 组件 | 作用 |
|---|---|
| Flutter SDK | 框架本体与 `flutter` 命令，解压后把 `flutter/bin` 加进 `PATH` |
| Android Studio | 提供 Android SDK、模拟器和 `sdkmanager`，Flutter 自己不带 |
| VS Code / Android Studio 插件 | 补全、热重载按钮、调试 |

- **Windows**：下载 zip 解压到不含中文和空格的路径（如 `D:\flutter`），把 `D:\flutter\bin` 加进系统 `PATH`。
- **macOS**：`brew install --cask flutter`，或下载 zip；iOS 还需要 Xcode 与 CocoaPods。
- **Linux**：下载 tar.xz 解压，或 `snap install flutter --classic`。

装完先验：

```bash
flutter --version
flutter doctor -v
```

## 排障顺序

Flutter 跑不起来，八成是环境不是代码。按这个顺序查：

1. `flutter clean` 清构建缓存
2. `flutter doctor -v` 看哪一项是红的，**先修红项**
3. `flutter pub cache repair` 修依赖缓存
4. 换 stable 通道重试：`flutter channel stable && flutter upgrade`
5. 最后才怀疑依赖版本和源码

`doctor` 最常见的几项：

| 报错 | 处理 |
|---|---|
| `cmdline-tools component is missing` | Android Studio → SDK Manager → SDK Tools 勾 `Android SDK Command-line Tools` |
| `Android license status unknown` | `flutter doctor --android-licenses`，一路 `y` |
| `CocoaPods not installed` | `sudo gem install cocoapods` 或 `brew install cocoapods` |
| `Unsupported class file major version` | JDK 版本和 Gradle 不匹配，用 Android Studio 自带的 JDK 或在 `android/gradle.properties` 里指定 |
| `Waiting for another flutter command to release the startup lock` | 删掉 `flutter/bin/cache/lockfile`（确认没有别的 flutter 进程在跑） |
| `Gradle task assembleDebug failed` | 先看完整日志；多是 Gradle 下载超时，配 Android 镜像或在 `android/gradle/wrapper/gradle-wrapper.properties` 换 `distributionUrl` |

## 国内镜像

Flutter 的 pub 与 SDK 下载走 `pub.dev` 和 `storage.googleapis.com`，国内需要换 CFUG 维护的镜像。

### 临时（只对当前终端生效）

```bash
# Windows（PowerShell）
$env:PUB_HOSTED_URL="https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL="https://storage.flutter-io.cn"

# macOS / Linux
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
```

### 永久

- **Windows**：此电脑 → 属性 → 高级系统设置 → 环境变量，在用户变量里新增上面两项。
- **macOS / Linux**：写进 `~/.zshrc` 或 `~/.bashrc`，`source` 一下。

Android 那边的 Gradle 依赖不走这两个变量，镜像要在 `android/build.gradle` 的 `repositories` 里换阿里云，或在 `gradle-wrapper.properties` 里换 `distributionUrl`。

## 最小工程

```bash
flutter create my_app
cd my_app
flutter run          # 连了设备或开了模拟器时
flutter devices      # 看有哪些设备可用
```

`lib/main.dart` 就是全部起点：

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My App',
      home: Scaffold(
        appBar: AppBar(title: const Text('首页')),
        body: const Center(child: Text('Hello Flutter')),
      ),
    );
  }
}
```

目录约定：

```text
my_app/
├── lib/            # Dart 源码，main.dart 是入口
├── test/           # flutter test 跑的单元/Widget 测试
├── android/        # Android 原生壳，Gradle 配置在这里
├── ios/            # iOS 原生壳，Podfile 在这里
├── web/            # flutter build web 用
├── pubspec.yaml    # 依赖与资源声明
└── analysis_options.yaml
```

`android/` 和 `ios/` 只在改权限、签名、原生插件时才动。

## Widget 与状态

- **一切皆 Widget**：布局、文字、按钮都是 Widget，靠组合而不是继承扩展。
- `StatelessWidget`：没有可变状态，重绘只取决于构造参数。
- `StatefulWidget` + `setState`：状态变化时重建这一棵子树。
- 常用布局：`Row` / `Column`（线性）、`Stack`（层叠）、`Container`（尺寸与装饰）、`Expanded`（占满剩余空间）。
- 跨组件共享状态用 `Provider` / `Riverpod` / `Bloc`，不要层层传构造参数。

## 依赖

```bash
flutter pub add http        # 写进 pubspec.yaml 并安装
flutter pub get             # 按 pubspec.yaml 安装
flutter pub upgrade         # 升级到允许范围内的最新版
flutter pub outdated        # 看哪些能升
```

`pubspec.yaml` 里的版本约束是 `^1.2.3` 形式，等价于 `>=1.2.3 <2.0.0`。

## 打包

```bash
flutter build apk --release        # APK
flutter build appbundle --release  # 上架 Google Play 用 AAB
flutter build web                  # 产物在 build/web
flutter build ios --release        # 需要 macOS + Xcode
```

Android 签名配置在 `android/app/build.gradle` 的 `signingConfigs`，密钥与口令不进仓库。

## 参考

- [Flutter 中文文档](https://docs.flutter.cn/)
- [手动安装 Flutter](https://docs.flutter.cn/install/manual)
- [在中国使用 Flutter](https://docs.flutter.cn/community/china)
