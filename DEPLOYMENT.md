# 部署指南

## GitHub Pages 配置

### 1. 启用 GitHub Pages

1. 进入仓库的 **Settings** > **Pages**
2. 在 **Build and deployment** > **Source** 选择 **GitHub Actions**
3. 确保 GitHub Actions 已启用

### 2. 推送代码触发部署

```bash
git add .
git commit -m "Initial Docusaurus setup"
git push origin main
```

推送到 `main` 分支后，GitHub Actions 会自动：
- 安装依赖
- 构建网站
- 部署到 GitHub Pages

### 3. 访问网站

部署完成后，访问：https://hanphonejan.github.io

## 本地开发

### 启动开发服务器

```bash
pnpm start
```

浏览器会自动打开 http://localhost:3000

### 本地构建测试

```bash
# 构建
pnpm build

# 预览构建结果
pnpm serve
```

## 常见问题

### 1. 部署失败

检查 GitHub Actions 日志：
- 进入仓库的 **Actions** 标签
- 查看失败的工作流
- 检查错误信息

### 2. 页面 404

确保：
- `docusaurus.config.ts` 中的 `url` 和 `baseUrl` 配置正确
- GitHub Pages 设置中选择了 **GitHub Actions** 作为源

### 3. 样式或资源加载失败

检查：
- 静态资源路径是否正确（应使用 `/img/xxx` 而不是 `./img/xxx`）
- `baseUrl` 配置是否正确

## 自定义域名（可选）

如果要使用自定义域名：

1. 在项目根目录创建 `static/CNAME` 文件
2. 文件内容为你的域名，如：`example.com`
3. 在域名提供商处配置 DNS 记录指向 GitHub Pages

## 更新内容

1. 编辑 `docs/` 目录下的 Markdown 文件
2. 提交并推送到 `main` 分支
3. GitHub Actions 会自动重新部署
