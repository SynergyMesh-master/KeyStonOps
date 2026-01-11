# Level 3 & Level 4 目錄合併分析報告

## 執行時間
2024-01-11

## 問題描述
在 `namespaces-mcp/` 目錄下發現重複的目錄結構：
- `level3/` 和 `mcp-level3/`
- `level4/` 和 `mcp-level4/`

這些目錄包含相似但不完全相同的內容，需要合併以避免混淆和維護問題。

## Level 3 詳細差異分析

### level3/ 獨有內容
```
- README.md (重要文檔)
- dag/ (子目錄)
- observability/ (子目錄)
- security/ (子目錄)
- engines/dag/dependency/ (子目錄)
- engines/dag/lineage/ (子目錄)
- engines/execution/context/ (子目錄)
- engines/execution/observability/ (子目錄)
- engines/execution/retry/ (子目錄)
- engines/execution/rollback/ (子目錄)
- engines/execution/transaction/ (子目錄)
- engines/execution/trigger/ (子目錄)
- engines/governance/abac/ (子目錄)
- engines/governance/audit/ (子目錄)
- engines/governance/security/ (子目錄)
- engines/promotion/approval/ (子目錄)
- engines/promotion/canary/ (子目錄)
- engines/promotion/manager/ (子目錄)
- engines/promotion/version/ (子目錄)
- engines/registry/metadata/ (子目錄)
- engines/registry/schema/ (子目錄)
- engines/registry/triplet/ (子目錄)
- engines/registry/vector/ (子目錄)
- engines/taxonomy/coreference/ (子目錄)
- engines/taxonomy/disambiguation/ (子目錄)
- engines/taxonomy/ontology/ (子目錄)
- engines/taxonomy/relationship/ (子目錄)
- engines/taxonomy/version/ (子目錄)
- engines/validation/faithfulness/ (子目錄)
- engines/validation/policy/ (子目錄)
- engines/validation/precision/ (子目錄)
- engines/validation/recall/ (子目錄)
- engines/validation/regression/ (子目錄)
- engines/validation/relevance/ (子目錄)
- engines/validation/schema/ (子目錄)
- engines/validation/shacl/ (子目錄)
```

### mcp-level3/ 獨有內容
```
- .github/ (GitHub 配置)
- docs/reports/ (子目錄)
```

### 共同但內容不同的文件
```
- docs/DEPLOYMENT-GUIDE.md
- docs/MCP-LEVEL3-COMPLETION-REPORT.md
- docs/deployment-guide.md
- docs/user-guide.md
- engines/*/各種 .yaml 文件
- tests/*/各種測試文件
- visualizations/interactive-dashboard.html
```

## Level 4 詳細差異分析

### level4/ 獨有內容
```
- README.md (重要文檔)
- k8s/ (Kubernetes 配置目錄)
- src/autonomy/ (自主性相關代碼)
```

### mcp-level4/ 獨有內容
```
- .eslintrc.json (ESLint 配置)
- .github/ (GitHub 配置)
- .prettierrc.json (Prettier 配置)
```

### 共同但內容不同的文件
```
- MCP-LEVEL4-FINAL-STATUS.md
- PHASE1-COMPLETION-REPORT.md
- PHASE1-FINAL-COMPLETION.md
- PHASE1-PROGRESS.md
- SESSION-COMPLETION-REPORT.md
- docs/LEVEL4-ARCHITECTURE-OVERVIEW.md
```

## 合併策略

### Level 3 合併策略
1. **保留 level3/ 作為主目錄**（因為它有更完整的子目錄結構）
2. **從 mcp-level3/ 複製獨有內容**：
   - 複製 `.github/` 目錄
   - 複製 `docs/reports/` 目錄
3. **合併文件內容**：
   - 對於內容不同的文件，需要逐一比較並選擇最新/最完整的版本
   - 優先保留 level3/ 的版本（因為它是較新的結構）
4. **刪除 mcp-level3/**

### Level 4 合併策略
1. **保留 level4/ 作為主目錄**（因為它有 k8s 和 autonomy 等重要內容）
2. **從 mcp-level4/ 複製獨有內容**：
   - 複製 `.eslintrc.json`
   - 複製 `.github/` 目錄
   - 複製 `.prettierrc.json`
3. **合併文件內容**：
   - 對於內容不同的文件，需要逐一比較並選擇最新/最完整的版本
   - 優先保留 level4/ 的版本
4. **刪除 mcp-level4/**

## 風險評估

### 高風險項目
- YAML 配置文件的差異可能影響系統行為
- 測試文件的差異可能導致測試失敗
- 文檔內容的差異可能造成信息不一致

### 中風險項目
- GitHub 配置的遺失可能影響 CI/CD
- ESLint/Prettier 配置的遺失可能影響代碼質量檢查

### 低風險項目
- README 文件的添加不會影響功能
- 子目錄的添加不會影響現有功能

## 建議的執行順序

1. **先處理配置文件**（低風險）
   - 複製 .github, .eslintrc.json, .prettierrc.json
   
2. **再處理文檔文件**（低風險）
   - 複製 README.md
   - 合併差異的文檔

3. **最後處理 YAML 和代碼文件**（高風險）
   - 仔細比較每個 YAML 文件
   - 運行測試驗證

4. **更新所有引用**
   - 搜索並替換路徑引用

5. **刪除舊目錄**
   - 確認所有內容已合併後再刪除

## 驗證清單

合併完成後需要驗證：
- [ ] 所有獨有的子目錄都已複製
- [ ] 所有配置文件都已複製
- [ ] 文檔內容已合併且一致
- [ ] YAML 文件已更新到最新版本
- [ ] 測試文件已更新
- [ ] 所有路徑引用已更新
- [ ] namespace-index.yaml 已更新
- [ ] 運行測試確認功能正常

## 回滾計劃

如果合併出現問題：
1. 從備份恢復：`level3-level4-backup-*.tar.gz`
2. 重新評估合併策略
3. 逐步進行合併，每步都進行驗證

## 下一步行動

1. 創建新的 Git 分支
2. 執行 Level 3 合併
3. 執行 Level 4 合併
4. 更新所有引用
5. 運行測試
6. 創建 Pull Request