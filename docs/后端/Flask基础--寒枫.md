参考教程：[Flask 基本概念 | 菜鸟教程](https://www.runoob.com/flask/flask-basic-concept.html)
## Flask核心基础

Flask是轻量级Web框架（"微框架"），核心仅包含路由、模板、请求响应处理，扩展通过第三方库实现（如数据库、表单验证等），灵活性高。
![Flask框架图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/Flask%E6%A1%86%E6%9E%B6%E5%9B%BE.webp)

### Flask最小应用示例

```python
# run.py（项目入口）
from flask import Flask

# 初始化Flask应用，__name__表示当前模块名，用于定位静态文件和模板位置
app = Flask(__name__)

# 路由装饰器：将URL路径 '/' 与视图函数 index 绑定
@app.route('/')
def index():
    # 视图函数返回响应内容（字符串/模板/JSON等）
    return 'Hello, Flask!'

# 启动开发服务器，debug=True开启调试模式（代码修改自动重启，显示错误详情）
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
    # host='0.0.0.0'允许外部网络访问，port指定端口号
}
```

### Flask请求与响应对象

Flask通过request对象获取请求数据，通过make_response构造响应，核心属性/方法如下：

```python
from flask import Flask, request, make_response, jsonify

app = Flask(__name__)

@app.route('/login', methods=['GET', 'POST'])  # 允许GET和POST请求
def login():
    # 1. 获取请求数据
    if request.method == 'POST':
        # 表单数据
        username = request.form.get('username')  # 安全获取表单值，不存在返回None
        # URL参数（如?age=20）
        age = request.args.get('age', type=int, default=18)  # 指定类型和默认值
        # 请求头
        user_agent = request.headers.get('User-Agent')
    
    # 2. 构造响应
    # 方式1：直接返回字符串（默认状态码200）
    # return 'Login Success', 200
    
    # 方式2：自定义响应（状态码、响应头）
    resp = make_response('Login Success')
    resp.status_code = 200
    resp.headers['X-Custom-Header'] = 'Flask'
    
    # 方式3：返回JSON（常用接口开发）
    # return jsonify({'code': 200, 'msg': 'success', 'data': {'username': username}})
    
    return resp
```

## Flask项目结构

分层结构便于协作和维护，各目录作用如下：

```plaintext
my_flask_app/          # 项目根目录
│
├── app/               # 核心应用目录
│   ├── __init__.py    # 应用初始化文件（工厂模式）
│   ├── routes/        # 路由（视图）目录，按功能拆分
│   │   ├── __init__.py
│   │   ├── main.py    # 主页面路由（如首页、关于页）
│   │   └── auth.py    # 认证路由（如登录、注册）
│   ├── models/        # 数据模型目录（与数据库表对应）
│   │   ├── __init__.py
│   │   └── user.py    # 用户模型
│   ├── templates/     # 模板文件目录（Jinja2）
│   │   ├── layout.html# 基础模板（继承用）
│   │   └── home.html  # 首页模板
│   └── static/        # 静态资源目录（CSS、JS、图片等）
│       ├── css/
│       └── js/
│
├── config.py          # 配置文件（开发/生产环境配置）
├── requirements.txt   # 依赖包列表（如Flask==2.3.3, SQLAlchemy==2.0.20）
├── migrations/        # 数据库迁移文件目录（Alembic工具生成）
└── run.py             # 项目入口文件（启动应用）
```

**关键文件说明**：app/\_\_init__.py（应用工厂模式）

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config

# 初始化扩展（先不绑定应用）
db = SQLAlchemy()
migrate = Migrate()

# 应用工厂函数：用于创建不同环境的应用实例
def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)  # 加载配置
    
    # 绑定扩展到应用
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 注册蓝图（路由）
    from app.routes import main_bp, auth_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')  # 前缀：/auth/login
    
    return app

# 导入模型（确保迁移工具能识别）
from app import models
```

## Flask模板（Jinja2）

模板是包含动态变量的HTML文件，通过Jinja2引擎渲染，核心是"后端传参→模板解析→生成静态HTML"。
### Flask模板语法

```jinja2
{# 模板注释，不会渲染到页面 #}
{% extends "layout.html" %}  {# 继承基础模板，实现页面复用 #}

{# 重写基础模板中的block块 #}
{% block title %}首页 - Flask应用{% endblock %}

{% block content %}
    <h1>欢迎，{{ current_user.username }}</h1>  {# 输出变量，current_user是Flask-Login扩展对象 #}
    
    {# 条件判断 #}
    {% if items %}
        <ul>
            {# 循环遍历 #}
            {% for item in items %}
                <li>{{ loop.index }}. {{ item.name }} - {{ item.price }}元</li>
                {# loop.index：循环索引（从1开始），loop.index0从0开始 #}
            {% else %}
                <li>暂无数据</li>  {# 循环为空时执行 #}
            {% endfor %}
        </ul>
    {% endif %}
    
    {# 导入并调用宏（可复用的模板片段） #}
    {% from "macros.html" import render_button %}
    {{ render_button('提交', 'btn-primary', '/submit') }}
{% endblock %}
```

### Flask宏示例（macros.html）

```html
{# 定义宏：生成按钮标签，参数为按钮文本、样式、链接 #}
{% macro render_button(text, class, url) %}
    <a href="{{ url }}" class="btn {{ class }}">{{ text }}</a>
{% endmacro %}
```

### 后端传参到模板

```python
# app/routes/main.py
from flask import render_template
from app import db
from app.models import Item
from flask import Blueprint

main_bp = Blueprint('main', __name__)  # 初始化蓝图

@main_bp.route('/')
def home():
    # 从数据库查询数据
    items = Item.query.all()
    # 传递变量到模板：render_template(模板名, 变量1=值1, 变量2=值2)
    return render_template('home.html', items=items, title='首页')
```

## Flask蓝图（Blueprint）

蓝图是Flask的模块化工具，用于将应用拆分为多个功能模块（如认证模块、博客模块），每个模块可独立管理路由、模板、静态文件，解决大型应用路由混乱问题。

- 独立路由：每个蓝图的路由相互隔离，避免命名冲突
- 共享应用配置：蓝图使用所属应用的配置（如数据库连接）
- 可选择性注册：不同环境可注册不同蓝图（如开发环境注册调试蓝图）
### 蓝图使用步骤（以认证模块为例）

#### 步骤1：创建蓝图

```python
# app/routes/auth.py
from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models import User

# 初始化蓝图：参数1=蓝图名，参数2=模块名，template_folder指定该蓝图的模板目录
auth_bp = Blueprint('auth', __name__, template_folder='templates')

# 登录路由（蓝图下的路由）
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:  # 已登录则跳转到首页
        return redirect(url_for('main.home'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user is None or not user.check_password(request.form['password']):
            flash('用户名或密码错误')  # 闪现消息（需模板配合显示）
            return redirect(url_for('auth.login'))
        login_user(user, remember=request.form.get('remember'))  # 登录用户（Flask-Login）
        return redirect(url_for('main.home'))
    # 蓝图模板：默认查找 app/templates/auth/login.html（因指定了template_folder）
    return render_template('login.html')

# 登出路由
@auth_bp.route('/logout')
@login_required  # 装饰器：仅登录用户可访问
def logout():
    logout_user()
    return redirect(url_for('main.home'))
```

#### 步骤2：注册蓝图到应用

```python
# app/__init__.py（补充蓝图注册）
# ... 原有代码 ...

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 注册蓝图：main_bp（无前缀）、auth_bp（前缀/auth）
    from app.routes.main import main_bp
    from app.routes.auth import auth_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')  # 访问路径：/auth/login
    
    return app
```

#### 步骤3：蓝图的URL反向解析

通过 `url_for('蓝图名.路由函数名')` 生成URL，避免硬编码：

```python
# 后端跳转
redirect(url_for('auth.login'))  # 生成 /auth/login

# 模板中使用
<a href="{{ url_for('main.home') }}">首页</a>  # 生成 /
<a href="{{ url_for('auth.logout') }}">登出</a>  # 生成 /auth/logout
```

## Flask-SQLAlchemy

Flask-SQLAlchemy是Flask的ORM（对象关系映射）扩展，将Python类映射到数据库表，无需直接写SQL。

### 依赖安装与配置

```plaintext
# requirements.txt 中添加
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5  # 数据库迁移工具（更新表结构）
```

```python
# config.py 数据库配置
import os
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    # SQLite数据库（文件型，开发环境用）
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, 'app.db')
    # 禁用SQLAlchemy的修改跟踪（提升性能）
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # 密钥（用于会话加密、CSRF保护等）
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
```

### 数据模型定义（与表映射）

```python
# app/models/user.py
from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash  # 密码加密

class User(db.Model):
    # 表名：默认是类名小写（user），可自定义
    __tablename__ = 'users'
    
    # 字段定义：db.Column(类型, 约束, 主键等)
    id = db.Column(db.Integer, primary_key=True)  # 主键（自增整数）
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)  # 用户名（唯一）
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)  # 邮箱（唯一）
    password_hash = db.Column(db.String(128))  # 密码哈希（不存明文）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间（默认当前时间）
    
    # 关联：User与Post是一对多关系（一个用户多篇文章）
    posts = db.relationship('Post', backref='author', lazy='dynamic')
    
    # 密码加密方法（不直接操作password_hash）
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    # 密码验证方法
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    # 打印对象时的显示内容
    def __repr__(self):
        return f'<User {self.username}>'

# 文章模型（示例关联）
class Post(db.Model):
    __tablename__ = 'posts'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(140), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    # 外键：关联users表的id字段
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
```

### 数据库迁移（Flask-Migrate）

用于跟踪模型变化，更新数据库表结构（避免手动删表重建），命令行执行：

```shell
# 1. 初始化迁移环境（仅第一次执行）
flask db init  # 生成migrations目录

# 2. 根据模型创建迁移脚本
flask db migrate -m "create users and posts table"  # -m 备注信息

# 3. 执行迁移脚本，更新数据库表
flask db upgrade

# 回滚上一次迁移
flask db downgrade
```

### Flask的CRUD

```python
from app import db
from app.models import User, Post

# 1. 新增（Create）
user = User(username='zhangsan', email='zhangsan@example.com')
user.set_password('123456')  # 加密密码
db.session.add(user)  # 添加到会话
db.session.commit()  # 提交会话（执行SQL）

# 2. 查询（Read）
# 按主键查询
user = User.query.get(1)  # 获取id=1的用户
# 按条件查询（唯一结果）
user = User.query.filter_by(username='zhangsan').first()  # 无结果返回None
# 按条件查询（多个结果）
users = User.query.filter(User.email.endswith('@example.com')).all()
# 排序与分页
users = User.query.order_by(User.created_at.desc()).paginate(page=1, per_page=10)  # 每页10条

# 3. 修改（Update）
user.username = 'lisi'
db.session.commit()

# 4. 删除（Delete）
db.session.delete(user)
db.session.commit()
```