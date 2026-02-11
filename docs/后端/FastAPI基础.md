FastAPI 是基于 Python 3.8+ 的异步 Web 框架，主打**快速开发**+**自动生成接口文档**，底层基于 Starlette（异步Web框架）和 Pydantic（数据校验），适合做 **后端API、实时通信、微服务**，适合处理IO密集型任务，性能接近 Node.js、Go 级别。FastAPI 使用 Uvicorn 作为其默认的 Web 服务器。
## 核心架构
FastAPI 是“分层封装”架构，核心依赖两个库：
1. **Starlette**：底层异步 Web 框架，负责处理 HTTP 请求/响应、路由匹配、WebSocket、中间件等核心网络能力；
2. **Pydantic**：负责数据校验、类型转换，FastAPI 把 Pydantic 模型和接口参数/请求体绑定，自动完成校验。
### 简易请求流程
```
用户请求 → Uvicorn（ASGI服务器） → FastAPI路由匹配 → 依赖注入处理 → Pydantic数据校验 → 业务逻辑处理 → 响应返回
```

## 常用命令
**安装**
```shell
pip install fastapi uvicorn
pip install fastapi[all]
```
**运行**
```shell
uvicorn main:app --reload --port 8001
#（main 是文件名，app 是 FastAPI 实例，--reload 开发时自动重启）
```
访问 `http://localhost:8001/docs` 可以Swagger查看接口。不指定端口是uvicorn会默认使用8000。
#### 模板文件
```python
from fastapi import FastAPI, Depends
from pydantic import BaseModel

app = FastAPI()

# 依赖函数：模拟登录校验
def check_login(token: str = Depends()):
    if token != "valid_token":
        raise ValueError("token无效")
    return {"user_id": 1}

# Pydantic模型：定义请求体规则
class Item(BaseModel):
    name: str
    price: float

# 接口：新增商品from fastapi import FastAPI, Depends, Query, Header, HTTPException, Path
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import asyncio

# 初始化FastAPI应用，添加文档描述（优化接口文档展示）
app = FastAPI(
    title="商品管理API",
    description="基于FastAPI的商品新增/查询接口示例，覆盖依赖注入、数据校验全场景",
    version="1.0.0"
)

# ======================== 1. Pydantic模型（完整用法） ========================
class Item(BaseModel):
    """商品模型（包含字段校验、默认值、示例值）"""
    # 基础字段定义：必填+示例值+描述
    name: str = Field(..., description="商品名称", examples=["苹果手机"])
    # 数值校验：价格必须大于0，默认值+示例值
    price: float = Field(
        default=0.0,
        gt=0,  # 大于0
        description="商品价格（必须大于0）",
        examples=[5999.99]
    )
    # 可选字段：分类列表，默认空列表
    categories: Optional[List[str]] = Field(default=[], description="商品分类")
    # 布尔字段：是否上架，默认True
    is_on_sale: bool = Field(default=True, description="是否上架")

    # 自定义字段校验器（比如校验商品名称长度）
    @field_validator("name")
    def name_length_check(cls, v):
        if len(v) < 2 or len(v) > 20:
            raise ValueError("商品名称长度必须在2-20个字符之间")
        return v

    # 模型配置（优化JSON序列化、文档展示）
    class Config:
        json_schema_extra = {
            "example": {
                "name": "苹果手机",
                "price": 5999.99,
                "categories": ["数码", "手机"],
                "is_on_sale": True
            }
        }

# ======================== 2. 依赖注入（完整用法） ========================
# 2.1 基础依赖：从请求头获取并校验Token（Bearer格式）
def get_token(authorization: Optional[str] = Header(None)) -> str:
    """
    第一步：提取Token（依赖函数1）
    从Authorization请求头提取Token，处理Bearer格式
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="未传入Token，请在请求头添加Authorization: Bearer <token>"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Token格式错误，正确格式：Authorization: Bearer <token>"
        )
    # 提取纯Token字符串
    token = authorization.split(" ")[1]
    return token

# 2.2 异步依赖：校验Token并返回用户信息（依赖嵌套）
async def check_login(
    token: str = Depends(get_token),  # 嵌套依赖：先调用get_token获取Token
    # 额外参数：从查询参数获取设备类型（非必填）
    device_type: Optional[str] = Query(None, description="设备类型：pc/mobile")
) -> dict:
    """
    第二步：校验Token并返回用户信息（依赖函数2）
    模拟异步操作（如查询数据库校验Token）
    """
    # 模拟异步数据库查询（实际开发中替换为真实的DB操作）
    await asyncio.sleep(0.1)
    
    # Token校验逻辑
    valid_tokens = {"valid_token": {"user_id": 1, "username": "张三"},
                    "test_token": {"user_id": 2, "username": "测试用户"}}
    if token not in valid_tokens:
        raise HTTPException(
            status_code=401,
            detail="Token无效或已过期，请重新登录"
        )
    
    # 返回用户信息（包含额外的设备类型）
    user_info = valid_tokens[token]
    user_info["device_type"] = device_type if device_type else "unknown"
    return user_info

# 2.3 全局依赖：对所有接口生效（比如统一日志、基础校验）
async def global_dependency(request_path: str = Path(...)):
    """全局依赖示例：记录所有接口的访问路径"""
    print(f"访问接口：{request_path}")
    return {"request_path": request_path}

# 给所有接口添加全局依赖
app.dependency_overrides[global_dependency] = global_dependency  # 简化写法，也可通过app.router.dependencies添加

# ======================== 3. 接口定义（完整场景） ========================
@app.post(
    "/items",
    summary="新增商品",
    description="新增商品接口，需登录（Token校验），支持商品信息完整校验",
    response_description="新增成功的商品信息+用户信息"
)
async def create_item(
    # 请求体：商品信息（自动校验）
    item: Item,
    # 依赖注入：用户登录信息
    user: dict = Depends(check_login),
    # 额外查询参数：操作人备注（非必填）
    remark: Optional[str] = Query(None, max_length=100, description="操作人备注")
):
    """
    新增商品接口（核心逻辑）
    - 自动校验请求体格式（Pydantic）
    - 自动校验登录状态（依赖注入）
    - 支持自定义字段校验（商品名称长度）
    """
    # 模拟业务逻辑：保存商品到数据库
    item_id = 1001  # 模拟生成的商品ID
    # 构造返回结果
    return {
        "code": 200,
        "msg": f"用户{user['username']}（ID：{user['user_id']}）新增商品成功",
        "data": {
            "item_id": item_id,
            "item_name": item.name,
            "item_price": item.price,
            "categories": item.categories,
            "is_on_sale": item.is_on_sale,
            "device_type": user["device_type"],
            "remark": remark if remark else "无备注"
        }
    }

@app.get(
    "/items/{item_id}",
    summary="查询商品",
    description="根据商品ID查询商品信息，无需登录（演示无依赖接口）"
)
async def get_item(
    # 路径参数：商品ID（校验必须大于0）
    item_id: int = Field(..., gt=0, description="商品ID，必须大于0"),
    # 依赖注入：可选（演示非必填依赖）
    user: Optional[dict] = Depends(check_login)  # 改为Optional后，依赖失败不会报错
):
    """查询商品接口（演示路径参数+可选依赖）"""
    # 模拟查询数据库
    await asyncio.sleep(0.05)
    item_data = {
        "item_id": item_id,
        "name": "苹果手机",
        "price": 5999.99,
        "categories": ["数码", "手机"],
        "is_on_sale": True
    }
    # 如果有用户信息，补充到返回结果
    if user:
        item_data["operator"] = user["username"]
    return {
        "code": 200,
        "msg": "查询成功",
        "data": item_data
    }

# ======================== 4. 异常处理（全局捕获） ========================
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """全局捕获ValueError，返回标准化错误"""
    return {
        "code": 400,
        "msg": f"参数错误：{str(exc)}",
        "data": None
    }

# ======================== 5. 运行入口（可选） ========================
if __name__ == "__main__":
    import uvicorn
    # 运行服务：热重载+允许外部访问
    uvicorn.run(
        app="main:app",  # main是当前文件名，app是FastAPI实例
        host="0.0.0.0",  # 允许所有IP访问
        port=8000,
        reload=True,  # 开发模式热重载（生产环境关闭）
        workers=1  # 生产环境可设置多进程，比如workers=4
    )
```

## 关键概念
### 1. 路由（Routes）
  ```python
  from fastapi import FastAPI
  app = FastAPI()

  # 同步路由
  @app.get("/hello")
  def hello():
      return {"msg": "你好"}

  # 异步路由+路径参数
  @app.get("/items/{item_id}")
  async def get_item(item_id: int):  # 自动校验item_id为整数
      return {"item_id": item_id}
  ```

### 2. 数据校验（Pydantic 模型）
定义接口的请求/响应数据格式，自动校验数据类型、必填项等，不用手动写 if 判断。
- **核心特点**：
  - 基于 Python 类型注解（如 `int`/`str`/`List`）定义模型；
  - 自动返回清晰的校验错误信息；
  - 支持数据转换（如前端传字符串数字自动转整数）。
  ```python
  from pydantic import BaseModel

  # 定义请求体模型
  class Item(BaseModel):
      name: str  # 必填字符串
      price: float  # 必填浮点数
      is_offer: bool = None  # 可选布尔值，默认None

  @app.post("/items/")
  async def create_item(item: Item):  # 自动解析请求体并校验
      return {"item_name": item.name, "item_price": item.price}
  ```

### 3. 自动接口文档
写代码时自动生成可交互的 API 文档，不用手动写 Swagger/OpenAPI。
  - Swagger UI：`http://localhost:8000/docs`（可视化、可直接调试接口）
![fastapi的swagger接口页面示例图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/fastapi%E7%9A%84swagger%E6%8E%A5%E5%8F%A3%E9%A1%B5%E9%9D%A2%E7%A4%BA%E4%BE%8B%E5%9B%BE.webp)
  - ReDoc：`http://localhost:8000/redoc`（更简洁的文档展示）。
  ![fastapi的redoc接口页面示例图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/backend/fastapi%E7%9A%84redoc%E6%8E%A5%E5%8F%A3%E9%A1%B5%E9%9D%A2%E7%A4%BA%E4%BE%8B%E5%9B%BE.webp)


### 4. 依赖注入（Dependencies）
- **通俗理解**：抽离接口共用的逻辑（如登录校验、数据库连接、参数提取），复用代码，减少冗余。
- **核心特点**：支持同步/异步依赖，支持嵌套依赖，可传参数。
  ```python
  from fastapi import Depends

  # 定义依赖函数（比如获取当前用户）
  def get_current_user(token: str = Depends()):
      # 模拟校验token
      return {"user_id": 1, "username": "test"}

  # 接口使用依赖
  @app.get("/users/me")
  async def read_user(current_user: dict = Depends(get_current_user)):
      return current_user
  ```

### 5. 中间件（Middleware）
所有请求/响应的“拦截器”，可统一处理日志、跨域、认证等（类似后端开发的“全局过滤器”）。
- **示例**（记录请求耗时）：
  ```python
  import time
  from fastapi import Request

  @app.middleware("http")
  async def add_process_time_header(request: Request, call_next):
      start_time = time.time()
      response = await call_next(request)  # 执行后续路由逻辑
      process_time = time.time() - start_time
      response.headers["X-Process-Time"] = str(process_time)
      return response
  ```


