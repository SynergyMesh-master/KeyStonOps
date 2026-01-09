# MachineNativeOps 統一驗證平台

[![MCP Compliant](https://img.shields.io/badge/MCP-2025--11--25-blue)](https://modelcontextprotocol.io)
[![Python Version](https://img.shields.io/badge/python-3.8+-green)](https://www.python.org)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)
[![Security](https://img.shields.io/badge/security-NIST%20Level%205%2B-red)](https://www.nist.gov)

## 🚀 平台簡介

MachineNativeOps 統一驗證平台是一個企業級的自動化驗證解決方案，完全符合 **MCP (Model Context Protocol) 2025-11-25** 標準，整合了文件結構驗證和 INSTANT 觸發器驗證功能，提供量子級別的安全保障。

### 核心特性

- ✅ **MCP 標準合規** - 完全符合 MCP 2025-11-25 規範
- 🔒 **量子級安全** - NIST Level 5+ 後量子安全
- ⚡ **極致性能** - <30秒部署，<1秒驗證
- 🛡️ **企業級保障** - SLSA L4+, EAL7+, Zero Trust
- 📊 **綜合驗證** - 156+ 檢查項，18 維度驗證

## 📦 快速開始

### 安裝依賴

```bash
# 安裝核心依賴
pip install cryptography pyyaml asyncio aiohttp

# 安裝可選量子組件
pip install qiskit cirq pennylane
```

### 基本使用

#### 1. 運行完整驗證

```bash
# 運行完整驗證
python tools/machinenativeops_validator.py /path/to/your/project

# 只運行文件驗證
python tools/machinenativeops_validator.py /path/to/project --type document

# 只運行 INSTANT 觸發器驗證
python tools/machinenativeops_validator.py /path/to/project --type instant

# JSON 輸出格式
python tools/machinenativeops_validator.py /path/to/project --output json

# 顯示詳細結果
python tools/machinenativeops_validator.py /path/to/project --detail
```

#### 2. MCP 工具架構

```bash
# 查看 MCP 工具架構
python tools/machinenativeops_validator.py --mcp-schema
```

### MCP 集成

#### Python 集成

```python
from tools import mcp_validate_handler

# 調用 MCP 工具
result = await mcp_validate_handler({
    "path": "/path/to/project",
    "validation_type": "all",
    "output_format": "json",
    "detail": True
})

print(result)
```

#### JSON-RPC 調用

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "machinenativeops.validator",
    "arguments": {
      "path": "/path/to/project",
      "validation_type": "all",
      "output_format": "json"
    }
  },
  "id": 1
}
```

## 🎯 核心功能

### 1. 文件結構驗證

- **目錄命名規範**: kebab-case 標準化驗證
- **文件放置驗證**: 正確的文件位置檢查
- **內容結構驗證**: Markdown、Python 等文件內容檢查
- **必需目錄驗證**: 確保項目結構完整性

### 2. INSTANT 觸發器驗證

#### 量子 9 維度

1. 命名規範標準化
2. 目錄結構完整性
3. 遺留歸檔管理
4. 臨時文件清理
5. 文檔同步驗證
6. Python 兼容性
7. 證據完整性
8. AI 合約合規
9. 治理合規評估

#### 傳統 9 大類

1. 結構合規性
2. 內容完整性
3. 路徑正確性
4. 位置一致性
5. 命名空間規範
6. 上下文統一性
7. 邏輯正確性
8. 鏈接完整性
9. 最終正確性

### 3. 統一報告系統

- **多格式輸出**: Text、JSON、YAML
- **詳細統計**: 通過率、失敗詳情、性能指標
- **不可變審計**: 區塊鏈存儲驗證記錄
- **安全合規**: SLSA L4+、NIST Level 5+ 認證

### 4. CI/CD 分析平台

企業級持續集成分析工具，提供全面的 CI/CD 流程監控：

#### 分析維度

1. **代碼質量分析**
   - 復雜度評估（圈複雜度、認知複雜度）
   - 可維護性指數
   - 代碼重複率檢測
   - 技術債務評估
   - 代碼氣味檢測

2. **構建性能分析**
   - 構建時間監控
   - 資源使用分析（CPU、記憶體）
   - 構建失敗率統計
   - 構建趨勢追蹤

3. **依賴分析**
   - Python 依賴分析（requirements.txt, setup.py, pyproject.toml）
   - JavaScript 依賴分析（package.json, yarn.lock）
   - Go 依賴分析（go.mod）
   - 依賴版本衝突檢測
   - 安全漏洞掃描

4. **安全分析**
   - SQL 注入檢測
   - XSS 跨站腳本檢測
   - 硬編碼密鑰檢測
   - 不安全加密算法檢測
   - 安全漏洞掃描

5. **測試覆蓋率分析**
   - 行覆蓋率
   - 分支覆蓋率
   - 函數覆蓋率
   - 模塊覆蓋率

#### 使用方法

```bash
# 運行完整分析
python tools/cicd_analyzer.py /path/to/project

# 運行特定分析
python tools/cicd_analyzer.py /path/to/project --analysis code_quality
python tools/cicd_analyzer.py /path/to/project --analysis build_performance
python tools/cicd_analyzer.py /path/to/project --analysis dependency
python tools/cicd_analyzer.py /path/to/project --analysis security
python tools/cicd_analyzer.py /path/to/project --analysis test_coverage

# 運行多個分析
python tools/cicd_analyzer.py /path/to/project --analysis code_quality,security,test_coverage

# 指定構建命令
python tools/cicd_analyzer.py /path/to/project --build-command "npm run build"

# 指定測試命令
python tools/cicd_analyzer.py /path/to/project --test-command "pytest"

# JSON 輸出
python tools/cicd_analyzer.py /path/to/project --output json
```

#### MCP 工具調用

```python
# 通過 MCP 調用 CI/CD 分析器
{
  "name": "machinenativeops.cicd_analyzer",
  "arguments": {
    "path": "/path/to/project",
    "analysis_types": ["code_quality", "security", "test_coverage"],
    "build_command": "npm run build",
    "test_command": "pytest"
  }
}
```

#### 健康評分

分析器會自動計算綜合健康評分（0-100）：
- 代碼質量影響：30%
- 構建性能影響：20%
- 依賴分析影響：15%
- 安全分析影響：25%
- 測試覆蓋率影響：10%

## ⚙️ 配置說明

平台使用 YAML 配置文件 (`config/machinenativeops-platform-config.yaml`):

```yaml
platform:
  name: "MachineNativeOps Validator Platform"
  version: "1.0.0"
  mcp_version: "2025-11-25"

mcp:
  namespace_prefix: "machinenativeops"
  tool_id: "machinenativeops.validator"

validation_modules:
  document_validator:
    enabled: true
  instant_trigger_validator:
    enabled: true

security:
  quantum_safe:
    enabled: true
    level: "NIST Level 5+"
```

## 📊 輸出示例

```
====================================================================================================
🤖 MachineNativeOps 統一驗證平台報告 (MCP Compliant)
====================================================================================================
🔧 平台版本: 1.0.0
📡 MCP版本: 2025-11-25
🏷️  工具ID: machinenativeops.validator
🔑 驗證ID: MNOP-VAL-a1b2c3d4-1704769200
⏰ 開始時間: 2024-01-08 10:30:00
⏱️ 結束時間: 2024-01-08 10:30:45
🚀 總用時: 45.123s
✅ 總體驗證: 通過
🛡️ 安全等級: NIST Level 5+
🔒 不可變哈希: a1b2c3d4e5f6...

📄 文件結構驗證結果:
--------------------------------------------------
📊 檢查數: 156 | ✅ 通過: 150 | ❌ 失敗: 3 | ⚠️ 警告: 3

⚡ INSTANT觸發器驗證結果:
--------------------------------------------------
📊 量子9維度: 9/9 通過
📋 傳統9大類: 9/9 通過

📈 性能指標:
--------------------------------------------------
• document_validation_time: 15.234s
• instant_validation_time: 25.678s
• total_duration: 45.123s

🎯 驗證總結:
--------------------------------------------------
✅ 所有驗證通過! 系統符合MachineNativeOps標準
🚀 準備好進行生產環境部署
📡 符合MCP標準規範
```

## 🔧 CI/CD 集成

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
      
      - name: Run MachineNativeOps Validation
        run: |
          python tools/machinenativeops_validator.py ${{ github.workspace }} \
            --type all \
            --output json \
            --detail
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
    - python tools/machinenativeops_validator.py . --type all --output json
  only:
    - merge_requests
    - master
```

## 🛠️ 高級功能

### 自動修復

```yaml
automation:
  auto_remediation:
    enabled: true
    rules:
      - name: "fix_naming_convention"
        action: "convert_to_kebab_case"
      - name: "remove_temp_files"
        action: "delete"
```

### 量子計算集成

```python
from qiskit import QuantumCircuit, execute
from qiskit_aer import AerSimulator
```

### 區塊鏈審計

```yaml
audit:
  blockchain:
    enabled: true
    network: "ethereum-mainnet"
```

## 🐛 故障排除

### 常見問題

1. **權限不足**: 確保運行用戶有足夠權限
2. **依賴缺失**: 檢查所有 Python 依賴是否安裝
3. **配置錯誤**: 驗證配置文件格式正確

### 日誌查看

```bash
# 查看日誌
python tools/machinenativeops_validator.py /path/to/project --detail

# 調試模式
python -m pdb tools/machinenativeops_validator.py /path/to/project
```

## 📈 性能優化

### 並行處理

```yaml
performance:
  concurrency:
    max_parallel_validations: 8
    max_quantum_threads: 16
```

### 資源限制

```yaml
resource_limits:
  cpu: "4"
  memory: "8Gi"
```

## 🤝 貢獻指南

歡迎貢獻代碼和提出建議：

1. Fork 項目倉庫
2. 創建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 創建 Pull Request

## 📄 許可證

Apache License 2.0 - 支持商業使用和修改

## 🔗 相關資源

- [MCP 官方文檔](https://modelcontextprotocol.io)
- [MCP 規範](https://modelcontextprotocol.io/specification/2025-11-25)
- [MachineNativeOps 文檔](https://docs.machinenativeops.com)
- [GitHub 倉庫](https://github.com/machinenativeops/validator)

## 📞 支持

如有問題或建議，請聯繫：

- Email: support@machinenativeops.com
- Discord: [MachineNativeOps Community](https://discord.gg/machinenativeops)
- GitHub Issues: [報告問題](https://github.com/machinenativeops/validator/issues)

---

**統一驗證，量子安全，企業級保障** - MachineNativeOps 驗證平台 🚀