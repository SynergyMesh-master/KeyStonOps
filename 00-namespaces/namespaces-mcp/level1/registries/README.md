# MCP Level 1 - Naming Registries

## 概述

本目錄包含 MCP Level 1 的七大命名註冊表（Naming Registries），這些註冊表是 MCP Registry 架構的核心組件，負責規範 artifact 的唯一標識、命名空間歸屬、語義關聯與衝突避免。

## 七大命名註冊表

### 0. 命名規範註冊表（Naming Rules Registry）
**文件**: `0-naming-rules-registry.yaml`

定義所有 artifact 的命名規則與規範，包括：
- 反向 DNS 命名格式
- 命名空間與 artifact-name 的語義邊界
- 命名衝突避免策略
- 所有權驗證要求

### 1. Teams 命名註冊表（Team Identity Registry）
**文件**: `1-team-identity-registry.yaml`

定義團隊、組織與個人的命名空間身份，包括：
- 命名空間所有權驗證（GitHub OAuth、DNS、HTTP）
- 組織層級結構支援
- 命名空間轉移與回收機制

### 2. 目錄命名註冊表（Directory Taxonomy Registry）
**文件**: `2-directory-taxonomy-registry.yaml`

定義 artifact 的目錄分類與組織結構，包括：
- 目錄命名規範
- 多層次目錄結構
- 與 categories.yaml 的對齊
- 目錄歸檔與重命名

### 3. 條目命名註冊表（Artifact Entry Registry）
**文件**: `3-artifact-entry-registry.yaml`

定義 artifact 實例的唯一標識與語義類型，包括：
- 條目命名格式
- 語義類型標註
- 版本化管理
- MCP endpoint 映射

### 4. 映射命名註冊表（Mapping Key Registry）
**文件**: `4-mapping-key-registry.yaml`

定義 artifact 間的語義映射關係，包括：
- 映射鍵格式（source:target）
- 多對多映射支援
- 依賴關係追蹤
- Lineage map 構建

### 5. 依賴命名註冊表（Dependency Identifier Registry）
**文件**: `5-dependency-identifier-registry.yaml`

定義 artifact 依賴關係的唯一標識，包括：
- 依賴標識符格式（artifact@version）
- 語義版本控制（semver）
- 依賴解析與驗證
- 版本回溯支援

### 6. 引用命名註冊表（Reference Tag Registry）
**文件**: `6-reference-tag-registry.yaml`

定義 artifact 的語義引用與標註，包括：
- 引用標籤格式（artifact#tag）
- 多重語義標註
- 狀態追蹤
- 語義查詢支援

### 7. 工具命名註冊表（Toolchain Identifier Registry）
**文件**: `7-toolchain-identifier-registry.yaml`

定義 MCP 工具鏈的唯一標識與版本管理，包括：
- 工具鏈標識符格式（toolchain@version）
- 多版本工具鏈管理
- 能力定義
- 工具鏈審計

## 註冊表關係圖

```
命名規範註冊表 (0)
    ↓ 定義基礎規則
Teams 命名註冊表 (1) ←→ 目錄命名註冊表 (2)
    ↓ 所有權驗證          ↓ 目錄分類
條目命名註冊表 (3)
    ↓ 實例標識
映射命名註冊表 (4) ←→ 依賴命名註冊表 (5)
    ↓ 語義映射          ↓ 依賴管理
引用命名註冊表 (6) ←→ 工具命名註冊表 (7)
    ↓ 語義標註          ↓ 工具鏈管理
```

## Artifact-First Workflow

所有註冊表遵循 artifact-first workflow 原則：

1. **Artifact 定義優先**: 先定義 artifact 的語義類型、命名規則與依賴關係
2. **自動化驗證**: 發佈前通過 schema 驗證、依賴檢查與命名空間所有權驗證
3. **語義關聯**: 所有 artifact 必須明確標註依賴、引用與映射關係
4. **MCP Endpoint 映射**: 每個 artifact 對應明確的 MCP endpoint

## 使用指南

### 查詢註冊表
```bash
# 查看命名規範
cat 0-naming-rules-registry.yaml

# 查看團隊身份
cat 1-team-identity-registry.yaml

# 查看所有註冊表
ls -la *.yaml
```

### 驗證合規性
所有 artifact 必須：
1. 遵循命名規範註冊表的命名格式
2. 通過團隊身份註冊表的所有權驗證
3. 符合目錄命名註冊表的分類要求
4. 在條目命名註冊表中註冊
5. 聲明映射、依賴、引用關係
6. 指定使用的工具鏈版本

### 註冊表版本
所有註冊表當前版本：`1.0.0`

## 相關文檔

- [MCP Level 1 架構規範](../README.md)
- [Artifact-First Workflow](../docs/artifact-first-workflow.md)
- [命名空間治理](../docs/namespace-governance.md)

## 維護者

- MCP Architecture Team
- Namespace: io.github.machinenativeops
- Version: 1.0.0
- Last Updated: 2024-01-11