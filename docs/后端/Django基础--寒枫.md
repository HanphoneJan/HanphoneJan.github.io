[Django 文档 | Django documentation | Django](https://docs.djangoproject.com/zh-hans/5.2/)

Django 是基于 WSGI/ASGI 的 Web 框架，设计初衷是处理 HTTP 请求和响应，对长时间连接（如 WebRTC 媒体流）的并发处理能力有限。
开发流程：先进行数据模型开发，再创建序列化器，定义数据交互格式，再开发 RESTful API 视图，然后配置URL路由
[PyCharm 创建 Django 项目 | 菜鸟教程](https://www.runoob.com/pycharm/pycharm-django.html
### 为什么 Django 在 AI 场景中 “不常用”？
1. **性能冗余**：Django 的 ORM、模板引擎、中间件等全栈功能，在 AI 推理场景中是 “无用负载”，反而增加资源消耗；
2. **异步支持弱**：AI 推理常涉及 IO 密集型操作（如加载模型、调用第三方服务），FastAPI 的原生异步能充分利用资源，而 Django 的异步仍需依赖第三方插件（如 Channels），上手成本高；
3. **生态适配性**：AI 社区（如 Hugging Face、PyTorch 官方示例）几乎都以 FastAPI 作为后端接口的首选示例，而 Django 相关的 AI 教程 / 插件极少。
# 项目基础文件
## apps.py
用于配置应用元数据，非启动必需但推荐自定义。核心作用是定义应用名称、配置信号接收器等，便于项目组件识别和管理。

采用默认配置时，只需在settings.py的INSTALLED_APPS中注册即可（可写应用名或apps配置类路径，如`'myapp.apps.MyappConfig'`）。新增的app需手动创建migrations包（含__init__.py的文件夹）以支持数据库迁移。

示例配置：

```python
from django.apps import AppConfig

class MyappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'  # 默认主键类型
    name = 'myapp'  # 应用唯一标识
    verbose_name = '我的应用'  # 后台显示名称
    
    # 应用就绪时加载信号
    def ready(self):
        import myapp.signals
```
## settings.py

https://docs.djangoproject.com/en/5.2/ref/settings

项目核心配置入口，所有Django组件均依赖此文件。除基础配置外，关键核心配置如下：

- **数据库配置**：支持MySQL、PostgreSQL等，默认SQLite。示例（MySQL）：
    

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'mydb',
        'USER': 'root',
        'PASSWORD': '123456',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {'charset': 'utf8mb4'}  # 支持emoji
    }
}
```

- **静态文件配置**：用于存放CSS、JS等，生产环境需Nginx代理
    

```python
STATIC_URL = '/static/'  # 访问前缀
STATIC_ROOT = BASE_DIR / 'staticfiles'  # 收集静态文件的目录
STATICFILES_DIRS = [BASE_DIR / 'static']  # 开发时静态文件存放目录
```

- **认证配置**：自定义用户模型需在此指定
    

```python
AUTH_USER_MODEL = 'myapp.User'  # 格式：应用名.模型类名
```

## asgi.py

ASGI（Asynchronous Server Gateway Interface，异步服务器网关接口）配置文件，用于支持异步处理请求。它定义了一个ASGI应用对象，允许Django项目在异步Web服务器（如Uvicorn、Hypercorn）上运行，能够更好地处理异步任务和WebSocket等实时通信场景，提高应用在高并发异步环境下的性能。

核心示例（集成Channels时）：

```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
import myapp.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(myapp.routing.websocket_urlpatterns),  # WebSocket路由
})
```

## wsgi.py

WSGI（Web Server Gateway Interface，Web服务器网关接口）配置文件，是Django项目与WSGI兼容的Web服务器（如Gunicorn、uWSGI）之间的接口。它定义了一个WSGI应用对象，使得Web服务器能够正确地将请求传递给Django应用进行处理，主要用于同步请求处理场景，是传统的部署方式中常用的配置文件。

生产环境启动示例（Gunicorn）：

```bash
gunicorn --bind 0.0.0.0:8000 myproject.wsgi:application
```

## manage.py

Django项目的命令行管理工具，封装了django-admin命令并自动加载项目配置。

```bash
python manage.py startproject myproject  # 创建项目
python manage.py startapp myapp  # 创建应用
python manage.py createsuperuser  # 创建后台超级用户
python manage.py shell  # 启动交互终端（加载Django环境）
python manage.py dumpdata myapp > data.json  # 导出数据
python manage.py loaddata data.json  # 导入数据
python manage.py collectstatic  # 收集静态文件（生产环境用）
```

## urls.py

URL路由配置文件，用于定义URL路径与视图函数或类之间的映射关系。主要用于处理 HTTP 请求，是 Django 传统的 URL 路由机制。当客户端通过 HTTP 协议向服务器发送请求时，Django 会根据 `urls.py` 中定义的路由规则，将请求分发到相应的视图函数或视图集进行处理。
```python
from django.urls import path
from . import views

urlpatterns = [
    # 关键字参数（推荐，可读性高）
    path('book/<int:book_id>/', views.book_detail, name='book_detail'),
    # 字符串参数（默认类型）
    path('author/<str:name>/', views.author_books),
    # 路径参数（匹配包含斜杠的路径）
    path('file/<path:file_path>/', views.get_file),
]
```

```python
# 项目urls.py
path('book/', include(('book.urls', 'book'), namespace='book')),

# 应用book/urls.py
path('detail/<int:id>/', views.detail, name='detail'),

# 视图中反向解析
from django.urls import reverse
url = reverse('book:detail', args=[1])  # 生成/book/detail/1/

# 模板中反向解析（非前后端分离场景）
# {% url 'book:detail' 1 %}
```
## routing.py
主要用于处理 WebSocket 请求，是 Django Channels 引入的概念。WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议，适用于实时通信场景，如聊天、实时数据更新等。routing.py 文件中定义的路由规则会将 WebSocket 连接分发到相应的消费者（`Consumer`）进行处理。
# 模型层（ORM）

## 模型定义与核心字段

Django ORM的核心，用于定义数据库结构，继承自`django.db.models.Model`。模型类的每个属性对应数据库表的字段，Django自动生成主键（id），支持自定义字段类型和约束。

常用字段类型及参数：

```python
from django.db import models
from django.utils import timezone

class Book(models.Model):
    # 字符串类型：max_length必填，strip默认True（去除首尾空格）
    title = models.CharField(max_length=100, verbose_name='书名', help_text='请输入书名')
    # 文本类型：用于长文本，无max_length限制
    content = models.TextField(blank=True, null=True, verbose_name='内容')
    # 整数类型：支持default默认值
    price = models.IntegerField(default=0, verbose_name='价格')
    # 浮点数类型：decimal_places保留小数位，max_digits总位数
    score = models.DecimalField(max_digits=3, decimal_places=1, default=0, verbose_name='评分')
    # 日期时间类型：auto_now_add创建时自动记录时间，auto_now更新时自动更新
    create_time = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    update_time = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    # 日期类型：可存储年月日
    publish_date = models.DateField(default=timezone.now, verbose_name='出版日期')
    # 布尔类型：default设置默认值
    is_active = models.BooleanField(default=True, verbose_name='是否上架')
    # 外键：多对一关系，on_delete指定关联数据删除策略
    author = models.ForeignKey(
        'Author', 
        on_delete=models.CASCADE,  # 级联删除：删除作者时删除关联书籍
        related_name='books',  # 反向查询属性名：author.books.all()
        verbose_name='作者'
    )
    # 选择字段：choices接收二元组迭代器，存储键值，显示值
    CATEGORY_CHOICES = (
        ('fiction', '小说'),
        ('tech', '科技'),
        ('history', '历史'),
    )
    category = models.CharField(
        max_length=10, 
        choices=CATEGORY_CHOICES, 
        default='fiction', 
        verbose_name='分类'
    )

    class Meta:
        # 自定义表名（默认应用名_模型名）
        db_table = 'book_info'
        # 后台显示模型名称
        verbose_name = '书籍'
        verbose_name_plural = verbose_name
        # 排序规则：-表示降序
        ordering = ['-create_time']

class Author(models.Model):
    name = models.CharField(max_length=50, verbose_name='姓名')
    age = models.IntegerField(default=0, verbose_name='年龄')

    def __str__(self):
        # 后台显示对象时返回的字符串
        return self.name
```

## 迁移（Migrations）

### 迁移到数据库

将模型变更同步到数据库结构。每次更改models.py中的模型后，都需要执行迁移命令。迁移文件是版本化的数据库变更记录，支持回滚操作。

```bash
# 模型生成迁移文件，记录数据库模式的变更
python manage.py makemigrations
# 指定应用生成迁移
python manage.py makemigrations myapp
# 生成空迁移（用于自定义SQL）
python manage.py makemigrations --empty myapp

# 迁移文件应用到数据库
# 默认应用到settings.py中DATABASES的'default'数据库
python manage.py migrate
# 应用指定迁移文件（如0001_initial）
python manage.py migrate myapp 0001_initial
# 回滚到上一个迁移版本
python manage.py migrate myapp zero  # 回滚该应用所有迁移

# 查看迁移状态
python manage.py showmigrations
# 查看迁移文件的SQL语句（不执行）
python manage.py sqlmigrate myapp 0001_initial
```

注意事项：

- 改名、删字段等操作可能导致依赖错误，可删除相关迁移文件和数据库表后重新迁移
    
- 更改数据库名称时需确保无其他会话连接，建议先停用数据库服务
    
- 生产环境迁移前需备份数据，避免数据丢失
    

### 迁移文件

存储在app/migrations文件夹中，命名格式为`000X_xxx.py`，包含up（应用）和down（回滚）方法。示例迁移文件核心内容：

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True  # 是否为初始迁移

    dependencies = [  # 依赖的迁移文件
    ]

    operations = [  # 迁移操作
        migrations.CreateModel(
            name='Book',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=100, verbose_name='书名')),
            ],
        ),
    ]
```

应用迁移的前提是app中存在migrations包（含__init__.py），新建app后可手动创建或通过makemigrations自动生成。

## 管理器（Manager）

模型与数据库交互的接口，负责处理查询操作。每个模型至少有一个管理器，默认名为`objects`。

### 默认管理器

`objects`是默认管理器，支持多种查询方法，核心方法示例：

```python
# 基本查询
Book.objects.all()  # 获取所有记录（QuerySet对象，惰性执行）
Book.objects.filter(is_active=True, category='tech')  # 条件查询
Book.objects.exclude(price__gt=100)  # 排除满足条件的记录
Book.objects.get(id=1)  # 获取单条记录，不存在或多条时抛异常
Book.objects.first()  # 获取第一条记录，无数据返回None
Book.objects.last()  # 获取最后一条记录

# 条件表达式（双下划线表示字段操作）
Book.objects.filter(price__gt=50)  # 价格>50
Book.objects.filter(price__gte=50)  # 价格>=50
Book.objects.filter(title__contains='Python')  # 标题包含Python（大小写敏感）
Book.objects.filter(title__icontains='python')  # 标题包含python（大小写不敏感）
Book.objects.filter(publish_date__year=2023)  # 2023年出版
Book.objects.filter(author__name='张三')  # 跨表查询（外键关联）

# 排序与限制
Book.objects.order_by('price')  # 按价格升序
Book.objects.order_by('-price')  # 按价格降序
Book.objects.order_by('price', '-create_time')  # 价格升序，创建时间降序
Book.objects.all()[:10]  # 获取前10条记录（切片操作，不支持负索引）

# 统计与去重
Book.objects.count()  # 统计记录数
Book.objects.filter(category='tech').exists()  # 判断是否存在满足条件的记录
Book.objects.values('category').distinct()  # 按分类去重
```

### 自定义管理器

继承`django.db.models.Manager`类实现，核心用途：添加自定义查询方法、修改初始查询集。

1. **添加额外查询方法**：封装常用查询逻辑，提高代码复用性
    

```python
from django.db import models
from django.utils import timezone

class BookManager(models.Manager):
    # 自定义方法：获取已出版的书籍
    def published(self):
        return self.filter(publish_date__lte=timezone.now(), is_active=True)
    
    # 自定义方法：按分类查询并排序
    def by_category(self, category):
        return self.filter(category=category).order_by('-score')

class Book(models.Model):
    title = models.CharField(max_length=100)
    publish_date = models.DateField()
    is_active = models.BooleanField(default=True)
    category = models.CharField(max_length=10)
    score = models.DecimalField(max_digits=3, decimal_places=1)
    
    # 使用自定义管理器替换默认管理器
    objects = BookManager()

# 使用示例
published_tech_books = Book.objects.published().by_category('tech')
```

1. **修改初始查询集**：重写`get_queryset()`方法，改变默认查询结果
    

```python
class ActiveManager(models.Manager):
    def get_queryset(self):
        # 默认只查询is_active=True的记录
        return super().get_queryset().filter(is_active=True)

class Product(models.Model):
    name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    
    # 自定义管理器：只查询活跃商品
    active_objects = ActiveManager()
    # 保留默认管理器：可查询所有商品
    objects = models.Manager()

# 使用示例
all_products = Product.objects.all()  # 所有商品
active_products = Product.active_objects.all()  # 仅活跃商品
```

## 自定义查询进阶

### 链式查询

QuerySet对象支持链式调用，查询条件会叠加，且查询延迟执行（直到迭代、切片或调用count()等方法时才执行SQL）。

```python
# 链式查询：先筛选分类，再按评分排序，最后取前5条
queryset = Book.objects.filter(category='tech').order_by('-score')[:5]
# 此时未执行SQL，迭代时才执行
for book in queryset:
    print(book.title)
```

### 注解（Annotation）与聚合（Aggregation）

用于对查询结果进行数据计算，注解为每条记录添加计算字段，聚合为查询集生成统计结果。需导入`django.db.models`中的聚合函数。

```python
from django.db.models import Count, Sum, Avg, F, Value, CharField

# 1. 注解：为每条记录添加计算字段
# 例：为书籍添加"价格翻倍"字段
books = Book.objects.annotate(
    double_price=F('price') * 2,  # F()引用模型字段，避免Python计算的竞态问题
    full_title=Value('《') + F('title') + Value('》'),  # 拼接字符串
    full_title__output_field=CharField()  # 指定输出字段类型
)
for book in books:
    print(book.title, book.double_price, book.full_title)

# 2. 聚合：统计查询集
# 例：统计科技类书籍的平均评分、总数量、最高价格
from django.db.models import Aggregate

result = Book.objects.filter(category='tech').aggregate(
    avg_score=Avg('score'),
    total_count=Count('id'),
    max_price=Max('price')
)
# result格式：{'avg_score': 8.5, 'total_count': 10, 'max_price': 120}

# 3. 按字段分组聚合
# 例：按分类统计书籍数量和平均评分
category_stats = Book.objects.values('category').annotate(
    count=Count('id'),
    avg_score=Avg('score')
).order_by('-count')
```

### F表达式与Q对象

- **F表达式**：用于引用模型字段值，实现字段间的比较和运算，避免并发问题
    

```python
from django.db.models import F

# 字段间比较：查询评分大于价格10%的书籍
Book.objects.filter(score__gt=F('price') * 0.1)

# 字段自增：将所有科技类书籍价格提高10
Book.objects.filter(category='tech').update(price=F('price') + 10)
```

- **Q对象**：用于实现复杂条件查询（逻辑与、或、非），弥补filter()只能实现逻辑与的不足
    

```python
from django.db.models import Q

# 逻辑或：查询分类为科技或评分大于9的书籍
Book.objects.filter(Q(category='tech') | Q(score__gt=9))

# 逻辑非：查询分类不是小说的书籍
Book.objects.filter(~Q(category='fiction'))

# 组合条件：科技类且（价格小于50或评分大于8.5）
Book.objects.filter(
    Q(category='tech') & (Q(price__lt=50) | Q(score__gt=8.5))
)
```

# 视图层

## 请求与响应对象

### HttpRequest对象核心属性与方法

Django自动创建，封装请求信息，作为视图函数第一个参数（通常命名为request）。

```python
def my_view(request):
    # 1. 请求方法
    if request.method == 'GET':
        pass
    elif request.method == 'POST':
        pass
    
    # 2. 请求参数
    request.GET  # GET参数，类似字典（QueryDict对象），如?name=张三&age=20
    request.GET.get('name')  # 获取单个参数，默认None
    request.GET.getlist('hobby')  # 获取多个相同参数，如?hobby=读书&hobby=运动
    
    request.POST  # POST参数，表单提交的数据（需设置form的method为POST）
    request.body  # 原始请求体（bytes类型），用于获取JSON等非表单数据
    
    # 3. 请求头与环境信息
    request.META.get('HTTP_USER_AGENT')  # 获取用户代理（浏览器信息）
    request.META.get('REMOTE_ADDR')  # 获取客户端IP地址
    
    # 4. 用户信息（需认证系统支持）
    request.user.is_authenticated  # 判断用户是否登录
    request.user.username  # 登录用户的用户名
    request.user.is_superuser  # 判断是否为超级用户
    
    # 5. 其他核心属性
    request.path  # 请求路径，如'/book/detail/1/'
    request.path_info  # 与path类似，支持URL重写时的路径获取
    request.get_full_path()  # 完整路径（含查询参数），如'/book/detail/1/?page=2'
    request.is_ajax()  # 判断是否为AJAX请求（基于X-Requested-With头）
```

### HttpResponse对象及子类

视图必须返回响应对象，Django提供多种响应类满足不同需求。

```python
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse, HttpResponseRedirect
from django.urls import reverse

def response_demo(request):
    # 1. 基础HttpResponse：返回文本内容，可设置状态码和响应头
    return HttpResponse('Hello Django', status=200, headers={'X-Custom-Header': 'value'})
    
    # 2. JsonResponse：返回JSON数据，自动设置Content-Type为application/json
    data = {'title': 'Python编程', 'price': 59}
    # safe=False允许返回非字典类型（如列表）
    return JsonResponse(data, safe=False, status=200)
    
    # 3. 重定向：永久重定向（301）或临时重定向（302，默认）
    return HttpResponseRedirect(reverse('book:detail', args=[1]))  # 反向解析后重定向
    # 永久重定向
    return HttpResponsePermanentRedirect('/book/')
    
    # 4. 流式响应：用于大文件下载，避免内存溢出
    def file_iterator(file_path, chunk_size=8192):
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                yield chunk
    file_path = '/path/to/large_file.pdf'
    response = StreamingHttpResponse(file_iterator(file_path))
    response['Content-Type'] = 'application/pdf'
    response['Content-Disposition'] = 'attachment; filename="large_file.pdf"'
    return response
    
    # 5. 返回404响应
    from django.http import Http404
    raise Http404('书籍不存在')
    # 或使用 shortcuts 中的 get_object_or_404
    from django.shortcuts import get_object_or_404
    book = get_object_or_404(Book, id=1)  # 不存在时自动返回404
```

## 视图类型

### 1. 函数视图（FBV）

最基础的视图类型，以函数形式定义，接收request参数并返回响应。适用于简单业务逻辑。

```python
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Book

# 函数视图示例：获取书籍详情
def book_detail(request, book_id):
    # 获取书籍，不存在返回404
    book = get_object_or_404(Book, id=book_id)
    # 处理GET请求
    if request.method == 'GET':
        data = {
            'id': book.id,
            'title': book.title,
            'author': book.author.name,
            'price': book.price,
            'score': float(book.score)
        }
        return JsonResponse(data)
    # 不支持的请求方法返回405
    return HttpResponse('Method Not Allowed', status=405)
```

### 2. 类视图（CBV）

继承`django.views.View`，按HTTP方法定义不同处理函数（get()、post()等），支持继承和Mixin扩展，代码复用性高。

```python
from django.views import View
from django.http import JsonResponse
from .models import Book

class BookDetailView(View):
    # 处理GET请求
    def get(self, request, book_id):
        book = get_object_or_404(Book, id=book_id)
        data = self._format_book_data(book)
        return JsonResponse(data)
    
    # 处理POST请求（如更新书籍信息）
    def post(self, request, book_id):
        book = get_object_or_404(Book, id=book_id)
        # 解析请求数据（假设为JSON格式）
        import json
        data = json.loads(request.body)
        # 更新书籍信息
        if 'title' in data:
            book.title = data['title']
        if 'price' in data:
            book.price = data['price']
        book.save()
        return JsonResponse(self._format_book_data(book))
    
    # 私有方法：格式化书籍数据，提高复用性
    def _format_book_data(self, book):
        return {
            'id': book.id,
            'title': book.title,
            'author': book.author.name,
            'price': book.price,
            'score': float(book.score),
            'category': book.get_category_display()  # 获取choices的显示值
        }
```

类视图路由配置：需使用`as_view()`方法将类转换为可调用的视图函数

```python
from django.urls import path
from .views import BookDetailView

urlpatterns = [
    path('book/<int:book_id>/', BookDetailView.as_view(), name='book_detail'),
]
```

### 3. DRF视图（RESTful API）

基于Django REST Framework实现，简化API开发，支持序列化、认证、权限等功能。

#### 核心概念：序列化器（Serializer）

用于模型数据与JSON等格式的转换，实现数据验证和序列化。是DRF的核心组件。

```python
from rest_framework import serializers
from .models import Book, Author

# 作者序列化器（用于嵌套显示）
class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ['id', 'name', 'age']  # 序列化的字段

# 书籍序列化器
class BookSerializer(serializers.ModelSerializer):
    # 嵌套显示作者信息（使用关联序列化器）
    author = AuthorSerializer(read_only=True)
    # 反序列化时接收作者ID（用于创建/更新关联）
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=Author.objects.all(),
        source='author',
        write_only=True
    )
    # 自定义序列化字段（通过方法）
    full_title = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        # 序列化所有字段：fields = '__all__'
        # 指定序列化字段，包含自定义字段
        fields = ['id', 'title', 'content', 'price', 'score', 'category', 
                 'full_title', 'author', 'author_id', 'create_time']
        # 只读字段（不允许反序列化修改）
        read_only_fields = ['id', 'create_time', 'update_time']
    
    # 自定义字段的获取方法（命名规则：get_字段名）
    def get_full_title(self, obj):
        return f"《{obj.title}》"
    
    # 自定义字段验证（命名规则：validate_字段名）
    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("价格不能为负数")
        return value
    
    # 全局验证（验证多个字段间的关系）
    def validate(self, data):
        if data.get('price') and data.get('score'):
            if data['score'] > data['price'] * 0.2:
                raise serializers.ValidationError("评分过高，不符合价格比例")
        return data
```

#### 视图集（ViewSet）：InterviewScenarioViewSet

DRF中高层次抽象，基于Mixin实现完整CRUD操作，适用于标准RESTful API场景。

```python
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import InterviewScenario
from .serializers import InterviewScenarioSerializer

class InterviewScenarioViewSet(viewsets.ModelViewSet):
    """
    面试场景视图集，支持CRUD操作
    """
    queryset = InterviewScenario.objects.all()
    serializer_class = InterviewScenarioSerializer
    # 权限控制：仅登录用户可访问
    permission_classes = [permissions.IsAuthenticated]
    
    # 过滤、排序、搜索功能
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['scenario_type', 'difficulty']  # 过滤字段
    search_fields = ['title', 'description']  # 搜索字段
    ordering_fields = ['create_time', 'difficulty']  # 排序字段
    ordering = ['-create_time']  # 默认排序
    
    # 重写查询方法：实现数据权限（仅能查看自己创建的场景）
    def get_queryset(self):
        # 管理员可查看所有数据
        if self.request.user.is_staff:
            return InterviewScenario.objects.all()
        # 普通用户仅查看自己的创建的数据
        return InterviewScenario.objects.filter(create_user=self.request.user)
    
    # 重写创建方法：自动设置创建者为当前用户
    def perform_create(self, serializer):
        serializer.save(create_user=self.request.user)
```

#### 基础API视图（APIView）：UserInterviewDataView

DRF最基础的类视图，无默认CRUD方法，灵活性极高，适用于非标准API场景（如数据聚合、跨表复杂查询）。

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg
from .models import InterviewRecord
from .serializers import UserInterviewDataSerializer

class UserInterviewDataView(APIView):
    """
    用户面试数据统计视图：返回用户的面试次数、平均成绩等统计信息
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # 获取当前用户的面试记录
        records = InterviewRecord.objects.filter(user=request.user)
        if not records.exists():
            return Response(
                {'message': '暂无面试记录'},
                status=status.HTTP_204_NO_CONTENT
            )
        
        # 数据聚合统计
        stats = records.aggregate(
            total_count=Count('id'),
            avg_score=Avg('score'),
            max_score=Max('score'),
            latest_time=Max('create_time')
        )
        
        # 按场景类型统计面试次数
        scenario_stats = records.values('scenario__scenario_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # 构造响应数据
        data = {
            'user': request.user.username,
            'stats': stats,
            'scenario_distribution': scenario_stats
        }
        
        # 序列化并返回
        serializer = UserInterviewDataSerializer(data)
        return Response(serializer.data)
    
    def post(self, request):
        """自定义创建逻辑：如批量导入面试数据"""
        serializer = UserInterviewDataImportSerializer(data=request.data)
        if serializer.is_valid():
            # 批量创建逻辑
            serializer.save(user=request.user)
            return Response(
                {'message': '面试数据导入成功'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## URL配置（DRF）

DRF提供Router工具简化ViewSet路由配置，自动生成RESTful风格URL。

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from .views import (
    InterviewScenarioViewSet,
    InterviewRecordViewSet,
    UserInterviewDataView
)

# 1. DefaultRouter：自动生成根路径（/）的API入口页面，包含所有路由信息
router = DefaultRouter()
# SimpleRouter：无自动生成的根路径页面，更简洁
# router = SimpleRouter()

# 注册ViewSet：第一个参数为URL前缀，第二个为视图集类
router.register(r'scenarios', InterviewScenarioViewSet)  # 面试场景路由
router.register(r'records', InterviewRecordViewSet)      # 面试记录路由

# 2. 手动注册基于APIView的路由
urlpatterns = [
    # 包含ViewSet自动生成的路由
    path('', include(router.urls)),
    # 手动配置类视图路由
    path('user-interview-data/', UserInterviewDataView.as_view(), name='user-interview-data'),
    # DRF内置的登录/登出视图（用于测试）
    path('api-auth/', include('rest_framework.urls')),
]
```

ViewSet自动生成的路由对应关系（以scenarios为例）：

|HTTP方法|URL路径|视图方法|功能描述|
|---|---|---|---|
|GET|/scenarios/|list()|获取所有面试场景|
|POST|/scenarios/|create()|创建新的面试场景|
|GET|/scenarios/<id>/|retrieve()|获取单个面试场景详情|
|PUT|/scenarios/<id>/|update()|全量更新面试场景|
|PATCH|/scenarios/<id>/|partial_update()|部分更新面试场景|
|DELETE|/scenarios/<id>/|destroy()|删除面试场景|

## 装饰器

用于增强视图功能，Django和DRF提供丰富的装饰器支持。

### 1. Django函数视图装饰器

```python
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.contrib.auth.decorators import login_required, permission_required

# 仅允许GET请求
@require_GET
def book_list(request):
    pass

# 仅允许POST请求
@require_POST
def book_create(request):
    pass

# 允许指定HTTP方法
@require_http_methods(['GET', 'POST'])
def book_detail_or_create(request):
    pass

# 免除CSRF验证（谨慎使用，如API接口）
@csrf_exempt
@require_POST
def api_book_create(request):
    pass

# 要求用户登录（未登录跳转到登录页）
@login_required(login_url='/login/')
def user_center(request):
    pass

# 要求用户拥有指定权限（如book.change_book）
@permission_required('book.change_book', login_url='/login/')
def book_edit(request, book_id):
    pass
```

### 2. DRF类视图装饰器

类视图不能直接使用函数装饰器，需通过`@method_decorator`适配，或使用DRF内置类装饰器。

```python
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAdminUser

# 1. 类视图方法装饰器：缓存视图响应（60秒）
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    
    @method_decorator(cache_page(60 * 1))  # 缓存1分钟
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    # 2. DRF自定义动作装饰器：添加非CRUD接口
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_featured(self, request, pk=None):
        """
        自定义动作：将书籍设为推荐（详情接口，需传入id）
        detail=True：需要资源ID，URL为/scenarios/<id>/set_featured/
        detail=False：不需要资源ID，URL为/scenarios/set_featured/
        """
        book = self.get_object()
        book.is_featured = True
        book.save()
        return Response({'status': 'book is featured'})
    
    # 3. 批量操作接口（非详情接口）
    @action(detail=False, methods=['delete'])
    def batch_delete(self, request):
        """批量删除书籍，接收ids列表"""
        ids = request.data.get('ids', [])
        Book.objects.filter(id__in=ids).delete()
        return Response({'status': 'deleted successfully'})

# 3. 类级别装饰器：为所有方法添加装饰器
@method_decorator(cache_page(60 * 10), name='dispatch')
class AuthorViewSet(viewsets.ModelViewSet):
    queryset = Author.objects.all()
    serializer_class = AuthorSerializer
```

# 文件管理

Django支持本地和第三方存储（如AWS S3）上传文件，核心配置和模型字段如下。
## 1. 基础配置（本地存储）

```python
# settings.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 媒体文件配置（用户上传的文件）
MEDIA_URL = '/media/'  # 访问媒体文件的URL前缀，如http://example.com/media/books/1.pdf
MEDIA_ROOT = BASE_DIR / 'media'  # 本地存储根目录，文件实际存在这里

# 开发环境中配置媒体文件访问路由（生产环境由Nginx代理）
# 项目urls.py
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ...其他路由
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

## 2. 模型中关联文件

使用`FileField`（通用文件）或`ImageField`（图片文件，需安装Pillow库）存储文件路径。

```python
from django.db import models

class Document(models.Model):
    title = models.CharField(max_length=100, verbose_name='文档标题')
    # upload_to：文件存储的子目录（相对于MEDIA_ROOT），支持动态路径
    file = models.FileField(
        upload_to='documents/%Y/%m/',  # 按年月存储，如documents/2024/10/
        verbose_name='文件',
        help_text='支持PDF、Word等格式'
    )
    # ImageField：额外验证图片格式和尺寸
    cover_image = models.ImageField(
        upload_to='covers/',
        null=True,
        blank=True,
        verbose_name='封面图片',
        width_field='image_width',  # 自动存储图片宽度
        height_field='image_height'  # 自动存储图片高度
    )
    image_width = models.PositiveIntegerField(null=True, blank=True)
    image_height = models.PositiveIntegerField(null=True, blank=True)
    upload_time = models.DateTimeField(auto_now_add=True, verbose_name='上传时间')
    
    class Meta:
        verbose_name = '文档'
        verbose_name_plural = verbose_name

# 安装Pillow库（ImageField依赖）
# pip install pillow
```

## 3. 视图中处理文件上传

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .serializers import DocumentSerializer

class DocumentUploadView(APIView):
    def post(self, request):
        # request.FILES获取上传的文件
        serializer = DocumentSerializer(data={
            'title': request.data.get('title'),
            'file': request.FILES.get('file'),
            'cover_image': request.FILES.get('cover_image')
        })
        if serializer.is_valid():
            serializer.save()
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## 4. 序列化器处理文件

```python
from rest_framework import serializers
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    # 序列化文件URL（自动拼接MEDIA_URL）
    file_url = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = ['id', 'title', 'file', 'file_url', 'cover_image', 'cover_image_url', 'upload_time']
        read_only_fields = ['id', 'upload_time']
    
    def get_file_url(self, obj):
        if obj.file and hasattr(obj.file, 'url'):
            return obj.file.url
        return None
    
    def get_cover_image_url(self, obj):
        if obj.cover_image and hasattr(obj.cover_image, 'url'):
            return obj.cover_image.url
        return None
```

# 中间件

介于请求与响应之间的钩子框架，用于全局处理请求/响应，实现通用功能（如认证、日志、跨域）。

## 中间件工作流程

1. 客户端发起请求 → 依次执行所有中间件的`process_request`方法（正序）
    
2. 请求到达视图 → 执行视图逻辑
    
3. 视图返回响应 → 依次执行所有中间件的`process_response`方法（逆序）
    
4. 流程中出现异常 → 执行中间件的`process_exception`方法（逆序）
    

注意：若`process_request`方法返回响应对象，会直接进入`process_response`阶段，跳过后续中间件和视图。

## 中间件配置与内置中间件

```python
# settings.py
MIDDLEWARE = [
    # 安全相关：设置安全HTTP头、防点击劫持等
    'django.middleware.security.SecurityMiddleware',
    # 会话管理：使request.session可用，处理用户会话
    'django.contrib.sessions.middleware.SessionMiddleware',
    # 跨域处理：需安装django-cors-headers
    'corsheaders.middleware.CorsMiddleware',
    # 通用功能：URL规范化（自动加斜杠）、设置Content-Length等
    'django.middleware.common.CommonMiddleware',
    # CSRF保护：验证POST请求的CSRF令牌，防止跨站请求伪造
    'django.middleware.csrf.CsrfViewMiddleware',
    # 身份验证：将用户信息绑定到request.user
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    # 消息框架：处理Django的消息提示
    'django.contrib.messages.middleware.MessageMiddleware',
    # 点击劫持保护：设置X-Frame-Options头
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 自定义中间件（需放在合适位置）
    'myapp.middleware.LoggingMiddleware',
]

# 跨域配置（django-cors-headers）
# pip install django-cors-headers
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # 前端开发服务器地址
    "http://example.com",
]
CORS_ALLOW_CREDENTIALS = True  # 允许跨域携带Cookie
```

## 自定义中间件

Django 1.10+支持简化的中间件编写方式，通过继承`MiddlewareMixin`实现
## 模板层

定义前端页面。在前后端分离项目中没用，直接删除即可。

## Websocket集成

[Django框架下的websocket Channels 4.2.0 文档](https://channels.readthedocs.io/en/latest/introduction.html)

- **Channel Layer 的核心作用**：实现消费者之间、消费者与异步任务之间的跨进程消息传递，支持广播、组通信等场景。
- **是否必须**：仅在需要跨消费者 / 跨进程通信时才需要配置；基础的一对一 WebSocket 通信无需依赖它。


# 测试

- **测试文件命名**：通常以`test_*.py`或`*_test.py`命名（如`test_login.py`）。
- **测试目录结构**：
    - 标准结构：项目下创建`tests`或`test`目录，内部按功能模块划分子目录（如`tests/api/`、`tests/utils/`）。
    - 包结构：每个测试目录需包含`__init__.py`，使其成为 Python 包。

- **pytest 框架**：
    - 函数名以`test_`开头（如`def test_login()`）。
    - 类名以`Test`开头且不含`__init__`方法（如`class TestLogin:`）。
    - 模块名以`test_`开头或包含`_test`。

- **配置加载**：
    - pytest 会读取项目根目录的`pytest.ini`、`tox.ini`或`setup.cfg`中的配置（如测试目录、标记过滤）。
# 部署
### Python项目的运行逻辑

Python 是解释型语言，其项目的运行逻辑主要基于**解释器逐行执行代码**，核心流程如下：

- 首先通过 Python 解释器（如`python`或`python3`命令）加载入口文件（通常是包含`if __name__ == "__main__":`的脚本，作为程序启动点）。
- 解释器会按顺序解析代码，遇到导入语句（`import`）时，会加载对应的模块（`.py`文件）或包（包含`__init__.py`的文件夹），并执行其中的顶层代码。
- 程序运行过程中，依赖的库（如第三方库或自定义模块）会被动态加载到内存中，供主程序调用。
- 与编译型语言（如 Java）不同，Python 不需要提前编译成机器码，而是边解释边执行，这也是其 “跨平台” 特性的基础（只要目标设备有对应版本的 Python 解释器即可运行）。

PyInstaller 是一个 Python 第三方工具，核心作用是**将 Python 脚本及其依赖打包成独立的可执行文件（.exe、.app 等）**，方便在没有安装 Python 解释器或对应依赖的环境中运行

### Django部署

Django 项目部署不需要像 SpringBoot 那样打包

- SpringBoot 基于 Java（编译型语言），通常需要打包成 JAR/WAR 文件（包含编译后的字节码、依赖库、配置等），通过`java -jar`命令运行，本质是 “打包后执行”。
    
- Django 基于 Python（解释型语言），部署时**不需要打包成单个文件**，核心是将项目源代码（`.py`文件、模板、静态文件等）放在服务器上，配合以下组件运行：
    - 依赖管理：通过`requirements.txt`安装项目所需的库（如`pip install -r requirements.txt`）。
    - WSGI 服务器：如 Gunicorn、uWSGI（负责运行 Django 应用，处理 Python 代码）。
    - Web 服务器：如 Nginx（负责处理静态文件、反向代理请求到 WSGI 服务器）。
- **uWSGI** 是一个广泛用于 Python Web 应用（包括 Django）的 WSGI 服务器，它与 Django 兼容性非常好，是生产环境中部署 Django 的主流选择之一。它可以高效地处理 HTTP 请求，并将其转发给 Django 应用，常与 Nginx 配合使用（Nginx 作为前端代理，处理静态文件和反向代理请求到 uWSGI）。

**开发环境入口**：`manage.py`  

这是开发时最常用的入口文件，位于项目根目录，用于执行各种 Django 命令，例如：

```bash
python manage.py runserver  # 启动开发服务器
python.exe E:\develop_project\Ai-Interview-Agent\AiInterviewAgent\manage.py runserver 5000 

```

 **生产环境入口**：`wsgi.py` 或 `asgi.py`  
 
部署到生产环境时，WSGI/ASGI 服务器（如 uWSGI、Gunicorn）通过这些文件加载应用：
wsgi.py：适用于同步请求处理（默认生成）
asgi.py：适用于异步请求处理（Django 3.0+ 支持）  
这两个文件定义了供服务器加载的 `application` 对象。


启动异步服务器：

```shell
daphne -p 5000 AiInterviewAgent.asgi:application
```