# MCP Level 1 教程

歡迎來到 MCP Level 1 教程系列！這些教程將引導您從基礎到高級，全面掌握 MCP Level 1 的使用。

## 📚 教程列表

### 初級教程

#### [01. 入門指南](./01-getting-started.md) ⭐
**時間**: 30 分鐘  
**難度**: 初級

學習 MCP Level 1 的基礎知識：
- 理解核心概念
- 創建第一個 artifact
- 使用驗證工具
- 理解命名規範

#### [02. Schema 定義](./02-schema-definition.md) ⭐⭐
**時間**: 45 分鐘  
**難度**: 初級-中級

學習如何定義 artifact 結構：
- JSON Schema 基礎
- 定義數據結構
- 驗證規則
- Schema 最佳實踐

#### [03. 治理和政策](./03-governance-policies.md) ⭐⭐
**時間**: 45 分鐘  
**難度**: 中級

學習治理框架和政策管理：
- 治理框架概述
- 創建政策
- 角色和權限
- 合規檢查

### 中級教程

#### [04. 工具鏈集成](./04-toolchain-integration.md) ⭐⭐⭐
**時間**: 60 分鐘  
**難度**: 中級

學習如何集成 MCP 工具鏈：
- 使用 MCP Validator
- 自動化驗證
- CI/CD 集成
- 工具鏈最佳實踐

#### [05. 依賴管理](./05-dependency-management.md) ⭐⭐⭐
**時間**: 60 分鐘  
**難度**: 中級

學習依賴管理和版本控制：
- 聲明依賴
- 版本控制策略
- 依賴解析
- 衝突處理

#### [06. 命名空間驗證](./06-namespace-verification.md) ⭐⭐⭐
**時間**: 45 分鐘  
**難度**: 中級

學習命名空間所有權驗證：
- GitHub OAuth 驗證
- DNS TXT 記錄驗證
- HTTP Well-Known 驗證
- 安全最佳實踐

### 高級教程

#### [07. 完整應用開發](./07-full-application.md) ⭐⭐⭐⭐
**時間**: 90 分鐘  
**難度**: 高級

構建一個完整的 MCP 應用：
- 多 artifact 應用
- 複雜依賴管理
- 完整治理實施
- 生產部署

#### [08. 自定義工具開發](./08-custom-tools.md) ⭐⭐⭐⭐
**時間**: 120 分鐘  
**難度**: 高級

開發自定義 MCP 工具：
- 工具開發框架
- 擴展驗證器
- 自定義檢查器
- 工具發佈

#### [09. 企業級部署](./09-enterprise-deployment.md) ⭐⭐⭐⭐⭐
**時間**: 120 分鐘  
**難度**: 高級

企業級 MCP 部署：
- 私有註冊表
- 企業治理
- 大規模部署
- 監控和審計

## 🎓 學習路徑

### 路徑 1: 快速入門（2-3 小時）
```
01. 入門指南
    ↓
02. Schema 定義
    ↓
04. 工具鏈集成
```

### 路徑 2: 完整學習（8-10 小時）
```
01. 入門指南
    ↓
02. Schema 定義
    ↓
03. 治理和政策
    ↓
04. 工具鏈集成
    ↓
05. 依賴管理
    ↓
06. 命名空間驗證
    ↓
07. 完整應用開發
```

### 路徑 3: 企業開發者（12-15 小時）
```
完整學習路徑
    ↓
08. 自定義工具開發
    ↓
09. 企業級部署
```

## 📖 教程格式

每個教程包含：

- **📚 概述**: 教程目標和內容
- **🎯 學習目標**: 完成後您將掌握的技能
- **📝 步驟指南**: 詳細的操作步驟
- **💡 最佳實踐**: 專業建議和技巧
- **🧪 實踐練習**: 動手練習題
- **🎯 檢查點**: 自我評估清單
- **📚 下一步**: 後續學習建議

## 🛠️ 前置要求

### 軟件要求

- Python 3.9+
- Git
- 文本編輯器（VS Code 推薦）
- 終端/命令行工具

### 知識要求

- 基本的 YAML 語法
- 基本的命令行操作
- 基本的 Git 操作
- （可選）JSON Schema 基礎

### 安裝工具

```bash
# 克隆倉庫
git clone https://github.com/MachineNativeOps/machine-native-ops.git
cd machine-native-ops/00-namespaces/namespaces-mcp/level1

# 安裝工具依賴
cd tools
pip install -r requirements.txt
cd ..

# 驗證安裝
python3 tools/validator.py --help
```

## 📂 教程資源

### 示例代碼

所有教程的示例代碼位於 `examples/` 目錄：

- `basic-artifact/` - 基本 artifact 示例
- `schema-example/` - Schema 定義示例
- `policy-example/` - Policy 定義示例
- `full-application/` - 完整應用示例

### 參考文檔

- [Level 1 Core 文檔](../core/README.md)
- [Level 1 Governance 文檔](../governance/README.md)
- [工具鏈文檔](../tools/README.md)

## 🎯 學習建議

### 對於初學者

1. 從 [01. 入門指南](./01-getting-started.md) 開始
2. 完成每個教程的實踐練習
3. 使用示例代碼進行實驗
4. 遇到問題時查閱參考文檔

### 對於有經驗的開發者

1. 快速瀏覽初級教程
2. 重點學習中級和高級教程
3. 嘗試自定義工具開發
4. 考慮企業級部署場景

### 對於架構師

1. 理解整體架構和設計原則
2. 重點學習治理和政策
3. 研究企業級部署
4. 考慮與現有系統的集成

## 💡 學習技巧

### 1. 動手實踐

不要只是閱讀，要實際操作：
```bash
# 創建自己的 artifacts
# 運行驗證工具
# 修改和實驗
```

### 2. 理解原理

理解為什麼這樣設計：
- 為什麼使用 reverse-DNS 命名？
- 為什麼需要語義版本控制？
- 為什麼要聲明依賴？

### 3. 參考示例

學習示例代碼：
```bash
# 查看示例
cd examples/basic-artifact
cat manifest.yaml

# 運行驗證
python3 ../../tools/validator.py --artifact manifest.yaml
```

### 4. 循序漸進

按順序學習教程，不要跳過基礎內容。

## 🤝 獲取幫助

### 遇到問題？

1. **查閱文檔**: 先查看相關文檔
2. **檢查示例**: 參考示例代碼
3. **運行驗證**: 使用工具檢查錯誤
4. **搜索問題**: 查看常見問題解答

### 常見問題

#### Q: 我的 artifact 驗證失敗了怎麼辦？

A: 運行驗證器查看詳細錯誤：
```bash
python3 tools/validator.py --artifact your-artifact.yaml --format json
```

#### Q: 如何選擇正確的命名空間？

A: 使用您擁有的域名或 GitHub 用戶名：
- GitHub: `io.github.username`
- 公司域名: `com.company`
- 組織: `org.organization`

#### Q: 什麼時候應該升級主版本號？

A: 當您做出破壞性變更時：
- 刪除字段
- 更改字段類型
- 更改 API 行為
- 不兼容的依賴更新

## 📊 進度追蹤

使用這個清單追蹤您的學習進度：

- [ ] 01. 入門指南
- [ ] 02. Schema 定義
- [ ] 03. 治理和政策
- [ ] 04. 工具鏈集成
- [ ] 05. 依賴管理
- [ ] 06. 命名空間驗證
- [ ] 07. 完整應用開發
- [ ] 08. 自定義工具開發
- [ ] 09. 企業級部署

## 🎓 認證

完成所有教程後，您將掌握：

- ✅ MCP Level 1 核心概念
- ✅ Artifact 創建和管理
- ✅ 治理和合規
- ✅ 工具鏈使用
- ✅ 最佳實踐

## 🔗 相關資源

- [MCP Registry 官方文檔](https://modelcontextprotocol.info/tools/registry/)
- [MCP 規範](https://model-context-protocol.github.io/specification/)
- [命名標準](https://github.com/modelcontextprotocol/registry/blob/main/docs/explanations/namespacing.md)

## 📝 反饋

您的反饋很重要！如果您有：
- 教程改進建議
- 發現錯誤或不清楚的地方
- 想要更多主題的教程

請創建 GitHub Issue 或 Pull Request。

---

**教程系列版本**: 1.0.0  
**最後更新**: 2024-01-11  
**總教程數**: 9  
**總學習時間**: 10-15 小時