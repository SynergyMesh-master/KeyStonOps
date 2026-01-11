# root/ 主層目錄設計報告（namespaces-mcp 對齊）

本文檢測並校正 root 主層的設計，對照 namespaces-mcp 期望的檔案清單，將現有資產與缺口一一對齊，確保治理、模組、信任、追溯與超級執行入口一致可追溯。

## 1. 核心檔案清單對照（現況 / 所屬 / 待補）

| 類別 | Canonical 名稱 | 現況與路徑 | 狀態 |
| --- | --- | --- | --- |
| 說明 | README.md | `root/ROOT_DIRECTORY_DESIGN_REPORT.md`（本檔） | ✅ 已建立 |
| 全域配置 | `.root.config.yaml` | 由 `controlplane/config/root.config.yaml` 供應（集中治理，不重複放置） | ✅ 委派到 controlplane |
| 治理策略 | `.root.governance.yaml` | `controlplane/config/root.governance.yaml` | ✅ 委派到 controlplane |
| 模組註冊 | `.root.modules.yaml` | `controlplane/config/root.modules.yaml` | ✅ 委派到 controlplane |
| 超級執行 | `.root.super-execution.yaml` | **缺口**（待生成，暫時以 `controlplane/specifications/root.specs.context.yaml` 內流程配置支撐） | ⚠️ 待補 |
| 信任 | `.root.trust.yaml` | **缺口**（可參照 `root/.root.gates.map.yaml` 中 attestation 流程作暫時入口） | ⚠️ 待補 |
| 來源追溯 | `.root.provenance.yaml` | **缺口**（現有 `.root.jobs/attestation-provenance.bundle.v1.yaml` 作為暫代） | ⚠️ 待補 |
| 完整性 | `.root.integrity.yaml` | **缺口**（使用 `.root.jobs/canonical-hash-lock.bundle.v1.yaml` 先行覆蓋 hash-lock 流程） | ⚠️ 待補 |
| 開機引導 | `.root.bootstrap.yaml` | `root.bootstrap.yaml`（已存在，命名沿用既有 root.* 形式） | ✅ 現有 |
| Shell 環境 | `.root.env.sh` | `root.env.sh` | ✅ 現有 |
| 裝置映射 | `.root.devices.map` | **缺口**（尚未收斂，需從實際節點 inventory 萃取） | ⚠️ 待補 |
| 檔案系統映射 | `.root.fs.map` | `root.fs.map` | ✅ 現有 |
| 核心模組映射 | `.root.kernel.map` | **缺口** | ⚠️ 待補 |
| Gate 映射 | `.root.gates.map.yaml` | `root/.root.gates.map.yaml` | ✅ 現有 |
| 初始化腳本 | `.root.init.d/` | `root/.root.init.d/`（含 00-init, governance/trust/provenance 等腳本） | ✅ 現有 |
| 工作包 | `.root.jobs/` | `root/.root.jobs/`（含 attestation-provenance、canonical-hash-lock 等 bundle） | ✅ 現有 |
| Semantic Root | `.root.semantic-root.yaml` | `root/.root.semantic-root.yaml` | ✅ 現有 |
| CI Gate | `.github/workflows/gate-lock-attest.yaml` | `.github/workflows/gate-lock-attest.yaml` | ✅ 現有 |

> 註：為避免與 `gate-root-specs.yml` 的 root.* 監管衝突，仍採既有 `root.*`（非點檔名）實體，並在表中標註 canonical 名稱與實際路徑的對映。

## 2. 一體化協作策略（namespaces-mcp 原則）

1) **統一 YAML 入口**：治理、模組、信任、追溯等核心配置集中在 `controlplane/config/`，root 層以本報告進行對映；避免重複來源與漂移。  
2) **Gate + Bundle 雙層防護**：`root/.root.gates.map.yaml` 聯動 `.root.jobs/*bundle*` 與 `.github/workflows/gate-lock-attest.yaml`，確保 attestation / hash-lock / drift detection 成為所有子系統的強制通道。  
3) **語義閉環**：`root/.root.semantic-root.yaml` 作為 taxonomy/治理的單一語義根，所有新檔案需對應 `metadata.urn` 與 `spec.*`，保持 namespaces-mcp 命名與版本規則。  
4) **初始化順序**：`.root.init.d` 以 00-XX 序號保證 bootstrap → governance → modules → trust → provenance → finalize 的可重放順序，符合 super-execution 流程的可治理性。  
5) **缺口封裝**：對於尚未落地的 trust/provenance/integrity/devices/kernel 配置，暫由現有 bundles 與 controlplane 規格提供防護與驗證，避免空洞；後續只需補齊對應 YAML 並在本表更新狀態即可。

## 3. 待補行動（最小變更建議）

- 生成輕量級 `root.trust.yaml` / `root.provenance.yaml` / `root.integrity.yaml` 草案，引用現有 bundles 作為初始策略來源。  
- 整理實際節點 inventory 產出 `root.devices.map`、`root.kernel.map`（優先記錄鍵路徑與驅動/模組對應）。  
- 提取 super-execution 流程（可複用 `controlplane/specifications/root.specs.context.yaml` 的觸發與 fallback）落成 `root.super-execution.yaml`。  
- 變更完成後，將狀態欄標記為 ✅ 並在 CI `gate-root-specs` 中新增對應檢查。

---

如需更新，遵循 namespaces-mcp 命名規範（小寫、以 `root.` 前綴、使用 `.yaml`），並確保每份配置均含 `apiVersion`, `kind`, `metadata`, `spec` 四要素，保持 root 層治理的可追溯與可審計。 
