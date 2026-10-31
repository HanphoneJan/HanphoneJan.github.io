---
title: Python 网络爬虫实战
description: 静态页、动态页、Scrapy、反爬与 JS 逆向、分布式与 Playwright，一份完整的爬虫工程笔记。
---

从 requests / BeautifulSoup 的静态页开始，一路到 Playwright、Scrapy 分布式和 JS 逆向。

写爬虫之前先看目标站点的 robots.txt 与服务条款。本文的示例只针对公开可抓取页面，验证码与登录那几节讲的是原理，不是可直接套用的绕过方案。


## 目录

- [一、爬虫基础理论](#一爬虫基础理论)
- [二、静态页面爬取实战](#二静态页面爬取实战)
- [三、动态页面与自动化](#三动态页面与自动化)
- [四、Scrapy 框架深度解析](#四scrapy-框架深度解析)
- [五、反爬虫应对策略](#五反爬虫应对策略)
- [六、JS 逆向技术](#六js-逆向技术)
- [七、分布式爬虫架构](#七分布式爬虫架构)
- [八、性能优化与工程实践](#八性能优化与工程实践)
- [九、验证码处理](#九验证码处理)
- [十、Playwright 现代化爬虫](#十playwright-现代化爬虫)
- [十一、最佳实践与注意事项](#十一最佳实践与注意事项)

---

## 一、爬虫基础理论

### 1.1 HTTP 协议深入理解

**爬虫的本质**：模拟浏览器行为，发送 HTTP 请求并解析响应。

| 概念 | 说明 | 爬虫应用 |
|------|------|----------|
| 请求方法 | GET/POST/PUT/DELETE | 数据获取与提交 |
| 状态码 | 200/301/302/403/404/500 | 判断请求状态 |
| 请求头 | User-Agent/Referer/Cookie | 模拟浏览器、防盗链、维持登录 |
| 响应头 | Content-Type/Set-Cookie | 解析数据类型、处理 Cookie |
| 编码 | UTF-8/GBK | 避免乱码 |

**关键请求头详解：**

```python
headers = {
    # 标识客户端类型（反爬虫重点）
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    
    # 声明可接受的内容类型
    'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,image/webp,*/*;q=0.8',
    
    # 支持压缩（减少传输量）
    'Accept-Encoding': 'gzip, deflate, br',
    
    # 语言偏好
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    
    # 来源页面（防盗链机制）
    'Referer': 'https://www.example.com',
    
    # 维持登录状态（Session 管理）
    'Cookie': 'session_id=abc123; user_token=xyz789',
    
    # 连接保持（提高性能）
    'Connection': 'keep-alive',
    
    # 自定义标识（某些网站要求）
    'X-Requested-With': 'XMLHttpRequest'  # 标识 AJAX 请求
}
```

### 1.2 爬虫核心流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 目标分析    │ →  │ 发送请求    │ →  │ 接收响应    │
└─────────────┘    └─────────────┘    └─────────────┘
       ↓                                    ↓
┌─────────────┐                    ┌─────────────┐
│ 找到接口    │                    │ 解析数据    │
│ 分析加密    │                    └─────────────┘
└─────────────┘                         ↓
                                 ┌─────────────┐
                                 │ 存储数据    │
                                 └─────────────┘
```

**实战步骤详解：**

1. **目标分析**（F12 开发者工具）
   - Network 标签：查看所有网络请求
   - XHR/Fetch 筛选：定位数据接口
   - 查看 Request Headers/Response Headers
   - 分析参数加密方式

2. **接口定位**
   - 搜索关键字（Ctrl+F）：快速定位数据
   - 查看响应内容：确认数据格式
   - 记录请求方式（GET/POST）
   - 复制 cURL（curl 命令）

3. **代码实现**
   - 构造请求参数
   - 设置请求头
   - 发送请求（考虑重试、超时）
   - 解析响应数据

4. **数据存储**
   - 选择存储方案（文件/数据库）
   - 数据清洗去重
   - 增量更新策略

### 1.3 数据提取技术对比

| 技术 | 性能 | 学习难度 | 适用场景 | 示例 |
|------|------|----------|----------|------|
| 正则表达式 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 简单文本提取 | `r'\d{4}-\d{2}-\d{2}'` |
| BeautifulSoup | ⭐⭐ | ⭐ | 静态 HTML、初学者 | `soup.find('div', class_='item')` |
| lxml/XPath | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 复杂结构、高性能需求 | `//div[@class="item"]/a/@href` |
| CSS Selector | ⭐⭐⭐ | ⭐⭐ | 元素定位、类 CSS | `select('.item > a')` |
| PyQuery | ⭐⭐⭐ | ⭐⭐⭐ | 熟悉 jQuery 的开发者 | `$('.item').find('a').attr('href')` |
| re + CSS 混合 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 复杂数据提取 | 组合使用 |

**XPath 进阶技巧：**

```python
from lxml import etree

## 解析 HTML
html = """
<div class="container">
    <div class="item" data-id="1">
        <h3 class="title">Python爬虫教程</h3>
        <span class="price">99.00</span>
        <a href="/detail/1">查看详情</a>
    </div>
    <div class="item" data-id="2">
        <h3 class="title">机器学习实战</h3>
        <span class="price">199.00</span>
        <a href="/detail/2">查看详情</a>
    </div>
</div>
"""

tree = etree.HTML(html)

## 1. 基础定位
titles = tree.xpath('//h3[@class="title"]/text()')  # 获取所有标题
prices = tree.xpath('//span[@class="price"]/text()')  # 获取所有价格

## 2. 属性提取
links = tree.xpath('//a/@href')  # 获取所有链接
data_ids = tree.xpath('//div[@class="item"]/@data-id')  # 获取自定义属性

## 3. 层级关系
## 父元素
container = tree.xpath('//h3[@class="title"]/parent::div')

## 祖先元素
all_divs = tree.xpath('//h3[@class="title"]/ancestor::div')

## 兄弟元素
next_sibling = tree.xpath('//span[@class="price"]/following-sibling::*')

## 4. 包含文本
//a[contains(text(), '详情')]

## 5. 文本匹配（精确）
//h3[text()='Python爬虫教程']

## 6. 多条件组合
//div[@class='item' and @data-id='1']

## 7. 轴选择器
preceding-sibling  # 前面的兄弟元素
following-sibling  # 后面的兄弟元素
ancestor           # 所有祖先元素
descendant         # 所有后代元素

## 8. 位置索引
//div[@class="item"][1]  # 第一个
//div[@class="item"][last()]  # 最后一个
//div[@class="item"][position() < 3]  # 前两个
```

---

## 二、静态页面爬取实战

### 2.1 豆瓣电影 Top250 - 分页爬取

**项目地址：** `douban/film.py`

**核心实现：**

```python
import requests
from bs4 import BeautifulSoup
import time
import csv

class DoubanCrawler:
    """豆瓣电影爬虫"""
    
    def __init__(self):
        self.base_url = "https://movie.douban.com/top250"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.session = requests.Session()
    
    def get_movie_list(self, page_num):
        """获取单页电影列表"""
        start = (page_num - 1) * 25
        url = f"{self.base_url}?start={start}"
        
        try:
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            return self.parse_html(response.text)
        except Exception as e:
            print(f"爬取第{page_num}页失败: {e}")
            return []
    
    def parse_html(self, html):
        """解析 HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        movies = []
        
        for item in soup.find('ol', class_='grid_view').find_all('li'):
            movie = {
                'rank': item.find('em').text,
                'title': item.find('span', class_='title').text,
                'rating': item.find('span', class_='rating_num').text,
                'quote': item.find('span', class_='inq').text if item.find('span', class_='inq') else '无简介',
                'link': item.find('a')['href']
            }
            movies.append(movie)
        
        return movies
    
    def crawl_all(self, max_pages=10, save_format='csv'):
        """爬取所有页面"""
        all_movies = []
        
        for page in range(1, max_pages + 1):
            print(f"正在爬取第 {page} 页...")
            movies = self.get_movie_list(page)
            all_movies.extend(movies)
            
            # 控制爬取频率
            time.sleep(random.uniform(1, 3))
        
        self.save_data(all_movies, save_format)
        return all_movies
    
    def save_data(self, data, format='csv'):
        """保存数据"""
        filename = f'douban_movies_{int(time.time())}.{format}'
        
        if format == 'csv':
            with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
        elif format == 'json':
            import json
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"数据已保存到 {filename}")

## 使用
if __name__ == '__main__':
    crawler = DoubanCrawler()
    crawler.crawl_all(max_pages=10)
```

### 2.2 人民网关键词搜索 - Session 管理与分页

**项目地址：** `xijinping/renmin.py`

**核心特性：**

- Session 自动管理 Cookie
- 完整异常处理
- 多格式数据导出
- 随机延迟防封禁

```python
class XiSpeechSpider:
    def __init__(self):
        self.base_url = "https://jhsjk.people.cn/result"
        self.session = requests.Session()  # 自动管理 Cookie
        self.headers = {
            'User-Agent': 'Mozilla/5.0...',
            'Referer': 'https://jhsjk.people.cn/'
        }
    
    def search_speeches(self, keyword, page=1):
        """搜索并解析"""
        params = {
            'keywords': keyword,
            'page': page,
            'sortType': 2  # 按时间排序
        }
        
        # 随机延迟
        time.sleep(1 + random.random())
        
        response = self.session.get(
            self.base_url,
            params=params,
            headers=self.headers,
            timeout=10
        )
        
        return self.parse_search_results(response.text)
    
    def search_all_pages(self, keyword, max_pages=None):
        """爬取所有页"""
        # 第一页确定总页数
        first_page = self.search_speeches(keyword, 1)
        total_pages = math.ceil(first_page['total_count'] / 10)
        
        all_results = first_page['results']
        for page in range(2, min(total_pages + 1, max_pages or total_pages + 1)):
            page_results = self.search_speeches(keyword, page)
            all_results.extend(page_results['results'])
        
        return all_results
```

**关键点解析：**

1. **Session 管理**：自动处理 Cookie，维持登录状态
2. **随机延迟**：`time.sleep(1 + random.random())` 避免固定间隔检测
3. **分页逻辑**：先获取第一页确定总数，再循环爬取
4. **异常处理**：每个请求都包含 try-except

### 2.3 网易云音乐 - 媒体文件下载

**项目地址：** `wyy-music/wyy.py`

**核心实现：**

```python
def download_song(song_id, song_title, headers):
    """下载单首歌曲"""
    # 1. 清理文件名（去除非法字符）
    song_title = re.sub(r'[\/:*?"<>|]', '-', song_title)
    
    # 2. 构造下载链接
    download_url = f'https://music.163.com/song/media/outer/url?id={song_id}.mp3'
    
    # 3. 流式下载（大文件支持）
    response = requests.get(download_url, headers=headers, timeout=15, stream=True)
    
    # 4. 保存文件
    save_path = os.path.join(save_dir, f'{song_title}.mp3')
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):  # 8KB 分块
            f.write(chunk)
    
    # 5. 控制下载频率
    time.sleep(1)
```

**批量下载优化：**

```python
def batch_download(song_list, max_workers=3):
    """多线程批量下载"""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for song_id, song_title in song_list:
            future = executor.submit(download_song, song_id, song_title, headers)
            futures.append(future)
        
        # 处理结果
        for future in as_completed(futures):
            try:
                result = future.result()
                print(f"下载完成: {result}")
            except Exception as e:
                print(f"下载失败: {e}")
```

---

## 三、动态页面与自动化

### 3.1 动态加载原理

**为什么需要浏览器自动化？**

| 场景 | 说明 | 应对方案 |
|------|------|----------|
| 单页应用（SPA） | React/Vue/Angular 渲染 | Selenium/Playwright |
| 懒加载 | 滚动加载更多 | 模拟滚动 + 等待 |
| AJAX 异步 | JavaScript 请求 | 直接请求接口 |
| 加密参数 | JS 生成签名 | JS 逆向 |
| 登录验证 | Cookie/Token | Cookie 池/模拟登录 |

### 3.2 Selenium 深度实战 - 淘宝商品爬取

**项目地址：** `taobao/taobao.py`

**完整配置：**

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

class TaobaoCrawler:
    def __init__(self):
        self.options = Options()
        
        # 1. 基础配置
        self.options.add_argument('--disable-blink-features=AutomationControlled')  # 禁用自动化标识
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option('useAutomationExtension', False)
        
        # 2. 性能优化
        self.options.add_argument('--disable-gpu')  # 禁用 GPU 加速
        self.options.add_argument('--no-sandbox')  # Linux 下必需
        self.options.add_argument('--disable-dev-shm-usage')  # 避免 /dev/shm 不足
        
        # 3. 反检测
        self.driver = webdriver.Chrome(options=self.options)
        self.driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5]
                })
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['zh-CN', 'zh', 'en']
                })
                window.chrome = {
                    runtime: {}
                }
                """
            }
        )
        
        self.wait = WebDriverWait(self.driver, 20)
    
    def search(self, keyword):
        """搜索商品"""
        self.driver.get('https://s.taobao.com/')
        
        # 等待搜索框
        input_box = self.wait.until(EC.presence_of_element_located((By.ID, 'q')))
        input_box.send_keys(keyword)
        
        # 点击搜索
        search_btn = self.wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'btn-search')))
        search_btn.click()
        
        # 处理滑块验证码（预留时间）
        time.sleep(2)
    
    def scroll_to_bottom(self):
        """滚动到底部加载更多"""
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        
        while True:
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
    
    def get_products(self):
        """获取商品信息"""
        self.scroll_to_bottom()
        
        # 使用 PyQuery 解析
        from pyquery import PyQuery as pq
        doc = pq(self.driver.page_source)
        
        products = []
        for item in doc('.J_MouserOnverReq').items():
            product = {
                'title': item.find('.title').text(),
                'price': item.find('.price').text(),
                'sales': item.find('.sale-num').text()
            }
            products.append(product)
        
        return products
    
    def close(self):
        """关闭浏览器"""
        self.driver.quit()
```

### 3.3 智能等待策略

**三种等待方式对比：**

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

## 1. 显式等待（推荐）- 等待特定条件出现
wait = WebDriverWait(driver, 10)  # 最长等待 10 秒
element = wait.until(
    EC.presence_of_element_located((By.ID, 'myElement'))
)

## 2. 隐式等待 - 全局等待时间
driver.implicitly_wait(10)  # 所有元素查找最多等 10 秒

## 3. 强制等待（不推荐）- 固定等待
import time
time.sleep(3)  # 固定等待 3 秒
```

**常用等待条件：**

```python
from selenium.webdriver.support import expected_conditions as EC

## 元素存在
EC.presence_of_element_located((By.ID, 'element'))

## 元素可见
EC.visibility_of_element_located((By.ID, 'element'))

## 元素可点击
EC.element_to_be_clickable((By.ID, 'element'))

## 文本出现在元素中
EC.text_to_be_present_in_element((By.ID, 'element'), 'expected text')

## 标题包含指定文本
EC.title_contains('expected title')

## 元素被选中
EC.element_to_be_selected((By.ID, 'checkbox'))

## 弹窗出现
EC.alert_is_present()
```

---

## 四、Scrapy 框架深度解析

### 4.1 Scrapy 架构与工作流程

**Scrapy 核心组件：**

```
┌─────────────┐
│   Engine    │ ← 核心引擎，协调所有组件
└─────────────┘
       ↓
    ┌──┴──┐
    ↓     ↓
┌────────┐ ┌────────┐
│Scheduler│ │Downloader│ ← 下载器（并发请求）
└────────┘ └────────┘
    ↑           ↓
    │      ┌──────┴──────┐
    │      │             │
┌───┴──────┴──┐   ┌─────┴─────┐
│Spiders      │   │Middlewares│ ← 中间件（处理请求/响应）
└─────────────┘   └───────────┘
                     ↓
              ┌────────────┐
              │  Pipelines │ ← 管道（数据处理、存储）
              └────────────┘
```

**工作流程：**

1. Engine 从 Scheduler 获取待爬 URL
2. Engine 通过 Downloader Middleware 处理请求
3. Downloader 发送请求并获取响应
4. Downloader Middleware 处理响应
5. Engine 将响应交给 Spider 解析
6. Spider 提取数据（Item）和新的 URL（Request）
7. Item 交给 Pipeline 处理
8. 新 URL 交给 Scheduler 调度

### 4.2 创建 Scrapy 项目

```bash
## 1. 创建项目
scrapy startproject myproject

## 2. 创建爬虫
cd myproject
scrapy genspider douban douban.com

## 3. 运行爬虫
scrapy crawl douban

## 4. 导出数据
scrapy crawl douban -o movies.json
scrapy crawl douban -o movies.csv
```

**项目结构：**

```
myproject/
├── scrapy.cfg          # Scrapy 配置文件
├── myproject/          # 项目主目录
│   ├── __init__.py
│   ├── items.py        # 数据模型定义
│   ├── middlewares.py  # 中间件
│   ├── pipelines.py    # 管道
│   ├── settings.py     # 全局配置
│   └── spiders/        # 爬虫目录
│       ├── __init__.py
│       └── douban.py   # 爬虫文件
```

### 4.3 爬虫编写 - 豆瓣电影

**items.py - 数据模型：**

```python
import scrapy

class DoubanItem(scrapy.Item):
    rank = scrapy.Field()
    title = scrapy.Field()
    rating = scrapy.Field()
    quote = scrapy.Field()
    link = scrapy.Field()
```

**douban.py - 爬虫逻辑：**

```python
import scrapy
from myproject.items import DoubanItem

class DoubanSpider(scrapy.Spider):
    name = 'douban'
    allowed_domains = ['douban.com']
    start_urls = ['https://movie.douban.com/top250']
    
    def parse(self, response):
        """解析响应"""
        # 提取电影列表
        for item in response.css('ol.grid_view li'):
            movie = DoubanItem()
            movie['rank'] = item.css('em::text').get()
            movie['title'] = item.css('span.title::text').get()
            movie['rating'] = item.css('span.rating_num::text').get()
            movie['quote'] = item.css('span.inq::text').get() or '无'
            movie['link'] = item.css('a::attr(href)').get()
            
            yield movie
        
        # 提取下一页链接
        next_page = response.css('span.next a::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
```

### 4.4 中间件 - 反爬虫与请求处理

**下载中间件（Downloader Middleware）：**

```python
## middlewares.py
import random
from scrapy import signals
from scrapy.downloadermiddlewares.useragent import UserAgentMiddleware

class RandomUserAgentMiddleware(UserAgentMiddleware):
    """随机 User-Agent 中间件"""
    
    def __init__(self, user_agent=''):
        self.user_agent = user_agent
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            user_agent=crawler.settings.get('USER_AGENT')
        )
    
    def process_request(self, request, spider):
        # 随机选择 User-Agent
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0.0.0',
            'Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0.0.0'
        ]
        request.headers['User-Agent'] = random.choice(user_agents)
        
        # 添加其他请求头
        request.headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        request.headers['Accept-Language'] = 'zh-CN,zh;q=0.9'
    
    def process_response(self, request, response, spider):
        # 处理响应
        if response.status == 403:
            spider.logger.info(f'被拒绝访问: {request.url}')
        return response

class ProxyMiddleware:
    """代理 IP 中间件"""
    
    def __init__(self, proxy_list):
        self.proxy_list = proxy_list
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            proxy_list=crawler.settings.get('PROXY_LIST')
        )
    
    def process_request(self, request, spider):
        # 随机选择代理
        if self.proxy_list:
            proxy = random.choice(self.proxy_list)
            request.meta['proxy'] = proxy
    
    def process_exception(self, request, exception, spider):
        # 代理失败处理
        if 'proxy' in request.meta:
            spider.logger.error(f'代理失败: {request.meta["proxy"]}')
```

**启用中间件：**

```python
## settings.py
DOWNLOADER_MIDDLEWARES = {
    'myproject.middlewares.RandomUserAgentMiddleware': 400,
    'myproject.middlewares.ProxyMiddleware': 410,
    'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware': None,  # 禁用默认 UA
}

## 配置
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
PROXY_LIST = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
]
```

### 4.5 管道 - 数据处理与存储

**pipelines.py：**

```python
import json
import sqlite3
from itemadapter import ItemAdapter

class JsonPipeline:
    """JSON 存储"""
    
    def __init__(self, filename):
        self.filename = filename
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            filename=crawler.settings.get('JSON_FILE', 'movies.json')
        )
    
    def open_spider(self, spider):
        self.file = open(self.filename, 'w', encoding='utf-8')
        self.file.write('[')
    
    def close_spider(self, spider):
        self.file.write(']')
        self.file.close()
    
    def process_item(self, item, spider):
        line = json.dumps(dict(item), ensure_ascii=False)
        self.file.write(line + ',\n')
        return item

class SQLitePipeline:
    """SQLite 存储"""
    
    def __init__(self, db_path):
        self.db_path = db_path
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            db_path=crawler.settings.get('DB_PATH', 'movies.db')
        )
    
    def open_spider(self, spider):
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        
        # 创建表
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS movies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rank INTEGER,
                title TEXT,
                rating REAL,
                quote TEXT,
                link TEXT UNIQUE
            )
        ''')
        self.conn.commit()
    
    def close_spider(self, spider):
        self.conn.close()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        try:
            self.cursor.execute('''
                INSERT OR IGNORE INTO movies (rank, title, rating, quote, link)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                adapter.get('rank'),
                adapter.get('title'),
                adapter.get('rating'),
                adapter.get('quote'),
                adapter.get('link')
            ))
            self.conn.commit()
        except Exception as e:
            spider.logger.error(f'存储失败: {e}')
        
        return item

class DuplicatesPipeline:
    """去重管道"""
    
    def __init__(self):
        self.links_seen = set()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        link = adapter.get('link')
        
        if link in self.links_seen:
            spider.logger.info(f'重复链接: {link}')
            raise DropItem(f'Duplicate item found: {link}')
        
        self.links_seen.add(link)
        return item
```

**启用管道：**

```python
ITEM_PIPELINES = {
    'myproject.pipelines.DuplicatesPipeline': 100,  # 先去重
    'myproject.pipelines.JsonPipeline': 200,
    'myproject.pipelines.SQLitePipeline': 300,
}
```

### 4.6 Scrapy 去重机制详解

**Scrapy 去重原理：**

1. **请求指纹生成**：对 URL 进行哈希（SHA1）
2. **指纹存储**：使用内存集合（set）存储
3. **去重判断**：发送请求前检查指纹是否存在

**查看去重实现：**

```python
## Scrapy 源码去重器位置
## scrapy/dupefilters.py

class RFPDupeFilter(BaseDupeFilter):
    """基于 Request Fingerprint 的去重器"""
    
    def __init__(self, path=None, debug=False):
        self.fingerprints = set()  # 指纹集合
        # ...
    
    def request_fingerprint(self, request):
        """生成请求指纹"""
        return request_fingerprint(request)
    
    def request_seen(self, request):
        """检查请求是否已存在"""
        fp = self.request_fingerprint(request)
        if fp in self.fingerprints:
            return True
        self.fingerprints.add(fp)
        return False
```

**自定义去重策略：**

```python
from scrapy.utils.request import request_fingerprint
from scrapy.dupefilters import BaseDupeFilter

class MyDupeFilter(BaseDupeFilter):
    """自定义去重器 - 基于内容而非 URL"""
    
    def request_seen(self, request):
        # 使用 URL + 部分参数生成指纹
        url = request.url
        params = request.meta.get('params', {})
        
        # 只根据特定参数去重
        key_params = {k: v for k, v in params.items() if k in ['id', 'category']}
        fp_str = url + str(sorted(key_params.items()))
        
        fp = hashlib.md5(fp_str.encode()).hexdigest()
        
        if fp in self.fingerprints:
            return True
        
        self.fingerprints.add(fp)
        return False
```

**自定义去重器启用：**

```python
## settings.py
DUPEFILTER_CLASS = 'myproject.dupefilters.MyDupeFilter'
```

---

## 五、反爬虫应对策略

### 5.1 常见反爬虫机制与应对

| 机制 | 原理 | 应对方法 | 复杂度 |
|------|------|----------|--------|
| User-Agent 检测 | 识别非浏览器 UA | 轮换真实 UA | ⭐ |
| IP 频率限制 | 限制单 IP 访问频率 | 代理 IP 池 | ⭐⭐ |
| Cookie 验证 | 要求登录状态 | Cookie 池/Selenium | ⭐⭐⭐ |
| JavaScript 加密 | 动态生成签名参数 | JS 逆向 | ⭐⭐⭐⭐ |
| 滑块验证码 | 区分机器和人类 | 图像识别/打码平台 | ⭐⭐⭐⭐ |
| 浏览器指纹 | 检测 webdriver 等特征 | Playwright/无痕模式 | ⭐⭐⭐ |
| 动态加载 | 客户端渲染数据 | Selenium/接口请求 | ⭐⭐ |

### 5.2 User-Agent 轮换

```python
import random
from fake_useragent import UserAgent

## 方案1：手动维护 UA 列表
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
]

def get_random_headers():
    return {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://www.example.com'
    }

## 方案2：使用 fake_useragent 库自动生成
from fake_useragent import UserAgent

ua = UserAgent()
headers = {
    'User-Agent': ua.random,  # 随机 UA
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}
```

### 5.3 代理 IP 池管理

**代理获取方式：**

| 方式 | 成本 | 稳定性 | 推荐场景 |
|------|------|--------|----------|
| 免费代理网站 | 免费 | 低 | 测试学习 |
| 付费代理服务 | 中-高 | 高 | 生产环境 |
| 自建代理池 | 低-中 | 高 | 长期项目 |

**代理 IP 池实现：**

```python
import requests
import random
import time
from typing import List, Optional

class ProxyPool:
    """代理 IP 池"""
    
    def __init__(self):
        self.proxies = []
        self.failed_proxies = set()
    
    def load_from_file(self, filename: str):
        """从文件加载代理"""
        with open(filename, 'r') as f:
            for line in f:
                proxy = line.strip()
                if proxy:
                    self.proxies.append(proxy)
    
    def test_proxy(self, proxy: str, test_url: str = 'https://www.baidu.com') -> bool:
        """测试代理是否可用"""
        try:
            response = requests.get(
                test_url,
                proxies={'http': proxy, 'https': proxy},
                timeout=5
            )
            return response.status_code == 200
        except:
            return False
    
    def get_random_proxy(self) -> Optional[str]:
        """获取随机代理"""
        if not self.proxies:
            return None
        
        # 排除失败的代理
        available_proxies = [p for p in self.proxies if p not in self.failed_proxies]
        
        if not available_proxies:
            # 重置失败列表
            self.failed_proxies.clear()
            available_proxies = self.proxies
        
        proxy = random.choice(available_proxies)
        return proxy
    
    def mark_failed(self, proxy: str):
        """标记代理失败"""
        self.failed_proxies.add(proxy)
    
    def fetch_free_proxies(self):
        """从免费网站获取代理"""
        # 示例：从 66ip.cn 获取
        urls = [
            'http://www.66ip.cn/mo.php?sxb=&tqsl=100&port=&export=&ktip=&sxa=&submit=%CC%E1++%C8%A1&textarea='
        ]
        
        for url in urls:
            try:
                response = requests.get(url, timeout=10)
                # 解析并添加代理
                # 具体实现需根据网页结构调整
            except:
                pass

## 使用
proxy_pool = ProxyPool()
proxy_pool.load_from_file('proxies.txt')

for url in urls:
    proxy = proxy_pool.get_random_proxy()
    if proxy:
        try:
            response = requests.get(url, proxies={'http': proxy, 'https': proxy}, timeout=10)
            # 处理响应
        except Exception as e:
            proxy_pool.mark_failed(proxy)
```

### 5.4 Cookie 池管理

```python
import requests
import json
import pickle
from typing import Dict, List

class CookieManager:
    """Cookie 池管理器"""
    
    def __init__(self, cookie_file: str = 'cookies.json'):
        self.cookie_file = cookie_file
        self.cookies: List[Dict] = []
        self.load_cookies()
    
    def load_cookies(self):
        """从文件加载 Cookie"""
        try:
            with open(self.cookie_file, 'r') as f:
                self.cookies = json.load(f)
        except FileNotFoundError:
            self.cookies = []
    
    def save_cookies(self):
        """保存 Cookie 到文件"""
        with open(self.cookie_file, 'w') as f:
            json.dump(self.cookies, f, indent=2)
    
    def add_cookie(self, cookie_dict: Dict):
        """添加 Cookie"""
        if cookie_dict not in self.cookies:
            self.cookies.append(cookie_dict)
            self.save_cookies()
    
    def get_random_cookie(self) -> Optional[Dict]:
        """获取随机 Cookie"""
        if not self.cookies:
            return None
        return random.choice(self.cookies)
    
    def get_cookie_with_session(self, session: requests.Session):
        """为 Session 设置 Cookie"""
        cookie = self.get_random_cookie()
        if cookie:
            session.cookies.update(cookie)
        return session

## Scrapy 中使用
class CookieMiddleware:
    """Scrapy Cookie 中间件"""
    
    def __init__(self, cookie_file):
        self.cookie_manager = CookieManager(cookie_file)
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            cookie_file=crawler.settings.get('COOKIE_FILE', 'cookies.json')
        )
    
    def process_request(self, request, spider):
        cookie = self.cookie_manager.get_random_cookie()
        if cookie:
            request.cookies = cookie
```

### 5.5 随机延迟与重试机制

```python
import random
import time
from functools import wraps
from typing import Callable

def random_delay(min_sec: float = 1.0, max_sec: float = 3.0):
    """随机延迟装饰器"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = random.uniform(min_sec, max_sec)
            time.sleep(delay)
            return func(*args, **kwargs)
        return wrapper
    return decorator

def retry(max_retries: int = 3, exceptions: tuple = (Exception,), backoff_factor: float = 1.0):
    """重试装饰器（支持指数退避）"""
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries - 1:
                        raise
                    
                    wait_time = backoff_factor * (2 ** attempt)
                    print(f"重试 {attempt + 1}/{max_retries}, 等待 {wait_time:.2f}s")
                    time.sleep(wait_time)
            return None
        return wrapper
    return decorator

## 使用示例
@random_delay(1.0, 3.0)
@retry(max_retries=3, backoff_factor=2.0)
def fetch_url(url: str, headers: dict):
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    return response

## 调用
result = fetch_url('https://example.com', headers=get_random_headers())
```

### 5.6 速率限制器

```python
import time
from collections import deque
from threading import Lock

class RateLimiter:
    """令牌桶算法速率限制器"""
    
    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = deque()
        self.lock = Lock()
    
    def acquire(self):
        """获取访问许可"""
        with self.lock:
            now = time.time()
            
            # 清理超出时间窗口的请求
            while self.requests and now - self.requests[0] > self.time_window:
                self.requests.popleft()
            
            if len(self.requests) >= self.max_requests:
                # 等待直到可以发送请求
                wait_time = self.time_window - (now - self.requests[0])
                if wait_time > 0:
                    time.sleep(wait_time)
                    now = time.time()
                    self.requests.popleft()
            
            self.requests.append(now)

## 使用
limiter = RateLimiter(max_requests=5, time_window=1)  # 每秒最多5个请求

for url in urls:
    limiter.acquire()
    response = requests.get(url)
    # 处理响应
```

---

## 六、JS 逆向技术

### 6.1 JS 逆向基本流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 定位加密点  │ →  │ 分析加密逻辑 │ →  │ 还原算法    │
└─────────────┘    └─────────────┘    └─────────────┘
       ↓                                    ↓
┌─────────────┐                    ┌─────────────┐
│ 复制 JS 代码│                    │ Python 实现 │
└─────────────┘                    └─────────────┘
```

### 6.2 有道翻译 JS 逆向实战

**逆向目标：** 破解有道翻译的 sign 参数加密

```python
import hashlib
import time
import random

def generate_sign(word: str, ts: str, salt: str) -> str:
    """
    生成 sign 参数
    算法：MD5("fanyideskweb" + word + salt + "Ygy_4c=r#e#4EX^NUGUcRh")
    """
    key = "fanyideskweb"
    constant = "Ygy_4c=r#e#4EX^NUGUcRh"
    
    sign_str = key + word + salt + constant
    sign = hashlib.md5(sign_str.encode()).hexdigest()
    
    return sign

def translate(text: str) -> dict:
    """有道翻译"""
    # 生成时间戳和 salt
    ts = str(int(time.time() * 1000))
    salt = ts + str(random.randint(0, 9))
    
    # 生成 sign
    sign = generate_sign(text, ts, salt)
    
    # 构造请求参数
    data = {
        'i': text,
        'from': 'AUTO',
        'to': 'AUTO',
        'smartresult': 'dict',
        'client': 'fanyideskweb',
        'salt': salt,
        'sign': sign,
        'lts': ts,
        'bv': 'e2a7891f3514625e4b4a0c051c0300f4',
        'doctype': 'json',
        'version': '2.1',
        'keyfrom': 'fanyi.web',
        'action': 'FY_BY_REALTlME'
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://fanyi.youdao.com/',
        'Origin': 'https://fanyi.youdao.com'
    }
    
    url = 'https://fanyi.youdao.com/translate_o?smartresult=dict&smartresult=rule'
    
    response = requests.post(url, data=data, headers=headers)
    result = response.json()
    
    return result

## 使用
result = translate('Python 爬虫教程')
print(result)
```

### 6.3 WebSocket 协议逆向

**WebSocket 简介：**

- 双向通信协议（服务器可主动推送）
- URL 以 `ws://` 或 `wss://`（加密）开头
- 常用于实时数据推送（聊天、直播、扫码登录）

**示例：智慧树扫码登录**

```python
import asyncio
import websockets
import json

async def handle_websocket_message():
    """处理 WebSocket 消息"""
    uri = "wss://api.example.com/ws"
    
    async with websockets.connect(uri) as websocket:
        # 发送消息
        message = {
            "type": "login",
            "data": {"username": "test", "password": "123456"}
        }
        await websocket.send(json.dumps(message))
        
        # 接收消息
        response = await websocket.recv()
        print(f"收到响应: {response}")

## 运行
asyncio.run(handle_websocket_message())
```

### 6.4 常见加密算法识别

| 加密类型 | 特征 | Python 实现 |
|----------|------|-------------|
| MD5 | 32 位十六进制字符串 | `hashlib.md5().hexdigest()` |
| SHA1 | 40 位十六进制字符串 | `hashlib.sha1().hexdigest()` |
| SHA256 | 64 位十六进制字符串 | `hashlib.sha256().hexdigest()` |
| Base64 | 包含 `+`、`/`、`=`，尾部 `=` 填充 | `base64.b64encode()` |
| AES | 块加密，需要密钥和偏移量 | `Crypto.Cipher.AES` |
| RSA | 公钥加密，私钥解密 | `Crypto.PublicKey.RSA` |

**加密算法示例：**

```python
import hashlib
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

## MD5
md5_hash = hashlib.md5(b'hello').hexdigest()  # 5d41402abc4b2a76b9719d911017c592

## SHA256
sha256_hash = hashlib.sha256(b'hello').hexdigest()  # 2cf24dba5fb0a30e26e83b2ac5b9e29e...

## Base64
encoded = base64.b64encode(b'hello').decode()  # aGVsbG8=
decoded = base64.b64decode('aGVsbG8=').decode()  # hello

## AES 加密
key = b'this_is_a_16byte_key'  # 16/24/32 字节
cipher = AES.new(key, AES.MODE_CBC)
encrypted = cipher.encrypt(pad(b'hello', AES.block_size))
```

---

## 七、分布式爬虫架构

### 7.1 分布式爬虫架构设计

**单机 vs 分布式：**

| 维度 | 单机爬虫 | 分布式爬虫 |
|------|----------|------------|
| 性能 | 受限于单机 CPU/网络 | 多机并行，性能可扩展 |
| 稳定性 | 单点故障 | 容错能力强 |
| 成本 | 低 | 中-高 |
| 复杂度 | 简单 | 复杂 |

**经典架构：**

```
                    ┌─────────────┐
                    │   Master    │ ← 调度中心
                    │ (Scheduler) │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Redis Queue │ ← 任务队列
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ↓               ↓               ↓
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Worker  │   │  Worker  │   │  Worker  │ ← 工作节点
    │    1     │   │    2     │   │    3     │
    └────┬─────┘   └────┬─────┘   └────┬─────┘
         ↓              ↓              ↓
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │Database │   │Database │   │Database │ ← 共享存储
    └──────────┘   └──────────┘   └──────────┘
```

### 7.2 Redis 任务队列实现

```python
import redis
import hashlib
import json
from typing import Optional

class RedisQueue:
    """基于 Redis 的分布式任务队列"""
    
    def __init__(self, name: str, host: str = 'localhost', port: int = 6379, db: int = 0):
        self.r = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self.queue_key = f'queue:{name}'
        self.set_key = f'set:{name}'  # 用于去重
        self.hash_key = f'hash:{name}'  # 存储 URL 的额外信息
    
    def push(self, url: str, meta: dict = None, priority: int = 0) -> bool:
        """
        添加任务（自动去重）
        :param url: 任务 URL
        :param meta: 元数据
        :param priority: 优先级（0=普通, 1=高）
        :return: 是否添加成功
        """
        # 生成指纹
        fingerprint = hashlib.md5(url.encode()).hexdigest()
        
        # 去重检查
        if self.r.sismember(self.set_key, fingerprint):
            return False
        
        # 添加到队列和去重集合
        if priority == 0:
            self.r.lpush(self.queue_key, url)
        else:
            self.r.lpush(self.queue_key, f'PRIORITY:{url}')
        
        self.r.sadd(self.set_key, fingerprint)
        
        # 存储元数据
        if meta:
            self.r.hset(self.hash_key, fingerprint, json.dumps(meta))
        
        return True
    
    def pop(self, timeout: int = 0) -> Optional[str]:
        """
        获取任务
        :param timeout: 阻塞超时时间（秒），0 表示非阻塞
        :return: 任务 URL
        """
        if timeout > 0:
            result = self.r.brpop(self.queue_key, timeout=timeout)
            if result:
                return result[1]
            return None
        else:
            return self.r.rpop(self.queue_key)
    
    def get_meta(self, url: str) -> Optional[dict]:
        """获取 URL 的元数据"""
        fingerprint = hashlib.md5(url.encode()).hexdigest()
        meta_json = self.r.hget(self.hash_key, fingerprint)
        if meta_json:
            return json.loads(meta_json)
        return None
    
    def size(self) -> int:
        """队列大小"""
        return self.r.llen(self.queue_key)
    
    def clear(self):
        """清空队列"""
        self.r.delete(self.queue_key)
        self.r.delete(self.set_key)
        self.r.delete(self.hash_key)
```

### 7.3 分布式爬虫 Worker

```python
import requests
from redis_queue import RedisQueue
import time
import random

class DistributedCrawler:
    """分布式爬虫 Worker"""
    
    def __init__(self, queue_name: str, redis_host: str = 'localhost'):
        self.queue = RedisQueue(queue_name, host=redis_host)
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def fetch(self, url: str) -> Optional[str]:
        """获取页面"""
        try:
            time.sleep(random.uniform(0.5, 2))  # 随机延迟
            
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"请求失败: {url}, 错误: {e}")
            return None
    
    def parse(self, html: str, url: str) -> list:
        """解析页面，提取新 URL"""
        # 这里使用简单的链接提取
        from urllib.parse import urljoin, urlparse
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        urls = []
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(url, href)
            
            # 只添加同域名的 URL
            if urlparse(full_url).netloc == urlparse(url).netloc:
                urls.append(full_url)
        
        return urls
    
    def worker(self):
        """工作节点"""
        print(f"Worker 启动，队列大小: {self.queue.size()}")
        
        while True:
            # 从队列获取任务
            task = self.queue.pop(timeout=5)
            
            if not task:
                print("队列为空，等待任务...")
                continue
            
            # 处理优先级任务
            url = task.replace('PRIORITY:', '') if task.startswith('PRIORITY:') else task
            
            print(f"处理: {url}")
            
            # 获取页面
            html = self.fetch(url)
            if not html:
                continue
            
            # 解析并添加新 URL
            new_urls = self.parse(html, url)
            for new_url in new_urls:
                self.queue.push(new_url)
            
            print(f"完成: {url}, 新增 {len(new_urls)} 个 URL")

if __name__ == '__main__':
    # 初始化队列（添加种子 URL）
    queue = RedisQueue('demo_crawler')
    queue.push('https://example.com')
    
    # 启动 Worker
    crawler = DistributedCrawler('demo_crawler')
    crawler.worker()
```

### 7.4 Scrapy-Redis 分布式爬虫

**安装：**

```bash
pip install scrapy-redis
```

**配置：**

```python
## settings.py

## 启用 Scrapy-Redis
DUPEFILTER_CLASS = "scrapy_redis.dupefilter.RFPDupeFilter"
SCHEDULER = "scrapy_redis.scheduler.Scheduler"
SCHEDULER_PERSIST = True  # 持久化队列

## Redis 配置
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_DB = 0

## 爬虫配置
SCHEDULER_QUEUE_CLASS = 'scrapy_redis.queue.PriorityQueue'  # 可选：FifoQueue, PriorityQueue, LifoQueue

## 不重写 start_urls，直接从 Redis 获取
REDIS_START_URLS_AS_SET = True  # 使用 Set 存储起始 URL
```

**爬虫代码：**

```python
import scrapy
from scrapy_redis.spiders import RedisSpider

class DistributedSpider(RedisSpider):
    """分布式爬虫（继承 RedisSpider）"""
    
    name = 'distributed'
    redis_key = 'demo:start_urls'  # Redis 中起始 URL 的 key
    
    def parse(self, response):
        """解析响应"""
        # 提取数据
        title = response.css('h1::text').get()
        print(f'标题: {title}')
        
        # 提取新链接并添加到 Redis 队列
        for link in response.css('a::attr(href)').getall():
            yield response.follow(link, callback=self.parse)
```

**启动爬虫：**

```bash
## 方式1：在 Master 节点添加起始 URL
redis-cli LPUSH demo:start_urls "https://example.com"

## 方式2：启动多个 Worker
scrapy crawl distributed  # Worker 1
scrapy crawl distributed  # Worker 2
scrapy crawl distributed  # Worker 3
```

---

## 八、性能优化与工程实践

### 8.1 性能优化策略

| 优化方向 | 方法 | 提升效果 |
|----------|------|----------|
| 并发请求 | 多线程/多进程/异步IO | 5-10x |
| 连接复用 | Session 连接池 | 1.5-2x |
| 批量操作 | 批量插入/批量请求 | 2-5x |
| 数据库优化 | 索引、连接池、批量写入 | 3-5x |
| 缓存 | Redis/内存缓存 | 10-100x |
| 去重优化 | 布隆过滤器/Redis Set | 内存减少90% |

### 8.2 异步爬虫实现

```python
import asyncio
import aiohttp
from typing import List, Optional

class AsyncCrawler:
    """异步爬虫"""
    
    def __init__(self, max_concurrent: int = 10):
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def fetch(self, session: aiohttp.ClientSession, url: str) -> Optional[str]:
        """异步获取单个 URL"""
        async with self.semaphore:  # 控制并发数
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                    response.raise_for_status()
                    return await response.text()
            except Exception as e:
                print(f"请求失败: {url}, 错误: {e}")
                return None
    
    async def fetch_with_retry(self, session: aiohttp.ClientSession, url: str, max_retries: int = 3) -> Optional[str]:
        """带重试的异步请求"""
        for attempt in range(max_retries):
            result = await self.fetch(session, url)
            if result:
                return result
            
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # 指数退避
        
        return None
    
    async def crawl_urls(self, urls: List[str]) -> List[str]:
        """并发爬取多个 URL"""
        async with aiohttp.ClientSession() as session:
            tasks = [self.fetch_with_retry(session, url) for url in urls]
            results = await asyncio.gather(*tasks)
            return [r for r in results if r]
    
    def run(self, urls: List[str]) -> List[str]:
        """运行异步爬虫"""
        return asyncio.run(self.crawl_urls(urls))

## 使用
if __name__ == '__main__':
    urls = [f'https://example.com/page/{i}' for i in range(1, 101)]
    
    crawler = AsyncCrawler(max_concurrent=20)  # 并发数20
    results = crawler.run(urls)
    
    print(f"成功爬取 {len(results)} 个页面")
```

### 8.3 数据库性能优化

**连接池配置：**

```python
import pymysql
from pymysql import Connection
from dbutils.pooled_db import PooledDB

class MySQLConnectionPool:
    """MySQL 连接池"""
    
    def __init__(self):
        self.pool = PooledDB(
            creator=pymysql,
            maxconnections=20,  # 最大连接数
            mincached=5,        # 最小空闲连接
            maxcached=10,       # 最大空闲连接
            maxshared=0,        # 最大共享连接
            blocking=True,      # 连接池满时是否阻塞
            host='localhost',
            port=3306,
            user='root',
            password='password',
            database='crawler',
            charset='utf8mb4'
        )
    
    def get_connection(self) -> Connection:
        """获取连接"""
        return self.pool.connection()

## 使用
pool = MySQLConnectionPool()

def batch_insert(items: list):
    """批量插入"""
    conn = pool.get_connection()
    cursor = conn.cursor()
    
    try:
        # 批量插入
        sql = "INSERT INTO articles (title, url, content) VALUES (%s, %s, %s)"
        values = [(item['title'], item['url'], item['content']) for item in items]
        cursor.executemany(sql, values)
        
        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"批量插入失败: {e}")
    finally:
        cursor.close()
        conn.close()
```

**索引优化：**

```sql
-- 创建索引
CREATE INDEX idx_url ON articles(url);
CREATE INDEX idx_title ON articles(title);
CREATE INDEX idx_created_at ON articles(created_at);

-- 复合索引
CREATE INDEX idx_type_created ON articles(type, created_at);

-- 查看索引
SHOW INDEX FROM articles;

-- 分析查询
EXPLAIN SELECT * FROM articles WHERE url = 'https://example.com';
```

### 8.4 布隆过滤器去重

**布隆过滤器原理：**

- 多个哈希函数
- 位图存储
- 空间效率极高（1GB 可存储 10亿 URL）
- 有误判率（可通过参数调整）

```python
from pybloom_live import ScalableBloomFilter

class BloomFilterDedup:
    """布隆过滤器去重"""
    
    def __init__(self, initial_capacity=1000000, error_rate=0.001):
        self.bloom = ScalableBloomFilter(
            initial_capacity=initial_capacity,
            error_rate=error_rate
        )
    
    def is_duplicate(self, url: str) -> bool:
        """检查是否重复"""
        return url in self.bloom
    
    def add(self, url: str):
        """添加 URL"""
        self.bloom.add(url)

## 使用
dedup = BloomFilterDedup()

url = "https://example.com/article/1"
if not dedup.is_duplicate(url):
    dedup.add(url)
    print("新 URL")
else:
    print("重复 URL")
```

---

## 九、验证码处理

### 9.1 验证码类型与应对

| 类型 | 难度 | 应对方法 |
|------|------|----------|
| 文本验证码 | ⭐ | OCR 识别（Tesseract） |
| 滑块验证码 | ⭐⭐⭐ | 图像识别 + 模拟拖动 |
| 点选验证码 | ⭐⭐⭐ | 目标检测 + 点击 |
| 旋转验证码 | ⭐⭐⭐⭐ | 角度计算 |
| 行为验证码 | ⭐⭐⭐⭐⭐ | 打码平台/人工 |

### 9.2 文本验证码 OCR 识别

```python
import pytesseract
from PIL import Image
import cv2

def preprocess_image(image_path: str) -> Image.Image:
    """图像预处理"""
    # 读取图像
    image = cv2.imread(image_path)
    
    # 灰度化
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 二值化
    _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    # 去噪
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    denoised = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    
    # 转换为 PIL Image
    return Image.fromarray(denoised)

def recognize_captcha(image_path: str) -> str:
    """识别验证码"""
    # 预处理
    processed_image = preprocess_image(image_path)
    
    # OCR 识别
    text = pytesseract.image_to_string(
        processed_image,
        config='--psm 7 --oem 3 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    )
    
    return text.strip()

## 使用
captcha_text = recognize_captcha('captcha.png')
print(f"验证码: {captcha_text}")
```

### 9.3 滑块验证码破解

```python
import cv2
import numpy as np
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver import ActionChains

def detect_gap(background_path: str, slider_path: str) -> int:
    """检测滑块缺口位置"""
    # 读取图像
    background = cv2.imread(background_path)
    slider = cv2.imread(slider_path)
    
    # 灰度化
    bg_gray = cv2.cvtColor(background, cv2.COLOR_BGR2GRAY)
    slider_gray = cv2.cvtColor(slider, cv2.COLOR_BGR2GRAY)
    
    # 边缘检测
    bg_edges = cv2.Canny(bg_gray, 100, 200)
    slider_edges = cv2.Canny(slider_gray, 100, 200)
    
    # 模板匹配
    result = cv2.matchTemplate(bg_edges, slider_edges, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    
    # 返回缺口位置
    return max_loc[0]

def crack_slider_captcha(driver, gap_x: int):
    """破解滑块验证码"""
    # 定位滑块
    slider = driver.find_element(By.CLASS_NAME, 'slider')
    
    # 计算移动距离（考虑缩放）
    move_distance = gap_x - 10  # 减去偏移量
    
    # 模拟人类滑动轨迹
    ActionChains(driver).click_and_hold(slider).perform()
    
    # 分段移动（模拟人类速度变化）
    steps = 10
    step_distance = move_distance / steps
    
    for i in range(steps):
        # 随机抖动
        offset = random.uniform(-2, 2)
        ActionChains(driver).move_by_offset(step_distance + offset, 0).perform()
        time.sleep(random.uniform(0.01, 0.05))
    
    ActionChains(driver).release().perform()
```

### 9.4 使用打码平台

```python
import base64
import requests

class CaptchaSolver:
    """打码平台 API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.captcha-platform.com/v1'
    
    def solve_image_captcha(self, image_path: str) -> str:
        """图像验证码识别"""
        # 读取图像并编码
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()
        
        # 调用 API
        response = requests.post(
            f'{self.base_url}/solve/image',
            json={
                'api_key': self.api_key,
                'image': image_data,
                'type': 'alphanumeric'
            }
        )
        
        result = response.json()
        if result['code'] == 0:
            return result['data']['text']
        else:
            raise Exception(f"识别失败: {result['message']}")
    
    def solve_slider_captcha(self, image_path: str) -> dict:
        """滑块验证码识别"""
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()
        
        response = requests.post(
            f'{self.base_url}/solve/slider',
            json={
                'api_key': self.api_key,
                'image': image_data
            }
        )
        
        result = response.json()
        if result['code'] == 0:
            return {
                'x': result['data']['x'],
                'y': result['data']['y']
            }
        else:
            raise Exception(f"识别失败: {result['message']}")

## 使用
solver = CaptchaSolver(api_key='your_api_key')
text = solver.solve_image_captcha('captcha.png')
```

---

## 十、Playwright 现代化爬虫

### 10.1 Playwright vs Selenium

| 特性 | Selenium | Playwright |
|------|----------|------------|
| 速度 | 较慢 | 快（3-5倍） |
| 稳定性 | 中 | 高 |
| API 设计 | 传统 | 现代 |
| 多标签页 | 支持 | 原生支持 |
| 网络拦截 | 困难 | 简单 |
| 自动等待 | 需手动 | 默认内置 |
| 无头模式 | 支持 | 原生支持 |
| 浏览器支持 | Chrome/Firefox/Safari/Edge | Chromium/Firefox/WebKit |

### 10.2 Playwright 基础使用

**安装：**

```bash
pip install playwright
playwright install  # 下载浏览器
```

**快速开始：**

```python
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)  # headless=True 无头模式
        page = browser.new_page()
        
        # 访问页面
        page.goto('https://www.example.com')
        
        # 获取标题
        title = page.title()
        print(f"页面标题: {title}")
        
        # 截图
        page.screenshot(path='screenshot.png')
        
        # 关闭浏览器
        browser.close()

if __name__ == '__main__':
    run()
```

### 10.3 Playwright 进阶用法

**网络拦截：**

```python
from playwright.sync_api import sync_playwright

def intercept_network():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        def handle_route(route):
            # 阻止图片加载
            if route.request.resource_type == 'image':
                route.abort()
            else:
                route.continue_()
        
        # 拦截请求
        page.route('**/*', handle_route)
        
        # 监听响应
        page.on('response', lambda response: print(f"状态码: {response.status}"))
        
        page.goto('https://example.com')
        browser.close()
```

**自动生成脚本：**

```bash
## 启动录制工具
playwright codegen https://example.com

## 参数：
## --device=iPhone  # 模拟设备
## --viewport-size=800,600  # 视口大小
## --user-agent="Mozilla/5.0..."  # 自定义 UA
## --save-storage=auth.json  # 保存登录状态
```

**多标签页处理：**

```python
from playwright.sync_api import sync_playwright

def handle_multiple_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        
        # 创建多个页面
        page1 = context.new_page()
        page2 = context.new_page()
        
        page1.goto('https://example.com/page1')
        page2.goto('https://example.com/page2')
        
        # 等待所有页面加载完成
        page1.wait_for_load_state('networkidle')
        page2.wait_for_load_state('networkidle')
        
        browser.close()
```

**Cookie 管理：**

```python
from playwright.sync_api import sync_playwright

def manage_cookies():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        
        # 访问网站（触发 Cookie 设置）
        page = context.new_page()
        page.goto('https://example.com/login')
        # 登录操作...
        
        # 保存 Cookie
        cookies = context.cookies()
        print(f"Cookie: {cookies}")
        
        # 导出 Cookie
        context.storage_state(path='cookies.json')
        
        # 使用保存的 Cookie
        new_context = browser.new_context(storage_state='cookies.json')
        new_page = new_context.new_page()
        new_page.goto('https://example.com/profile')  # 已登录状态
        
        browser.close()
```

---

## 十一、最佳实践与注意事项

### 11.1 爬虫开发最佳实践

**代码规范：**

```python
## ✅ 好的做法
class Crawler:
    """爬虫类 - 单一职责"""
    
    def __init__(self):
        self.session = requests.Session()
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        """私有方法 - 设置日志"""
        pass
    
    def crawl(self, url: str) -> Optional[dict]:
        """公开方法 - 明确的返回类型"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.logger.error(f"请求失败: {url}, 错误: {e}")
            return None

## ❌ 不好的做法
def crawl(url):  # 没有类型注解
    try:
        r = requests.get(url)  # 没有超时
        return r.json()  # 没有异常处理
    except:
        pass  # 吞掉异常
```

**配置管理：**

```python
import yaml
from dataclasses import dataclass
from typing import List

@dataclass
class CrawlerConfig:
    """爬虫配置"""
    base_url: str
    max_pages: int
    delay_range: tuple
    user_agents: List[str]
    proxies: List[str]

    @classmethod
    def from_yaml(cls, config_file: str):
        """从 YAML 加载配置"""
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = yaml.safe_load(f)
        
        return cls(**config_data)

## config.yaml
## base_url: "https://example.com"
## max_pages: 100
## delay_range: [1, 3]
## user_agents:
## - "Mozilla/5.0..."
## proxies:
## - "http://proxy1:8080"

## 使用
config = CrawlerConfig.from_yaml('config.yaml')
```

### 11.2 遵守 robots.txt

```python
import urllib.robotparser
from urllib.parse import urlparse

def can_fetch(url: str, user_agent: str = '*') -> bool:
    """检查是否允许爬取"""
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    
    rp = urllib.robotparser.RobotFileParser()
    rp.set_url(robots_url)
    
    try:
        rp.read()
        return rp.can_fetch(user_agent, url)
    except:
        # 无法读取 robots.txt 时，默认允许
        return True

## 使用
url = 'https://example.com/private-page'
if can_fetch(url):
    print("允许爬取")
else:
    print("禁止爬取")
```

### 11.3 监控与告警

```python
import smtplib
from email.mime.text import MIMEText
from typing import List

class CrawlerMonitor:
    """爬虫监控"""
    
    def __init__(self, email_config: dict):
        self.smtp_server = email_config['smtp_server']
        self.smtp_port = email_config['smtp_port']
        self.sender = email_config['sender']
        self.password = email_config['password']
        self.receivers = email_config['receivers']
    
    def send_alert(self, subject: str, content: str):
        """发送告警邮件"""
        message = MIMEText(content, 'plain', 'utf-8')
        message['Subject'] = subject
        message['From'] = self.sender
        message['To'] = ', '.join(self.receivers)
        
        with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
            server.starttls()
            server.login(self.sender, self.password)
            server.sendmail(self.sender, self.receivers, message.as_string())
    
    def check_crawler_health(self, crawler):
        """检查爬虫健康状态"""
        metrics = {
            'total_requests': crawler.total_requests,
            'success_rate': crawler.success_rate,
            'error_count': crawler.error_count,
            'avg_response_time': crawler.avg_response_time
        }
        
        # 检查告警条件
        if metrics['success_rate'] < 0.8:  # 成功率低于 80%
            self.send_alert(
                f"爬虫异常: 成功率过低",
                f"当前成功率: {metrics['success_rate']:.2%}\n错误数: {metrics['error_count']}"
            )
        
        if metrics['avg_response_time'] > 5:  # 平均响应时间超过 5 秒
            self.send_alert(
                f"爬虫异常: 响应时间过长",
                f"平均响应时间: {metrics['avg_response_time']:.2f}s"
            )
```

### 11.4 法律与道德规范

**遵守原则：**

1. **遵守 robots.txt** - 尊重网站爬取规则
2. **控制访问频率** - 避免对服务器造成压力
3. **尊重知识产权** - 合理使用，注明来源
4. **保护隐私** - 不爬取个人敏感信息
5. **不用于商业** - 仅限学习和研究

**示例代码 - 礼貌爬虫：**

```python
import random
import time
import urllib.robotparser

class PoliteCrawler:
    """礼貌爬虫 - 遵守道德规范"""
    
    def __init__(self):
        self.session = requests.Session()
        self.last_request_time = {}
        self.min_delay = 1  # 最小延迟 1 秒
        self.max_delay = 3  # 最大延迟 3 秒
    
    def respect_robots_txt(self, url: str) -> bool:
        """遵守 robots.txt"""
        parsed = urllib.parse.urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(robots_url)
        
        try:
            rp.read()
            return rp.can_fetch('*', url)
        except:
            return True
    
    def polite_delay(self, domain: str):
        """礼貌延迟"""
        now = time.time()
        last_time = self.last_request_time.get(domain, 0)
        
        elapsed = now - last_time
        if elapsed < self.min_delay:
            time.sleep(self.min_delay - elapsed)
        
        # 随机延迟
        delay = random.uniform(self.min_delay, self.max_delay)
        time.sleep(delay)
        
        self.last_request_time[domain] = time.time()
    
    def fetch(self, url: str):
        """礼貌请求"""
        parsed = urllib.parse.urlparse(url)
        
        # 检查 robots.txt
        if not self.respect_robots_txt(url):
            print(f"禁止访问（robots.txt）: {url}")
            return None
        
        # 礼貌延迟
        self.polite_delay(parsed.netloc)
        
        # 发送请求
        response = self.session.get(url, headers=get_random_headers(), timeout=10)
        return response
```

---

## 附录：工具与资源

### 常用工具

```bash
## 基础库
pip install requests beautifulsoup4 lxml

## 动态页面
pip install selenium pyquery playwright

## 异步
pip install aiohttp asyncio

## 框架
pip install scrapy scrapy-redis

## 数据处理
pip install pandas openpyxl sqlalchemy pymongo

## 图像处理
pip install pillow opencv-python pytesseract

## 其他
pip install fake-useragent loguru redis

## 浏览器驱动自动管理
python webdriver_manager.py
```

### 学习资源

| 类别 | 链接 |
|------|------|
| Requests 文档 | https://docs.python-requests.org/ |
| Selenium 文档 | https://www.selenium.dev/documentation/ |
| Scrapy 文档 | https://docs.scrapy.org/ |
| Playwright 文档 | https://playwright.dev/python/ |
| BeautifulSoup 文档 | https://www.crummy.com/software/BeautifulSoup/bs4/doc/ |

### 开源项目

- [Scrapy](https://github.com/scrapy/scrapy) - Python 爬虫框架
- [Playwright](https://github.com/microsoft/playwright-python) - 现代化浏览器自动化
- [Firecrawl](https://github.com/firecrawl/firecrawl) - AI 友好的爬虫工具
- [Jina Reader](https://github.com/jina-ai/reader) - URL 转 Markdown
- [unclecode/crawl4ai: 🚀🤖 Crawl4AI: Open-source LLM Friendly Web Crawler & Scraper. Don't be shy, join here: https://discord.gg/jP8KfhDhyN](https://github.com/unclecode/crawl4ai)
- [kangvcar/InfoSpider: INFO-SPIDER 是一个集众多数据源于一身的爬虫工具箱🧰，旨在安全快捷的帮助用户拿回自己的数据，工具代码开源，流程透明。支持数据源包括GitHub、QQ邮箱、网易邮箱、阿里邮箱、新浪邮箱、Hotmail邮箱、Outlook邮箱、京东、淘宝、支付宝、中国移动、中国联通、中国电信、知乎、哔哩哔哩、网易云音乐、QQ好友、QQ群、生成朋友圈相册、浏览器浏览历史、12306、博客园、CSDN博客、开源中国博客、简书。](https://github.com/kangvcar/InfoSpider)
