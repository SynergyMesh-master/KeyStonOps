#!/bin/bash
# MachineNativeOps 命名空間 MCP 轉換執行腳本
# 版本: 1.0.0

set -euo pipefail

# ==================== 配置參數 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/config"
SRC_DIR="$PROJECT_ROOT/src"
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
    exit 1
}

log_header() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}================================================${NC}"
}

# ==================== 幫助信息 ====================
show_help() {
    cat << EOF
MachineNativeOps 命名空間 MCP 轉換工具

用法:
    $0 <source_path> <target_path> [options]

參數:
    source_path     源專案路徑
    target_path     目標專案路徑

選項:
    -c, --config    配置文件路徑 (默認: config/conversion.yaml)
    -v, --verbose   詳細輸出模式
    -d, --dry-run   乾跑模式 (不實際修改文件)
    -h, --help      顯示此幫助信息

範例:
    # 基本使用
    $0 /path/to/source /path/to/target

    # 使用自定義配置
    $0 /path/to/source /path/to/target --config my-config.yaml

    # 乾跑模式
    $0 /path/to/source /path/to/target --dry-run

版本: 1.0.0
作者: MachineNativeOps Team
EOF
}

# ==================== 參數解析 ====================
parse_arguments() {
    if [ $# -lt 2 ]; then
        show_help
        exit 1
    fi

    SOURCE_PATH="$1"
    TARGET_PATH="$2"
    shift 2

    CONFIG_FILE="$CONFIG_DIR/conversion.yaml"
    VERBOSE=false
    DRY_RUN=false

    while [ $# -gt 0 ]; do
        case "$1" in
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知選項: $1"
                ;;
        esac
    done
}

# ==================== 環境驗證 ====================
validate_environment() {
    log_info "驗證執行環境..."

    # 檢查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 未安裝"
    fi

    # 檢查 Python 版本
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    if (( $(echo "$PYTHON_VERSION < 3.8" | bc -l) )); then
        log_error "需要 Python 3.8 或更高版本 (當前: $PYTHON_VERSION)"
    fi

    # 檢查源目錄
    if [ ! -d "$SOURCE_PATH" ]; then
        log_error "源目錄不存在: $SOURCE_PATH"
    fi

    # 檢查配置文件
    if [ ! -f "$CONFIG_FILE" ]; then
        log_warning "配置文件不存在: $CONFIG_FILE，將使用默認配置"
    fi

    # 創建目標目錄
    mkdir -p "$TARGET_PATH"
    mkdir -p "$REPORTS_DIR"

    log_success "環境驗證通過"
}

# ==================== 專案信息 ====================
show_project_info() {
    log_header "專案信息"
    echo ""
    echo "  源專案路徑: $SOURCE_PATH"
    echo "  目標專案路徑: $TARGET_PATH"
    echo "  配置文件: $CONFIG_FILE"
    echo "  詳細模式: $VERBOSE"
    echo "  乾跑模式: $DRY_RUN"
    echo ""
}

# ==================== 執行轉換 ====================
execute_conversion() {
    log_header "開始專案轉換"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_info "🚀 乾跑模式 - 模擬專案轉換"
        echo ""
        log_info "將執行以下治理層級轉換:"
        echo "  1. 命名空間對齊 (Namespace Alignment)"
        echo "  2. 依賴關係對齊 (Dependency Alignment)"
        echo "  3. 引用路徑對齊 (Reference Alignment)"
        echo "  4. 結構佈局對齊 (Structure Alignment)"
        echo "  5. 語意對齊 (Semantic Alignment)"
        echo "  6. 治理合規對齊 (Governance Alignment)"
        echo ""
        log_success "乾跑模式完成 - 未實際修改文件"
        return 0
    fi

    # 構建 Python 命令
    PYTHON_CMD="python3 $SRC_DIR/converter.py"
    PYTHON_CMD="$PYTHON_CMD \"$SOURCE_PATH\" \"$TARGET_PATH\""
    
    if [ -f "$CONFIG_FILE" ]; then
        PYTHON_CMD="$PYTHON_CMD --config \"$CONFIG_FILE\""
    fi
    
    if [ "$VERBOSE" = true ]; then
        PYTHON_CMD="$PYTHON_CMD --verbose"
    fi

    # 執行轉換
    log_info "執行轉換命令..."
    eval $PYTHON_CMD

    if [ $? -eq 0 ]; then
        log_success "轉換執行成功"
        return 0
    else
        log_error "轉換執行失敗"
        return 1
    fi
}

# ==================== 生成報告 ====================
generate_summary() {
    log_header "轉換摘要"
    echo ""

    if [ -f "$TARGET_PATH/CONVERSION-REPORT.md" ]; then
        # 提取關鍵指標
        TOTAL_FILES=$(grep "總文件數" "$TARGET_PATH/CONVERSION-REPORT.md" | grep -oP '\d+' | head -1)
        TOTAL_CHANGES=$(grep "總變更數" "$TARGET_PATH/CONVERSION-REPORT.md" | grep -oP '\d+' | head -1)
        SUCCESS_LAYERS=$(grep "成功層級" "$TARGET_PATH/CONVERSION-REPORT.md" | grep -oP '\d+/\d+' | head -1)

        echo "  📊 總文件數: $TOTAL_FILES"
        echo "  🔄 總變更數: $TOTAL_CHANGES"
        echo "  ✅ 成功層級: $SUCCESS_LAYERS"
        echo ""
        echo "  📝 詳細報告: $TARGET_PATH/CONVERSION-REPORT.md"
        echo "  📋 JSON 報告: $TARGET_PATH/conversion-report.json"
        echo ""
    else
        log_warning "未找到轉換報告"
    fi
}

# ==================== 清理函數 ====================
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "轉換過程中發生錯誤"
    fi
}

trap cleanup EXIT

# ==================== 主執行流程 ====================
main() {
    log_header "MachineNativeOps 命名空間 MCP 轉換工具"
    echo ""
    echo "  版本: 1.0.0"
    echo "  SLSA 等級: L3+"
    echo "  MCP 協議: 2024.1"
    echo ""

    # 解析參數
    parse_arguments "$@"

    # 顯示專案信息
    show_project_info

    # 驗證環境
    validate_environment

    # 執行轉換
    execute_conversion

    # 生成摘要
    generate_summary

    # 完成
    log_header "轉換完成"
    echo ""
    log_success "🎉 專案轉換成功完成！"
    echo ""
    echo "  下一步:"
    echo "    1. 查看轉換報告: cat $TARGET_PATH/CONVERSION-REPORT.md"
    echo "    2. 驗證轉換結果: cd $TARGET_PATH && ls -la"
    echo "    3. 運行測試: ./scripts/test.sh"
    echo ""
}

# 執行主函數
main "$@"
