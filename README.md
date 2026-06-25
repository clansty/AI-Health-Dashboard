# Vue 3 + Typescript + Vite

This template should help get you started developing with Vue 3 and Typescript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar)

## OpenCode Go Quota

Worker 侧独立查询 OpenCode Go，不走 subapi：

```bash
OPENCODE_GO_WORKSPACES_JSON='[
  {"id":"wrk_abc","label":"主工作区","cookie":"auth-cookie-for-abc"},
  {"id":"wrk_def","label":"备用工作区","cookie":"auth=auth-cookie-for-def","windows":["rolling","weekly"]}
]'

OPENCODE_GO_WORKSPACE_ID="wrk_abc"
OPENCODE_GO_WORKSPACE_IDS="wrk_abc:主工作区,wrk_def:备用工作区"
OPENCODE_GO_AUTH_COOKIE="auth-cookie-value"
OPENCODE_GO_WINDOWS="rolling,weekly,monthly"
```

优先使用 `OPENCODE_GO_WORKSPACES_JSON`，可为每个 Workspace 指定独立 `cookie` 和 `windows`；对象格式也支持 `{"cookie":"全局 cookie","windows":[...],"workspaces":[...]}`。不写 per-workspace `cookie` 时回退 `OPENCODE_GO_AUTH_COOKIE`。旧的 `OPENCODE_GO_WORKSPACE_IDS` 仍支持多个，用逗号分隔；每项可写成 `workspaceId:显示名`，显示名可省略。只配一个 Workspace 时可用 `OPENCODE_GO_WORKSPACE_ID`。

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's `.vue` type support plugin by running `Volar: Switch TS Plugin on/off` from VSCode command palette.
