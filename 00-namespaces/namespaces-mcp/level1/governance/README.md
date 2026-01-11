# MCP Level 1: Governance - 治理與安全

## 概述

MCP Level 1 Governance 定義了 MCP 生態系統的治理框架、安全政策與合規要求。

## 結構

```
level1/governance/
├── manifest.yaml          # 治理主描述檔
├── schema.yaml            # 治理結構與驗證規則
├── spec.yaml              # 治理功能規格
├── index.yaml             # 治理條目索引
├── categories.yaml        # 治理分類
├── policies.yaml          # 治理政策條目
├── roles.yaml             # 角色與權限定義
└── README.md              # 本文檔
```

## 治理框架

### 命名空間治理
- 所有權驗證（GitHub OAuth、DNS TXT、HTTP Well-Known）
- 衝突解決策略
- 命名空間回收機制

### Artifact 治理
- 發佈規則
- 版本控制規則
- 棄用政策

### 安全治理
- Artifact 簽名要求
- 依賴安全掃描
- 訪問控制模型（RBAC）

### 審計治理
- 審計日誌記錄
- 合規報告
- 日誌保留政策

## 政策類別

1. **命名政策** - 命名格式、命名空間驗證、唯一性
2. **版本政策** - 語義版本控制、破壞性變更、向後兼容
3. **安全政策** - Artifact 簽名、漏洞掃描、來源驗證
4. **驗證政策** - Schema 驗證、依賴檢查、語義驗證
5. **發佈政策** - 發佈前驗證、元數據完整性、文檔要求
6. **審計政策** - 審計日誌、日誌保留、合規報告
7. **治理政策** - RBAC、政策更新審批、命名空間轉移

## 角色定義

- **Viewer** - 只讀訪問
- **Publisher** - 發佈和更新 artifacts
- **Maintainer** - 管理 artifacts 和命名空間
- **Administrator** - 完全管理訪問
- **Auditor** - 訪問審計日誌和合規報告
- **Security Analyst** - 執行安全分析和漏洞掃描

## 狀態

- **版本**: 1.0.0
- **狀態**: Stable ✅
- **政策數**: 21
- **角色數**: 6

## 合規性

- MCP Registry API v1.0
- OAuth 2.0
- RBAC 模型
- 審計日誌標準