# Namespace Migration Plan: MachineNativeOps → MachineNativeOps

## 問題分析

### 1. 路徑錯誤
- `chatops/root/` - 應該移至正確位置
- `chatops/.github/` - 路徑錯誤，應該在專案根目錄

### 2. 命名空間問題
發現以下文件包含 MachineNativeOps 命名空間：
- controlplane/governance/docs/ARCHITECTURE.md
- controlplane/governance/reports/MachineNativeOps_INTEGRATION_SUMMARY.md
- workspace/mno-namespace.yaml
- workspace/docs/MachineNativeOps_ANALYSIS_REPORT.md
- workspace/docs/project-reports/MachineNativeOps_INTEGRATION_SUMMARY.md
- workspace/docs/MACHINENATIVEOPS_NAMESPACE_STANDARDIZATION.md
- workspace/governance-execution-report.json
- workspace/artifacts/governance-execution-report.json

### 3. 歸檔文件
- workspace-archive/ 中的文件（已歸檔，不需修改）

## 修正策略

### Phase 1: 移動錯誤路徑的目錄
1. 移動 `chatops/.github/` → `.github/workflows/chatops/`
2. 檢查 `chatops/root/` 的內容並移至正確位置

### Phase 2: 命名空間統一
將所有 MachineNativeOps/aaps 替換為：
- 文件名: `MachineNativeOps` 或 `machine-native-ops`
- 代碼/配置: `machinenativeops` (小寫無連字符)
- 文檔標題: `MachineNativeOps` (駝峰式)
- URL/路徑: `machine-native-ops` (小寫連字符)

### Phase 3: 重新生成 fs.map 和 fs.index
使用 fs-map-generator.py 重新生成所有映射文件

## 執行順序
1. 創建新分支
2. 移動目錄結構
3. 批量替換命名空間
4. 重新生成 fs.map/fs.index
5. 驗證變更
6. 提交並創建 PR