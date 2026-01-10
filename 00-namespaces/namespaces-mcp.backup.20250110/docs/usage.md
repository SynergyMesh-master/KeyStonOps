# namespace-mcp 使用指南

## 🚀 快速開始

### 安裝

```bash
# 克隆專案
git clone https://github.com/machine-native-ops/namespace-mcp.git
cd namespace-mcp

# 確認 Python 版本
python3 --version  # 需要 3.8+
```

### 基本使用

```bash
# 最簡單的用法
./scripts/convert.sh /path/to/source/project /path/to/target

# 查看轉換報告
cat /path/to/target/CONVERSION-REPORT.md
```

## 📖 詳細使用說明

### 命令行接口

#### 基本語法

```bash
./scripts/convert.sh <source_path> <target_path> [options]
```

#### 參數說明

| 參數 | 說明 | 必需 |
|------|------|------|
| `source_path` | 源專案路徑 | ✅ |
| `target_path` | 目標專案路徑 | ✅ |

#### 選項說明

| 選項 | 簡寫 | 說明 | 默認值 |
|------|------|------|--------|
| `--config` | `-c` | 配置文件路徑 | `config/conversion.yaml` |
| `--verbose` | `-v` | 詳細輸出模式 | `false` |
| `--dry-run` | `-d` | 乾跑模式（不修改文件） | `false` |
| `--help` | `-h` | 顯示幫助信息 | - |

### 使用範例

#### 範例 1: 基本轉換

```bash
# 轉換一個 Python 專案
./scripts/convert.sh ~/projects/my-python-app ~/converted/my-python-app
```

**預期輸出**:
```
================================================
 MachineNativeOps 命名空間 MCP 轉換工具
================================================

  版本: 1.0.0
  SLSA 等級: L3+
  MCP 協議: 2024.1

================================================
 專案信息
================================================

  源專案路徑: /home/user/projects/my-python-app
  目標專案路徑: /home/user/converted/my-python-app
  配置文件: config/conversion.yaml
  詳細模式: false
  乾跑模式: false

[INFO] 驗證執行環境...
[SUCCESS] 環境驗證通過
[INFO] 執行轉換命令...
[SUCCESS] 轉換執行成功

================================================
 轉換摘要
================================================

  📊 總文件數: 156
  🔄 總變更數: 423
  ✅ 成功層級: 6/6

  📝 詳細報告: /home/user/converted/my-python-app/CONVERSION-REPORT.md
  📋 JSON 報告: /home/user/converted/my-python-app/conversion-report.json

================================================
 轉換完成
================================================

[SUCCESS] 🎉 專案轉換成功完成！
```

#### 範例 2: 使用自定義配置

```bash
# 創建自定義配置
cat > my-config.yaml << EOF
enterprise:
  prefix: "mycompany"
  namespace: "mc"
  domain: "mycompany.com"

namespace_rules:
  class_naming:
    prefix: "MyCompany"
EOF

# 使用自定義配置轉換
./scripts/convert.sh ~/projects/app ~/converted/app --config my-config.yaml
```

#### 範例 3: 乾跑模式（預覽變更）

```bash
# 預覽轉換效果，不實際修改文件
./scripts/convert.sh ~/projects/app ~/converted/app --dry-run
```

**輸出**:
```
[INFO] 🚀 乾跑模式 - 模擬專案轉換

[INFO] 將執行以下治理層級轉換:
  1. 命名空間對齊 (Namespace Alignment)
  2. 依賴關係對齊 (Dependency Alignment)
  3. 引用路徑對齊 (Reference Alignment)
  4. 結構佈局對齊 (Structure Alignment)
  5. 語意對齊 (Semantic Alignment)
  6. 治理合規對齊 (Governance Alignment)

[SUCCESS] 乾跑模式完成 - 未實際修改文件
```

#### 範例 4: 詳細輸出模式

```bash
# 啟用詳細日誌輸出
./scripts/convert.sh ~/projects/app ~/converted/app --verbose
```

#### 範例 5: Python API 使用

```python
from namespace_mcp.converter import MachineNativeConverter

# 創建轉換器實例
converter = MachineNativeConverter(config_path="config/conversion.yaml")

# 執行轉換
results = converter.convert_project(
    source_path="/path/to/source",
    target_path="/path/to/target"
)

# 查看結果
for layer, result in results.items():
    print(f"{layer}: {result.changes_made} changes")
```

## 🎯 六層轉換詳解

### 1. 命名空間對齊

**目標**: 統一類名、方法名、變數名

**轉換示例**:

```python
# 轉換前
class DataProcessor:
    def process_data(self):
        MAX_SIZE = 1000
        return self.data

# 轉換後
class MachineNativeDataProcessor:
    def mnops_process_data(self):
        MNOPS_MAX_SIZE = 1000
        return self.data
```

**配置**:

```yaml
namespace_rules:
  class_naming:
    prefix: "MachineNative"
  method_naming:
    prefix: "mnops_"
  constant_naming:
    prefix: "MNOPS_"
```

### 2. 依賴關係對齊

**目標**: 映射外部依賴到企業內部實現

**轉換示例**:

```python
# 轉換前
import django
from flask import Flask
import requests

# 轉換後
import machine_native_web
from machine_native_web import Flask
import machine_native_http
```

**配置**:

```yaml
dependency_mapping:
  python:
    django: "machine-native-web"
    flask: "machine-native-web"
    requests: "machine-native-http"
```

### 3. 引用路徑對齊

**目標**: 標準化導入和引用路徑

**轉換示例**:

```python
# 轉換前
from utils import helper
from .models import User

# 轉換後
from machine_native.utils import helper
from machine_native.models import User
```

**配置**:

```yaml
reference_rules:
  python:
    - pattern: "from\\s+([.\\w]+)\\s+import"
      replacement: "from machine_native.\\1 import"
```

### 4. 結構佈局對齊

**目標**: 重組專案目錄結構

**轉換示例**:

```
轉換前:
project/
├── src/
│   ├── main.py
│   └── utils.py
├── docs/
│   └── README.md
└── test/
    └── test_main.py

轉換後:
project/
├── lib/
│   ├── main.py
│   └── utils.py
├── documentation/
│   └── README.md
└── tests/
    └── test_main.py
```

**配置**:

```yaml
structure_rules:
  directory_mapping:
    "src": "lib"
    "docs": "documentation"
    "test": "tests"
```

### 5. 語意對齊

**目標**: 確保程式碼語意一致性

**轉換示例**:

```python
# 轉換前
def processData(input):
    return input.upper()

# 轉換後
def mnops_process_data(input):
    """
    處理數據並轉換為大寫
    
    Args:
        input: 輸入數據
    
    Returns:
        處理後的數據
    """
    return input.upper()
```

### 6. 治理合規對齊

**目標**: 強制執行企業治理規範

**轉換示例**:

```python
# 轉換前
# main.py

def main():
    pass

# 轉換後
# Copyright (c) 2024 MachineNativeOps. All rights reserved.
# Licensed under the MachineNativeOps Enterprise License v1.0.
#
# This file is part of the MachineNativeOps namespace-mcp project.

def main():
    pass
```

## ⚙️ 配置文件詳解

### 主配置文件 (conversion.yaml)

```yaml
# 企業配置
enterprise:
  prefix: "machine-native"      # 企業前綴
  namespace: "mnops"            # 命名空間
  domain: "machinenativeops.com" # 企業域名

# 命名空間規則
namespace_rules:
  class_naming:
    prefix: "MachineNative"
    case_style: "PascalCase"
  
  method_naming:
    prefix: "mnops_"
    case_style: "snake_case"

# 依賴映射
dependency_mapping:
  python:
    django: "machine-native-web"
    flask: "machine-native-web"
  
  javascript:
    express: "machine-native-server"
    react: "machine-native-ui"

# 文件類型
file_types:
  source_code:
    - ".py"
    - ".js"
    - ".ts"
  
  config_files:
    - ".json"
    - ".yaml"

# 性能配置
performance:
  max_workers: 8
  chunk_size: 100
  timeout: 600
```

### MCP 規則文件 (mcp-rules.yaml)

```yaml
# MCP 協議配置
mcp_protocol:
  version: "2024.1"
  compliance_level: "strict"

# MCP 工具規則
tools:
  naming_convention: "machine-native-{tool-name}"

# MCP 資源規則
resources:
  path_prefix: "machine-native-resources"
  uri_scheme: "mnops"

# MCP 提示規則
prompts:
  path_prefix: "machine-native-prompts"
```

### 治理規則文件 (governance.yaml)

```yaml
# 許可證管理
license:
  default_license: "MachineNativeOps Enterprise License v1.0"
  
  allowed_source_licenses:
    - "MIT"
    - "Apache-2.0"
    - "BSD-3-Clause"

# 安全合規
security:
  level: "maximum"
  
  standards:
    - "SLSA-L3"
    - "Zero-Trust"
    - "ISO27001"

# 審計配置
audit:
  enabled: true
  level: "detailed"
  retention: "permanent"
```

## 📊 輸出報告解讀

### Markdown 報告 (CONVERSION-REPORT.md)

```markdown
# MachineNativeOps 專案轉換報告

## 📊 轉換摘要
- **轉換版本**: 1.0.0
- **轉換時間**: 2024-01-09T12:00:00Z
- **總文件數**: 156
- **總變更數**: 423
- **成功層級**: 6/6

## 🎯 層級轉換結果
| 治理層級 | 文件數 | 變更數 | 狀態 |
|----------|--------|--------|------|
| namespace | 156 | 189 | ✅ |
| dependency | 45 | 89 | ✅ |
| reference | 120 | 204 | ✅ |
| structure | 78 | 56 | ✅ |
| semantic | 92 | 134 | ✅ |
| governance | 156 | 156 | ✅ |
```

### JSON 報告 (conversion-report.json)

```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-09T12:00:00Z",
  "conversion_results": {
    "namespace": {
      "files_processed": 156,
      "changes_made": 189,
      "success": true,
      "details": {
        "class_names": 45,
        "method_names": 89,
        "constant_names": 55
      }
    }
  },
  "summary": {
    "total_files": 156,
    "total_changes": 423,
    "successful_layers": 6,
    "total_layers": 6
  },
  "ssot_hash": "a1b2c3d4..."
}
```

## 🔍 故障排除

### 常見問題

#### 問題 1: Python 版本不符

**錯誤信息**:
```
[ERROR] 需要 Python 3.8 或更高版本 (當前: 3.7)
```

**解決方案**:
```bash
# 升級 Python
sudo apt update
sudo apt install python3.11

# 或使用 pyenv
pyenv install 3.11.0
pyenv global 3.11.0
```

#### 問題 2: 配置文件不存在

**錯誤信息**:
```
[WARNING] 配置文件不存在: config/conversion.yaml，將使用默認配置
```

**解決方案**:
```bash
# 複製範例配置
cp config/conversion.yaml.example config/conversion.yaml

# 或創建新配置
cat > config/conversion.yaml << EOF
enterprise:
  prefix: "machine-native"
  namespace: "mnops"
EOF
```

#### 問題 3: 權限不足

**錯誤信息**:
```
[ERROR] Permission denied: /path/to/target
```

**解決方案**:
```bash
# 修改目標目錄權限
sudo chown -R $USER:$USER /path/to/target

# 或使用 sudo 執行
sudo ./scripts/convert.sh /path/to/source /path/to/target
```

#### 問題 4: 文件編碼問題

**錯誤信息**:
```
UnicodeDecodeError: 'utf-8' codec can't decode byte
```

**解決方案**:
```bash
# 轉換文件編碼
find /path/to/source -type f -name "*.py" -exec iconv -f ISO-8859-1 -t UTF-8 {} -o {}.utf8 \;

# 或在配置中指定編碼
# (需要修改源代碼支持)
```

### 調試技巧

#### 啟用詳細日誌

```bash
# 使用 --verbose 選項
./scripts/convert.sh /path/to/source /path/to/target --verbose

# 或設置環境變數
export LOG_LEVEL=DEBUG
./scripts/convert.sh /path/to/source /path/to/target
```

#### 查看轉換日誌

```bash
# 實時查看日誌
tail -f conversion.log

# 搜索錯誤
grep ERROR conversion.log

# 統計變更
grep "changes_made" conversion-report.json | jq '.changes_made' | awk '{sum+=$1} END {print sum}'
```

## 🎓 最佳實踐

### 1. 轉換前準備

```bash
# 1. 備份源專案
cp -r /path/to/source /path/to/source.backup

# 2. 驗證源專案完整性
find /path/to/source -type f | wc -l

# 3. 檢查磁盤空間
df -h /path/to/target
```

### 2. 分階段轉換

```bash
# 先乾跑預覽
./scripts/convert.sh /path/to/source /path/to/target --dry-run

# 再執行實際轉換
./scripts/convert.sh /path/to/source /path/to/target

# 最後驗證結果
diff -r /path/to/source /path/to/target
```

### 3. 自定義配置

```yaml
# 針對特定專案調整配置
enterprise:
  prefix: "myproject"  # 使用專案特定前綴

# 排除不需要轉換的文件
exclusions:
  paths:
    - "vendor/**"
    - "third_party/**"
```

### 4. 批量轉換

```bash
# 批量轉換多個專案
for project in ~/projects/*; do
    project_name=$(basename "$project")
    ./scripts/convert.sh "$project" "~/converted/$project_name"
done
```

### 5. CI/CD 集成

```yaml
# .github/workflows/convert.yml
name: Convert Project
on: [push]
jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Conversion
        run: |
          ./scripts/convert.sh . ./converted
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: conversion-report
          path: ./converted/CONVERSION-REPORT.md
```

## 📚 進階使用

### 自定義轉換規則

```python
# custom_rules.py
from namespace_mcp.converter import ConversionRule

custom_rule = ConversionRule(
    name="custom_transformation",
    pattern=r'my_pattern',
    replacement=r'my_replacement',
    file_types=["source_code"],
    context="custom_context",
    priority=50,
    description="自定義轉換規則"
)

# 添加到轉換器
converter.conversion_rules["custom"].append(custom_rule)
```

### 擴展驗證邏輯

```python
# custom_validator.py
def custom_validator(content: str) -> bool:
    """自定義驗證邏輯"""
    # 實現驗證邏輯
    return True

# 註冊驗證器
converter.register_validator("custom", custom_validator)
```

---

**文檔版本**: 1.0.0  
**最後更新**: 2024-01-09  
**維護者**: MachineNativeOps Documentation Team