# MachineNativeOps 驗證平台 - 使用指南

## 🚀 快速開始

### 1. 安裝依賴

```bash
pip install cryptography pyyaml asyncio aiohttp
```

### 2. 基本使用

#### 命令行使用

```bash
# 完整驗證
python tools/machinenativeops_validator.py /path/to/project

# 指定驗證類型
python tools/machinenativeops_validator.py /path/to/project --type document
python tools/machinenativeops_validator.py /path/to/project --type instant

# JSON 輸出
python tools/machinenativeops_validator.py /path/to/project --output json

# 詳細輸出
python tools/machinenativeops_validator.py /path/to/project --detail

# 查看 MCP 架構
python tools/machinenativeops_validator.py --mcp-schema
```

#### Python 集成

```python
import asyncio
from tools.machinenativeops_validator import (
    MachineNativeOpsValidator,
    mcp_validate_handler
)

async def main():
    # 方法1: 使用驗證器類
    validator = MachineNativeOpsValidator()
    report = await validator.run_comprehensive_validation("/path/to/project")
    print(validator.generate_unified_report(report))
    
    # 方法2: 使用 MCP 處理器
    result = await mcp_validate_handler({
        "path": "/path/to/project",
        "validation_type": "all",
        "output_format": "json"
    })
    print(result)

asyncio.run(main())
```

## 📋 MCP 集成

### JSON-RPC 2.0 調用

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "machinenativeops.validator",
    "arguments": {
      "path": "/path/to/project",
      "validation_type": "all",
      "output_format": "json",
      "detail": true
    }
  },
  "id": 1
}
```

### MCP 服務器配置

```python
from tools import MCP_TOOLS

# 獲取所有工具
all_tools = MCP_TOOLS

# 獲取特定工具
validator_tool = MCP_TOOLS.get("machinenativeops.validator")

# 調用工具處理器
result = await validator_tool["handler"]({
    "path": "/path/to/project"
})
```

## 🔧 配置選項

### 平台配置 (config/machinenativeops-platform-config.yaml)

```yaml
platform:
  name: "MachineNativeOps Validator Platform"
  version: "1.0.0"
  mcp_version: "2025-11-25"

security:
  quantum_safe:
    enabled: true
    level: "NIST Level 5+"

performance:
  timeouts:
    document_validation: 60.0
    instant_validation: 30.0
```

### 文件驗證配置 (config/document-validator.yaml)

```yaml
rules:
  directory_naming:
    enabled: true
    pattern: "^[a-z0-9_-]+$"
    severity: "error"

  required_directories:
    enabled: true
    directories:
      - name: "src"
        required: true
      - name: "docs"
        required: true
```

### INSTANT 觸發器配置 (config/instant-trigger.yaml)

```yaml
quantum_dimensions:
  naming_convention:
    enabled: true
    confidence_threshold: 0.9

traditional_validations:
  structure_compliance:
    enabled: true
    severity: "warning"
```

## 🎯 驗證類型

### 文件結構驗證

```bash
# 只驗證文件結構
python tools/machinenativeops_validator.py /path/to/project --type document
```

**檢查項目**:
- ✅ 目錄命名規範 (kebab-case)
- ✅ 文件命名規範
- ✅ 必需目錄存在性
- ✅ 文件位置正確性
- ✅ 內容結構完整性

### INSTANT 觸發器驗證

```bash
# 只驗證 INSTANT 觸發器
python tools/machinenativeops_validator.py /path/to/project --type instant
```

**量子 9 維度**:
1. 命名規範標準化
2. 目錄結構完整性
3. 遺留歸檔管理
4. 臨時文件清理
5. 文檔同步驗證
6. Python 兼容性
7. 證據完整性
8. AI 合約合規
9. 治理合規評估

**傳統 9 大類**:
1. 結構合規性
2. 內容完整性
3. 路徑正確性
4. 位置一致性
5. 命名空間規範
6. 上下文統一性
7. 邏輯正確性
8. 鏈接完整性
9. 最終正確性

### 綜合驗證

```bash
# 運行所有驗證（默認）
python tools/machinenativeops_validator.py /path/to/project --type all
```

## 📊 輸出格式

### Text 格式（默認）

```bash
python tools/machinenativeops_validator.py /path/to/project --output text
```

輸出：
```
====================================================================================================
🤖 MachineNativeOps 統一驗證平台報告 (MCP Compliant)
====================================================================================================
🔧 平台版本: 1.0.0
📡 MCP版本: 2025-11-25
✅ 總體驗證: 通過
🛡️ 安全等級: NIST Level 5+
...
```

### JSON 格式

```bash
python tools/machinenativeops_validator.py /path/to/project --output json
```

輸出：
```json
{
  "platform_version": "1.0.0",
  "validation_id": "MNOP-VAL-xxx",
  "overall_status": true,
  "document_results": [...],
  "quantum_results": [...],
  "traditional_results": {...}
}
```

### YAML 格式

```bash
python tools/machinenativeops_validator.py /path/to/project --output yaml
```

## 🔍 詳細輸出

```bash
# 顯示詳細驗證結果
python tools/machinenativeops_validator.py /path/to/project --detail
```

詳細輸出包含：
- 每個文件的驗證結果
- 每個維度的置信度分數
- 量子簽名
- 具體建議和修復方案

## 🧪 測試

### 運行測試套件

```bash
# 運行所有測試
python test_validator.py

# 測試覆蓋
- 基本驗證功能
- MCP 處理器
- MCP 工具架構
- 命名空間合規性
- INSTANT 標準合規性
- 安全等級驗證
```

## 🚀 CI/CD 集成

### GitHub Actions

```yaml
name: MachineNativeOps Validation

on: [push, pull_request]

jobs:
  validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install cryptography pyyaml asyncio aiohttp
      - name: Run Validation
        run: |
          python tools/machinenativeops_validator.py . --type all --output json
        timeout-minutes: 2
```

### GitLab CI

```yaml
stages:
  - validation

machine_native_ops:
  stage: validation
  image: python:3.11
  script:
    - pip install cryptography pyyaml asyncio aiohttp
    - python tools/machinenativeops_validator.py . --type all
  only:
    - merge_requests
    - master
```

## 🐛 故障排除

### 常見問題

#### 1. 依賴缺失

```bash
pip install cryptography pyyaml asyncio aiohttp
```

#### 2. 權限問題

```bash
# 確保有讀取權限
chmod +r /path/to/project
```

#### 3. 配置錯誤

```bash
# 驗證配置文件格式
python -c "import yaml; yaml.safe_load(open('config/machinenativeops-platform-config.yaml'))"
```

### 調試模式

```bash
# 使用 Python 調試器
python -m pdb tools/machinenativeops_validator.py /path/to/project

# 或添加日誌輸出
python tools/machinenativeops_validator.py /path/to/project --detail
```

## 📈 性能優化

### 並行驗證

```yaml
# 在配置文件中調整
performance:
  concurrency:
    max_parallel_validations: 8
    max_quantum_threads: 16
```

### 資源限制

```yaml
performance:
  resource_limits:
    cpu: "4"
    memory: "8Gi"
```

## 🤝 高級用法

### 自定義驗證規則

```python
from tools.machinenativeops_validator import ValidationRule, ValidationType

# 創建自定義規則
custom_rule = ValidationRule(
    rule_type="custom_check",
    pattern="^[a-z]+$",
    description="自定義檢查",
    severity="error",
    suggestion="請修正",
    validation_type=ValidationType.DOCUMENT
)
```

### 批量驗證

```python
import asyncio
from pathlib import Path

async def validate_multiple_projects():
    projects = [
        "/path/to/project1",
        "/path/to/project2",
        "/path/to/project3"
    ]
    
    validator = MachineNativeOpsValidator()
    tasks = [validator.run_comprehensive_validation(p) for p in projects]
    reports = await asyncio.gather(*tasks)
    
    for report in reports:
        print(f"Project: {report.validation_id} - Status: {report.overall_status}")

asyncio.run(validate_multiple_projects())
```

## 📚 相關文檔

- [README.md](README.md) - 平台概述
- [COMPLIANCE_REPORT.md](COMPLIANCE_REPORT.md) - 合規報告
- [MCP 規範](https://modelcontextprotocol.io/specification/2025-11-25) - MCP 標準文檔

## 💬 支持與反饋

如有問題或建議，請通過以下方式聯繫：

- GitHub Issues: [報告問題](https://github.com/machinenativeops/validator/issues)
- Email: support@machinenativeops.com
- Discord: [MachineNativeOps Community](https://discord.gg/machinenativeops)

---

**MachineNativeOps 驗證平台** - 統一驗證，量子安全，企業級保障 🚀