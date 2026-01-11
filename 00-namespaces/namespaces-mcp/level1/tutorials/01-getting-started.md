# MCP Level 1 教程 1: 入門指南

## 📚 教程概述

本教程將引導您完成 MCP Level 1 的基礎知識，包括：
- 理解 MCP Level 1 的核心概念
- 創建您的第一個 MCP artifact
- 驗證 artifact 的正確性
- 理解命名規範和依賴管理

**預計時間**: 30 分鐘  
**難度**: 初級  
**前置知識**: 基本的 YAML 語法

## 🎯 學習目標

完成本教程後，您將能夠：

1. ✅ 理解 MCP Level 1 的核心組件
2. ✅ 創建符合標準的 MCP artifact
3. ✅ 使用 MCP Validator 驗證 artifacts
4. ✅ 理解命名空間和版本控制
5. ✅ 聲明和管理依賴關係

## 📖 第一部分：理解 MCP Level 1

### 什麼是 MCP Level 1？

MCP Level 1 是 Model Context Protocol 的基礎層，定義了：

- **核心協議**: 基本的通信和數據交換標準
- **命名規範**: 如何命名和組織 artifacts
- **治理框架**: 安全、審計和合規要求
- **工具鏈**: 驗證、發佈和管理工具

### 核心概念

#### 1. Artifact（工件）

Artifact 是 MCP 生態系統中的基本單位，可以是：
- Manifest（描述檔）
- Schema（結構定義）
- Spec（規範）
- Policy（政策）
- 等等

#### 2. Namespace（命名空間）

命名空間用於組織和隔離 artifacts，格式為 reverse-DNS：
```
io.github.username
com.company
org.organization
```

#### 3. Semantic Type（語義類型）

每個 artifact 都有一個語義類型，表示其用途：
- `manifest`: 主描述檔
- `schema`: 結構定義
- `spec`: 功能規範
- `policy`: 治理政策
- 等等

## 🛠️ 第二部分：創建您的第一個 Artifact

### 步驟 1: 設置工作環境

```bash
# 創建項目目錄
mkdir -p my-first-mcp-artifact
cd my-first-mcp-artifact

# 創建 manifest.yaml 文件
touch manifest.yaml
```

### 步驟 2: 編寫 Manifest

打開 `manifest.yaml` 並添加以下內容：

```yaml
apiVersion: mcp.io/v1
kind: Manifest
metadata:
  name: io.github.yourname/my-first-artifact
  version: "1.0.0"
  description: "My first MCP artifact"
  semanticType: "manifest"
  mcpEndpoint: "/manifest/validate"
  
  # Naming Registry
  namingRegistry:
    format: "reverse-DNS"
    namespace: "io.github.yourname"
    artifactName: "my-first-artifact"
  
  # Team Identity
  teamIdentity:
    namespace: "io.github.yourname"
    verificationMethod: "github-oauth"
  
  # Timestamps
  createdAt: "2024-01-11T00:00:00Z"
  updatedAt: "2024-01-11T00:00:00Z"

# Dependencies
dependsOn: []

# References
references: []

# Artifact Information
artifact:
  type: "example"
  category: "tutorial"
  status: "draft"
  
  capabilities:
    - "basic-example"
  
  compliance:
    namingRules: "v1.0.0"
    artifactFirst: true
    semanticVersioning: true
```

**重要**: 將 `yourname` 替換為您的 GitHub 用戶名。

### 步驟 3: 理解 Manifest 結構

讓我們逐部分解析這個 manifest：

#### API Version 和 Kind
```yaml
apiVersion: mcp.io/v1
kind: Manifest
```
- 指定 MCP API 版本
- 聲明這是一個 Manifest 類型的 artifact

#### Metadata
```yaml
metadata:
  name: io.github.yourname/my-first-artifact
  version: "1.0.0"
  semanticType: "manifest"
```
- `name`: 使用 reverse-DNS 格式的唯一標識符
- `version`: 遵循語義版本控制（MAJOR.MINOR.PATCH）
- `semanticType`: 聲明 artifact 的語義類型

#### Naming Registry
```yaml
namingRegistry:
  format: "reverse-DNS"
  namespace: "io.github.yourname"
  artifactName: "my-first-artifact"
```
- 確保符合命名註冊表規範
- 分離命名空間和 artifact 名稱

## 🔍 第三部分：驗證 Artifact

### 步驟 1: 安裝驗證工具

```bash
# 安裝 Python 依賴
pip install pyyaml jsonschema

# 或使用虛擬環境
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

pip install -r ../tools/requirements.txt
```

### 步驟 2: 運行驗證

```bash
# 基本驗證
python3 ../tools/validator.py --artifact manifest.yaml

# 查看詳細輸出
python3 ../tools/validator.py --artifact manifest.yaml --format text
```

### 步驟 3: 理解驗證結果

#### 成功的驗證
```
============================================================
MCP Level 1 Artifact Validator
============================================================

Artifact: manifest.yaml
Type: Manifest
Status: PASSED

✅ Validation passed!

============================================================
```

#### 失敗的驗證
```
============================================================
MCP Level 1 Artifact Validator
============================================================

Artifact: manifest.yaml
Type: Manifest
Status: FAILED

❌ Errors (2):
  - Missing required field: version
  - Invalid name format: 'MyArtifact'

============================================================
```

## 📝 第四部分：添加依賴

### 步驟 1: 創建 Schema

創建 `schema.yaml` 文件：

```yaml
apiVersion: mcp.io/v1
kind: Schema
metadata:
  name: io.github.yourname/my-first-schema
  version: "1.0.0"
  description: "Schema for my first artifact"
  semanticType: "schema"
  mcpEndpoint: "/schema/validate"

schema:
  $schema: "http://json-schema.org/draft-07/schema#"
  title: "My First Artifact Schema"
  type: "object"
  required:
    - apiVersion
    - kind
    - metadata
```

### 步驟 2: 在 Manifest 中聲明依賴

更新 `manifest.yaml` 的 `dependsOn` 部分：

```yaml
dependsOn:
  - artifact: "schema.yaml"
    purpose: "Structure validation"
    version: "1.0.0"
```

### 步驟 3: 驗證依賴

```bash
# 驗證 manifest（會檢查依賴）
python3 ../tools/validator.py --artifact manifest.yaml
```

## 🎓 第五部分：最佳實踐

### 1. 命名規範

✅ **正確**:
```yaml
name: io.github.alice/data-processor
name: com.company/api-gateway
name: org.nonprofit/analytics-tool
```

❌ **錯誤**:
```yaml
name: DataProcessor  # 缺少命名空間
name: io.github.Alice/Tool  # 大寫字母
name: github.com/alice/tool  # 錯誤的順序
```

### 2. 版本控制

遵循語義版本控制：

- **MAJOR** (1.0.0 → 2.0.0): 破壞性變更
- **MINOR** (1.0.0 → 1.1.0): 新功能，向後兼容
- **PATCH** (1.0.0 → 1.0.1): Bug 修復

### 3. 依賴管理

```yaml
# ✅ 好的依賴聲明
dependsOn:
  - artifact: "schema.yaml"
    purpose: "Structure validation"
    version: "1.0.0"  # 明確版本

# ❌ 不好的依賴聲明
dependsOn:
  - artifact: "schema.yaml"
    # 缺少 purpose 和 version
```

### 4. 元數據完整性

確保包含所有重要的元數據：

```yaml
metadata:
  name: "..."           # 必需
  version: "..."        # 必需
  description: "..."    # 必需
  semanticType: "..."   # 必需
  mcpEndpoint: "..."    # 推薦
  createdAt: "..."      # 推薦
  updatedAt: "..."      # 推薦
```

## 🧪 第六部分：實踐練習

### 練習 1: 創建 Policy Artifact

創建一個 policy artifact，定義您的項目的治理規則。

**提示**:
- Kind: `Policy`
- semanticType: `policy`
- 包含至少 3 個政策規則

### 練習 2: 建立依賴鏈

創建三個 artifacts，形成依賴鏈：
1. Schema
2. Spec（依賴 Schema）
3. Manifest（依賴 Schema 和 Spec）

### 練習 3: 版本升級

將您的 artifact 從 1.0.0 升級到 1.1.0，添加新功能。

## 🎯 檢查點

完成本教程後，您應該能夠：

- [ ] 創建符合 MCP Level 1 標準的 artifact
- [ ] 使用正確的命名規範
- [ ] 聲明和管理依賴關係
- [ ] 使用 MCP Validator 驗證 artifacts
- [ ] 理解語義版本控制
- [ ] 遵循最佳實踐

## 📚 下一步

繼續學習：

1. [教程 2: Schema 定義](./02-schema-definition.md)
2. [教程 3: 治理和政策](./03-governance-policies.md)
3. [教程 4: 工具鏈集成](./04-toolchain-integration.md)

## 🔗 相關資源

- [Level 1 Core 文檔](../core/README.md)
- [基本示例](../examples/basic-artifact/)
- [MCP Validator 源碼](../tools/validator.py)

## ❓ 常見問題

### Q: 我可以使用其他命名空間格式嗎？
A: 不可以，MCP Level 1 要求使用 reverse-DNS 格式以確保全局唯一性。

### Q: 版本號可以包含預發布標籤嗎？
A: Level 1 要求嚴格的 MAJOR.MINOR.PATCH 格式。預發布標籤在 Level 2+ 中支持。

### Q: 如何驗證命名空間所有權？
A: 使用 GitHub OAuth、DNS TXT 記錄或 HTTP Well-Known 端點。詳見治理文檔。

---

**教程版本**: 1.0.0  
**最後更新**: 2024-01-11  
**難度**: 初級  
**預計時間**: 30 分鐘