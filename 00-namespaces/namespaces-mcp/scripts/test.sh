#!/bin/bash
# MachineNativeOps 測試執行腳本
# 版本: 1.0.0

set -euo pipefail

# ==================== 配置參數 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TESTS_DIR="$PROJECT_ROOT/tests"
REPORTS_DIR="$PROJECT_ROOT/reports"

# ==================== 顏色輸出 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ==================== 日誌函數 ====================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

# ==================== 主執行流程 ====================
main() {
    log_header "MachineNativeOps 測試套件"
    echo ""
    
    # 檢查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 未安裝"
        exit 1
    fi
    
    log_info "Python 版本: $(python3 --version)"
    echo ""
    
    # 創建報告目錄
    mkdir -p "$REPORTS_DIR"
    
    # 運行測試
    log_info "運行測試套件..."
    echo ""
    
    cd "$PROJECT_ROOT"
    python3 -m pytest tests/ -v --tb=short || {
        log_warning "pytest 未安裝，使用 unittest"
        python3 tests/test_converter.py
    }
    
    TEST_RESULT=$?
    
    echo ""
    if [ $TEST_RESULT -eq 0 ]; then
        log_success "✅ 所有測試通過！"
    else
        log_error "❌ 測試失敗"
        exit 1
    fi
}

main "$@"