## 当前权限体系总览

本平台的权限体系分为 4 层：

1. **系统角色层**
   - `sys_user_permission.role_type` 决定用户基础角色。
   - 默认角色矩阵来自 `ROLE_PERMISSION_FLAGS`，可被角色模块权限表覆盖。

2. **功能权限层**
   - 后端以 `permission_flags` 作为主判断依据。
   - 每个权限键的值为 `allow`、`partial`、`deny`。
   - 绝大多数业务 API、前端路由可见性、MCP 工具访问都依赖这一层。

3. **协作组层**
   - 协作组是类似聊天群的人员容器，普通用户或负责人可创建和管理自己拥有的协作组。
   - 协作组用于共享空间邀请、成员协作和资源编辑，不参与 `permission_flags` 合并。

4. **资源授权层**
   - 共享空间通过 `project_space_principals` 绑定 `user`、`group`、`collaboration_group` 主体。
   - 资源级 ACL 继续由 `sys_resource_acl` 承载，用于脱离共享空间的长期资源授权。

权限管理后台层由超级管理员使用：

   - 超级管理员可管理角色、用户、权限组、字段权限、角色模块矩阵。
   - 这些能力主要由 `/v1/permission/*` 提供。
   - `/v1/permission/user-groups` 名称保持兼容，但当前语义为"权限组"，不会返回协作组。

## 主权限模型

### 权限数据来源

当前登录用户的有效主权限来自：

- `sys_user_permission.role_type`
- `ROLE_PERMISSION_FLAGS`
- `sys_role_module_permission`（覆盖表）
- `sys_group_module_permission`（权限组模块权限，已合并到个人 `permission_flags`）

后端 `/v1/auth/me` 返回：

- `roles`
- `permissions`
- `permission_flags`

其中真正用于接口鉴权和前端显隐控制的是 `permission_flags`。

### 权限级别语义

| 级别 | 含义 |
|------|------|
| `allow` | 完整允许 |
| `partial` | 部分允许，是否可通过取决于接口是否允许 `partial` |
| `deny` | 拒绝 |

### `partial` 的生效规则

本平台不是所有接口都接受 `partial`：

- 接受 `partial`
  - `dashboard_view`
  - `query_view`
  - `query_export`
  - 部分 MCP/JWT 校验链路把 `partial` 视为可通过

- 仅接受 `allow`
  - `alert_view`
  - `alert_config`
  - `dashboard_custom_view`
  - `report_view`
  - `segment_view`
  - `project_space_view`
  - `ai_chat`
  - 绝大多数管理类权限

> **注意**：上述"仅接受 `allow`"的权限中，前端 `stores/user.ts` 实际上对 `dashboard_custom_view`、`report_view`、`segment_view`、`project_space_view` 都接受 `partial`，但后端业务 API 使用的 `require_permission` 默认 `allow_partial=False`，这会导致拥有 `partial` 权限的用户前端能看到页面但调用后端 API 时收到 403。详见第 13 节。

## 角色体系

当前系统固定 5 个角色：

| 角色 ID | role_type | 用途 |
|---------|-----------|------|
| `role_super_admin` | `super_admin` | 平台级管理员，拥有全部主权限 |
| `role_project_admin` | `project_admin` | 项目管理员，拥有大部分业务权限，但不能管理权限体系本身 |
| `role_operator` | `operator` | 运营角色，可看大部分业务数据，部分导出/删除能力受限 |
| `role_developer` | `developer` | 研发角色，可访问技术/分析相关能力，但不能访问自定义看板、报表、分群、共享空间 |
| `role_no_permission` | `no_permission` | 无权限用户，登录后仅能看到联系管理员提示页，需被授权后才能使用功能 |

全局角色与项目级别的区分：

- `role_type` 是**全局能力身份**：决定用户能使用哪些平台功能，以及是否具备项目管理员的**能力**。
- `project_ids[].level` 是**项目级权限范围**：决定用户在某个项目中的实际权限，取值 `read` / `write` / `admin`。
- `project_admin` 是能力角色：持有该 `role_type` 的用户可以管理其 `project_ids` 中所有 `level=admin` 的项目。
- 项目成员管理接口只修改 `project_ids[].level`；当 `level=admin` 且用户原本不是 `super_admin`/`project_admin` 时，自动将其 `role_type` 提升为 `project_admin`。

---

范文来源：本仓库 `docs/项目/数据分析平台/权限设计与权限矩阵.md` §2–§4 节选（AI 生成，作者认可其文体）。

这份范文治什么：

- **分层用编号列表，不用段落递进**：四层权限各占一个列表项，每项两三条事实，没有「这四层缺一不可」这类收束。
- **名字先给，含义后给**：先写 `permission_flags`，再说它是主判断依据；不先讲一段「权限为什么重要」。
- **照实写不一致**：前端接受 `partial`、后端默认拒绝、结果 403，这条写进「注意」并指向第 13 节。真实文档会承认自己的坑，不会把棱角磨平。
- **兼容性说明只写结论**：`/v1/permission/user-groups` 名称保持兼容，语义已变——一句话，不展开历史。
- **没有一个比喻**：全节没用「等于」「就像」「相当于」。
