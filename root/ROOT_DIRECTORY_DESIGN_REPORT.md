# root/ 主層目錄設計報告（namespaces-mcp 對齊）

本文檢測並校正 root 主層的設計，對照 namespaces-mcp 期望的檔案清單，將現有資產與缺口一一對齊，確保治理、模組、信任、追溯與超級執行入口一致可追溯。

## 1. 核心檔案清單對照（現況 / 所屬 / 待補）

| 類別 | Canonical 名稱 | 現況與路徑 | 狀態 |
| --- | --- | --- | --- |
| 說明 | README.md | `root/ROOT_DIRECTORY_DESIGN_REPORT.md`（本檔） | ✅ 已建立 |
| 全域配置 | `root.config.yaml` | 由 `controlplane/config/root.config.yaml` 供應，薄封裝時需透過 gate-lock-attest | ✅ 委派到 controlplane |
| 命名策略 | `root.naming-policy.yaml` | `controlplane/config/root.naming-policy.yaml` | ✅ 委派到 controlplane |
| 治理策略 | `root.governance.yaml` | `controlplane/config/root.governance.yaml` | ✅ 委派到 controlplane |
| 模組註冊 | `root.modules.yaml` | `controlplane/config/root.modules.yaml` | ✅ 委派到 controlplane |
| 超級執行 | `root.super-execution.yaml` | `controlplane/config/root.super-execution.yaml` | ✅ 委派到 controlplane |
| 信任 | `root.trust.yaml` | `controlplane/config/root.trust.yaml` | ✅ 委派到 controlplane |
| 來源追溯 | `root.provenance.yaml` | `controlplane/config/root.provenance.yaml` | ✅ 委派到 controlplane |
| 完整性 | `root.integrity.yaml` | `controlplane/config/root.integrity.yaml` | ✅ 委派到 controlplane |
| 開機引導 | `root.bootstrap.yaml` | `root.bootstrap.yaml`（已存在，命名沿用既有 root.* 形式） | ✅ 現有 |
| Shell 環境 | `root.env.sh` | `root.env.sh` | ✅ 現有 |
| 裝置映射 | `root.devices.map` | `controlplane/config/root.devices.map` | ✅ 委派到 controlplane |
| 檔案系統映射 | `root.fs.map` | `root.fs.map` | ✅ 現有 |
| 核心模組映射 | `root.kernel.map` | `controlplane/config/root.kernel.map` | ✅ 委派到 controlplane |
| Gate 映射 | `root.gates.map.yaml` | `root/.root.gates.map.yaml` | ✅ 現有 |
| 初始化腳本 | `root.init.d/` | `root/.root.init.d/`（含 00-init 及治理/信任/追溯相關腳本） | ✅ 現有 |
| 工作包 | `root.jobs/` | `root/.root.jobs/`（含 attestation-provenance、semantic-root attestations） | ✅ 現有 |
| Semantic Root | `root.semantic-root.yaml` | `root/.root.semantic-root.yaml` | ✅ 現有 |
| CI Gate | `gate-lock-attest.yaml` | `.github/workflows/gate-lock-attest.yaml` | ✅ 現有 |

> 註：  
> - Canonical 名稱統一採 `root.*`（不含前置點）並以程式碼樣式呈現；如有重構請同步更新本表。  
> - Gate/Bundle 依賴：controlplane/config 下的 root.* 由 `root/.root.gates.map.yaml` 與 `.github/workflows/gate-lock-attest.yaml` 驗證。attestation 輸出集中於 `root/.root.jobs/semantic-root-attestations/` 與 `root/.root.jobs/validation-rules.json`，薄封裝時僅引用單一來源避免雙重配置。  
> - 路徑皆以倉庫根目錄為基準，若有目錄調整需同步更新本表與 gate 定義。

## 2. 一體化協作策略（namespaces-mcp 原則）

1) **統一 YAML 入口**：治理、模組、信任、追溯等核心配置集中在 `controlplane/config/`，root 層以本報告進行對映；避免重複來源與漂移。  
2) **Gate + Bundle 雙層防護**：`root/.root.gates.map.yaml` 先界定必經 Gate，`.root.jobs/semantic-root-attestations/initial-attestation.yaml` 作為基礎 bundle，並由 `.github/workflows/gate-lock-attest.yaml` 執行。如此 attestation / hash-lock / drift detection 對所有 controlplane 映射檔案成為強制通道。  
3) **語義閉環**：`root/.root.semantic-root.yaml` 作為 taxonomy/治理的單一語義根，所有新檔案需對應 `metadata.urn` 與 `spec.*`，保持 namespaces-mcp 命名與版本規則。  
4) **初始化順序**：`.root.init.d` 以 00-XX 序號保證 bootstrap → governance → modules → trust → provenance → finalize 的可重放順序，符合 super-execution 流程的可治理性。  
5) **缺口封裝**：目前核心 YAML 已集中於 `controlplane/config/`；若未來需要 root 層實體檔，可採用薄封裝（include/alias）並延續 namespaces-mcp 命名與 `metadata.urn` 制度，避免雙來源漂移。

## 3. 待補行動（最小變更建議）

- 若需要 root 層獨立檔案，採用 thin wrapper 方式（含 `apiVersion/kind/metadata/spec`），在 `metadata.annotations` 標註來源 `controlplane/config/root.*` 並引用 gate/bundle（`root/.root.gates.map.yaml` + `.root.jobs/semantic-root-attestations/initial-attestation.yaml`），避免雙來源漂移。  
- 持續以 `.root.jobs/semantic-root-attestations` 與 `root/.root.jobs/validation-rules.json` 校驗 attestation/hash-lock，確保與 `gate-lock-attest.yaml` 一致。  
- 於後續 PR 中，可逐步為 root 層新增針對 super-execution / trust / provenance 的鏡像檔並更新本表，以便 `gate-root-specs` 擴充檢查覆蓋率。

---

如需更新，遵循 namespaces-mcp 命名規範（小寫、以 `root.` 前綴、使用 `.yaml`），並確保每份配置均含 `apiVersion`, `kind`, `metadata`, `spec` 四要素，保持 root 層治理的可追溯與可審計。`RootImage` 作為 root 鏡像的薄封裝載體，對應的完整 `RootConfig` 仍由 `controlplane/config` 提供。參考下列最小模板：

```yaml
apiVersion: machinenativeops.io/v1
kind: RootImage
metadata:
  name: root.example
  namespace: machinenativeops-root
  labels:
    machinenativeops.io/component: "root"
  annotations:
    machinenativeops.io/sourceRef: "controlplane/config/root.config.yaml"
    machinenativeops.io/gate: "root/.root.gates.map.yaml"
spec:
  sourceRef:
    config: controlplane/config/root.config.yaml
    governance: controlplane/config/root.governance.yaml
  bundle:
    attestation: root/.root.jobs/semantic-root-attestations/initial-attestation.yaml
    workflow: .github/workflows/gate-lock-attest.yaml
  mount:
    fsMap: root.fs.map
    env: root.env.sh
  description: "薄封裝說明 / 用途"
```
