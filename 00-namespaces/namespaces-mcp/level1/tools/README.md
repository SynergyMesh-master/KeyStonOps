# MCP Level 1 工具鏈

MCP Level 1 提供了一套完整的工具鏈，用於驗證、發佈和管理 MCP artifacts。

## 📦 可用工具

### 1. MCP Validator (validator.py)

驗證 MCP artifacts 是否符合 Level 1 標準。

**功能**:
- ✅ Schema 驗證
- ✅ 命名規範檢查
- ✅ 依賴完整性驗證
- ✅ 語義類型驗證
- ✅ 結構完整性檢查

**使用方式**:

```bash
# 基本驗證
python3 validator.py --artifact path/to/manifest.yaml

# 使用 schema 驗證
python3 validator.py \
  --artifact path/to/manifest.yaml \
  --schema path/to/schema.yaml

# 嚴格模式（警告視為錯誤）
python3 validator.py \
  --artifact path/to/manifest.yaml \
  --strict

# JSON 輸出
python3 validator.py \
  --artifact path/to/manifest.yaml \
  --format json
```

**輸出格式**:

文本格式:
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

JSON 格式:
```json
{
  "status": "passed",
  "artifact_path": "manifest.yaml",
  "artifact_type": "Manifest",
  "errors": [],
  "warnings": [],
  "passed": true
}
```

### 2. MCP Publisher (計劃中)

發佈 MCP artifacts 到註冊表。

**功能**:
- Artifact 簽名
- 命名空間驗證
- 依賴解析
- 註冊表上傳
- 版本管理

**使用方式**:
```bash
# 發佈 artifact
mcp-publisher \
  --artifact manifest.yaml \
  --namespace io.github.user \
  --sign
```

### 3. MCP Inspector (計劃中)

檢查和分析 MCP artifacts。

**功能**:
- Artifact 元數據提取
- 依賴圖可視化
- 安全漏洞掃描
- 質量指標分析
- 合規報告

**使用方式**:
```bash
# 檢查 artifact
mcp-inspector \
  --artifact manifest.yaml \
  --report json \
  --output report.json
```

### 4. MCP Schema Generator (計劃中)

從 artifact 定義生成 JSON schemas。

**功能**:
- Schema 生成
- Schema 驗證
- Schema 文檔化
- Schema 版本控制

**使用方式**:
```bash
# 生成 schema
mcp-schema-gen \
  --input artifact.yaml \
  --output schema.json \
  --format json
```

### 5. MCP Dependency Resolver (計劃中)

解析和管理 artifact 依賴。

**功能**:
- 依賴解析
- 版本衝突檢測
- 傳遞依賴分析
- 依賴圖生成

**使用方式**:
```bash
# 解析依賴
mcp-deps \
  --artifact manifest.yaml \
  --resolve \
  --graph
```

### 6. MCP Security Scanner (計劃中)

掃描 artifacts 的安全漏洞。

**功能**:
- 漏洞掃描
- 依賴安全分析
- 惡意軟體檢測
- 安全政策驗證

**使用方式**:
```bash
# 安全掃描
mcp-security-scan \
  --artifact manifest.yaml \
  --severity high \
  --report
```

### 7. MCP Compliance Checker (計劃中)

檢查 artifact 是否符合政策。

**功能**:
- 政策合規檢查
- 治理規則驗證
- 審計追蹤生成
- 合規報告

**使用方式**:
```bash
# 合規檢查
mcp-compliance \
  --artifact manifest.yaml \
  --policies policies.yaml \
  --report
```

### 8. MCP Documentation Generator (計劃中)

從 artifacts 生成文檔。

**功能**:
- Markdown 文檔生成
- API 參考生成
- Schema 文檔化
- 依賴文檔化

**使用方式**:
```bash
# 生成文檔
mcp-docs \
  --artifact manifest.yaml \
  --output README.md \
  --format markdown
```

## 🛠️ 安裝

### 前置要求

- Python 3.9+
- pip

### 安裝步驟

```bash
# 克隆倉庫
git clone https://github.com/MachineNativeOps/machine-native-ops.git
cd machine-native-ops/00-namespaces/namespaces-mcp/level1/tools

# 安裝依賴
pip install -r requirements.txt

# 驗證安裝
python3 validator.py --help
```

### 使用虛擬環境（推薦）

```bash
# 創建虛擬環境
python3 -m venv venv

# 激活虛擬環境
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安裝依賴
pip install -r requirements.txt
```

## 📚 使用示例

### 示例 1: 驗證單個 Artifact

```bash
python3 validator.py --artifact ../core/manifest.yaml
```

### 示例 2: 批量驗證

```bash
# 驗證所有 core artifacts
for file in ../core/*.yaml; do
  echo "Validating $file..."
  python3 validator.py --artifact "$file"
done
```

### 示例 3: CI/CD 集成

```yaml
# .github/workflows/validate.yml
- name: Validate MCP Artifacts
  run: |
    python3 tools/validator.py --artifact core/manifest.yaml --strict
    python3 tools/validator.py --artifact core/schema.yaml --strict
```

### 示例 4: 使用 Schema 驗證

```bash
python3 validator.py \
  --artifact ../core/manifest.yaml \
  --schema ../core/schema.yaml \
  --strict
```

## 🔧 開發

### 運行測試

```bash
# 安裝測試依賴
pip install pytest pytest-cov

# 運行測試
pytest tests/ -v

# 生成覆蓋率報告
pytest tests/ --cov=. --cov-report=html
```

### 代碼質量

```bash
# 運行 linter
pylint validator.py

# 格式化代碼
black validator.py

# 類型檢查
mypy validator.py
```

## 📖 API 文檔

### MCPValidator 類

```python
from validator import MCPValidator

# 創建驗證器
validator = MCPValidator(schema_path="schema.yaml")

# 驗證 artifact
result = validator.validate_artifact("manifest.yaml", strict=False)

# 檢查結果
if result.status == ValidationStatus.PASSED:
    print("✅ Validation passed!")
else:
    print("❌ Validation failed!")
    for error in result.errors:
        print(f"  - {error}")
```

### ValidationResult 類

```python
@dataclass
class ValidationResult:
    status: ValidationStatus
    artifact_path: str
    errors: List[str]
    warnings: List[str]
    artifact_type: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
```

## 🐛 故障排除

### 問題 1: 找不到模組

```bash
# 確保已安裝依賴
pip install -r requirements.txt

# 檢查 Python 路徑
python3 -c "import sys; print(sys.path)"
```

### 問題 2: YAML 解析錯誤

```bash
# 檢查 YAML 語法
python3 -c "import yaml; yaml.safe_load(open('manifest.yaml'))"
```

### 問題 3: Schema 驗證失敗

```bash
# 檢查 schema 文件是否存在
ls -la schema.yaml

# 驗證 schema 格式
python3 -c "import yaml; print(yaml.safe_load(open('schema.yaml')))"
```

## 🤝 貢獻

歡迎貢獻！請參考：

1. Fork 倉庫
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 創建 Pull Request

## 📄 授權

本項目採用與 MCP Registry 相同的授權協議。

## 🔗 相關資源

- [Level 1 文檔](../README.md)
- [示例](../examples/)
- [教程](../tutorials/)
- [CI/CD 工作流](../../../../.github/workflows/mcp-level1-ci.yml)

---

**工具鏈版本**: 1.0.0  
**最後更新**: 2024-01-11