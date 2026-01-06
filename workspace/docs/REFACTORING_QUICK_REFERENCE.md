# 三階段重構快速參考 | Three-Phase Refactoring Quick Reference

> **快速索引 (Quick Index)**: 關鍵命令、檔案路徑、決策點

---

## 🚀 快速執行 (Quick Execution)

### 完整流程 (Complete Pipeline)

```bash
# 1. 檢視計劃
cat workspace/docs/THREE_PHASE_REFACTORING_EXECUTION_PLAN.md

# 2. 試運行 (不做實際更改)
bash scripts/refactor/master-refactor.sh --dry-run

# 3. 執行重構
bash scripts/refactor/master-refactor.sh

# 4. 如需回滾
bash scripts/refactor/rollback.sh phase 3
```

### 分階段執行 (Phase-by-Phase)

```bash
# 僅執行 Phase 1 (解構)
bash scripts/refactor/master-refactor.sh --skip-phase 2 --skip-phase 3

# 僅執行 Phase 2 (集成)
bash scripts/refactor/master-refactor.sh --skip-phase 1 --skip-phase 3

# 僅執行 Phase 3 (重構)
bash scripts/refactor/master-refactor.sh --skip-phase 1 --skip-phase 2
```

---

## 📁 關鍵檔案路徑 (Key File Paths)

### 計劃文檔 (Planning Documents)

| 文件 | 路徑 | 用途 |
|------|------|------|
| **主執行計劃** | `workspace/docs/THREE_PHASE_REFACTORING_EXECUTION_PLAN.md` | 完整三階段計劃 |
| **INSTANT 計劃** | `INSTANT-EXECUTION-REFACTOR-PLAN.md` | INSTANT 執行標準 |
| **重構 Playbooks** | `workspace/docs/refactor_playbooks/README.md` | Playbooks 系統概覽 |
| **AI 行為合約** | `.github/AI-BEHAVIOR-CONTRACT.md` | AI 行為規範 |

### 執行腳本 (Execution Scripts)

| 腳本 | 路徑 | 功能 |
|------|------|------|
| **主編排腳本** | `scripts/refactor/master-refactor.sh` | 三階段主流程 |
| **回滾腳本** | `scripts/refactor/rollback.sh` | 多級別回滾 |
| **Phase 1 腳本** | `scripts/refactor/phase1-deconstruction.sh` | 解構階段 |
| **Phase 2 腳本** | `scripts/refactor/phase2-integration.sh` | 集成階段 |
| **Phase 3 腳本** | `scripts/refactor/phase3-refactor.sh` | 重構階段 |

### 驗證工具 (Validation Tools)

| 工具 | 路徑 | 功能 |
|------|------|------|
| **Phase 1 驗證器** | `tools/refactor/validate-phase1.py` | 驗證 Phase 1 交付物 |
| **Phase 2 驗證器** | `tools/refactor/validate-phase2.py` | 驗證 Phase 2 交付物 |
| **Phase 3 驗證器** | `tools/refactor/validate-phase3.py` | 驗證 Phase 3 交付物 |

### 交付物目錄 (Deliverables Directories)

| 階段 | 路徑 | 內容 |
|------|------|------|
| **解構層** | `workspace/docs/refactor_playbooks/01_deconstruction/` | 現狀分析、依賴圖 |
| **集成層** | `workspace/docs/refactor_playbooks/02_integration/` | 設計方案、API 契約 |
| **重構層** | `workspace/docs/refactor_playbooks/03_refactor/` | 執行計劃、驗證報告 |

---

## ✅ 階段檢查清單 (Phase Checklists)

### Phase 1: Deconstruction (解構)

```yaml
checklist:
  - [ ] 完成倉庫結構映射 (Repository structure map)
  - [ ] 完成依賴關係分析 (Dependency analysis)
  - [ ] 識別架構違規 (Architecture violations identified)
  - [ ] 建立舊資產索引 (Legacy assets cataloged)
  - [ ] 問題優先級排序完成 (Problem prioritization complete)
  - [ ] 所有交付物通過驗證 (All deliverables validated)
```

**驗收標準**: 100% 模組覆蓋、> 95% 依賴圖準確度、所有 P0 問題已識別

### Phase 2: Integration (集成)

```yaml
checklist:
  - [ ] 模組邊界清晰定義 (Module boundaries defined)
  - [ ] API 契約完整制定 (API contracts complete)
  - [ ] 整合策略規劃完成 (Integration strategy planned)
  - [ ] 遷移路線圖建立 (Migration roadmap created)
  - [ ] 整合測試套件就緒 (Integration tests ready)
  - [ ] Pilot 遷移驗證成功 (Pilot migration validated)
```

**驗收標準**: 100% API 覆蓋、整合測試 > 95% 通過率、Pilot 零故障

### Phase 3: Refactor (重構)

```yaml
checklist:
  - [ ] 所有 P0 項目完成 (All P0 items complete)
  - [ ] 所有 P1 項目完成 (All P1 items complete)
  - [ ] 架構合規性 100% (Architecture compliance 100%)
  - [ ] 測試覆蓋率保持 (Test coverage maintained)
  - [ ] 性能無回歸 (No performance regression)
  - [ ] 生產環境零故障 (Zero production incidents)
```

**驗收標準**: P0 100% 完成、架構 100% 合規、覆蓋率 > 80%、P95 延遲 < 100ms

---

## 🎯 關鍵決策點 (Critical Decision Points)

### D1: Phase 1 完成檢查點

```yaml
when: "Phase 1 結束時"
decision: "繼續到 Phase 2 或重做？"
criteria:
  - Phase 1 所有交付物完成
  - 問題優先級已批准
  - 依賴圖已驗證
go_criteria: "所有標準滿足"
no_go: "重做 Phase 1 並調整"
```

### D2: Pilot 驗證檢查點

```yaml
when: "Pilot 遷移後"
decision: "全面推出或調整策略？"
criteria:
  - Pilot 期間零生產故障
  - 性能指標在目標範圍內
  - 整合測試通過
go_criteria: "所有標準滿足"
no_go: "調整整合策略並重新 Pilot"
```

### D3: P0 完成檢查點

```yaml
when: "P0 項目執行後"
decision: "繼續 P1 或穩定系統？"
criteria:
  - 所有 P0 項目已解決
  - 架構合規性 100%
  - 無關鍵回歸
go_criteria: "所有標準滿足"
no_go: "穩定系統並修復回歸"
```

### D4: 最終驗證檢查點

```yaml
when: "生產部署前"
decision: "部署或回滾？"
criteria:
  - 所有驗收標準滿足
  - 健康檢查全綠
  - 回滾已測試就緒
go_criteria: "所有標準滿足"
no_go: "回滾並進行根因分析"
```

---

## 📊 成功指標 (Success Metrics)

### 必須達成 (Must Achieve)

```yaml
metrics:
  architecture_compliance: "100%"
  p0_completion: "100%"
  test_coverage: "> 80%"
  production_incidents: "0"
  rollback_success_rate: "100%"
```

### 目標指標 (Target Metrics)

```yaml
targets:
  deployment_time: "< 3 minutes"
  automation_coverage: "> 95%"
  language_violations: "0"
  performance_regression: "< 10%"
  manual_interventions: "0 (operational layer)"
```

---

## 🔄 回滾命令 (Rollback Commands)

### 檔案級回滾 (File-Level)

```bash
bash scripts/refactor/rollback.sh file src/core/main.ts
```

### 模組級回滾 (Module-Level)

```bash
bash scripts/refactor/rollback.sh module core/unified_integration
```

### 階段級回滾 (Phase-Level)

```bash
# 回滾 Phase 3
bash scripts/refactor/rollback.sh phase 3

# 回滾 Phase 2
bash scripts/refactor/rollback.sh phase 2

# 回滾 Phase 1
bash scripts/refactor/rollback.sh phase 1
```

### 完整回滾 (Full Rollback)

```bash
# 回滾到前一個 commit
bash scripts/refactor/rollback.sh full

# 回滾到指定 commit
bash scripts/refactor/rollback.sh full abc123def
```

---

## 🚨 緊急處理 (Emergency Procedures)

### 生產故障 (Production Incident)

```bash
# 1. 立即回滾
bash scripts/refactor/rollback.sh full

# 2. 檢查健康狀態
npm run test:integration

# 3. 查看日誌
tail -f refactor-*.log

# 4. 通報團隊
# GitHub Issue with label: refactor-incident-critical
```

### 測試失敗 (Test Failure)

```bash
# 1. 檢查失敗的測試
npm test -- --verbose

# 2. 回滾相關模組
bash scripts/refactor/rollback.sh module <module-name>

# 3. 重新驗證
npm test
```

### 性能回歸 (Performance Regression)

```bash
# 1. 執行性能基準測試
npm run benchmark

# 2. 回滾到上一個階段
bash scripts/refactor/rollback.sh phase 3

# 3. 重新分析性能
# Review performance profiling results
```

---

## 📞 支援聯繫 (Support Contacts)

| 情況 | 管道 | 回應時間 |
|------|------|----------|
| **立即問題** | GitHub Issues (label: refactor-execution) | < 1 小時 |
| **疑問諮詢** | GitHub Discussions (Refactoring) | < 4 小時 |
| **關鍵阻礙** | Slack #refactor-team | < 15 分鐘 |
| **緊急故障** | On-call rotation | < 5 分鐘 |

---

## 🔗 快速鏈接 (Quick Links)

- [完整執行計劃](workspace/docs/THREE_PHASE_REFACTORING_EXECUTION_PLAN.md)
- [INSTANT 執行標準](INSTANT-EXECUTION-REFACTOR-PLAN.md)
- [重構 Playbooks](workspace/docs/refactor_playbooks/README.md)
- [AI 行為合約](.github/AI-BEHAVIOR-CONTRACT.md)
- [腳本 README](scripts/refactor/README.md)

---

**最後更新**: 2026-01-05  
**維護者**: SynergyMesh Refactor Team  
**版本**: 1.0.0
