# MCP Level 1 Example: Basic Artifact

這是一個最基本的 MCP Level 1 artifact 示例，展示了如何創建符合 MCP 標準的 artifact。

## 📁 文件結構

```
basic-artifact/
├── manifest.yaml          # 主描述檔
├── schema.yaml            # 結構定義
└── README.md              # 本文檔
```

## 🎯 學習目標

通過這個示例，您將學習：

1. ✅ MCP artifact 的基本結構
2. ✅ 必需的元數據字段
3. ✅ 命名規範（reverse-DNS）
4. ✅ 依賴聲明
5. ✅ 語義類型標註

## 📝 Manifest 結構說明

### 1. API Version 和 Kind

```yaml
apiVersion: mcp.io/v1
kind: Manifest
```

- `apiVersion`: MCP API 版本，格式為 `mcp.io/v{version}`
- `kind`: Artifact 類型，此處為 `Manifest`

### 2. Metadata（元數據）

```yaml
metadata:
  name: io.github.example/hello-mcp
  version: "1.0.0"
  description: "A basic example MCP artifact"
  semanticType: "manifest"
```

**必需字段**:
- `name`: 使用 reverse-DNS 格式（namespace/artifact-name）
- `version`: 遵循語義版本控制（MAJOR.MINOR.PATCH）
- `semanticType`: 語義類型（manifest, schema, spec 等）

**命名規範**:
- 命名空間：小寫字母、數字、點、連字號
- Artifact 名稱：小寫字母、數字、連字號
- 格式：`{namespace}/{artifact-name}`

### 3. Naming Registry（命名註冊表）

```yaml
namingRegistry:
  format: "reverse-DNS"
  namespace: "io.github.example"
  artifactName: "hello-mcp"
```

確保 artifact 符合命名註冊表規範。

### 4. Dependencies（依賴）

```yaml
dependsOn:
  - artifact: "schema.yaml"
    purpose: "Structure validation"
    version: "1.0.0"
```

聲明 artifact 依賴的其他 artifacts。

### 5. References（引用）

```yaml
references:
  - artifact: "categories.yaml"
    purpose: "Functional classification"
```

聲明 artifact 引用的其他 artifacts。

## 🔍 驗證 Artifact

### 使用 MCP Validator

```bash
# 基本驗證
python3 ../../tools/validator.py --artifact manifest.yaml

# 使用 schema 驗證
python3 ../../tools/validator.py \
  --artifact manifest.yaml \
  --schema ../../core/schema.yaml

# 嚴格模式（警告視為錯誤）
python3 ../../tools/validator.py \
  --artifact manifest.yaml \
  --strict

# JSON 輸出
python3 ../../tools/validator.py \
  --artifact manifest.yaml \
  --format json
```

### 預期輸出

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

## 🛠️ 修改示例

### 1. 更改命名空間

將 `io.github.example` 替換為您自己的命名空間：

```yaml
metadata:
  name: io.github.yourname/your-artifact
  
namingRegistry:
  namespace: "io.github.yourname"
  artifactName: "your-artifact"
```

### 2. 添加更多依賴

```yaml
dependsOn:
  - artifact: "schema.yaml"
    purpose: "Structure validation"
    version: "1.0.0"
  - artifact: "spec.yaml"
    purpose: "Functional specifications"
    version: "1.0.0"
```

### 3. 更新版本

遵循語義版本控制：

```yaml
metadata:
  version: "1.1.0"  # 新功能，向後兼容
  # 或
  version: "2.0.0"  # 破壞性變更
  # 或
  version: "1.0.1"  # Bug 修復
```

## ❌ 常見錯誤

### 錯誤 1: 無效的命名格式

```yaml
# ❌ 錯誤
metadata:
  name: "HelloMCP"  # 大寫字母不允許

# ✅ 正確
metadata:
  name: "io.github.example/hello-mcp"
```

### 錯誤 2: 無效的版本格式

```yaml
# ❌ 錯誤
metadata:
  version: "1.0"  # 缺少 PATCH 版本

# ✅ 正確
metadata:
  version: "1.0.0"
```

### 錯誤 3: 缺少必需字段

```yaml
# ❌ 錯誤
metadata:
  name: "io.github.example/hello-mcp"
  # 缺少 version 和 semanticType

# ✅ 正確
metadata:
  name: "io.github.example/hello-mcp"
  version: "1.0.0"
  semanticType: "manifest"
```

## 📚 下一步

學習更多高級主題：

1. [Schema 定義](../schema-example/) - 學習如何定義 artifact 結構
2. [Policy 定義](../policy-example/) - 學習如何定義治理政策
3. [完整應用](../full-application/) - 完整的 MCP 應用示例

## 🔗 相關資源

- [Level 1 Core 文檔](../../core/README.md)
- [MCP Validator 工具](../../tools/validator.py)
- [命名規範](../../core/spec.yaml)

---

**示例版本**: 1.0.0  
**最後更新**: 2024-01-11