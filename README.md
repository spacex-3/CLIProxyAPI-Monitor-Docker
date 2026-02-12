# CLIProxyAPI 数据看板

基于 Next.js App Router + Drizzle + Postgres 的数据看板，用于拉取上游 CLIProxyAPI 使用数据，**持久化到数据库**，并进行数据可视化。

## 功能
- `/api/sync` 拉取上游用量数据并去重入库（支持 GET/POST，有鉴权）
- 前端表单可配置模型单价
- 前端图表：日粒度折线图、小时粒度柱状图、模型费用列表，支持时间范围、模型、Key 筛选
- 访问密码保护

## 环境变量
| 环境变量 | 说明 | 备注 |
|---|---|---|
| `CLIPROXY_SECRET_KEY` | 登录 CLIProxyAPI 后台管理界面的密钥 | 必填 |
| `CLIPROXY_API_BASE_URL` | 自部署的 CLIProxyAPI 根地址 | 如 `https://your-domain.com/` |
| `DATABASE_URL` | 数据库连接串（仅支持 Postgres） | Docker Compose 下自动拼接，可不手填 |
| `PASSWORD` | 访问密码，同时用于调用 `/api/sync` | 可选；默认使用 `CLIPROXY_SECRET_KEY` |
| `CRON_SECRET` | 调用定时同步接口的密钥 | 建议长度 >= 16 |
| `POSTGRES_DB` | Docker Compose 数据库名 | 默认 `cliproxy` |
| `POSTGRES_USER` | Docker Compose 数据库用户名 | 默认 `postgres` |
| `POSTGRES_PASSWORD` | Docker Compose 数据库密码 | 默认 `postgres` |

## Docker Compose 部署
1. 复制环境变量：
   - `cp .env.example .env`
2. 修改 `.env` 里的 `CLIPROXY_SECRET_KEY` 和 `CLIPROXY_API_BASE_URL`。
3. 启动：
   - `docker compose up -d --build`
4. 打开：
   - `http://localhost:3000`

说明：容器启动时会自动执行数据库迁移（`node scripts/migrate.mjs`），无需手动 `db:push`。

## GitHub Actions 构建并推送 GHCR
仓库已内置工作流：`/.github/workflows/docker-ghcr.yml`

触发规则：
- Push 到 `main` 分支：构建并推送镜像
- Push `v*` Tag：构建并推送镜像
- Pull Request：仅构建，不推送

镜像地址示例：
- `ghcr.io/<你的 GitHub 用户名>/cliproxyapi-monitor:latest`

如需拉取运行：
- `docker pull ghcr.io/<你的 GitHub 用户名>/cliproxyapi-monitor:latest`

## 本地开发
1. 安装依赖：`pnpm install`
2. 复制环境变量：`cp .env.example .env`
3. 创建表结构：`pnpm run db:push`
4. 同步数据：GET/POST `/api/sync`
5. 启动开发：`pnpm dev`

## 预览

|   |   |
| --- | --- |
| <img width="2186" height="1114" alt="image" src="https://github.com/user-attachments/assets/939424fb-1caa-4e80-a9a8-921d1770eb9f" /> | <img width="2112" height="1117" alt="image" src="https://github.com/user-attachments/assets/e5338679-7808-4f37-9753-41b559a3cee6" /> |
<img width="2133" height="1098" alt="image" src="https://github.com/user-attachments/assets/99858753-f80f-4cd6-9331-087af35b21b3" />
