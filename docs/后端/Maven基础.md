Maven 是一个 项目管理与构建自动化工具，主要用于 Java 项目，但也可用于其他语言（如 Kotlin、Scala）。
Maven 的核心功能包括：

- **项目构建**（编译、测试、打包、部署）
- **依赖管理**（自动下载和管理第三方库）
- **标准化项目结构**（约定优于配置）
- **插件扩展**（支持自定义构建流程）

### Maven 模型

![maven模型](https://hanphone.top/gh/HanphoneJan/public_pictures/learn/maven模型.webp)

##### 推荐项目目录

```
myproject/
|-- pom.xml
`-- src
    |-- main
    |   |-- java
    |   |-- resources
    |   `-- webapp
    `-- test
        |-- java
        `-- resources
```

### Maven 安装与配置

Maven 下载地址：http://maven.apache.org/download.cgi

解压下载文件到自定义目录，配置环境变量 MAVEN_HOME 为安装路径的 bin 目录

配置本地仓库：修改 conf/settings.xml 中的 `<localRepository>`

配置阿里云私服，修改 `<mirrors>`标签

```xml
<mirror>
      <id>alimaven</id>
      <name>aliyun maven</name>
      <url>http://maven.aliyun.com/nexus/content/groups/public/</url>
      <mirrorOf>central</mirrorOf>
</mirror>
```

(配置私服，减少从中央仓库下载的时间)

### 依赖管理

![maven仓库交互图](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/maven仓库交互图.webp)

```xml
<!-- pom.xml 的 dependencies 列表列出了我们的项目需要构建的所有外部依赖项 -->
<dependencies>
  <dependency>
    <groupId>org.example</groupId>
    <artifactId>my-project</artifactId>
    <version>1.0.0</version>
  </dependency>
</dependencies>
```

项目同步依赖前要先配置 JDK。

要添加依赖项，可以先在 src 文件夹下添加 lib 文件夹，然后将工程需要的 jar 文件复制到 lib 文件夹下。

maven 会自动管理传递性依赖，Maven 使用三个基本坐标来唯一标识一个依赖项：

- **groupId**：定义项目所属的组织或公司（如 `org.apache`）
- **artifactId**：定义项目的名称（如 `commons-lang3`）
- **version**：定义项目的版本（如 `3.12.0`）

这三个元素组合起来形成了 Maven 依赖的唯一标识符。

依赖范围 (Scope) Maven 定义了不同的依赖范围，决定了依赖在哪些阶段可用：

- **compile**（默认）：编译、测试和运行时都可用
- **provided**：编译和测试时可用，但运行时由 JDK 或容器提供
- **runtime**：只在测试和运行时需要
- **test**：仅在测试编译和执行阶段需要
- **system**：类似于 provided，但需要显式指定 JAR 路径

```xml
<dependencies>
    <!-- 添加你的依赖 -->
     <dependency>
         <groupId>junit</groupId>
         <artifactId>junit</artifactId>
         <version>3.8.1</version>
         <scope>test</scope>
      </dependency>

    <dependency>
        <groupId>ldapjdk</groupId>  <!-- 库名称，也可以自定义 -->
        <artifactId>ldapjdk</artifactId>    <!--库名称，也可以自定义-->
        <version>1.0</version> <!--版本号-->
        <scope>system</scope> <!--作用域,确定依赖范围-->
        <systemPath>${basedir}\src\lib\ldapjdk.jar</systemPath> <!--项目根目录下的lib文件夹下-->
    </dependency>
</dependencies>
```

### Maven 命令

mvn+compile, clean, test, package(打包成 jar 包), install(将当前项目安装到本地仓库)

### Maven 生命周期

clean： 生命周期负责清理项目的临时文件和目录（主要是 target/）

dafault（build）：Maven 构建（build）生命周期是由以下几个阶段的序列组成的

![maven生命周期图](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/maven生命周期图.webp)

site： 生命周期用于生成项目站点文档

### IDEA 配置 Maven

IDEA 已经内置了对 Maven 的支持

settings-->maven-->使用本地安装的 maven，并修改配置文件路径（/conf/settings.xml)

Maven 使用原型 **archetype** 插件创建项目

#### Maven Compiler Plugin-Maven 编译插件

**Maven Compiler Plugin**  是一个用于编译项目代码的 Maven 插件。它允许开发者指定项目源码和目标编译的 JDK 版本，以及编码格式，从而确保项目在不同环境下编译的一致性

**推荐使用插件：maven-helper**

**构建工具（Maven/Gradle）报错**
 像 Maven 这类工具依赖 JDK 进行编译和打包操作。如果未配置 JDK 环境变量，可能会出现类似 “找不到 Java_HOME” 或 “无法执行编译” 的错误（例如你之前遇到的编译失败问题，也可能与此相关）。
