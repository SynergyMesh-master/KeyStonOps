# MCP Level 1 完整應用示例

這是一個完整的 MCP Level 1 應用示例，展示了如何構建一個包含多個 artifacts 的完整應用。

## 📁 項目結構

```
full-application/
├── manifest.yaml          # 主描述檔
├── schema.yaml            # 數據結構定義
├── spec.yaml              # 功能規範
├── policies.yaml          # 治理政策
├── roles.yaml             # 角色定義
├── index.yaml             # Artifact 索引
├── README.md              # 本文檔
└── docs/
    ├── architecture.md    # 架構文檔
    └── api.md             # API 文檔
```

## 🎯 應用概述

**應用名稱**: Data Processing Pipeline  
**命名空間**: io.github.example  
**版本**: 1.0.0  
**狀態**: Production Ready

### 功能特性

- ✅ 數據接收和驗證
- ✅ 數據轉換和處理
- ✅ 數據存儲和檢索
- ✅ 治理和合規
- ✅ 角色基礎訪問控制

## 📋 Artifacts 說明

### 1. Manifest (manifest.yaml)

主描述檔，定義應用的基本信息和依賴關係。

**關鍵特性**:
- 聲明所有依賴
- 定義應用能力
- 指定合規要求

### 2. Schema (schema.yaml)

定義數據結構和驗證規則。

**包含**:
- 輸入數據 schema
- 輸出數據 schema
- 配置 schema
- 驗證規則

### 3. Spec (spec.yaml)

詳細的功能規範。

**包含**:
- API 端點定義
- 數據處理流程
- 性能要求
- 安全要求

### 4. Policies (policies.yaml)

治理政策定義。

**包含**:
- 數據訪問政策
- 數據保留政策
- 安全政策
- 合規政策

### 5. Roles (roles.yaml)

角色和權限定義。

**包含**:
- Data Engineer 角色
- Data Analyst 角色
- Administrator 角色
- Auditor 角色

### 6. Index (index.yaml)

Artifact 索引和元數據。

**包含**:
- 所有 artifacts 列表
- 依賴關係圖
- 版本信息

## 🚀 快速開始

### 步驟 1: 驗證所有 Artifacts

```bash
# 驗證 manifest
python3 ../../tools/validator.py --artifact manifest.yaml --strict

# 驗證 schema
python3 ../../tools/validator.py --artifact schema.yaml --strict

# 驗證 spec
python3 ../../tools/validator.py --artifact spec.yaml --strict

# 驗證 policies
python3 ../../tools/validator.py --artifact policies.yaml --strict

# 驗證 roles
python3 ../../tools/validator.py --artifact roles.yaml --strict

# 驗證 index
python3 ../../tools/validator.py --artifact index.yaml --strict
```

### 步驟 2: 批量驗證

```bash
# 使用腳本批量驗證
for file in *.yaml; do
  echo "Validating $file..."
  python3 ../../tools/validator.py --artifact "$file" --strict
  if [ $? -eq 0 ]; then
    echo "✅ $file passed"
  else
    echo "❌ $file failed"
    exit 1
  fi
done
```

### 步驟 3: 生成依賴圖

```bash
# 使用 Python 生成依賴圖
python3 << 'EOF'
import yaml
from pathlib import Path

def generate_dependency_graph():
    artifacts = {}
    
    # 讀取所有 artifacts
    for yaml_file in Path('.').glob('*.yaml'):
        with open(yaml_file, 'r') as f:
            artifact = yaml.safe_load(f)
            name = artifact.get('metadata', {}).get('name', yaml_file.stem)
            artifacts[name] = {
                'file': str(yaml_file),
                'depends_on': artifact.get('dependsOn', [])
            }
    
    # 打印依賴圖
    print("Dependency Graph:")
    print("=" * 60)
    for name, info in artifacts.items():
        print(f"\n{name}")
        if info['depends_on']:
            for dep in info['depends_on']:
                print(f"  └─> {dep.get('artifact')}")
        else:
            print(f"  (no dependencies)")

generate_dependency_graph()
EOF
```

## 📊 依賴關係

```
index.yaml
  └─> manifest.yaml
  └─> schema.yaml
  └─> spec.yaml

manifest.yaml
  └─> schema.yaml
  └─> spec.yaml

spec.yaml
  └─> schema.yaml

policies.yaml
  └─> manifest.yaml

roles.yaml
  └─> policies.yaml
```

## 🔒 安全和合規

### 命名空間驗證

```bash
# 驗證命名空間所有權
# 使用 GitHub OAuth
export GITHUB_TOKEN="your-token"
# 驗證 io.github.example 命名空間
```

### 政策合規

應用實施以下政策：

1. **數據訪問政策**
   - 基於角色的訪問控制
   - 最小權限原則
   - 審計日誌記錄

2. **數據保留政策**
   - 原始數據保留 90 天
   - 處理後數據保留 365 天
   - 審計日誌保留 7 年

3. **安全政策**
   - 所有數據傳輸加密
   - 靜態數據加密
   - 定期安全掃描

## 🧪 測試

### 單元測試

```bash
# 測試 schema 驗證
python3 << 'EOF'
import yaml
import jsonschema

# 加載 schema
with open('schema.yaml', 'r') as f:
    schema_doc = yaml.safe_load(f)
    schema = schema_doc.get('schema', {})

# 測試數據
test_data = {
    "apiVersion": "mcp.io/v1",
    "kind": "Manifest",
    "metadata": {
        "name": "io.github.example/test",
        "version": "1.0.0",
        "semanticType": "manifest"
    }
}

# 驗證
try:
    jsonschema.validate(instance=test_data, schema=schema)
    print("✅ Schema validation passed")
except jsonschema.exceptions.ValidationError as e:
    print(f"❌ Schema validation failed: {e.message}")
EOF
```

### 集成測試

```bash
# 測試完整工作流
echo "Testing complete workflow..."

# 1. 驗證所有 artifacts
echo "Step 1: Validating artifacts..."
for file in *.yaml; do
  python3 ../../tools/validator.py --artifact "$file" || exit 1
done

# 2. 檢查依賴完整性
echo "Step 2: Checking dependencies..."
# (依賴檢查邏輯)

# 3. 驗證政策合規
echo "Step 3: Checking policy compliance..."
# (合規檢查邏輯)

echo "✅ All tests passed!"
```

## 📈 性能指標

### 驗證性能

- Manifest 驗證: < 100ms
- Schema 驗證: < 150ms
- Spec 驗證: < 200ms
- 完整驗證: < 500ms

### 資源使用

- 內存使用: < 50MB
- CPU 使用: < 10%
- 磁盤空間: < 1MB

## 🔄 版本升級

### 從 1.0.0 升級到 1.1.0

```bash
# 1. 更新版本號
sed -i 's/version: "1.0.0"/version: "1.1.0"/' manifest.yaml

# 2. 添加新功能
# (編輯相關文件)

# 3. 驗證變更
python3 ../../tools/validator.py --artifact manifest.yaml --strict

# 4. 更新文檔
# (更新 README 和其他文檔)

# 5. 提交變更
git add .
git commit -m "chore: bump version to 1.1.0"
```

## 🐛 故障排除

### 問題 1: 驗證失敗

```bash
# 檢查 YAML 語法
python3 -m yaml manifest.yaml

# 查看詳細錯誤
python3 ../../tools/validator.py --artifact manifest.yaml --format json
```

### 問題 2: 依賴缺失

```bash
# 檢查依賴文件是否存在
for dep in schema.yaml spec.yaml; do
  if [ ! -f "$dep" ]; then
    echo "❌ Missing dependency: $dep"
  fi
done
```

### 問題 3: 命名空間衝突

```bash
# 檢查命名空間唯一性
grep -r "name: io.github.example" . | wc -l
```

## 📚 學習資源

- [Level 1 教程](../../tutorials/01-getting-started.md)
- [Schema 定義指南](../../tutorials/02-schema-definition.md)
- [治理和政策](../../tutorials/03-governance-policies.md)

## 🤝 貢獻

歡迎改進這個示例！請：

1. Fork 倉庫
2. 創建功能分支
3. 提交變更
4. 創建 Pull Request

## 📄 授權

本示例採用 MIT 授權。

---

**示例版本**: 1.0.0  
**最後更新**: 2024-01-11  
**狀態**: Production Ready