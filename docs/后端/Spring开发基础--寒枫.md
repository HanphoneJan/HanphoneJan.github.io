[Spring Boot 官方文档](https://spring.io/projects/spring-boot)

[SpringBoot 教程 - SpringBoot 教程 - 菜鸟教程](https://www.cainiaojc.com/springboot/springboot-tutorial.html)

**Spring**：是一个**全面的企业级应用开发框架**，提供了 IoC（控制反转）、AOP（面向切面编程）、事务管理、MVC 等基础功能，旨在通过 “模块化” ；；方式解决企业级开发的复杂性。开发者需自行配置和整合各种组件（如数据库连接、Web 服务器、安全认证等）。

**Spring Boot**：是一个 Spring 模块，提供了 **RAD(快速应用程序开发)**功能。遵循 “约定优于配置”（Convention Over Configuration）原则，不需要 XML 配置(部署描述符)，旨在通过自动配置和简化依赖管理，让开发者**快速搭建独立运行的 Spring 应用**，减少样板代码和配置文件。

传统 Spring 开发需要大量 XML 配置或 Java 注解，需手动管理 Maven 或 Gradle 依赖。通常打包为 WAR 文件，部署到外部应用服务器。**Spring Boot**通过自动配置（如 `@SpringBootApplication`注解）和 `application.properties`/`application.yml`文件简化配置。支持内嵌服务器（如 Tomcat、Jetty），可直接打包为可执行 JAR 文件，通过 `java -jar`命令独立运行，无需额外服务器配置。
![SpringBoot的组成部分](https://hanphone.top/gh/HanphoneJan/public_pictures/spring/SpringBoot的组成部分.webp)

## SpringMVC

**SpringMVC** 是 Spring 框架下基于模型视图控制器的 Web 框架。分别指定每个依赖项。必需 XML 配置。
参考资料：[黑马程序员--SpringMVC 详细教程\_springmvc 教程-CSDN 博客](https://blog.csdn.net/qq_58168493/article/details/122634493)

### 执行流程

![SpringMVC流程图示](https://hanphone.top/gh/HanphoneJan/public_pictures/spring/SpringMVC流程图示.webp)

#### SpringMVC的执行流程

![SpringMVC的执行流程图](https://hanphone.top/gh/HanphoneJan/public_pictures/spring/SpringMVC的执行流程图.webp)

① 用户发送请求至前端控制器 DispatcherServlet。

② DispatcherServlet 收到请求调用 HandlerMapping 处理器映射器。

③ 处理器映射器找到具体的处理器(可以根据 xml 配置、注解进行查找)，生成处理器对象及处理器拦截器(如果 有则生成)一并返回给 DispatcherServlet。

④ DispatcherServlet 调用 HandlerAdapter 处理器适配器。

⑤ HandlerAdapter 经过适配调用具体的处理器(Controller，也叫后端控制器)。

⑥ Controller 执行完成返回 ModelAndView。

⑦ HandlerAdapter 将 controller 执行结果 ModelAndView 返回给 DispatcherServlet。

⑧ DispatcherServlet 将 ModelAndView 传给 ViewReslover 视图解析器。

⑨ ViewReslover 解析后返回具体 View。

⑩ DispatcherServlet 根据 View 进行渲染视图（即将模型数据填充至视图中）。DispatcherServlet 响应用户。

#### SpringMVC组件解析

1.前端控制器：DispatcherServlet

用户请求到达前端控制器，它就相当于 MVC 模式中的 C，DispatcherServlet 是整个流程控制的中心，由 它调用其它组件处理用户的请求，DispatcherServlet 的存在降低了组件之间的耦合性。

2.处理器映射器：HandlerMapping HandlerMapping

负责根据用户请求找到 Handler 即处理器，SpringMVC 提供了不同的映射器实现不同的 映射方式，例如：配置文件方式，实现接口方式，注解方式等。

3.处理器适配器：HandlerAdapter

通过 HandlerAdapter 对处理器进行执行，这是适配器模式的应用，通过扩展适配器可以对更多类型的处理 器进行执行。

4.处理器：Handler

它就是我们开发中要编写的具体业务控制器。由 DispatcherServlet 把用户请求转发到 Handler。由 Handler 对具体的用户请求进行处理。

5.视图解析器：View Resolver

View Resolver 负责将处理结果生成 View 视图，View Resolver 首先根据逻辑视图名解析成物理视图名，即 具体的页面地址，再生成 View 视图对象，最后对 View 进行渲染将处理结果通过页面展示给用户。

6.视图：View

SpringMVC 框架提供了很多的 View 视图类型的支持，包括：jstlView、freemarkerView、pdfView 等。最 常用的视图就是 jsp。一般情况下需要通过页面标签或页面模版技术将模型数据通过页面展示给用户，需要由程 序员根据业务需求开发具体的页面

### 开发步骤

① 导入 SpringMVC 相关坐标

② 配置 SpringMVC 核心控制器 DispathcerServlet

③ 创建 Controller 类和视图页面

④ 使用注解配置 Controller 类中业务方法的映射地址

⑤ 配置 SpringMVC 核心文件 spring-mvc.xml

⑥ 客户端发起请求测试

### SpringMVC 数据请求与数据响应

**MVC 实现数据请求方式**

- 基本类型参数：**Controller 中的业务方法数组名称与请求参数的 name 一致，参数值会自动映射匹配。**
- POJO 类型参数：**获得集合参数时，要将集合参数包装到一个 POJO 中**
- 数组类型参数
- 集合类型参数

**SpringMVC的数据响应方式**
1、页面跳转
①直接返回字符串
② 通过ModelAndView对象返回

2、回写数据
① 直接返回字符串
② 返回对象或集合

### 注解

#### lombok

Lombok 是一个 Java 库，能自动插入编辑器并构建工具，简化 Java 开发。通过添加注解的方式，不需要为类编写 getter 或 eques 方法。
可以大幅简化 POJO 类的编写，例如实体类、DTO 等。
在 Spring 框架中，当使用依赖注入（如 `@Autowired`）时，通常需要类具有 setter 方法。`@Setter`注解可以自动生成这些方法
`@Getter`注解为类中的所有字段自动生成 `getter`方法（获取字段值的方法）。
`@Data`注解是一个组合注解，包含了 `@Getter`、`@Setter`、`@ToString`、`@EqualsAndHashCode`、`@RequiredArgsConstructor`的功能。
但是有可能导致编译错误，建议使用最新版。

#### 为什么不推荐用Autowired?

（不推荐使用字段注入）是依赖注入（DI）框架（如 Spring）中常见的代码检查提示。
字段注入直接通过反射修改类的私有字段，绕过了类的构造方法和 setter 方法。这违背了面向对象的封装原则 —— 类应该通过自身提供的方法来控制内部状态的修改，而不是允许外部直接访问私有字段。
使用字段注入时，依赖项被隐藏在私有字段中，没有显式的构造方法或 setter 方法来设置依赖。

#### 接收 Request 请求参数的 7 种方式

参考资料：[Java 后端接收Request请求参数的7种方式_java如何将request的params映射到实体中-CSDN博客](https://blog.csdn.net/ShiuHB/article/details/109674343)
1.直接在Controller 方法参数上配置参数名
2.@RequestParam 接收url地址中的参数
3.@RequestBody 接收body中JSON字符串参数
4.直接通过实体接收参数
5.@ModelAttribute 接收实体参数
6.HttpServletRequest request接收参数
7.@PathVariable RestFul 风格传参

#### Request&Response

Request 是请求对象，Response 是响应对象，这两个对象在我们使用 Servlet 的 service 方法的时候有看到

#### request:获取请求数据

浏览器会发送 HTTP 请求到后台服务器[Tomcat]，HTTP 的请求中会包含很多请求数据[请求行+请求头+请求体]
后台服务器[Tomcat]会对 HTTP 请求中的数据进行解析并把解析结果存入到一个对象中
所存入的对象即为 request 对象，所以我们可以从 request 对象中获取请求的相关参数

#### response:设置响应数据

业务处理完后，后台就需要给前端返回业务处理的结果即响应数据，把响应数据封装到 response 对象中，后台服务器[Tomcat]会解析 response 对象,按照[响应行+响应头+响应体]格式拼接结果

##### 请求参数中文乱码问题

设置一个过滤器来进行编码的过滤

## SpringBoot

### 五个层次

| 层级名称                                           | 核心职责                                                                                                                                     | 核心特征                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **实体层（Entity/PO 层），持久化对象层 **          | 1. 对应数据库中的一张数据表，属性与表字段一一映射`<br>`2. 仅封装字段和 getter/setter，无业务逻辑`<br>`3. 字段数 ≥ 数据库操作所需字段数  | Persistent Object，持久化对象。纯数据载体，无行为，是各层之间传递数据的基础              |
| **持久层（DAO/Mapper 层），数据访问层**      | 1. 与数据库表一一对应，封装单表的增删改查（CRUD）操作`<br>`2. 直接执行 SQL 语句（Mapper 层）`<br>`3. 仅关注数据存储 / 读取，无业务逻辑   | Data Access Object，数据访问对象，最底层数据操作，只做单表操作，不涉及多表关联或业务规则 |
| **业务层（Service 层）**，业务逻辑层         | 1. 组合一个 / 多个 DAO/Mapper 层的方法，实现复杂业务逻辑`<br>`2. 处理授权、验证、事务控制等`<br>`3. 间接操作数据库，对外提供业务接口     | 核心业务逻辑载体，可跨表操作，是分层架构的核心                                           |
| **控制层（Controller 层），接口层 / 请求层** | 1. 接收前端 HTTP 请求，解析参数（JSON → 实体类）`<br><br>`2. 调用 Service 层处理业务，接收返回结果`<br><br>`3. 封装响应数据，返回给前端 | 仅做请求转发和参数 / 响应处理，无业务逻辑，是前端与后端的交互入口                        |
| **展示层（View 层），前端层**                | 1. 负责页面展示、用户交互`<br><br>`2. 发送 HTTP 请求到 Controller 层，接收并渲染响应数据                                                   | 纯前端交互层，不属于后端分层，但与 Controller 层直接对接                                 |

### Application.properties配置

使用名为 **application.properties** 的文件进行应用程序配置。它位于 **src/main/resources** 文件夹中。还可以使用 application.yml 文件，但是 **yml** 文件应该出现在类路径中。

[SpringBoot 应用程序属性 - SpringBoot 教程 - 菜鸟教程](https://www.cainiaojc.com/springboot/springboot-properties.html)

[SpringBoot 中的配置文件详解(yml、properties 全局配置和自定义配置、腾讯云开发者社区](https://cloud.tencent.com/developer/article/2177628)

[3.SpringBoot 配置文件 - application.properties 的常用配置\_application.properties 配置数据库-CSDN 博客](https://blog.csdn.net/yiguang_820/article/details/117882194)

```properties
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.datasource.url=jdbc:postgresql://localhost:5432/blog?characterEncoding=utf-8&serverTimezone=GMT
spring.datasource.username=${PG_USERNAME}
spring.datasource.password=${PG_PASSWORD}

#spring.jpa.show-sql=true
spring.jpa.hibernate.ddl-auto=update
logging.level.root=info
logging.level.com.example.blog2=debug
logging.file.name=log.blog-dev.log
logging.file.path=/logs
server.port=${SERVER_PORT:8090}

server.compression.enabled=true
server.compression.mime-types=application/javascript,text/css,application/json,application/xml,text/html,text/xml,text/plain

# JWT配置
TOKEN_SECRET=${TOKEN_SECRET}
JWT_ISSUER=${JWT_ISSUER}
JWT_EXPIRE_TIME=${JWT_EXPIRE_TIME:604800000}
```

```yml
spring:
application:
name: demoApplication
server:
port: 8081
```

### 依赖管理

每个 Spring Boot 版本都提供了它所支持的依赖项列表。依赖关系列表是可以与 **Maven** 一起使用的 **材料清单**的一部分。因此，我们无需在配置中指定依赖项的版本。 Spring Boot 自行管理。当我们更新 Spring Boot 版本时，Spring Boot 会以一致的方式自动升级所有依赖项。

**spring-boot-starter-parent** 会自动继承。

##### 添加 Spring Boot Maven 插件

可以在 **pom.xml** 文件中 **添加 Maven 插件**。它将项目包装到可执行的 **jar** 文件中。

### main方法启动

Spring Boot 支持 main 方法启动，在我们需要启动的主类中加入此注解，告诉 Spring Boot，这个类是程序的入口。如：

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

如果不加这个注解，程序是无法启动的。

## 数据库操作

### JDBC

Java 平台用于连接关系型数据库的标准 API，由一组用 Java 语言编写的接口和类组成。它允许 Java 程序通过统一的方式操作不同类型的数据库（如 MySQL、Oracle、PostgreSQL 等），直接操作 SQL，屏蔽了底层数据库的差异。

#### **JDBC 的核心组件**

1. **Driver（驱动）**
   - 数据库厂商实现的 JDBC 接口实现类，用于建立与数据库的连接。
   - 例如：MySQL 的驱动类为 `com.mysql.cj.jdbc.Driver`，Oracle 的驱动类为 `oracle.jdbc.OracleDriver`。
2. **Connection（连接）**
   - 代表 Java 程序与数据库的一次会话，用于创建 SQL 执行对象。
   - 例如：通过 `DriverManager.getConnection(url, username, password)` 获取连接。
3. **Statement/PreparedStatement/CallableStatement（语句对象）**
   - **Statement**：执行普通 SQL 语句（存在 SQL 注入风险）。
   - **PreparedStatement**：预编译 SQL 语句，支持参数化查询，安全性和性能更优（推荐使用）。
   - **CallableStatement**：执行数据库存储过程。
4. **ResultSet（结果集）**
   - 存储 SQL 查询返回的结果，提供遍历和获取数据的方法（如 `getInt()`、`getString()`）。
5. **DriverManager（驱动管理器）**
   - 管理数据库驱动的注册和连接的创建，是 JDBC 的核心管理类。

现代 Java 开发中，JDBC 常作为底层技术被 ORM（对象关系映射）框架封装，例如：

- **Hibernate**：完全封装 JDBC，通过对象操作数据库，屏蔽 SQL 细节。
- **MyBatis**：半自动化 ORM，允许开发者编写 SQL 并映射结果集，简化 JDBC 操作。
- **Spring JDBC**：Spring 框架的一部分，通过 `JdbcTemplate` 简化 JDBC 编码，提供模板

### MyBatis

通过 xml 配置文件映射，免除 jdbc 代码，使得后端 java 类能够操纵数据库，并且方便后期维护

具体操作可以查阅官网

##### 在 IDEA 中配置数据库连接

##### mapper 代理开发

```java
public class MyBatisDemo2 {

    public static void main(String[] args) throws IOException {

        //1. 加载mybatis的核心配置文件，获取 SqlSessionFactory
        String resource = "mybatis-config.xml";
        InputStream inputStream = Resources.getResourceAsStream(resource);
        SqlSessionFactory sqlSessionFactory = new SqlSessionFactoryBuilder().build(inputStream);

        //2. 获取SqlSession对象，用它来执行sql
        SqlSession sqlSession = sqlSessionFactory.openSession();
        //3. 执行sql
        //List<User> users = sqlSession.selectList("test.selectAll");
        //3.1 获取UserMapper接口的代理对象
        UserMapper userMapper = sqlSession.getMapper(UserMapper.class);
        List<User> users = userMapper.selectAll();

        System.out.println(users);
        //4. 释放资源
        sqlSession.close();
    }
}
```

configuration（配置）

- [properties（属性）](https://mybatis.net.cn/configuration.html#properties)，[settings（设置）](https://mybatis.net.cn/configuration.html#settings)
- [typeAliases（类型别名）](https://mybatis.net.cn/configuration.html#typeAliases)，[typeHandlers（类型处理器）](https://mybatis.net.cn/configuration.html#typeHandlers)
- [objectFactory（对象工厂）](https://mybatis.net.cn/configuration.html#objectFactory)，[plugins（插件）](https://mybatis.net.cn/configuration.html#plugins)
- environments（环境配置）
  - environment（环境变量）
    - transactionManager（事务管理器）
    - dataSource（数据源）
- [databaseIdProvider（数据库厂商标识）](https://mybatis.net.cn/configuration.html#databaseIdProvider)
- [mappers（映射器）](https://mybatis.net.cn/configuration.html#mappers)

##### mybatis-config.xml

xml 与 html 语法上类似，但用途是存储数据，尽量使用标签存储数据，属性仅用于数据的数据时

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE configuration
        PUBLIC "-//mybatis.org//DTD Config 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-config.dtd">
<configuration>

    <typeAliases>
        <package name="com.itheima.pojo"/>
    </typeAliases>

    <!--
    environments：配置数据库连接环境信息。可以配置多个environment，通过default属性切换不同的environment
    -->
    <environments default="development">
        <environment id="development">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <!--数据库连接信息-->
                <property name="driver" value="com.mysql.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql:///mybatis?useSSL=false"/>
                <property name="username" value="root"/>
                <property name="password" value="1234"/>
            </dataSource>
        </environment>

        <environment id="test">
            <transactionManager type="JDBC"/>
            <dataSource type="POOLED">
                <!--数据库连接信息-->
                <property name="driver" value="com.mysql.jdbc.Driver"/>
                <property name="url" value="jdbc:mysql:///mybatis?useSSL=false"/>
                <property name="username" value="root"/>
                <property name="password" value="1234"/>
            </dataSource>
        </environment>
    </environments>
    <mappers>
        <!--加载sql映射文件-->
       <!-- <mapper resource="com/itheima/mapper/UserMapper.xml"/>-->

        <!--Mapper代理方式-->
        <package name="com.itheima.mapper"/>
    </mappers>

</configuration>
```

#### MyBatis 常用注解

```java
@Insert ： 插入sql , 和xml insert sql语法完全一样
@Select ： 查询sql, 和xml select sql语法完全一样
@Update ： 更新sql, 和xml update sql语法完全一样
@Delete ： 删除sql, 和xml delete sql语法完全一样
@Param ： 入参
@Results ：结果集合
@Result ： 结果
```

MyBatis 会执行这个语句并返回结果

### JPA

**Spring Boot JPA** 是用于管理的 Java 规范 Java 应用程序中的**关系**数据。它允许我们访问和持久化 Java 对象/类与关系数据库之间的数据。 JPA 遵循**对象关系映射**(ORM)。它是一组接口。它还提供了运行时 **EntityManager** API，用于处理针对数据库对象的查询和事务。

JPA 的主要优点在于，**在 JPA 中，数据由对象和类表示，而在 JDBC 中，数据由表和记录表示。JPA 使用 POJO 表示持久数据，从而简化了数据库编程**。 JPA 还有其他优点:

JPA 避免使用 SQL 的特定于数据库的方言编写 DDL。取而代之的是，它允许以 XML 或使用 Java 注解进行映射。JPA 允许我们避免用 SQL 的数据库专用方言编写 DML。JPA 允许我们完全不使用任何 DML 语言来保存和加载 Java 对象和图形。当我们需要执行查询 JPQL 时，它允许我们用 Java 实体而不是(本机)SQL 表和列来表达查询。

Hibernate 等是 JPA 的**提供者**。

### IDEA 连接数据库

教程参考：[MySQL 连接 IDEA 详细教程-腾讯云开发者社区-腾讯云 (tencent.com)](https://cloud.tencent.com/developer/article/2260845)

打开 idea，点击右侧的 Database。选择 Data Source ，选择数据库，配置驱动，填上信息后，点击 Test Connect 测试
① 连接的名称
② 连接的数据库地址和端口号（连接本地的数据库就默认为 localhost，端口号为 3306）
③ 数据库的用户名和密码
④ 需要连接的数据库名称
⑤ 配置完成之后，点击测试连接，查看是否连接成功
然后连接到具体的数据块，可以在 idea 中创建，也可以先在 DBMS 中创建好

#### 权限不足

常见导致权限不足的场景：

1. 数据库账号是新创建的，只给了 “连接数据库” 的权限，没给 “操作具体表” 的权限；
2. 表是后来新增的（如  `t_tag`），但没给现有账号授权；
3. 数据库账号被误操作回收了表权限。

## Servlet

**Servlet** 是 Java 平台中用于开发 Web 应用程序的标准组件，遵循 Java Servlet 规范。它**本质上是一个运行在 Web 容器（如 Tomcat、Jetty）中的 Java 类，负责处理客户端（如浏览器）的 HTTP 请求并返回响应**，是传统 JavaWeb 开发的基础。

### JSP 与 Servlet 的协同工作

JSP（Java Server Pages）与 Servlet 是 Java EE 中构建动态 Web 应用的基础技术，二者通过 **MVC 模式** 协同工作：

| 组件 | 职责 | 技术特点 |
|------|------|----------|
| **Servlet** | 控制器（Controller） | 处理业务逻辑、调用数据库、控制流程跳转 |
| **JSP** | 视图（View） | 展示数据、生成 HTML 页面 |
| **JavaBean** | 模型（Model） | 封装数据、与数据库表映射 |

#### JSP 动态页面

JSP 是基于 HTML 的动态页面技术，支持以下特性：

- **脚本标签**：`<% %>` 嵌入 Java 代码，`<%= %>` 输出表达式结果
- **标签库**：通过 `<%@ taglib %>` 引入 JSTL、EL 表达式
- **内置对象**：`request`（获取请求参数）、`session`（管理会话）、`out`（输出内容）

**示例：学生列表 JSP**

```jsp
<%@ page import="java.util.List" %>
<%@ page import="com.entity.Student" %>
<html>
<body>
    <h1>学生列表</h1>
    <ul>
        <% List<Student> students = (List<Student>) request.getAttribute("students"); %>
        <% for (Student s : students) { %>
            <li><%= s.getSid() %> - <%= s.getSname() %></li>
        <% } %>
    </ul>
</body>
</html>
```

#### Servlet 核心功能

Servlet 在 MVC 架构中承担控制器职责，主要功能包括：

1. **接收请求参数**：通过 `req.getParameter("username")` 获取表单或 URL 参数
2. **调用业务逻辑**：通过 Service 层或 DAO 层处理业务（如 JDBC 查询用户数据）
3. **控制页面跳转**：
   - 重定向：`resp.sendRedirect("url")`（重新发起请求）
   - 转发：`req.getRequestDispatcher("page.jsp").forward(req, resp)`（请求转发，共享 request 数据）

**示例：用户登录验证 Servlet**

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        // 调用数据库验证逻辑
        boolean isValid = UserService.validate(username, password);
        if (isValid) {
            req.getSession().setAttribute("user", username);
            resp.sendRedirect("home.jsp");
        } else {
            req.setAttribute("error", "用户名或密码错误");
            req.getRequestDispatcher("login.jsp").forward(req, resp);
        }
    }
}
```

#### 数据库交互流程

在 JSP + Servlet 架构中，完整的数据库交互流程如下：

1. **Servlet 接收请求**：解析参数（如查询条件）
2. **调用数据层**：通过 JDBC 或工具类执行数据库查询（如 `StudentDAO.getStudents()`）
3. **数据传递**：将查询结果存入 `request` 或 `session` 作用域
4. **JSP 渲染**：通过 EL 表达式或脚本段展示数据

### Servlet 接口定义

#### 核心接口：`javax.servlet.Servlet`

Servlet 需实现该接口的三个生命周期方法：

- `init(ServletConfig config)`：初始化方法，容器创建 Servlet 实例时调用（仅一次）
- `service(ServletRequest req, ServletResponse res)`：处理请求的核心方法，根据请求类型（GET/POST 等）分发至具体处理方法
- `destroy()`：销毁方法，容器关闭时调用，用于释放资源

#### 常用子类：`HttpServlet`

大多数 Servlet 会继承 `HttpServlet`，重写针对 HTTP 请求的处理方法：

- `doGet(HttpServletRequest req, HttpServletResponse res)`：处理 GET 请求
- `doPost(HttpServletRequest req, HttpServletResponse res)`：处理 POST 请求
- 其他：`doPut`、`doDelete` 等，对应 RESTful 接口

### Servlet 与 Web 容器的交互流程

1. **客户端发送 HTTP 请求至 Web 容器（如 Tomcat）**。
2. **容器解析请求**：根据 URL 匹配 `web.xml` 中配置的 Servlet 映射规则。
3. **创建请求与响应对象**：`HttpServletRequest`（封装请求数据）和 `HttpServletResponse`（封装响应数据）。
4. **调用 Servlet 的 service 方法**：容器将请求分发给对应的 Servlet 实例处理。
5. **Servlet 处理请求**：通过请求对象获取参数，执行业务逻辑，通过响应对象设置返回数据（如 HTML、JSON）。
6. **容器返回响应**：将 Servlet 生成的响应数据封装为 HTTP 响应，返回给客户端。

直接使用 Servlet 开发复杂项目较为繁琐，但它是许多框架的基础

- **框架的基础**：SpringMVC 的 `DispatcherServlet` 是一个核心 Servlet，负责请求分发。
- **容器支持**：Tomcat、Jetty 等容器的核心功能仍是对 Servlet 规范的实现。

### Tomcat

Tomcat是一个Servlet 容器（实现了 Java Servlet、JSP 和 WebSocket 标准），属于轻量级 Web 服务器，用于运行 Java Web 应用（如 Spring MVC、Struts 项目），处理 HTTP 请求并生成动态内容。

#### 启动

双击: bin\startup.bat
启动后，通过浏览器访问 `http://localhost:8080` 能看到 Apache Tomcat 的内容就说明 Tomcat 已经
启动成功。

## 项目日志配置

定义日志工具类
创建一个全局日志工具类，通过统一的日志工具类获取 logger 实例，避免在每个类中重复创建 logger，确保使用方式一致。

## 项目测试工具

### Postman

后端接口测试

### 内网穿透

工具：cpolar
