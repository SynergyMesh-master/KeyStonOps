# namespace-mcp 使用範例

本目錄包含 namespace-mcp 轉換工具的使用範例。

## 📁 範例專案結構

```
examples/
├── example-project/          # 原始專案範例
│   ├── main.py              # 主程式
│   ├── utils.py             # 工具函數
│   ├── models.py            # 數據模型
│   └── requirements.txt     # 依賴清單
└── converted-project/        # 轉換後專案（執行後生成）
```

## 🚀 執行範例

### 步驟 1: 查看原始專案

```bash
# 查看原始專案結構
tree examples/example-project/

# 查看原始代碼
cat examples/example-project/main.py
```

### 步驟 2: 執行轉換

```bash
# 從專案根目錄執行
./scripts/convert.sh examples/example-project examples/converted-project

# 或使用 Python 直接調用
python3 src/converter.py examples/example-project examples/converted-project
```

### 步驟 3: 查看轉換結果

```bash
# 查看轉換後的專案結構
tree examples/converted-project/

# 查看轉換後的代碼
cat examples/converted-project/main.py

# 查看轉換報告
cat examples/converted-project/CONVERSION-REPORT.md
```

## 📊 預期轉換效果

### 原始代碼 (main.py)

```python
import requests
from flask import Flask

class DataProcessor:
    MAX_SIZE = 1000
    
    def process_data(self, input_data):
        return {'status': 'success'}
```

### 轉換後代碼 (main.py)

```python
# Copyright (c) 2024 MachineNativeOps. All rights reserved.
# Licensed under the MachineNativeOps Enterprise License v1.0.

import machine_native_http
from machine_native_web import Flask

class MachineNativeDataProcessor:
    MNOPS_MAX_SIZE = 1000
    
    def mnops_process_data(self, input_data):
        return {'status': 'success'}
```

## 🎯 轉換層級示例

### 1. 命名空間對齊

| 原始 | 轉換後 |
|------|--------|
| `class DataProcessor` | `class MachineNativeDataProcessor` |
| `def process_data()` | `def mnops_process_data()` |
| `MAX_SIZE = 1000` | `MNOPS_MAX_SIZE = 1000` |

### 2. 依賴關係對齊

| 原始 | 轉換後 |
|------|--------|
| `import requests` | `import machine_native_http` |
| `from flask import Flask` | `from machine_native_web import Flask` |

### 3. 引用路徑對齊

| 原始 | 轉換後 |
|------|--------|
| `from utils import helper` | `from machine_native.utils import helper` |
| `from models import User` | `from machine_native.models import User` |

### 4. 結構佈局對齊

| 原始 | 轉換後 |
|------|--------|
| `src/main.py` | `lib/main.py` |
| `docs/README.md` | `documentation/README.md` |

### 5. 治理合規對齊

- ✅ 添加版權頭
- ✅ 更新許可證
- ✅ 生成審計跟踪
- ✅ SLSA L3+ 合規

## 📈 轉換報告示例

```markdown
# MachineNativeOps 專案轉換報告

## 📊 轉換摘要
- **總文件數**: 4
- **總變更數**: 23
- **成功層級**: 6/6

## 🎯 層級轉換結果
| 治理層級 | 文件數 | 變更數 | 狀態 |
|----------|--------|--------|------|
| namespace | 4 | 8 | ✅ |
| dependency | 2 | 4 | ✅ |
| reference | 3 | 6 | ✅ |
| structure | 4 | 0 | ✅ |
| semantic | 3 | 5 | ✅ |
| governance | 4 | 4 | ✅ |
```

## 🔍 比對工具

### 使用 diff 比對

```bash
# 比對單個文件
diff examples/example-project/main.py examples/converted-project/main.py

# 比對整個目錄
diff -r examples/example-project/ examples/converted-project/
```

### 使用 git diff

```bash
# 初始化 git 倉庫
cd examples/example-project
git init
git add .
git commit -m "Original project"

# 複製轉換後的文件
cp -r ../converted-project/* .

# 查看變更
git diff
```

## 🧪 驗證轉換結果

### 檢查語法正確性

```bash
# Python 語法檢查
python3 -m py_compile examples/converted-project/main.py

# 或使用 pylint
pylint examples/converted-project/main.py
```

### 檢查導入完整性

```bash
# 測試導入
cd examples/converted-project
python3 -c "import main"
```

### 檢查功能等價性

```bash
# 運行原始專案
cd examples/example-project
python3 main.py > /tmp/original_output.txt

# 運行轉換後專案
cd examples/converted-project
python3 main.py > /tmp/converted_output.txt

# 比對輸出
diff /tmp/original_output.txt /tmp/converted_output.txt
```

## 📚 更多範例

### 範例 1: JavaScript 專案

```bash
# 創建 JavaScript 專案範例
mkdir -p examples/js-project
cat > examples/js-project/index.js << 'EOF'
const express = require('express');
const axios = require('axios');

class ApiClient {
    async fetchData(url) {
        const response = await axios.get(url);
        return response.data;
    }
}

module.exports = ApiClient;
EOF

# 執行轉換
./scripts/convert.sh examples/js-project examples/js-converted
```

### 範例 2: 多語言專案

```bash
# 創建多語言專案
mkdir -p examples/polyglot-project/{python,javascript,java}

# 執行轉換
./scripts/convert.sh examples/polyglot-project examples/polyglot-converted
```

## 🎓 學習資源

- [架構設計文檔](../docs/architecture.md)
- [使用指南](../docs/usage.md)
- [API 文檔](../docs/api.md)

---

**範例版本**: 1.0.0  
**最後更新**: 2024-01-09