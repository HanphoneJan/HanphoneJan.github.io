教程：[简介 - Java 教程 - 廖雪峰的官方网站 (liaoxuefeng.com)](https://liaoxuefeng.com/books/java/introduction/index.html)

[Java 教程 | 菜鸟教程 (runoob.com)](https://www.runoob.com/java/java-tutorial.html)

### 安装

windows 一般使用.msi 安装

JAVA

​ JVM,JRE,JDK 三层结构

​ java api 文档查看与使用

## 基础语法与关键字

switch 语法 穿透现象

赋值给 float 时应该在数字后加 f，否则有 double 截断错误

system.out.println 与 toString

#### 模块、包、类

模块 practice；包 src，包中可以创建包，模块下也可；类 首字母大写

##### 其他命名都使用驼峰命名法

#### 构造方法——构造器

源文件的名称应该和 public 类的类名保持一致。构造方法的名称必须与类同名，一个类可以有多个构造方法，构造器没有返回类型

#### main 方法

main 方法是程序运行的入口，没有 main 则无法运行

#### this 关键字

```java
public class Account {
    private String name;
    private double balance;
    private String pwd;

	//Account类的一个构造器  方法中的变量为局部变量存储在栈中。通过构造器初始化成员变量存储在堆中
	public Account (String name,double balance,String pwd){
		//构造器的实现---初始化对象
		this.name = name;
		this.balance = balance;
		this.pwd = pwd;
	}
}
```

#### instanceof 关键字（了解）

instanceof 是 Java 中的二元运算符，左边是对象，右边是类；当对象是右边类或子类所创建对象时，返回 true；否则，返回 false。

在 Java 中，每个对象都有一个运行时类型标识（runtime type identification），即表示该对象所属的类或接口类型。这个标识由虚拟机在对象创建时自动添加，并保存在对象头中。当使用 instanceof 运算符对对象进行判断时，实际上是通过比较该对象的运行时类型标识和指定类的类型来确定对象是否是指定类的实例。

instanceof 运算符只适用于对象类型，不适用于原始数据类型（如 int、double 等）。

```java
类型转换：在使用强制类型转换进行类型转换之前，可以先使用 instanceof 运算符判断对象的类型，避免出现 ClassCastException 异常。
if (obj instanceof String) {
    String str = (String) obj;
    //TODO: do something with str
}

运行时类型判断：有时候需要在运行时根据不同的对象类型执行不同的代码逻辑，这时可以使用 instanceof 运算符判断对象的类型。
if (obj instanceof Integer) {
    int value = ((Integer) obj).intValue();
    //TODO: do something with value
} else if (obj instanceof Double) {
    double value = ((Double) obj).doubleValue();
    //TODO: do something with value
} else {
    //TODO: handle other types
}

对象匹配：有时候需要在一个集合中查找某个类型的对象，这时可以使用 instanceof 运算符筛选符合条件的对象
List<Object> list = new ArrayList<>();
list.add("Hello");
list.add(123);
list.add(new Date());

for (Object obj : list) {
    if (obj instanceof Integer) {
        System.out.println("Found integer: " + obj);
    }
}
```

#### 访问修饰

外部包的类都要 import，很少用 protected

| 修饰符       | 当前类 | 同一包内 | 子孙类(同一包) | 子孙类(不同包) | 其他包 |
| --------- | --- | ---- | -------- | -------- | --- |
| public    | Y   | Y    | Y        | Y        | Y   |
| protected | Y   | Y    | Y        | Y/N      | N   |
| default   | Y   | Y    | Y        | N        | N   |
| private   | Y   | N    | N        | N        | N   |
protected 的核心规则是：不同包的子类，能否访问该成员，取决于访问方式，当不同包的子类**通过自己的实例**（而非父类的实例）访问父类的 protected 成员时，是允许的，而当不同包的子类**直接通过父类的实例**访问 protected 成员时，是不允许的。
#### static 修饰符

- ◦ 一旦将成员设为 static，数据或方法就不会同类的任何实例联系到一起

  ◦ 即使从未创建那个类的一个实例，仍能调用 static 方法，或访问一些 static 数据

  常见于统计类的实例的个数等

#### final

告诉编译器某个数据是“常数”。常数主要应用于下述两个方面：

(1) 编译期常数，它永远不会改变 (2) 在运行期初始化的一个值，我们不希望它发生变化

对于编译期的常数，编译器（程序）可将常数值“封装”到需要的计算过程里。也就是说，计算可在编译期间提前执行，从而节省运行时的一些开销

#### 例程

```java
package bao;

public class Person {
    private static int count=0;
    private String name;
    private int age;
    public Person(String name,int age){
        this.age=age;
        this.name=name;
        count=count+1;
    }
}
```

## 继承

#### 继承关键字

继承可以使用 extends 和 implements 这两个关键字来实现继承，而且所有的类都是继承于 java.lang.Object，当一个类没有继承的两个关键字，则默认继承 Object（这个类在 **java.lang** 包中，所以不需要 **import**）祖先类

##### 单一继承

单一继承性：子类只能有一个超类(父类)，extends 只能继承一个类。而超类可以有多个子类；
子类继承超类的所有成员；子类可以创建自己的成员；子类不能继承超类的构造器，只能在构造器中通过 super()调用超类的构造器；

子类的构造器首先要调用超类的构造器；

多态性：子类的成员隐藏和覆盖超类中相同的成员；超类的对象可以对子类的实例引用；

由 abstract 和 final 修饰的类指示类的是否必须或不能被继承。

类中可以访问从超类继承下来的三种访问权限设定的成员 public;protected;缺省。
在超类中，由 private 修饰的访问权限的成员变量和方法，虽然被子类继承，但是子类不能访问。

##### implements 变相多继承接口

使用 implements 关键字可以变相的使 java 具有多继承的特性，使用范围为类继承接口的情况，可以同时继承多个接口（接口跟接口之间采用逗号分隔）。

##### super 关键字

实现对父类成员的访问，用来引用当前对象的父类。例如：方法覆盖后，子类内部虽然重写了父类的方法，但子类也想使用一下父类的被覆盖的方法，此时可以使用“super.”的方式。当子类中出现和父类一样的属性或者方法，此时，你要想去调用父类的那个属性或者方法，此时“super.”不能省略

无论子类构造方法有没有“this()”和“super()”方法，实例化子类对象一定一定会执行对应的父类构造方法，即不管实例化了一个怎样的孩子，它一定会先实例化一个对应的父亲。

子类不继承父类的构造器（构造方法或者构造函数），它只是调用（隐式或显式）

##### 例程

```java
class Animal {
  void eat() {
    System.out.println("animal : eat");
  }
}

class Dog extends Animal {
  void eat() {
    System.out.println("dog : eat");
  }
  void eatTest() {
    this.eat();   // this 调用自己的方法
    super.eat();  // super 调用父类方法
  }
}
```

## 抽象

把没有方法主体的方法称为抽象方法，也就是没有方法体（大括号）的方法。Java 语法规定，包含抽象方法的类就是抽象类。
抽象类是用来被继承的，继承抽象类的子类必须重写父类所有的**抽象**方法。

在创建抽象方法时，要注意有下面三种方法不能作为抽象方法定义：

构造方法，类方法（static 静态方法），私有方法

#### 向上转型与向下转型

向上转型可以当做隐藏自身的方法，所以，再转回来（向下转型）方法就会恢复原状

## 接口

接口通常以 interface 来声明，由接口可以实现多态。一个类通过继承接口的方式，从而来继承接口的抽象方法。接口中的属性默认是静态的

**接口是百分之百的抽象类**

接口也被用来实现解耦。
接口被用来实现抽象，而抽象类也被用来实现抽象，为什么一定要用接口呢？接口和抽象类之间又有什么区别呢？原因是抽象类内部可能包含非 final 的变量，但是在接口中存在的变量一定是 final，public，static 的。

实现接口一定要实现接口的所有方法。

##### 例程，interface 与 inplements

```java
interface USB {
    void read();
}

class YouPan implements USB {
    @Override
    public void read() {
        System.out.println("U盘正在通过USB功能读取数据");
    }
}
```

#### list 接口

List 是接口，因此无法从中创建对象。为了使用 List 接口的功能，我们可以使用以下类：

- [数组列表（ArrayList 类）](https://www.cainiaojc.com/java/java-arraylist.html)
- [链表（LinkedList 类）](https://www.cainiaojc.com/java/java-linkedlist.html)
- [向量（vector 类）](https://www.cainiaojc.com/java/java-vector.html)
- [堆栈（Stack 类）](https://www.cainiaojc.com/java/java-stack.html)

```java
List<String> phone=new ArrayList<>();
person.add("jackie");   //索引为0  //.add(e)
            person.add("peter");    //索引为1
```

## 类、包

包声明应该在源文件的第一行，每个源文件只能有一个包声明，这个文件中的每个类型都应用于它。

在 Java 中，**import** 关键字用于导入其他类或包中定义的类型，以便在当前源文件中使用这些类型。

#### 内部类

静态内部类是属于外部类的类成员，是一种静态的成员，是属于类的，就有点类似于 private static Singleton instance = null；非静态内部类，是属于外部类的实例对象的一个实例成员,静态类则是属于所有外部共有的，也就是说，每个非静态内部类，不是属于外部类的，是属于外部类的每一个实例的，创建非静态内部类的实例以后，非静态内部类实例，是必须跟一个外部类的实例进行关联和有寄存关系的

#### 匿名类

原本我们需要创建子类或者实现类，去继承父类和实现接口，才能重写其中的方法。但是有时候我们这样做了，然而子类和实现类却只使用了一次（定义了一个对象）。这个时候我们就可以使用匿名内部类，不用去写子类和实现类，起到简化代码的作用。

匿名内部类的格式：父类/接口 对象 = new 父类/接口（）{ 重写父类/接口中的方法 }；

这样做就把子类继承父类，重写父类中的方法，创建子类对象，合成了一步完成，减少了其中创建子类的过程。或者将实现类实现接口，重写接口中的方法，创建实现类对象，合成了一步完成，减少了其中创建实现类的过程

## 线程与线程通信

粗暴的理解：Runnble 和 Thread 是实现多线程的两种方式，在 Java 中要实现多线程运行要么实现 Runnable 接口，要么继承 Thread 类

[Java 多线程编程 | 菜鸟教程](https://www.runoob.com/java/java-multithreading.html)

实现 Runnable 接口：必须实现接口中的无参方法 run(), run() 可以调用其他方法，使用其他类，并声明变量，就像主线程一样

继承 thread 类必须重写 run() 方法，该方法是新线程的入口点。它也必须调用 start() 方法才能执行。

该方法尽管被列为一种多线程实现方式，但是本质上也是实现了 Runnable 接口的一个实例

```java
Thread(Runnable threadOb,String threadName);
```

#### 多线程同步

`synchronized`关键字不能直接用于修饰变量，可以用于方法、代码块以及类

##### 线程的7 种同步方式
**1.同步方法**
**2.同步代码块**
**3.使用特殊域变量(volatile)实现线程同步**
**4.使用重入锁实现线程同步**
**5.使用局部变量实现线程同步**
**6.使用阻塞队列实现线程同步**
**7.使用原子变量实现线程同步**

##### Java 等待唤醒机制 wait/notify 深入解析

调用对象 obj 的 wait(), notify()方法前，必须获得 obj 锁，也就是必须写在 synchronized(obj) 代码段内。

wait()：在线程获取到锁后，调用锁对象的本方法，线程释放锁并且把该线程放置到与锁对象关联的等待队列（等待线程池）。

wait(long timeout)：与 wait()方法相似，只不过等待指定的毫秒数，如果超过指定时间则自动把该线程从等待队列中移出

wait(long timeout, int nanos)： 与上边的一样，只不过超时时间粒度更小，即指定的毫秒数加纳秒数

notify()： 唤醒一个在与该锁对象关联的等待队列的线程，一次唤醒一个，而且是任意的

notifyAll()：唤醒全部：可以将线程池中的所有 wait() 线程都唤醒。

notify()或者 notifyAll()调用时并不会真正释放对象锁, 必须等到 synchronized 方法或者语法块执行完才真正释放锁

### 泛型

java 是强类型编程语言

泛型，即“参数化类型”(类型参数)，数据类型被设置为一个参数，在使用时再从外部传入一个数据类型；而一旦传入了具体的数据类型后，传入变量（实参）的数据类型如果不匹配，编译器就会直接报错。这种`参数化类型`可以用在类、接口和方法中，分别被称为泛型类、泛型接口、泛型方法。

一个 list 中贴上了 animal 的标签，另一个 list 贴上了 cat 的标签，可以说 cat 是 animal 的子类，但是不能说贴了 cat 标签的 list 就是贴了 animal 标签 list 的子类，他们实际上都是 list

#### 例程 基本语法

```java
class 类名称 <泛型标识> {
  private 泛型标识 /*（成员变量类型）*/ 变量名;
  .....
  }
}
泛型标识是任意设置的,常见的如下
  T ：代表一般的任何类。
  E ：代表 Element 元素的意思，或者 Exception 异常的意思。
  K ：代表 Key 的意思。
  V ：代表 Value 的意思，通常与 K 一起配合使用。
  S ：代表 Subtype 的意思，文章后面部分会讲解示意。
```

**泛型类中的静态方法和静态变量不可以使用泛型类所声明的类型参数**

泛型类中的类型参数的确定是在创建泛型类对象的时候（例如 ArrayList< Integer >）。

[知识链接](https://www.cnblogs.com/coprince/p/8603492.html)

#### 类型擦除

其实在创建一个泛型类的对象时， Java 编译器是先检查代码中传入 < T > 的数据类型，并记录下来，然后再对代码进行编译，`编译的同时进行类型擦除`；如果需要对被擦除了泛型信息的对象进行操作，编译器会自动将对象进行类型转换。

#### 泛型通配符

**上界通配符 `<? extends T>`：T 代表了类型参数的上界，`<? extends T>`表示类型参数的范围是 T 和 T 的子类。需要注意的是： `<? extends T>` 也是一个数据类型实参，它和 Number、String、Integer 一样都是一种实际的数据类型。**

**使用 extends 通配符表示可以读，不能写。**在 ArrayList`<? extends Number> `集合中，不能添加任何数据类型的对象，只能添加空值 null，因为 null 可以表示任何数据类型

下界通配符 `<? super T> ` **使用 super 通配符表示可以写，不能读。**

#### 无限定通配符 `<?>`

作为方法形参，`<? extends T>` 类型和` <? super T>` 类型的区别在于：

`<? extends T>` 允许调用读方法T get()获取 T 的引用，但不允许调用写方法 set(T)传入 T 的引用（传入 null 除外）。
`<? super T> `允许调用写方法set(T)传入 T 的引用，但不允许调用读方法 T get()获取 T 的引用（获取 Object 除外）。

```java
@ Test
public void test() {
    ArrayList list = new ArrayList();
    list.add("aaa");
    list.add("bbb");
    list.add("ccc");
    list.add(111);
    for (int i = 0; i < list.size(); i++) {
        System.out.println((String)list.get(i));
    }
}
上述代码在编译时没有报错，但在运行时却抛出了一个 ClassCastException 异常，其原因是 Integer 对象不能强转为 String 类型。

@ Test
public void test() {
    ArrayList<String> list = new ArrayList<>();
    list.add("aaa");
    list.add("bbb");
    list.add("ccc");
    list.add(111);// 在编译阶段，编译器会报错
    for (int i = 0; i < list.size(); i++) {
        System.out.println((String)list.get(i));
    }
}
< String > 是一个泛型，其限制了 ArrayList 集合中存放对象的数据类型只能是 String，当添加一个非 String 对象时，编译器会直接报错。这样，我们便解决了上面产生的 ClassCastException 异常的问题（这样体现了泛型的类型安全检测机制）
```

```java
// 改写前
public class PairHelper {
    static int addPair(Pair<Number> p) {
        Number first = p.getFirst();
        Number last = p.getLast();
        return first.intValue() + last.intValue();
    }
}

// 改写后
public class PairHelper {
    static int addPair(Pair<? extends Number> p) {
        Number first = p.getFirst();
        Number last = p.getLast();
        return first.intValue() + last.intValue();
    }
}
```



### 异常

Java 提供了以下关键字和类来支持异常处理：

- **try**：用于包裹可能会抛出异常的代码块。
- **catch**：用于捕获异常并处理异常的代码块。
- **finally**：用于包含无论是否发生异常都需要执行的代码块。
- **throw**：用于手动抛出异常。
- **throws**：用于在方法声明中指定方法可能抛出的异常。
- **Exception**类：是所有异常类的父类，它提供了一些方法来获取异常信息，如 **getMessage()、printStackTrace()** 等。

##### try-catch

```java
try{
   // 程序代码
}catch(异常类型1 异常的变量名1){
  // 程序代码
}catch(异常类型2 异常的变量名2){
  // 程序代码
}finally{
  // 程序代码
}
无论是否发生异常，finally 代码块中的代码总会被执行。
```

##### throw 

常用于嵌套异常，对异常进行进一步处理

```java
throws 当 readFile 方法内部发生 IOException 异常时，会将该异常传递给调用该方法的代码。在调用该方法的代码中，必须捕获或声明处理 IOException 异常。
public void readFile() throws IOException {
    // 可能会抛出IOException的代码
}

throw 关键字用于在当前方法中抛出一个异常,创建⾃定义异常
public void checkNumber(int num) {
  if (num < 0) {
    throw new IllegalArgumentException("Number must be positive");
  }
}
```

#### 受检异常：

在Java中，异常分为两类：受检异常（Checked Exception）和非受检异常（Unchecked Exception）。受检异常需要在方法声明中显式地用`throws`关键字声明，而非受检异常则不需要。

- **受检异常**：这些异常是编译时异常，必须在编译时被捕获或声明抛出。它们继承自`Exception`类（但不包括`RuntimeException`及其子类）。
- **非受检异常**：这些异常是运行时异常，不需要在编译时被捕获或声明抛出。它们继承自`RuntimeException`类

## IO

#### 控制台

```java
BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
br.read()
println() 
System.out.write
```



#### 文件

```java
//文件名 :fileStreamTest2.java
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {

        File f = new File("a.txt");
        FileOutputStream fop = new FileOutputStream(f);
        // 构建FileOutputStream对象,文件不存在会自动新建

        OutputStreamWriter writer = new OutputStreamWriter(fop, "UTF-8");
        // 构建OutputStreamWriter对象,参数可以指定编码,默认为操作系统默认编码,windows上是gbk

        writer.append("中文输入");
        // 写入到缓冲区

        writer.append("\r\n");
        // 换行

        writer.append("English");
        // 刷新缓存冲,写入到文件,如果下面已经没有写入的内容了,直接close也会写入

        writer.close();
        // 关闭写入流,同时会把缓冲区内容写入文件,所以上面的注释掉

        fop.close();
        // 关闭输出流,释放系统资源

        FileInputStream fip = new FileInputStream(f);
        // 构建FileInputStream对象

        InputStreamReader reader = new InputStreamReader(fip, "UTF-8");
        // 构建InputStreamReader对象,编码与写入相同

        StringBuffer sb = new StringBuffer();
        while (reader.ready()) {
            sb.append((char) reader.read());
            // 转成char加到StringBuffer对象中
        }
        System.out.println(sb.toString());
        reader.close();
        // 关闭读取流

        fip.close();
        // 关闭输入流,释放系统资源

    }
}
```

- **mkdir( )**方法创建一个文件夹，成功则返回true，失败则返回false。失败表明File对象指定的路径已经存在，或者由于整个路径还不存在，该文件夹不能被创建。
- **mkdirs()**方法创建一个文件夹和它的所有父文件夹。

```java
import java.io.File;
 
public class CreateDir {
    public static void main(String[] args) {
        String dirname = "/tmp/user/java/bin";
        File d = new File(dirname);
        // 现在创建目录
        d.mkdirs();
    }
}

import java.io.File;
 
public class DirList {
    public static void main(String args[]) {
        String dirname = "/tmp";
        File f1 = new File(dirname);
        if (f1.isDirectory()) {
            System.out.println("目录 " + dirname);
            String s[] = f1.list();
            for (int i = 0; i < s.length; i++) {
                File f = new File(dirname + "/" + s[i]);
                if (f.isDirectory()) {
                    System.out.println(s[i] + " 是一个目录");
                } else {
                    System.out.println(s[i] + " 是一个文件");
                }
            }
        } else {
            System.out.println(dirname + " 不是一个目录");
        }
    }
}
```


## @：Java 注解（Annotation）

Spring注解替代了之前Spring xml文件

注解就是一个注释标签。开发者的视角可以解读出这个类/方法/属性的作用以及该怎么使用，而从框架的视角则可以解析注解本身和其属性实现各种功能，编译器的角度则可以进行一些预检查(@Override)和抑制警告(@SuppressWarnings)等。

#### Spring核心注解

[Spring 核心注解 - spring 中文网 (springdoc.cn)](https://springdoc.cn/spring-core-annotations/)

- @Override - 检查该方法是否是重写方法。如果发现其父类，或者是引用的接口中并没有该方法时，会报编译错误。
- @Deprecated - 标记过时方法。如果使用该方法，会报编译警告。
- @SuppressWarnings - 指示编译器去忽略注解中声明的警告。
