# CLIProxyAPI 数据看板（Docker 版）

基于 Next.js App Router + Drizzle + Postgres 的数据看板，用于自动拉取上游 CLIProxyAPI 使用数据，**持久化到数据库**，并进行数据可视化。

> 本仓库是 `sxjeru/CLIProxyAPI-Monitor` 的 Docker 化与持久化增强版本。

## 功能
- `/api/sync` 拉取上游用量数据并去重入库（支持 GET/POST，有鉴权）
- 前端表单可配置模型单价，支持从 models.dev 自动拉取价格
- 前端图表：日粒度折线图、小时粒度柱状图、模型费用列表等，支持时间范围、模型、Key、凭证筛选
- 访问密码保护
- Docker Compose 一键部署 + Postgres 数据持久化

## 环境变量
| 环境变量 | 说明 | 备注 |
|---|---|---|
| `CLIPROXY_SECRET_KEY` | 登录 CLIProxyAPI 后台管理界面的密钥 | 必填 |
| `CLIPROXY_API_BASE_URL` | 自部署的 CLIProxyAPI 根地址 | 如 `https://your-domain.com/` |
| `APP_IMAGE` | Docker Compose 拉取的应用镜像 | 默认 `ghcr.io/spacex-3/cliproxyapi-monitor-docker:latest` |
| `DATABASE_URL` | 数据库连接串（仅支持 Postgres） | Compose 下自动拼接，可不手填 |
| `PASSWORD` | 访问密码，同时用于调用 `/api/sync` | 可选；默认使用 `CLIPROXY_SECRET_KEY` |
| `CRON_SECRET` | 调用定时同步接口的密钥 | 建议长度 >= 16 |
| `TIMEZONE` | 图表按天/小时聚合使用的时区 | 例如 `Asia/Shanghai` |
| `POSTGRES_DB` | Docker Compose 数据库名 | 默认 `cliproxy` |
| `POSTGRES_USER` | Docker Compose 数据库用户名 | 默认 `postgres` |
| `POSTGRES_PASSWORD` | Docker Compose 数据库密码 | 默认 `postgres` |
| `POSTGRES_HOST` | Docker Compose 数据库服务名（主机名） | 默认 `db` |
| `PGDATA_DIR` | Postgres 数据目录（宿主机路径） | 默认 `./data/postgres` |

## Docker 部署（推荐：直接拉 GHCR 镜像）
1. 复制环境变量：
   - `cp .env.example .env`
2. 修改 `.env`：
   - 必填：`CLIPROXY_SECRET_KEY`、`CLIPROXY_API_BASE_URL`
   - 如你 fork 了仓库，可改 `APP_IMAGE` 为你自己的镜像地址
3. 启动：
   - `docker compose pull`
   - `docker compose up -d`
4. 打开：
   - `http://localhost:3000`

说明：
- 容器启动时会自动执行数据库迁移（`node scripts/migrate.mjs`），无需手动 `db:push`。
- 默认会在当前目录创建 `./data/postgres` 用于数据库持久化。
- 若你在 compose 里把数据库服务名从 `db` 改成其他名字（如 `cpa-monitor-db`），请同步设置 `POSTGRES_HOST`。

## Docker 本地构建运行（可选）
如果你要本地改代码后直接构建运行：
- `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build`

## GitHub Actions（GHCR）
仓库已内置工作流：`/.github/workflows/docker-ghcr.yml`

触发规则：
- Push 到 `main`：构建并推送镜像
- Push `v*` Tag：构建并推送镜像
- Pull Request：仅构建，不推送

镜像示例：
- `ghcr.io/spacex-3/cliproxyapi-monitor-docker:latest`

## 上游自动同步（Fork 推荐）
仓库已内置：`/.github/workflows/sync-upstream.yml`
- 每周自动从上游 `sxjeru/CLIProxyAPI-Monitor` 同步
- 以 PR 形式提交到你的 `main`，你审核后合并

## 本地开发
1. 安装依赖：`pnpm install`
2. 复制环境变量：`cp .env.example .env`
3. 创建表结构：`pnpm run db:push`
4. 同步数据：GET/POST `/api/sync`（可选）
5. 启动开发：`pnpm dev`

## 预览

|   |   |
| --- | --- |
| <img width="2186" height="1114" alt="image" src="https://github.com/user-attachments/assets/939424fb-1caa-4e80-a9a8-921d1770eb9f" /> | <img width="2112" height="1117" alt="image" src="https://github.com/user-attachments/assets/e5338679-7808-4f37-9753-41b559a3cee6" /> |
<img width="2133" height="1098" alt="image" src="https://github.com/user-attachments/assets/99858753-f80f-4cd6-9331-087af35b21b3" />
<img width="2166" height="973" alt="image" src="https://github.com/user-attachments/assets/6097da38-9dcc-46c0-a515-5904b81203d6" />


## CLIProxyAPI 新版本兼容说明（2026-02）

CLIProxyAPI 新版本将管理接口集中到 `\/v0\/management\/*`，例如：
- `\/v0\/management\/usage`
- `\/v0\/management\/auth-files`
- `\/v0\/management\/usage-statistics-enabled`

本项目会自动将 `CLIPROXY_API_BASE_URL` 规范化到管理前缀，
因此你仍可填写根地址（如 `http://192.168.1.25:8317`），系统会自动适配。

> 若直接访问 `\/api\/user` 返回 `amp upstream proxy not available`，通常不影响本看板同步；
> 看板核心依赖的是 `\/v0\/management\/*` 与 `\/v1\/models`。
