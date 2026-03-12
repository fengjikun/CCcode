# Frontend Mock Mode

前端开发环境已经接入 `vite-plugin-mock`。

## 启动方式

```bash
npm install
npm run dev
```

默认会启用本地 mock，直接拦截以下接口：

- `/api/auth/*`
- `/api/ontology/*`
- `/api/mock-store/*`

默认 mock 登录账号：

- 用户名：`admin`
- 密码：`admin0312changhong`

## 切换到真实后端

如果你要继续走本地或远端后端接口，可以关闭 mock：

```bash
npm run dev:api
```

或者手动指定：

```bash
VITE_USE_MOCK=false VITE_API_PROXY_TARGET=http://localhost:9000 npm run dev
```

## Mock 文件位置

`vite-plugin-mock` 路由文件位于：

- `mock/auth.ts`
- `mock/ontology.ts`
- `mock/mockStore.ts`

共享状态和种子数据位于：

- `mock/shared.ts`
