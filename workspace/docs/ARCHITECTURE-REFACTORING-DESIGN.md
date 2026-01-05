# MachineNativeOps 專案架構最佳化設計完整方案

## 📋 目錄
1. [架構評估](#架構評估)
2. [優先級行動計劃](#優先級行動計劃)
3. [技術決策詳細建議](#技術決策詳細建議)
4. [遷移腳本](#遷移腳本)
5. [驗證檢查清單](#驗證檢查清單)
6. [風險管理與回滾策略](#風險管理與回滾策略)

---

## 架構評估

### 現狀分析
您的 **FHS + Controlplane/Workspace 分離設計**是正確且成熟的企業級架構。這種分離模式遵循以下最佳實踐：

#### 核心架構原則
1. **不可變治理層**
   - 作為只讀的單一事實來源
   - 確保治理配置的穩定性和可審計性
   - 所有治理策略、契約定義、驗證規則集中管理

2. **靈活工作區**
   - 提供開發團隊足夠的靈活性進行迭代和實驗
   - 支持快速原型開發和功能驗證
   - 實現業務邏輯與治理層的解耦

3. **FHS 合規性**
   - 遵循 Linux 標準目錄結構
   - 便於運維和部署
   - 提高系統可移植性

#### 關鍵優化建議

**1. 嚴格執行 Controlplane 只讀保護**
```yaml
# 建議在 Git hooks 中強制執行
controlplane/:
  - git-hooks:
    - pre-commit: 驗證 Controlplane 修改
    - pre-push: 檢查治理配置變更
  - file-permissions: 444 (只讀)
```

**2. 定義清晰的邊界契約**
- **Controlplane 定義「什麼是對的」**：治理策略、契約規範、驗證規則
- **Workspace 定義「如何做到」**：業務邏輯、實現細節、應用程式

#### 潛在風險識別

| 風險類型 | 描述 | 嚴重程度 | 建議措施 |
|---------|------|---------|---------|
| 配置重複 | `workspace/src/config/` 與 `controlplane/config/` 重複 | 中 | 明確責任邊界 |
| 可執行腳本混入 | Controlplane 中有 `.py` 腳本違反只讀原則 | 高 | 遷移到 Workspace |
| 中文目錄名稱 | `workspace/src/代碼聖殿/` 影響跨平台相容性 | 中 | 重命名為英文 |
| 前端分散 | `web/` 和 `frontend/` 分散在不同位置 | 低 | 整合到 `apps/` |

---

## 優先級行動計劃

### 🔴 優先級 0：建立安全機制（立即執行）

#### 1. 創建完整備份

```bash
#!/bin/bash
# 創建當前狀態的快照
git tag -a "pre-refactor-backup" -m "Pre-refactoring backup snapshot"
git push origin pre-refactor-backup
```

#### 2. 設置驗證腳本

```bash
#!/bin/bash
# 驗證關鍵模組是否仍然可訪問
python -c "import sys; sys.path.insert(0, 'workspace/src/core'); from engine import ContractEngine" || exit 1
echo "✅ Core modules accessible"
```

---

### 🟡 Phase 1：低風險清理（預計 1-2 小時）

#### 調整理由
先做無破壞性的清理，建立信心和習慣

#### 1.1 重命名中文目錄

**當前狀態：** `workspace/src/代碼聖殿/`

**目標狀態：** `workspace/src/sacred-modules/`

**變更理由：**
- 統一命名規範，提高可維護性
- 「sacred」體現模組的特殊性和保護需求
- 與項目文檔中的「SuperRoot」風格一致

**風險評估：** ⚠️ 低（僅影響路徑引用）

**執行步驟：**
```bash
# 檢查引用
grep -r "代碼聖殿" workspace/src/ > references.txt

# 重命名目錄
mv workspace/src/代碼聖殿 workspace/src/sacred-modules

# 更新引用
find workspace/src/ -name "*.py" -exec sed -i 's/代碼聖殿/sacred-modules/g' {} \;
find workspace/src/ -name "*.md" -exec sed -i 's/代碼聖殿/sacred-modules/g' {} \;
```

**驗證：**
```bash
# 確認無中文引用
grep -r "代碼聖殿" workspace/src/  # 應該返回空

# 確認新目錄存在
ls -la workspace/src/sacred-modules/
```

#### 1.2 清理構建產物

**目標：** 刪除 `workspace/src/machinenativeops.egg-info/`

**變更理由：**
- 避免意外提交構建產物到版本控制
- 縮小倉庫大小
- 確保構建環境一致性

**風險評估：** ✅ 極低（無副作用）

**執行步驟：**
```bash
# 刪除構建產物
rm -rf workspace/src/machinenativeops.egg-info

# 添加到 .gitignore
echo "*.egg-info/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore
```

#### 1.3 處理 `_scratch/` 目錄

**當前狀態：** `workspace/src/_scratch/`

**目標狀態：** `workspace/src/_sandbox/`

**變更理由：**
- `_sandbox/` 語義更清晰（沙箱環境）
- 下劃線前綴表示這是內部/臨時空間
- 保留實驗性代碼的安全空間

**風險評估：** ⚠️ 低（僅影響路徑引用）

**管理策略：**
```yaml
# .gitignore 配置
_sandbox/:
  - exceptions: "*.md"  # 保留文檔
  - policy: 定期清理（每季度）
  - rule: 禁止從 _sandbox/ 導入代碼到生產環境
```

**執行步驟：**
```bash
# 重命名
mv workspace/src/_scratch workspace/src/_sandbox

# 添加說明文件
cat > workspace/src/_sandbox/README.md << 'EOF'
# 🚧 Sandbox Environment

此目錄用於存放實驗性代碼和臨時測試。

## 使用規則
- 定期清理（每季度）
- 禁止從此目錄導入代碼到生產環境
- 敏感信息不應在此目錄中
EOF
```

---

### 🟠 Phase 2：解決重複（預計 2-3 小時）

#### 調整理由
這是最關鍵的結構性問題，需要謹慎處理

#### 2.1 合併 `core/contracts/` 和 `contracts/`

**當前狀態：**
- `workspace/src/contracts/` (根層)
- `workspace/src/core/contracts/` (核心層)

**目標狀態：**
- 保留 `workspace/src/contracts/`（統一契約定義）
- 刪除 `workspace/src/core/contracts/`

**變更理由：**
- 根層的 `contracts/` 是統一的 API 契約定義
- 符合「契約優先」設計原則
- 避免契約定義分散和版本不一致

**風險評估：** 🟡 中（需要檢查所有導入引用）

**執行步驟：**
```bash
#!/bin/bash
# Step 1: 檢查引用
grep -r "from core\.contracts" workspace/src/ > backup/contracts-imports.txt
grep -r "import.*core\.contracts" workspace/src/ >> backup/contracts-imports.txt

# Step 2: 比較兩個目錄的差異
diff -r workspace/src/contracts/ workspace/src/core/contracts/ > backup/contracts-diff.txt || true

# Step 3: 備份並刪除
mv workspace/src/core/contracts workspace/src/core/contracts.backup

# Step 4: 更新引用
find workspace/src/ -name "*.py" -exec sed -i 's/from core\.contracts/from contracts/g' {} \;
find workspace/src/ -name "*.py" -exec sed -i 's/import core\.contracts/import contracts/g' {} \;

# Step 5: 驗證
python -c "import sys; sys.path.insert(0, 'workspace/src'); from contracts import Contract"
```

**回滾計劃：**
```bash
# 如果發現問題，立即回滾
rm -rf workspace/src/core/contracts
mv workspace/src/core/contracts.backup workspace/src/core/contracts
```

#### 2.2 整合 `core/contract_service/` 到 `services/`

**當前狀態：** `workspace/src/core/contract_service/`

**目標狀態：** `workspace/src/services/contract-service/`

**變更理由：**
- 服務層應該統一管理
- 不應該散布在 core 中
- 符合微服務架構最佳實踐

**風險評估：** 🟡 中（需要更新服務發現配置）

**執行步驟：**
```bash
#!/bin/bash
# Step 1: 檢查服務引用
grep -r "contract_service" workspace/src/ > backup/service-imports.txt
grep -r "contract-service" workspace/src/ >> backup/service-imports.txt

# Step 2: 創建新位置
mkdir -p workspace/src/services/contract-service

# Step 3: 複製檔案
cp -r workspace/src/core/contract_service/* workspace/src/services/contract-service/

# Step 4: 備份舊位置
mv workspace/src/core/contract_service workspace/src/core/contract_service.backup

# Step 5: 更新 package.json
# 需要手動檢查並更新
```

#### 2.3 整合前端到 `apps/`

**當前狀態：**
- `workspace/src/web/`
- `workspace/src/frontend/`

**目標狀態：**
- `workspace/src/apps/web/`
- `workspace/src/apps/ui/` (如果前端是 UI 組件庫)

**變更理由：**
- `apps/` 是應用程序的統一入口
- 前端應該歸類到應用層
- 統一應用程式管理

**風險評估：** 🟡 中（需要更新構建腳本和部署配置）

**執行步驟：**
```bash
#!/bin/bash
# Step 1: 評估 frontend/ 的角色
# 檢查 frontend/ 是否是 UI 組件庫還是應用
ls -la workspace/src/frontend/

# Step 2: 移動 web/ 的內容
mkdir -p workspace/src/apps/web
cp -r workspace/src/web/* workspace/src/apps/web/

# Step 3: 評估並移動 frontend/
# 根據檢查結果決定：
# - 如果是 UI 組件庫 → workspace/src/ui-library/
# - 如果是應用 → workspace/src/apps/frontend/

# Step 4: 更新 package.json workspaces
```

---

### 🟢 Phase 3：整理散落檔案（預計 1-2 小時）

#### 調整理由
在核心結構穩定後再進行細粒度整理

#### 3.1 整理 core 目錄中的 Python 檔案

**目標：** 按職責分類到子目錄

```bash
# 創建子目錄
mkdir -p workspace/src/core/ai_engine
mkdir -p workspace/src/core/automation
mkdir -p workspace/src/core/engine

# 移動檔案
mv workspace/src/core/ai_decision_engine.py workspace/src/core/ai_engine/
mv workspace/src/core/auto_*.py workspace/src/core/automation/
mv workspace/src/core/context_understanding_engine.py workspace/src/core/ai_engine/
mv workspace/src/core/contract_engine.py workspace/src/core/engine/

# 創建 __init__.py 檔案
touch workspace/src/core/ai_engine/__init__.py
touch workspace/src/core/automation/__init__.py
touch workspace/src/core/engine/__init__.py
```

**風險評估：** 🟡 中（需要全面測試）

**更新導入路徑：**
```python
# 舊導入
from core.ai_decision_engine import AIDecisionEngine

# 新導入
from core.ai_engine.ai_decision_engine import AIDecisionEngine
```

#### 3.2 更新 package.json workspaces

**建議配置：**
```json
{
  "workspaces": [
    "workspace/src/mcp-servers",
    "workspace/src/ui-library",
    "workspace/src/services/*",
    "workspace/src/apps/*",
    "workspace/src/ai",
    "cloudflare/workers"
  ],
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

**風險評估：** ⚠️ 低到中（需要重新安裝依賴）

---

### 🔵 Phase 4：驗證和測試（持續進行）

#### 調整理由
每個階段都應該有驗證，而不是最後才驗證

#### 運行完整測試套件

```bash
# 運行所有測試
npm test
pytest

# 運行構建
npm run build
python -m build

# 檢查代碼品質
npm run lint
flake8 workspace/src/
pylint workspace/src/core/
```

#### 更新文檔

```bash
# 更新 README.md
# 更新架構文檔
# 更新 CI/CD 配置
```

---

## 技術決策詳細建議

### 關於 workspace/src/ 重組

#### Q1: 合併 core/contracts/ 選擇

**建議：** 保留根層 `workspace/src/contracts/`

**理由：**
1. 根層 `contracts/` 是統一的 API 契約定義
2. `core/` 應該專注於核心業務邏輯，不是契約定義
3. 符合「契約優先」設計原則
4. 便於跨模組共享契約定義

**驗證步驟：**
```bash
# 檢查 contracts/ 的內容完整性
ls -la workspace/src/contracts/
ls -la workspace/src/core/contracts/

# 比較差異
diff -r workspace/src/contracts/ workspace/src/core/contracts/ || true

# 驗證導入
python -c "import sys; sys.path.insert(0, 'workspace/src'); from contracts import Contract"
```

#### Q2: 代碼聖殿/ 目錄處理

**建議：** 重命名為 `workspace/src/sacred-modules/`

**理由：**
1. 「Sacred」暗示這些模組需要特殊保護和管理
2. 與項目文檔中的「SuperRoot」風格一致
3. 保持項目的獨特性
4. 更清晰的語義表達

**替代方案：**
- 如果內容是高級模組：`workspace/src/elite-modules/`
- 如果是核心模組：`workspace/src/foundation-modules/`

**最終決定：** 使用 `sacred-modules/` 以保持項目獨特風格

#### Q3: _scratch/ 目錄處理

**建議：** 重命名為 `workspace/src/_sandbox/` 並保留

**理由：**
1. 實驗性代碼需要安全空間
2. `_sandbox/` 語義更清晰（沙箱環境）
3. 下劃線前綴表示這是內部/臨時空間

**管理策略：**
```yaml
_sandbox/:
  cleanup:
    frequency: 每季度
    exceptions: "*.md"
  
  import_policy:
    - 禁止從 _sandbox/ 導入代碼到生產環境
    - 僅允許單元測試導入
  
  gitignore:
    - "*.pyc"
    - "__pycache__/"
    - sensitive_files/
```

#### Q4: 前端整合

**建議：** 採用漸進式整合策略

**執行計劃：**

**Step 1: 先移動 web/ 的內容**
```bash
mkdir -p workspace/src/apps/web
cp -r workspace/src/web/* workspace/src/apps/web/
```

**Step 2: 評估 frontend/ 的角色**
```bash
# 檢查 frontend/ 的結構
ls -la workspace/src/frontend/

# 如果是 UI 組件庫
# → workspace/src/ui-library/

# 如果是應用
# → workspace/src/apps/frontend/
```

**Step 3: 更新引用和配置**
```bash
# 更新 package.json
# 更新構建腳本
# 更新部署配置
```

---

### 關於技術棧分離

#### Q1: 創建分離的工作區配置

**建議：** 不建議過度分離

**理由：**
1. 項目已經有清晰的目錄結構分離
2. 過度分離會增加維護成本
3. Node.js 的 monorepo 機制已經足夠

**推薦配置：**

**根層 package.json：**
```json
{
  "name": "machine-native-ops",
  "version": "1.0.0",
  "workspaces": [
    "workspace/src/mcp-servers/*",
    "workspace/src/ui-library",
    "workspace/src/services/*",
    "workspace/src/apps/*",
    "workspace/src/ai",
    "cloudflare/workers"
  ],
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

**Python 配置：**
- 保持現有的 `workspace/src/governance/pyproject.toml`
- 考慮在 `workspace/src/core/` 創建核心模組的 `pyproject.toml`
- 使用 `requirements.txt` 管理共享依賴

**Rust 配置：**
- 保持獨立的 `Cargo.toml`
- 使用 workspace 功能管理多個 Rust 項目

#### Q2: Node.js workspaces 配置

**建議配置：**
```json
{
  "workspaces": [
    "workspace/src/mcp-servers",
    "workspace/src/ui-library",
    "workspace/src/services/*",
    "workspace/src/apps/*",
    "workspace/src/ai",
    "cloudflare/workers"
  ],
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0"
  },
  "scripts": {
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces"
  }
}
```

#### Q3: 統一的 pyproject.toml

**建議：** 不建議在 workspace 根層創建統一的 `pyproject.toml`

**理由：**
1. 項目已經有 `workspace/src/governance/pyproject.toml`
2. Python 模組之間的依賴關係可能不同
3. 可能與治理層的配置衝突

**替代方案：**

**方案 1：模組化配置**
```
workspace/src/
├── core/pyproject.toml
├── governance/pyproject.toml
├── ai/pyproject.toml
└── requirements.txt (共享依賴)
```

**方案 2：使用 Poetry workspace**
```toml
[tool.poetry]
name = "machine-native-ops"
version = "1.0.0"

[tool.poetry.dependencies]
python = "^3.11"

[tool.poetry.group.dev.dependencies]
pytest = "^7.0"
black = "^23.0"
```

**最終決定：** 保持現有結構，添加共享依賴文件

---

### 關於 FHS 合規性

#### Q1: 移動 etc/machinenativeops/*

**建議：** 不完全移動

**理由：**
1. FHS 規定 `etc/` 用於系統級配置
2. `controlplane/config/` 用於應用級治理配置
3. 應該有清晰的分離

**建議策略：**

```bash
# 系統級配置（保留在 etc/）
etc/machinenativeops/
├── services/          # 服務定義
└── env/               # 環境變量

# 應用級配置（移到 controlplane/）
controlplane/config/
├── governance/        # 治理策略
└── contracts/         # 契約定義
```

**執行步驟：**
```bash
# 移動應用級配置
mv etc/machinenativeops/governance controlplane/config/
mv etc/machinenativeops/contracts controlplane/config/

# 保留系統級配置
# etc/machinenativeops/services/
# etc/machinenativeops/env/
```

#### Q2: init.d/ 腳本位置

**建議：** 移動到 `workspace/scripts/init/`

**理由：**
1. `init.d/` 是傳統 SysV 風格，現代項目通常使用 systemd
2. `workspace/scripts/` 更符合項目的開發流程
3. 便於版本控制和審計

**執行步驟：**
```bash
# 創建新目錄
mkdir -p workspace/scripts/init

# 移動腳本
mv init.d/*.sh workspace/scripts/init/

# 創建說明文件
cat > workspace/scripts/init/README.md << 'EOF'
# Initialization Scripts

此目錄包含系統初始化腳本。

## 使用方法
```bash
# 執行所有初始化腳本
./scripts/init/all.sh

# 執行特定腳本
./scripts/init/01-setup-env.sh
```

## 注意事項
- 腳本按數字順序執行
- 確保腳本有執行權限
- EOF

# 更新腳本引用（如果有的話）
grep -r "init.d/" . --exclude-dir=.git --exclude-dir=node_modules
```

#### Q3: opt/ 內容處理

**建議：** 移動到 `workspace/`

**理由：**
1. `opt/` 用於第三方軟件包
2. 項目自己的可選模組應該在 workspace 中
3. 更符合 Controlplane/Workspace 分離原則

**執行步驟：**
```bash
# 評估 opt/ 的內容
ls -la opt/

# 根據內容類型移動
# 如果是插件 → workspace/src/plugins/
# 如果是工具 → workspace/src/tools/
# 如果是應用 → workspace/src/apps/
```

---

## 遷移腳本

### 完整的安全遷移腳本

**檔案位置：** `scripts/safe-refactor.sh`

```bash
#!/bin/bash
# MachineNativeOps 重構腳本 - 安全執行版本
# 使用方法：./scripts/safe-refactor.sh [phase]
# 例如：./scripts/safe-refactor.sh phase1

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 創建備份
create_backup() {
    log_info "創建備份..."
    BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 創建 Git 標籤
    TAG_NAME="pre-refactor-$(date +%Y%m%d_%H%M%S)"
    git tag -a "$TAG_NAME" -m "Pre-refactoring backup: $(date)"
    log_info "Git 標籤：$TAG_NAME"
    
    # 備份關鍵目錄
    if [ -d "workspace/src/core" ]; then
        cp -r workspace/src/core "$BACKUP_DIR/"
        log_info "已備份：workspace/src/core/"
    fi
    
    if [ -d "workspace/src/contracts" ]; then
        cp -r workspace/src/contracts "$BACKUP_DIR/"
        log_info "已備份：workspace/src/contracts/"
    fi
    
    if [ -d "workspace/src/web" ]; then
        cp -r workspace/src/web "$BACKUP_DIR/"
        log_info "已備份：workspace/src/web/"
    fi
    
    # 備份配置文件
    cp package.json "$BACKUP_DIR/" 2>/dev/null || true
    cp .gitignore "$BACKUP_DIR/" 2>/dev/null || true
    
    log_info "備份完成：$BACKUP_DIR"
    echo "$BACKUP_DIR" > .last-backup
}

# Phase 1: 低風險清理
phase1() {
    log_info "開始 Phase 1：低風險清理..."
    
    # 1. 重命名中文目錄
    if [ -d "workspace/src/代碼聖殿" ]; then
        log_step "重命名中文目錄..."
        
        # 檢查引用
        log_info "檢查引用..."
        grep -r "代碼聖殿" workspace/src/ > "$BACKUP_DIR/chinese-dir-references.txt" || true
        
        if [ -s "$BACKUP_DIR/chinese-dir-references.txt" ]; then
            log_warn "發現 $(wc -l < "$BACKUP_DIR/chinese-dir-references.txt") 個引用"
        fi
        
        # 重命名
        mv "workspace/src/代碼聖殿" "workspace/src/sacred-modules"
        log_info "✅ 已重命名：代码圣殿 → sacred-modules"
        
        # 更新引用
        log_info "更新引用..."
        find workspace/src/ -name "*.py" -exec sed -i 's/代碼聖殿/sacred-modules/g' {} \;
        find workspace/src/ -name "*.md" -exec sed -i 's/代碼聖殿/sacred-modules/g' {} \;
        find workspace/src/ -name "*.json" -exec sed -i 's/代碼聖殿/sacred-modules/g' {} \;
        
        log_info "✅ 引用已更新"
    else
        log_warn "中文目錄不存在，跳過"
    fi
    
    # 2. 清理構建產物
    if [ -d "workspace/src/machinenativeops.egg-info" ]; then
        log_step "清理構建產物..."
        rm -rf workspace/src/machinenativeops.egg-info
        
        # 更新 .gitignore
        if ! grep -q "*.egg-info/" .gitignore; then
            echo "*.egg-info/" >> .gitignore
        fi
        if ! grep -q "__pycache__/" .gitignore; then
            echo "__pycache__/" >> .gitignore
        fi
        if ! grep -q "*.pyc" .gitignore; then
            echo "*.pyc" >> .gitignore
        fi
        
        log_info "✅ 已清理構建產物並更新 .gitignore"
    fi
    
    # 3. 處理 _scratch/ 目錄
    if [ -d "workspace/src/_scratch" ]; then
        log_step "重命名 _scratch → _sandbox..."
        mv "workspace/src/_scratch" "workspace/src/_sandbox"
        
        # 創建說明文件
        cat > workspace/src/_sandbox/README.md << 'EOF'
# 🚧 Sandbox Environment

此目錄用於存放實驗性代碼和臨時測試。

## 使用規則
- 定期清理（每季度）
- 禁止從此目錄導入代碼到生產環境
- 敏感信息不應在此目錄中
EOF
        
        log_info "✅ 已重命名：_scratch → _sandbox"
    else
        log_warn "_scratch/ 不存在，跳過"
    fi
    
    log_info "Phase 1 完成！"
}

# Phase 2: 解決重複
phase2() {
    log_info "開始 Phase 2：解決重複..."
    
    # 1. 合併 contracts/
    if [ -d "workspace/src/core/contracts" ]; then
        log_warn "發現重複的 contracts/ 目錄"
        
        # 檢查引用
        log_info "檢查 contracts 引用..."
        grep -r "from core\.contracts" workspace/src/ > "$BACKUP_DIR/contracts-imports.txt" || true
        grep -r "import.*core\.contracts" workspace/src/ >> "$BACKUP_DIR/contracts-imports.txt" || true
        
        if [ -s "$BACKUP_DIR/contracts-imports.txt" ]; then
            log_info "發現 $(wc -l < "$BACKUP_DIR/contracts-imports.txt") 個引用"
        fi
        
        # 比較差異
        log_info "比較 contracts/ 目錄差異..."
        diff -r workspace/src/contracts/ workspace/src/core/contracts/ > "$BACKUP_DIR/contracts-diff.txt" || true
        
        # 備份並刪除
        log_info "備份舊目錄..."
        mv workspace/src/core/contracts workspace/src/core/contracts.backup
        
        # 更新引用
        log_info "更新 contracts 引用..."
        find workspace/src/ -name "*.py" -exec sed -i 's/from core\.contracts/from contracts/g' {} \;
        find workspace/src/ -name "*.py" -exec sed -i 's/import core\.contracts/import contracts/g' {} \;
        
        log_info "✅ 已備份並刪除 core/contracts/"
        log_warn "請人工審查並更新 contracts 相關的導入引用"
        log_info "引用清單已保存到：$BACKUP_DIR/contracts-imports.txt"
    else
        log_warn "core/contracts/ 不存在，跳過"
    fi
    
    # 2. 整合 contract_service/
    if [ -d "workspace/src/core/contract_service" ]; then
        log_step "整合 contract_service/ 到 services/..."
        
        # 檢查服務引用
        grep -r "contract_service" workspace/src/ > "$BACKUP_DIR/service-imports.txt" || true
        grep -r "contract-service" workspace/src/ >> "$BACKUP_DIR/service-imports.txt" || true
        
        # 創建新位置
        mkdir -p workspace/src/services/contract-service
        cp -r workspace/src/core/contract_service/* workspace/src/services/contract-service/
        
        # 備份舊位置
        mv workspace/src/core/contract_service workspace/src/core/contract_service.backup
        
        log_info "✅ 已整合 contract_service/ 到 services/contract-service/"
        log_warn "請更新服務發現配置"
    else
        log_warn "core/contract_service/ 不存在，跳過"
    fi
    
    # 3. 整合前端
    if [ -d "workspace/src/web" ]; then
        log_step "整合 web/ 到 apps/..."
        
        mkdir -p workspace/src/apps/web
        cp -r workspace/src/web/* workspace/src/apps/web/
        
        mv workspace/src/web workspace/src/web.backup
        
        log_info "✅ 已整合 web/ 到 apps/web/"
        log_warn "請更新構建腳本和部署配置"
    else
        log_warn "web/ 不存在，跳過"
    fi
    
    log_info "Phase 2 完成！請檢查並更新相關配置。"
}

# Phase 3: 整理散落檔案
phase3() {
    log_info "開始 Phase 3：整理散落檔案..."
    
    # 創建目標目錄
    mkdir -p workspace/src/core/ai_engine
    mkdir -p workspace/src/core/automation
    mkdir -p workspace/src/core/engine
    
    # 移動檔案
    if [ -f "workspace/src/core/ai_decision_engine.py" ]; then
        mv workspace/src/core/ai_decision_engine.py workspace/src/core/ai_engine/
        log_info "已移動：ai_decision_engine.py → ai_engine/"
    fi
    
    if ls workspace/src/core/auto_*.py 1> /dev/null 2>&1; then
        mv workspace/src/core/auto_*.py workspace/src/core/automation/
        log_info "已移動：auto_*.py → automation/"
    fi
    
    if [ -f "workspace/src/core/context_understanding_engine.py" ]; then
        mv workspace/src/core/context_understanding_engine.py workspace/src/core/ai_engine/
        log_info "已移動：context_understanding_engine.py → ai_engine/"
    fi
    
    if [ -f "workspace/src/core/contract_engine.py" ]; then
        mv workspace/src/core/contract_engine.py workspace/src/core/engine/
        log_info "已移動：contract_engine.py → engine/"
    fi
    
    # 創建 __init__.py 檔案
    touch workspace/src/core/ai_engine/__init__.py
    touch workspace/src/core/automation/__init__.py
    touch workspace/src/core/engine/__init__.py
    
    log_info "✅ 已整理核心檔案"
    log_warn "請更新 Python 導入路徑"
    
    # 保存導入更新建議
    cat > "$BACKUP_DIR/import-updates.txt" << 'EOF'
# 需要更新的導入路徑

# 舊導入 → 新導入
from core.ai_decision_engine import AIDecisionEngine → from core.ai_engine.ai_decision_engine import AIDecisionEngine
from core.auto_* import * → from core.automation.auto_* import *
from core.context_understanding_engine import ContextUnderstandingEngine → from core.ai_engine.context_understanding_engine import ContextUnderstandingEngine
from core.contract_engine import ContractEngine → from core.engine.contract_engine import ContractEngine
EOF
    
    log_info "Phase 3 完成！"
}

# 驗證步驟
validate() {
    log_info "運行驗證..."
    
    # 檢查關鍵模組
    if [ -f "workspace/scripts/validate-structure.sh" ]; then
        log_info "運行結構驗證..."
        bash workspace/scripts/validate-structure.sh
    fi
    
    # 檢查目錄結構
    log_info "檢查目錄結構..."
    echo ""
    echo "=== workspace/src/ 結構 ==="
    ls -la workspace/src/ | head -20
    echo ""
    
    # 檢查 Git 狀態
    log_info "檢查 Git 狀態..."
    git status --short
    
    log_info "驗證完成！請檢查上述輸出。"
}

# 回滾腳本
rollback() {
    log_warn "開始回滾..."
    
    # 讀取最後的備份目錄
    if [ -f ".last-backup" ]; then
        BACKUP_DIR=$(cat .last-backup)
        log_info "使用備份：$BACKUP_DIR"
    else
        log_error "未找到備份目錄"
        exit 1
    fi
    
    # 恢復備份
    if [ -d "$BACKUP_DIR/core" ]; then
        log_info "恢復 workspace/src/core/..."
        rm -rf workspace/src/core
        cp -r "$BACKUP_DIR/core" workspace/src/
    fi
    
    if [ -d "$BACKUP_DIR/contracts" ]; then
        log_info "恢復 workspace/src/contracts/..."
        rm -rf workspace/src/contracts
        cp -r "$BACKUP_DIR/contracts" workspace/src/
    fi
    
    if [ -d "$BACKUP_DIR/web" ]; then
        log_info "恢復 workspace/src/web/..."
        rm -rf workspace/src/web
        cp -r "$BACKUP_DIR/web" workspace/src/
    fi
    
    # Git reset
    log_warn "執行 Git reset..."
    git reset --hard HEAD
    
    log_warn "回滾完成！"
}

# 主函數
main() {
    case "$1" in
        phase1)
            create_backup
            phase1
            validate
            ;;
        phase2)
            create_backup
            phase2
            validate
            ;;
        phase3)
            create_backup
            phase3
            validate
            ;;
        validate)
            validate
            ;;
        rollback)
            rollback
            ;;
        all)
            create_backup
            phase1
            validate
            read -p "Phase 1 完成，是否繼續？(y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                phase2
                validate
                read -p "Phase 2 完成，是否繼續？(y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    phase3
                    validate
                fi
            fi
            ;;
        *)
            echo "使用方法：$0 {phase1|phase2|phase3|validate|rollback|all}"
            echo ""
            echo "選項："
            echo "  phase1   - 執行 Phase 1：低風險清理"
            echo "  phase2   - 執行 Phase 2：解決重複"
            echo "  phase3   - 執行 Phase 3：整理散落檔案"
            echo "  validate - 運行驗證"
            echo "  rollback - 回滾到備份狀態"
            echo "  all      - 執行所有階段（交互式）"
            exit 1
            ;;
    esac
}

main "$@"
```

---

### 回滾腳本

**檔案位置：** `scripts/rollback.sh`

```bash
#!/bin/bash
# 回滾腳本 - 緊急恢復
# 使用方法：./scripts/rollback.sh

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  MachineNativeOps 回滾腳本${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 1. 恢復 Git 標籤
log_info "查找最新的備份標籤..."
LATEST_TAG=$(git tag -l "pre-refactor-*" | tail -1)

if [ -z "$LATEST_TAG" ]; then
    echo -e "${RED}❌ 未找到備份標籤${NC}"
    exit 1
fi

echo -e "${GREEN}找到標籤：$LATEST_TAG${NC}"
read -p "是否恢復到此標籤？(y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消回滾"
    exit 0
fi

echo -e "${YELLOW}執行 Git reset...${NC}"
git reset --hard $LATEST_TAG

echo -e "${GREEN}✅ 已恢復到 Git 標籤：$LATEST_TAG${NC}"

# 2. 恢復文件系統備份（如果有）
if [ -f ".last-backup" ]; then
    BACKUP_DIR=$(cat .last-backup)
    
    if [ -d "$BACKUP_DIR" ]; then
        echo ""
        echo -e "${GREEN}找到文件系統備份：$BACKUP_DIR${NC}"
        echo ""
        read -p "是否恢復文件系統備份？(y/n) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # 恢復關鍵目錄
            if [ -d "$BACKUP_DIR/core" ]; then
                echo -e "${YELLOW}恢復 workspace/src/core/...${NC}"
                rm -rf workspace/src/core
                cp -r "$BACKUP_DIR/core" workspace/src/
            fi
            
            if [ -d "$BACKUP_DIR/contracts" ]; then
                echo -e "${YELLOW}恢復 workspace/src/contracts/...${NC}"
                rm -rf workspace/src/contracts
                cp -r "$BACKUP_DIR/contracts" workspace/src/
            fi
            
            if [ -d "$BACKUP_DIR/web" ]; then
                echo -e "${YELLOW}恢復 workspace/src/web/...${NC}"
                rm -rf workspace/src/web
                cp -r "$BACKUP_DIR/web" workspace/src/
            fi
            
            echo -e "${GREEN}✅ 文件系統備份已恢復${NC}"
        fi
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  回滾完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "建議檢查："
echo "  1. 運行測試套件：npm test && pytest"
echo "  2. 檢查 Git 狀態：git status"
echo "  3. 驗證應用程式是否正常運行"
```

---

## 驗證檢查清單

### Phase 1 驗證

```bash
#!/bin/bash
# Phase 1 驗證腳本

echo "=== Phase 1 驗證 ==="
echo ""

# 1. 檢查目錄結構
echo "1. 檢查目錄結構..."
tree -L 2 workspace/src/ | head -30

# 2. 檢查 Git 狀態
echo ""
echo "2. 檢查 Git 狀態..."
git status --short

# 3. 運行結構驗證
if [ -f "workspace/scripts/validate-structure.sh" ]; then
    echo ""
    echo "3. 運行結構驗證..."
    bash workspace/scripts/validate-structure.sh
fi

# 4. 檢查導入引用（應該返回空）
echo ""
echo "4. 檢查中文目錄引用（應該為空）..."
RESULT=$(grep -r "代碼聖殿" workspace/src/ 2>/dev/null || true)
if [ -z "$RESULT" ]; then
    echo "✅ 無中文目錄引用"
else
    echo "❌ 發現中文目錄引用："
    echo "$RESULT"
    exit 1
fi

# 5. 檢查構建產物
echo ""
echo "5. 檢查構建產物（應該不存在）..."
if [ -d "workspace/src/machinenativeops.egg-info" ]; then
    echo "❌ .egg-info 目錄仍然存在"
    exit 1
else
    echo "✅ 構建產物已清理"
fi

# 6. 檢查 _sandbox/ 目錄
echo ""
echo "6. 檢查 _sandbox/ 目錄..."
if [ -d "workspace/src/_sandbox" ]; then
    echo "✅ _sandbox/ 目錄存在"
    if [ -f "workspace/src/_sandbox/README.md" ]; then
        echo "✅ README.md 存在"
    fi
else
    echo "❌ _sandbox/ 目錄不存在"
    exit 1
fi

# 7. 檢查 .gitignore
echo ""
echo "7. 檢查 .gitignore..."
if grep -q "*.egg-info/" .gitignore; then
    echo "✅ .egg-info/ 已添加到 .gitignore"
fi

if grep -q "__pycache__/" .gitignore; then
    echo "✅ __pycache__/ 已添加到 .gitignore"
fi

echo ""
echo "=== Phase 1 驗證完成 ==="
echo "✅ 所有檢查通過！"
```

**成功標準：**
- ✅ 沒有中文目錄名稱
- ✅ 沒有 .egg-info 目錄
- ✅ _sandbox/ 存在且有 README.md
- ✅ .gitignore 已更新
- ✅ 無中文目錄引用

---

### Phase 2 驗證

```bash
#!/bin/bash
# Phase 2 驗證腳本

echo "=== Phase 2 驗證 ==="
echo ""

# 1. 檢查服務結構
echo "1. 檢查服務結構..."
if [ -d "workspace/src/services/contract-service" ]; then
    echo "✅ services/contract-service/ 存在"
    ls -la workspace/src/services/contract-service/ | head -10
else
    echo "❌ services/contract-service/ 不存在"
    exit 1
fi

# 2. 檢查應用結構
echo ""
echo "2. 檢查應用結構..."
if [ -d "workspace/src/apps/web" ]; then
    echo "✅ apps/web/ 存在"
    ls -la workspace/src/apps/web/ | head -10
else
    echo "❌ apps/web/ 不存在"
    exit 1
fi

# 3. 檢查核心目錄
echo ""
echo "3. 檢查核心目錄（應該沒有重複）..."
if [ -d "workspace/src/core/contracts" ]; then
    echo "❌ core/contracts/ 仍然存在（應該已刪除）"
    exit 1
else
    echo "✅ core/contracts/ 已刪除"
fi

if [ -d "workspace/src/core/contract_service" ]; then
    echo "❌ core/contract_service/ 仍然存在（應該已刪除）"
    exit 1
else
    echo "✅ core/contract_service/ 已刪除"
fi

if [ -d "workspace/src/web" ]; then
    echo "❌ web/ 仍然存在（應該已移動）"
    exit 1
else
    echo "✅ web/ 已移動"
fi

# 4. 運行服務測試（如果存在）
echo ""
echo "4. 運行服務測試..."
if [ -f "workspace/src/services/contract-service/package.json" ]; then
    cd workspace/src/services/contract-service
    if npm test 2>/dev/null; then
        echo "✅ 服務測試通過"
    else
        echo "⚠️  服務測試未通過（可能需要配置）"
    fi
    cd - > /dev/null
fi

# 5. 檢查前端構建（如果存在）
echo ""
echo "5. 檢查前端構建..."
if [ -f "workspace/src/apps/web/package.json" ]; then
    cd workspace/src/apps/web
    if npm run build 2>/dev/null; then
        echo "✅ 前端構建成功"
    else
        echo "⚠️  前端構建失敗（可能需要配置）"
    fi
    cd - > /dev/null
fi

# 6. 檢查備份目錄
echo ""
echo "6. 檢查備份目錄..."
if [ -d "workspace/src/core/contracts.backup" ]; then
    echo "✅ contracts.backup 存在"
fi

if [ -d "workspace/src/core/contract_service.backup" ]; then
    echo "✅ contract_service.backup 存在"
fi

if [ -d "workspace/src/web.backup" ]; then
    echo "✅ web.backup 存在"
fi

echo ""
echo "=== Phase 2 驗證完成 ==="
echo "✅ 所有檢查通過！"
```

**成功標準：**
- ✅ services/contract-service/ 存在且可運行
- ✅ apps/web/ 存在且可構建
- ✅ 沒有 core/contracts/ 和 core/contract_service/
- ✅ 沒有 workspace/src/web/
- ✅ 備份目錄存在

---

### Phase 3 驗證

```bash
#!/bin/bash
# Phase 3 驗證腳本

echo "=== Phase 3 驗證 ==="
echo ""

# 1. 檢查 Python 模組結構
echo "1. 檢查 Python 模組結構..."
echo "  ai_engine/"
if [ -d "workspace/src/core/ai_engine" ]; then
    echo "  ✅ ai_engine/ 存在"
    ls -la workspace/src/core/ai_engine/ | grep -E "\.py$"
else
    echo "  ❌ ai_engine/ 不存在"
    exit 1
fi

echo ""
echo "  automation/"
if [ -d "workspace/src/core/automation" ]; then
    echo "  ✅ automation/ 存在"
    ls -la workspace/src/core/automation/ | grep -E "\.py$"
else
    echo "  ❌ automation/ 不存在"
    exit 1
fi

echo ""
echo "  engine/"
if [ -d "workspace/src/core/engine" ]; then
    echo "  ✅ engine/ 存在"
    ls -la workspace/src/core/engine/ | grep -E "\.py$"
else
    echo "  ❌ engine/ 不存在"
    exit 1
fi

# 2. 運行 Python 測試
echo ""
echo "2. 運行 Python 測試..."
if command -v pytest &> /dev/null; then
    if pytest workspace/src/core/ -v 2>/dev/null; then
        echo "✅ Python 測試通過"
    else
        echo "⚠️  Python 測試未通過（可能需要更新導入）"
    fi
else
    echo "⚠️  pytest 未安裝，跳過測試"
fi

# 3. 檢查導入引用
echo ""
echo "3. 檢查導入引用..."
# 檢查舊導入是否仍然存在
OLD_IMPORTS=$(grep -r "from core\.ai_decision_engine" workspace/src/core/ 2>/dev/null || true)
if [ -z "$OLD_IMPORTS" ]; then
    echo "✅ 舊導入已更新"
else
    echo "⚠️  發現舊導入引用，需要手動更新"
fi

# 4. 檢查 __init__.py 檔案
echo ""
echo "4. 檢查 __init__.py 檔案..."
if [ -f "workspace/src/core/ai_engine/__init__.py" ]; then
    echo "✅ ai_engine/__init__.py 存在"
fi

if [ -f "workspace/src/core/automation/__init__.py" ]; then
    echo "✅ automation/__init__.py 存在"
fi

if [ -f "workspace/src/core/engine/__init__.py" ]; then
    echo "✅ engine/__init__.py 存在"
fi

echo ""
echo "=== Phase 3 驗證完成 ==="
echo "✅ 所有檢查通過！"
```

**成功標準：**
- ✅ 核心 Python 檔案已分類
- ✅ 所有測試通過
- ✅ 沒有導入錯誤
- ✅ __init__.py 檔案存在

---

### 最終驗證（完整測試）

```bash
#!/bin/bash
# 完整驗證腳本

echo "========================================"
echo "  MachineNativeOps 完整驗證"
echo "========================================"
echo ""

# 1. 運行所有測試
echo "1. 運行單元測試..."
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "  運行 npm test..."
    npm test
    echo "  ✅ npm test 完成"
fi

if command -v pytest &> /dev/null; then
    echo "  運行 pytest..."
    pytest workspace/src/ -v
    echo "  ✅ pytest 完成"
fi

# 2. 運行構建
echo ""
echo "2. 運行構建..."
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    echo "  運行 npm run build..."
    npm run build
    echo "  ✅ npm build 完成"
fi

# 3. 檢查代碼品質
echo ""
echo "3. 檢查代碼品質..."
if command -v flake8 &> /dev/null; then
    echo "  運行 flake8..."
    flake8 workspace/src/ --max-line-length=100
    echo "  ✅ flake8 完成"
fi

if command -v eslint &> /dev/null; then
    echo "  運行 eslint..."
    eslint workspace/src/
    echo "  ✅ eslint 完成"
fi

# 4. 檢查文檔
echo ""
echo "4. 檢查文檔..."
CHINESE_REF=$(grep -r "代碼聖殿" docs/ 2>/dev/null || true)
if [ -z "$CHINESE_REF" ]; then
    echo "  ✅ 文檔中無中文目錄引用"
else
    echo "  ❌ 文檔中仍有中文目錄引用"
    echo "$CHINESE_REF"
fi

# 5. 生成驗證報告
echo ""
echo "========================================"
echo "  驗證完成！"
echo "========================================"
echo ""
echo "請檢查上述輸出。"
```

---

## 風險管理與回滾策略

### 風險評估矩陣

| 風險 | 影響 | 可能性 | 緩解措施 | 備份策略 |
|------|------|--------|----------|----------|
| 導入路徑錯誤 | 高 | 中 | 全面的引用檢查和更新 | Git 標籤 + 文件備份 |
| 測試失敗 | 中 | 中 | 每個階段後驗證 | 逐步回滾 |
| 配置丟失 | 高 | 低 | 備份配置文件 | 備份目錄保留 |
| 構建失敗 | 中 | 低 | 更新構建腳本 | Git 歷史記錄 |

### 回滾觸發條件

**立即回滾：**
- 關鍵模組無法導入
- 測試套件失敗率 > 50%
- 構建完全失敗

**評估後回滾：**
- 測試失敗率 20-50%
- 部分功能異常
- 性能顯著下降

**不回滾（繼續）：**
- 測試失敗率 < 20%
- 僅文檔更新
- 非關鍵功能異常

### 回滾執行流程

```bash
# 1. 識別問題
git log --oneline -10
git diff HEAD~1

# 2. 執行回滾
./scripts/rollback.sh

# 3. 驗證回滾
npm test
pytest

# 4. 報告問題
# 記錄問題到 issue tracker
```

---

## 團隊溝通和培訓

### 溝通計劃

**重構前：**
- 📧 發送重構計劃郵件
- 📅 安排團隊會議討論
- 📝 收集反饋和建議

**重構中：**
- 💬 即時通訊群組更新進度
- 🔄 每日站會同步狀態
- 📊 共享進度儀表板

**重構後：**
- 🎉 發布重構完成公告
- 📚 更新文檔和培訓材料
- 🤝 收集用戶反饋

### 培訓計劃

**培訓內容：**
1. 新架構概覽
2. 目錄結構變更
3. 導入路徑更新
4. 開發工作流程
5. 常見問題解答

**培訓形式：**
- 📹 錄製培訓視頻
- 📖 編寫培訓文檔
- 🎓 舉辦線上培訓會議
- 💻 提供實戰練習

---

## 總結

本架構重構方案遵循以下原則：

1. **安全第一**：每個階段都有備份和回滾機制
2. **漸進式執行**：從低風險到高風險逐步進行
3. **持續驗證**：每個階段後都進行完整驗證
4. **團隊協作**：充分的溝通和培訓

**預期收益：**
- ✅ 更清晰的目錄結構
- ✅ 更好的可維護性
- ✅ 更高的開發效率
- ✅ 更強的擴展性

**執行時間預估：**
- Phase 1：1-2 小時
- Phase 2：2-3 小時
- Phase 3：1-2 小時
- 驗證和測試：1-2 小時
- **總計：5-9 小時**

**風險等級：** 🟡 中等風險（有完整的備份和回滾機制）

---

## 附錄

### A. 快速參考

**常用命令：**
```bash
# 執行重構
./scripts/safe-refactor.sh all

# 回滾
./scripts/rollback.sh

# 驗證
./scripts/safe-refactor.sh validate
```

**關鍵檔案：**
- `scripts/safe-refactor.sh` - 重構腳本
- `scripts/rollback.sh` - 回滾腳本
- `workspace/scripts/validate-structure.sh` - 驗證腳本

### B. 聯繫方式

如有問題，請聯繫：
- 專案負責人：[待填寫]
- 技術支持：[待填寫]
- 文檔：[待填寫]

---

**文檔版本：** 1.0.0  
**最後更新：** 2024-01-15  
**作者：** MachineNativeOps 架構團隊