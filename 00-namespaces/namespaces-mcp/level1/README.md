# MCP Level 1: Foundation Protocol

## 概述

MCP Level 1 是 Model Context Protocol 的基礎層，定義了核心協議標準、命名規範、artifact 結構與治理框架。Level 1 為整個 MCP 生態系統提供了堅實的基礎。

## 結構

```
level1/
├── core/                  # 核心協議與標準
│   ├── manifest.yaml
│   ├── schema.yaml
│   ├── spec.yaml
│   ├── index.yaml
│   ├── categories.yaml
│   ├── governance.yaml
│   ├── policies.yaml
│   ├── roles.yaml
│   ├── tools.yaml
│   └── README.md
├── governance/            # 治理與安全
│   ├── manifest.yaml
│   ├── schema.yaml
│   ├── spec.yaml
│   ├── index.yaml
│   ├── categories.yaml
│   ├── policies.yaml
│   ├── roles.yaml
│   └── README.md
└── README.md              # 本文檔
```

## 核心組件

### Core (核心)
定義 MCP 的基礎協議、命名標準、artifact 結構與驗證規則。

**主要功能**:
- 協議定義
- 基礎 schemas
- 核心接口
- 命名標準
- 七大命名註冊表

**狀態**: Stable ✅  
**Artifacts**: 9

### Governance (治理)
定義 MCP 的治理框架、安全政策與合規要求。

**主要功能**:
- 命名空間治理
- Artifact 治理
- 安全治理
- 審計治理
- 角色與權限管理

**狀態**: Stable ✅  
**Artifacts**: 7

## 七大命名註冊表

Level 1 實現了完整的七大命名註冊表系統：

1. **Naming Rules Registry** (命名規範註冊表)
   - 反向 DNS 命名格式
   - 命名空間所有權驗證
   - 衝突避免策略

2. **Team Identity Registry** (Teams 命名註冊表)
   - 團隊與組織命名空間
   - 所有權驗證機制
   - 多層次組織結構

3. **Directory Taxonomy Registry** (目錄命名註冊表)
   - 目錄分類結構
   - Artifact 語義分類
   - 與 categories.yaml 對齊

4. **Artifact Entry Registry** (條目命名註冊表)
   - Artifact 實例標識
   - 版本化管理
   - 語義類型標註

5. **Mapping Key Registry** (映射命名註冊表)
   - Artifact 間語義映射
   - 依賴關係管理
   - 多對多映射支援

6. **Dependency Identifier Registry** (依賴命名註冊表)
   - 依賴版本追蹤
   - 語義版本控制
   - 傳遞依賴解析

7. **Reference Tag Registry** (引用命名註冊表)
   - 語義引用標註
   - 狀態追蹤
   - 標籤管理

8. **Toolchain Identifier Registry** (工具命名註冊表)
   - 工具鏈版本管理
   - 工具鏈集成
   - 自動化部署

## Artifact-First Workflow

Level 1 實現了完整的 artifact-first workflow：

### 核心原則
1. **Artifact 定義優先** - 所有 artifact 需先定義語義類型、命名規則與依賴關係
2. **自動化驗證** - 發佈前必須通過 schema 驗證、依賴檢查與命名空間驗證
3. **多格式支援** - 支援 YAML、JSON 等多種格式
4. **CI/CD 集成** - 支援自動化發佈、驗證與回滾

### Workflow 階段
1. **Draft** - 初始草稿
2. **Review** - 審查階段
3. **Approved** - 已批准
4. **Published** - 已發佈
5. **Deprecated** - 已棄用
6. **Archived** - 已歸檔

## 命名空間驗證

Level 1 支援三種命名空間所有權驗證方式：

### 1. GitHub OAuth/OIDC
適用於 `io.github.*` 命名空間
- 自動驗證 GitHub 用戶/組織所有權
- 支援 OAuth 2.0 和 OpenID Connect

### 2. DNS TXT 記錄
適用於 `com.*`, `org.*`, `net.*` 命名空間
- 在域名下設置 TXT 記錄
- 格式: `mcp-registry-auth=<token>`

### 3. HTTP Well-Known
適用於所有域名命名空間
- 在域名下設置 `/.well-known/mcp-registry-auth` 端點
- 返回驗證 token

## MCP Endpoints

Level 1 提供以下 MCP endpoints：

### Core Endpoints
- `/manifest/validate` - 驗證 manifest
- `/schema/validate` - 驗證 schema
- `/spec/validate` - 驗證 spec
- `/index/list` - 列舉 artifacts
- `/categories/list` - 查詢分類
- `/tools/list` - 列舉工具鏈

### Governance Endpoints
- `/governance/validate` - 驗證治理規則
- `/policies/validate` - 驗證政策
- `/roles/validate` - 驗證角色

## 工具鏈

Level 1 定義了完整的工具鏈生態系統：

### 驗證工具
- **mcp-validator@v1.2.0** - Artifact 驗證器

### 發佈工具
- **mcp-publisher@v0.9.1** - Artifact 發佈器

### 分析工具
- **mcp-inspector@2024-01-11** - Artifact 檢查器
- **mcp-deps@v1.1.0** - 依賴解析器

### 安全工具
- **mcp-security-scan@v2.0.0** - 安全掃描器

### 合規工具
- **mcp-compliance@v1.0.0** - 合規檢查器

### 開發工具
- **mcp-schema-gen@v1.0.0** - Schema 生成器
- **mcp-docs@v1.0.0** - 文檔生成器

## 使用示例

### 驗證 Artifact
```bash
mcp-validator --artifact manifest.yaml --schema schema.yaml --strict
```

### 發佈 Artifact
```bash
mcp-publisher --artifact manifest.yaml --namespace io.github.user --sign
```

### 檢查依賴
```bash
mcp-deps --artifact manifest.yaml --resolve --graph
```

### 安全掃描
```bash
mcp-security-scan --artifact manifest.yaml --severity high --report
```

### 合規檢查
```bash
mcp-compliance --artifact manifest.yaml --policies policies.yaml --report
```

## 統計數據

### Core
- **Artifacts**: 9
- **命名註冊表**: 8
- **MCP Endpoints**: 9
- **工具鏈**: 8

### Governance
- **Artifacts**: 7
- **政策數**: 21
- **角色數**: 6
- **MCP Endpoints**: 3

### 總計
- **總 Artifacts**: 16
- **總 Endpoints**: 12
- **總工具鏈**: 8
- **總政策**: 21
- **總角色**: 6

## 合規性

Level 1 符合以下標準：

- ✅ MCP Registry API v1.0
- ✅ Semantic Versioning 2.0.0
- ✅ JSON Schema Draft-07
- ✅ OAuth 2.0
- ✅ OpenID Connect (可選)
- ✅ Artifact-First Workflow
- ✅ RBAC 模型
- ✅ 審計日誌標準

## 狀態

- **版本**: 1.0.0
- **狀態**: Stable ✅
- **最後更新**: 2024-01-11

## 下一步

Level 1 為以下層級提供基礎：

- **Level 2**: 模組化組件和服務
- **Level 3**: 專業化引擎系統
- **Level 4**: 高級和實驗性功能

## 參考資料

- [MCP Registry Documentation](https://modelcontextprotocol.info/tools/registry/)
- [MCP Specification](https://model-context-protocol.github.io/specification/)
- [Naming Standards](https://github.com/modelcontextprotocol/registry/blob/main/docs/explanations/namespacing.md)
- [Artifact-First Workflow](https://github.com/modelcontextprotocol/registry)

## 貢獻

歡迎對 Level 1 進行貢獻！請參考：
- [貢獻指南](../../CONTRIBUTING.md)
- [開發規範](../../docs/)

## 授權

本項目採用與 MCP Registry 相同的授權協議。