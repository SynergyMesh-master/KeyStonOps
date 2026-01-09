# 貢獻指南

感謝您對 namespace-mcp 專案的關注！我們歡迎社群貢獻。

## 📋 目錄

- [行為準則](#行為準則)
- [如何貢獻](#如何貢獻)
- [開發流程](#開發流程)
- [代碼規範](#代碼規範)
- [提交規範](#提交規範)
- [測試要求](#測試要求)
- [文檔要求](#文檔要求)

## 🤝 行為準則

### 我們的承諾

為了營造開放和友好的環境，我們承諾：

- 使用友好和包容的語言
- 尊重不同的觀點和經驗
- 優雅地接受建設性批評
- 關注對社群最有利的事情
- 對其他社群成員表示同理心

### 不可接受的行為

- 使用性化的語言或圖像
- 挑釁、侮辱或貶損性評論
- 公開或私下騷擾
- 未經許可發布他人的私人信息
- 其他在專業環境中不適當的行為

## 🚀 如何貢獻

### 報告 Bug

在提交 Bug 報告前，請：

1. 檢查是否已有相同的 Issue
2. 確認問題可重現
3. 收集相關信息

Bug 報告應包含：

- 清晰的標題和描述
- 重現步驟
- 預期行為
- 實際行為
- 環境信息（OS、Python 版本等）
- 相關日誌或截圖

### 建議新功能

功能建議應包含：

- 清晰的用例說明
- 預期的行為
- 可能的實現方案
- 對現有功能的影響

### 提交 Pull Request

1. Fork 專案
2. 創建功能分支
3. 實現變更
4. 添加測試
5. 更新文檔
6. 提交 PR

## 🔧 開發流程

### 環境設置

```bash
# 克隆專案
git clone https://github.com/machine-native-ops/namespace-mcp.git
cd namespace-mcp

# 創建虛擬環境
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# 或
venv\Scripts\activate  # Windows

# 安裝依賴
pip install -r requirements-dev.txt
```

### 分支策略

- `main`: 穩定版本
- `develop`: 開發版本
- `feature/*`: 新功能分支
- `bugfix/*`: Bug 修復分支
- `hotfix/*`: 緊急修復分支

### 開發工作流

```bash
# 1. 創建功能分支
git checkout -b feature/amazing-feature

# 2. 進行開發
# ... 編寫代碼 ...

# 3. 運行測試
./scripts/test.sh

# 4. 提交變更
git add .
git commit -m "feat: add amazing feature"

# 5. 推送分支
git push origin feature/amazing-feature

# 6. 創建 Pull Request
```

## 📝 代碼規範

### Python 代碼風格

遵循 [PEP 8](https://www.python.org/dev/peps/pep-0008/) 規範：

```python
# 好的示例
class MachineNativeConverter:
    """轉換器類"""
    
    def __init__(self, config_path: Optional[str] = None):
        """初始化轉換器"""
        self.config = self._load_config(config_path)
    
    def convert_project(self, source: str, target: str) -> Dict[str, Any]:
        """執行專案轉換"""
        # 實現邏輯
        pass
```

### 命名規範

- **類名**: PascalCase (例: `MachineNativeConverter`)
- **函數名**: snake_case (例: `convert_project`)
- **常量**: UPPER_CASE (例: `MAX_WORKERS`)
- **私有方法**: 前綴下劃線 (例: `_load_config`)

### 文檔字符串

使用 Google 風格的文檔字符串：

```python
def convert_project(source: str, target: str) -> Dict[str, Any]:
    """執行專案轉換
    
    Args:
        source: 源專案路徑
        target: 目標專案路徑
    
    Returns:
        轉換結果字典，包含各層級的轉換統計
    
    Raises:
        ValueError: 當源路徑不存在時
    """
    pass
```

### 類型提示

使用類型提示增強代碼可讀性：

```python
from typing import Dict, List, Optional, Tuple

def process_files(
    files: List[Path],
    config: Dict[str, Any]
) -> Tuple[int, int]:
    """處理文件列表"""
    pass
```

## 📋 提交規範

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 類型

- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔變更
- `style`: 代碼格式（不影響功能）
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 構建/工具變更

### 示例

```
feat(converter): add semantic alignment layer

- Implement semantic analysis using AST
- Add LLM integration for semantic understanding
- Update tests for semantic layer

Closes #123
```

## 🧪 測試要求

### 測試覆蓋率

- 單元測試覆蓋率 ≥ 80%
- 集成測試覆蓋核心流程
- 所有 PR 必須包含測試

### 運行測試

```bash
# 運行所有測試
./scripts/test.sh

# 運行特定測試
python3 -m pytest tests/test_converter.py -v

# 生成覆蓋率報告
python3 -m pytest --cov=src tests/
```

### 測試示例

```python
def test_namespace_conversion(self):
    """測試命名空間轉換"""
    # Arrange
    test_file = self.source_dir / "test.py"
    test_file.write_text("class DataProcessor:\n    pass")
    
    # Act
    results = self.converter.convert_project(
        str(self.source_dir),
        str(self.target_dir)
    )
    
    # Assert
    self.assertTrue(results["namespace"].success)
    converted_file = self.target_dir / "test.py"
    content = converted_file.read_text()
    self.assertIn("MachineNativeDataProcessor", content)
```

## 📚 文檔要求

### 文檔類型

- **代碼文檔**: 所有公開 API 必須有文檔字符串
- **使用文檔**: 新功能需要更新使用指南
- **架構文檔**: 重大變更需要更新架構文檔
- **範例**: 新功能應提供使用範例

### 文檔風格

- 使用清晰、簡潔的語言
- 提供實用的範例
- 包含必要的截圖或圖表
- 保持文檔與代碼同步

## 🔍 代碼審查

### 審查清單

- [ ] 代碼符合風格規範
- [ ] 包含適當的測試
- [ ] 測試全部通過
- [ ] 文檔已更新
- [ ] Commit message 符合規範
- [ ] 無明顯的性能問題
- [ ] 無安全漏洞

### 審查流程

1. 自動化檢查（CI/CD）
2. 代碼審查（至少 1 人）
3. 測試驗證
4. 文檔審查
5. 合併到主分支

## 🎯 優先級

### 高優先級

- 安全漏洞修復
- 關鍵 Bug 修復
- 性能優化
- 文檔改進

### 中優先級

- 新功能開發
- 代碼重構
- 測試增強

### 低優先級

- 代碼風格調整
- 註釋改進
- 小型優化

## 📞 聯繫方式

- **Email**: dev@machinenativeops.com
- **Discord**: [加入社群](https://discord.gg/machinenativeops)
- **GitHub Issues**: [提交 Issue](https://github.com/machine-native-ops/namespace-mcp/issues)

## 📄 許可證

貢獻的代碼將採用與專案相同的許可證（MachineNativeOps Enterprise License v1.0）。

---

**感謝您的貢獻！** 🎉

每一個貢獻都讓 namespace-mcp 變得更好。