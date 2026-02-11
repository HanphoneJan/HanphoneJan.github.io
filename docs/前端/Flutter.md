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

#### 国内镜像配置（全平台通用）

推荐使用 CFUG（China Flutter User Group）维护的镜像，配置方式如下：

##### 临时配置（仅当前终端生效）

代码语言：javascript

AI代码解释

```javascript
# Windows（PowerShell）
$env:PUB_HOSTED_URL="https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL="https://storage.flutter-io.cn"

# macOS/Linux（终端）
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
```

##### 永久配置（推荐）

- Windows：通过"此电脑 → 右键属性 → 高级系统设置 → 环境变量"，在"用户变量"或"系统变量"中新增两个变量：
  - `PUB_HOSTED_URL`，值为：https://pub.flutter-io.cn
  - `FLUTTER_STORAGE_BASE_URL`，值为：https://storage.flutter-io.cn
- macOS/Linux：编辑 shell 配置文件（bash 为 ~/.bash_profile，zsh 为 ~/.zshrc），添加上述两条 export 指令，保存后执行 `source ~/.bash_profile` 或 `source ~/.zshrc` 生效。