# MCP Level 1: Core - Foundation Protocol

## 概述

MCP Level 1 Core 是 Model Context Protocol 的基礎層，定義了核心協議標準、命名規範、artifact 結構與治理框架。

## 結構

```
level1/core/
├── manifest.yaml          # 主描述檔
├── schema.yaml            # 結構與驗證規則
├── spec.yaml              # 功能規格
├── index.yaml             # 條目索引
├── categories.yaml        # 功能分類
├── governance.yaml        # 治理規則
├── policies.yaml          # 治理政策
├── roles.yaml             # 角色與權限
├── tools.yaml             # 工具鏈定義
└── README.md              # 本文檔
```

## Artifact 說明

### manifest.yaml
**語義類型**: manifest  
**MCP Endpoint**: `/manifest/validate`

主描述檔，定義 artifact 的基本資訊、版本、依賴與分類。所有 MCP artifact 的入口點。

**依賴**:
- schema.yaml (結構驗證)
- spec.yaml (功能規格)

**引用**:
- categories.yaml (功能分類)
- index.yaml (條目索引)

### schema.yaml
**語義類型**: schema  
**MCP Endpoint**: `/schema/validate`

定義 artifact 的結構、欄位與驗證規則，採用 JSON Schema Draft-07 格式。

**依賴**: 無

**引用**:
- spec.yaml (功能規格)

### spec.yaml
**語義類型**: spec  
**MCP Endpoint**: `/spec/validate`

詳細描述 artifact 的功能規格與行為約束，包括協議定義、命名標準、artifact-first workflow 等。

**依賴**:
- schema.yaml (結構驗證)

**引用**: 無

### index.yaml
**語義類型**: index  
**MCP Endpoint**: `/index/list`

MCP 服務條目索引，列舉所有 artifact 與其 metadata，支援自動化查詢與發現。

**依賴**:
- manifest.yaml (artifact metadata)
- schema.yaml (結構驗證)
- spec.yaml (功能規格)

**引用**:
- categories.yaml (功能分類)

### categories.yaml
**語義類型**: taxonomy  
**MCP Endpoint**: `/categories/list`

定義 artifact 的功能分類，包括基礎協議、artifact 類型、命名註冊表、治理與工作流等分類。

**依賴**: 無

**引用**: 無

### governance.yaml
**語義類型**: governance  
**MCP Endpoint**: `/governance/validate`

定義 artifact 的治理規則、權限、審計與安全政策，包括命名空間治理、artifact 治理、安全治理等。

**依賴**:
- manifest.yaml (artifact metadata)

**引用**:
- policies.yaml (治理政策)
- roles.yaml (角色定義)

### policies.yaml
**語義類型**: policy  
**MCP Endpoint**: `/policies/validate`

具體治理政策條目，細化權限、審計與安全要求，包括命名政策、版本政策、安全政策等。

**依賴**:
- governance.yaml (治理框架)

**引用**:
- roles.yaml (角色定義)

### roles.yaml
**語義類型**: role  
**MCP Endpoint**: `/roles/validate`

定義 artifact 的角色與權限分配，包括 Viewer、Publisher、Maintainer、Administrator 等角色。

**依賴**:
- governance.yaml (治理框架)

**引用**: 無

### tools.yaml
**語義類型**: toolchain  
**MCP Endpoint**: `/tools/list`

定義 MCP 服務可用工具鏈，包括 validator、publisher、inspector、security-scanner 等工具。

**依賴**: 無

**引用**: 無

## 七大命名註冊表

Level 1 Core 實現了 MCP 的七大命名註冊表：

1. **Naming Rules Registry** (命名規範註冊表)
   - 定義反向 DNS 命名格式
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

Level 1 Core 實現了完整的 artifact-first workflow：

1. **Artifact 定義優先**: 所有 artifact 需先定義語義類型、命名規則與依賴關係
2. **自動化驗證**: 發佈前必須通過 schema 驗證、依賴檢查與命名空間驗證
3. **多格式支援**: 支援 YAML、JSON 等多種格式
4. **CI/CD 集成**: 支援自動化發佈、驗證與回滾

## 命名空間驗證

Level 1 Core 支援三種命名空間所有權驗證方式：

1. **GitHub OAuth/OIDC**: 適用於 `io.github.*` 命名空間
2. **DNS TXT 記錄**: 適用於 `com.*`, `org.*`, `net.*` 命名空間
3. **HTTP Well-Known**: 在域名下設置 `/.well-known/mcp-registry-auth` 端點

## 使用方式

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

## MCP Endpoints

Level 1 Core 提供以下 MCP endpoints：

- `/manifest/validate` - 驗證 manifest
- `/schema/validate` - 驗證 schema
- `/spec/validate` - 驗證 spec
- `/index/list` - 列舉 artifacts
- `/categories/list` - 查詢分類
- `/governance/validate` - 驗證治理規則
- `/policies/validate` - 驗證政策
- `/roles/validate` - 驗證角色
- `/tools/list` - 列舉工具鏈

## 狀態

- **版本**: 1.0.0
- **狀態**: Stable ✅
- **Artifacts**: 9
- **命名註冊表**: 8
- **MCP Endpoints**: 9

## 合規性

Level 1 Core 符合以下標準：

- MCP Registry API v1.0
- Semantic Versioning 2.0.0
- JSON Schema Draft-07
- OAuth 2.0
- Artifact-First Workflow

## 參考資料

- [MCP Registry Documentation](https://modelcontextprotocol.info/tools/registry/)
- [MCP Specification](https://model-context-protocol.github.io/specification/)
- [Naming Standards](https://github.com/modelcontextprotocol/registry/blob/main/docs/explanations/namespacing.md)