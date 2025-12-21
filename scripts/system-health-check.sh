#!/bin/bash
# MachineNativeOps 系統健康檢查腳本
# 版本: v1.0.0
# 用途: 執行全面的系統健康檢查

set -euo pipefail

# 載入錯誤處理函式庫
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 載入錯誤處理
if [ -f "$PROJECT_ROOT/lib/error-handlers.sh" ]; then
    source "$PROJECT_ROOT/lib/error-handlers.sh"
    load_error_handling
else
    echo "錯誤: 無法載入錯誤處理函式庫"
    exit 1
fi

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 健康檢查結果
declare -A CHECK_RESULTS
declare -A CHECK_STATUS

# 檢查專案目錄結構
check_directory_structure() {
    local check_name="directory_structure"
    error_log "INFO" "檢查目錄結構..."
    
    local required_dirs=(
        "root"
        "etc"
        "bin"
        "sbin"
        "lib"
        "usr"
        "var"
        "init.d"
        ".github/workflows"
    )
    
    local missing_dirs=0
    for dir in "${required_dirs[@]}"; do
        if ! directory_exists "$PROJECT_ROOT/$dir"; then
            error_log "ERROR" "缺少目錄: $dir"
            missing_dirs=$((missing_dirs + 1))
        fi
    done
    
    if [ "$missing_dirs" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="目錄結構完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "目錄結構檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_dirs 個目錄"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "目錄結構檢查失敗"
    fi
}

# 檢查配置檔案
check_configuration_files() {
    local check_name="configuration_files"
    error_log "INFO" "檢查配置檔案..."
    
    local required_configs=(
        "root/spec/root.specs.naming.yaml"
        "root/registry/root.registry.modules.yaml"
        "root/policy/root.governance.yaml"
        "root/engine/engine.yaml"
        "etc/logging-config.yaml"
    )
    
    local missing_configs=0
    for config in "${required_configs[@]}"; do
        if ! file_exists "$PROJECT_ROOT/$config"; then
            error_log "ERROR" "缺少配置檔案: $config"
            missing_configs=$((missing_configs + 1))
        fi
    done
    
    if [ "$missing_configs" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="配置檔案完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "配置檔案檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_configs 個配置檔案"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "配置檔案檢查失敗"
    fi
}

# 檢查初始化腳本
check_initialization_scripts() {
    local check_name="initialization_scripts"
    error_log "INFO" "檢查初始化腳本..."
    
    local init_dir="$PROJECT_ROOT/init.d"
    local missing_scripts=0
    
    if ! directory_exists "$init_dir"; then
        CHECK_RESULTS[$check_name]="初始化腳本目錄不存在"
        CHECK_STATUS[$check_name]="FAIL"
        return
    fi
    
    # 檢查關鍵初始化腳本
    local critical_scripts=(
        "00-init.sh"
        "01-governance-init.sh"
        "99-finalize.sh"
    )
    
    for script in "${critical_scripts[@]}"; do
        if ! file_exists "$init_dir/$script"; then
            error_log "ERROR" "缺少關鍵初始化腳本: $script"
            missing_scripts=$((missing_scripts + 1))
        elif ! [ -x "$init_dir/$script" ]; then
            error_log "WARNING" "初始化腳本無執行權限: $script"
        fi
    done
    
    if [ "$missing_scripts" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="關鍵初始化腳本完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "初始化腳本檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_scripts 個關鍵腳本"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "初始化腳本檢查失敗"
    fi
}

# 檢查可執行檔案
check_executables() {
    local check_name="executables"
    error_log "INFO" "檢查可執行檔案..."
    
    local required_execs=(
        "bin/mno-admin"
        "sbin/mno-systemctl"
    )
    
    local missing_execs=0
    for exec_file in "${required_execs[@]}"; do
        if ! file_exists "$PROJECT_ROOT/$exec_file"; then
            error_log "ERROR" "缺少可執行檔案: $exec_file"
            missing_execs=$((missing_execs + 1))
        elif ! [ -x "$PROJECT_ROOT/$exec_file" ]; then
            error_log "WARNING" "檔案無執行權限: $exec_file"
            # 嘗試添加執行權限
            chmod +x "$PROJECT_ROOT/$exec_file"
        fi
    done
    
    if [ "$missing_execs" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="可執行檔案完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "可執行檔案檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_execs 個可執行檔案"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "可執行檔案檢查失敗"
    fi
}

# 檢查日誌目錄
check_log_directories() {
    local check_name="log_directories"
    error_log "INFO" "檢查日誌目錄..."
    
    local log_dirs=(
        "var/log/machine-native-ops"
        "var/lib/machine-native-ops"
        "var/tmp"
    )
    
    local missing_dirs=0
    for dir in "${log_dirs[@]}"; do
        if ! directory_exists "$PROJECT_ROOT/$dir"; then
            error_log "ERROR" "缺少日誌目錄: $dir"
            missing_dirs=$((missing_dirs + 1))
        fi
    done
    
    if [ "$missing_dirs" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="日誌目錄完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "日誌目錄檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_dirs 個日誌目錄"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "日誌目錄檢查失敗"
    fi
}

# 檢查函式庫檔案
check_library_files() {
    local check_name="library_files"
    error_log "INFO" "檢查函式庫檔案..."
    
    local required_libs=(
        "lib/error-handlers.sh"
    )
    
    local missing_libs=0
    for lib_file in "${required_libs[@]}"; do
        if ! file_exists "$PROJECT_ROOT/$lib_file"; then
            error_log "ERROR" "缺少函式庫檔案: $lib_file"
            missing_libs=$((missing_libs + 1))
        fi
    done
    
    if [ "$missing_libs" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="函式庫檔案完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "函式庫檔案檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_libs 個函式庫檔案"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "函式庫檔案檢查失敗"
    fi
}

# 檢查 GitHub Actions
check_github_actions() {
    local check_name="github_actions"
    error_log "INFO" "檢查 GitHub Actions..."
    
    local workflows_dir="$PROJECT_ROOT/.github/workflows"
    local required_workflows=(
        "gate-pr-evidence.yml"
        "gate-root-naming.yml"
        "gate-root-specs.yml"
    )
    
    local missing_workflows=0
    if ! directory_exists "$workflows_dir"; then
        CHECK_RESULTS[$check_name]="GitHub Actions 目錄不存在"
        CHECK_STATUS[$check_name]="FAIL"
        return
    fi
    
    for workflow in "${required_workflows[@]}"; do
        if ! file_exists "$workflows_dir/$workflow"; then
            error_log "ERROR" "缺少 GitHub Actions 工作流: $workflow"
            missing_workflows=$((missing_workflows + 1))
        fi
    done
    
    if [ "$missing_workflows" -eq 0 ]; then
        CHECK_RESULTS[$check_name]="GitHub Actions 工作流完整"
        CHECK_STATUS[$check_name]="PASS"
        error_log "SUCCESS" "GitHub Actions 檢查通過"
    else
        CHECK_RESULTS[$check_name]="缺少 $missing_workflows 個工作流"
        CHECK_STATUS[$check_name]="FAIL"
        error_log "ERROR" "GitHub Actions 檢查失敗"
    fi
}

# 生成健康檢查報告
generate_health_report() {
    local report_file="$PROJECT_ROOT/var/log/machine-native-ops/health-check-$(date +%Y%m%d-%H%M%S).log"
    mkdir -p "$(dirname "$report_file")"
    
    {
        echo "MachineNativeOps 系統健康檢查報告"
        echo "===================================="
        echo "檢查時間: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "項目路徑: $PROJECT_ROOT"
        echo ""
        
        local total_checks=0
        local passed_checks=0
        local failed_checks=0
        
        for check_name in "${!CHECK_STATUS[@]}"; do
            total_checks=$((total_checks + 1))
            
            local status="${CHECK_STATUS[$check_name]}"
            local result="${CHECK_RESULTS[$check_name]}"
            
            case "$status" in
                "PASS")
                    echo -e "✅ ${GREEN}$check_name${NC}: $result"
                    passed_checks=$((passed_checks + 1))
                    ;;
                "FAIL")
                    echo -e "❌ ${RED}$check_name${NC}: $result"
                    failed_checks=$((failed_checks + 1))
                    ;;
                "WARN")
                    echo -e "⚠️  ${YELLOW}$check_name${NC}: $result"
                    ;;
            esac
        done
        
        echo ""
        echo "檢查摘要:"
        echo "---------"
        echo "總檢查項: $total_checks"
        echo -e "通過: ${GREEN}$passed_checks${NC}"
        echo -e "失敗: ${RED}$failed_checks${NC}"
        
        local success_rate=$((passed_checks * 100 / total_checks))
        echo "成功率: $success_rate%"
        
        if [ "$success_rate" -eq 100 ]; then
            echo -e "\n🎉 ${GREEN}系統健康狀態: 優秀${NC}"
        elif [ "$success_rate" -ge 80 ]; then
            echo -e "\n👍 ${BLUE}系統健康狀態: 良好${NC}"
        elif [ "$success_rate" -ge 60 ]; then
            echo -e "\n⚠️  ${YELLOW}系統健康狀態: 需要注意${NC}"
        else
            echo -e "\n🚨 ${RED}系統健康狀態: 需要立即修復${NC}"
        fi
        
    } | tee "$report_file"
    
    error_log "INFO" "健康檢查報告已生成: $report_file"
    return "${failed_checks:-0}"
}

# 顯示幫助資訊
show_help() {
    cat << EOF
MachineNativeOps 系統健康檢查 v1.0.0

用法: $(basename "$0") [選項]

選項:
    -h, --help          顯示此幫助資訊
    -v, --verbose       詳細輸出
    -q, --quiet         安靜模式
    -o, --output FILE   輸出報告到指定檔案
    --detailed          執行詳細檢查

檢查項目:
    directory_structure    目錄結構檢查
    configuration_files    配置檔案檢查
    initialization_scripts 初始化腳本檢查
    executables            可執行檔案檢查
    log_directories        日誌目錄檢查
    library_files          函式庫檔案檢查
    github_actions         GitHub Actions 檢查

範例:
    $(basename "$0")                    # 執行基本健康檢查
    $(basename "$0") --detailed         # 執行詳細檢查
    $(basename "$0") -v                 # 詳細輸出模式
    $(basename "$0") -o report.txt      # 輸出到檔案
EOF
}

# 主函數
main() {
    local detailed=false
    local output_file=""
    local verbose=false
    local quiet=false
    
    # 解析命令列參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            -o|--output)
                output_file="$2"
                shift 2
                ;;
            --detailed)
                detailed=true
                shift
                ;;
            *)
                error_log "ERROR" "未知選項: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 執行健康檢查
    error_log "INFO" "開始執行系統健康檢查..."
    
    check_directory_structure
    check_configuration_files
    check_initialization_scripts
    check_executables
    check_log_directories
    check_library_files
    check_github_actions
    
    # 生成報告
    local exit_code
    if [ -n "$output_file" ]; then
        generate_health_report > "$output_file"
        exit_code=$?
    else
        generate_health_report
        exit_code=$?
    fi
    
    error_log "INFO" "系統健康檢查完成"
    exit "$exit_code"
}

# 如果直接執行此腳本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi