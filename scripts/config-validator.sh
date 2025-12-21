#!/bin/bash
# MachineNativeOps 配置驗證腳本
# 版本: v1.0.0
# 用途: 驗證所有配置檔案的語法和完整性

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

# 驗證結果
declare -A VALIDATION_RESULTS
declare -A VALIDATION_STATUS

# 檢查 YAML 語法
check_yaml_syntax() {
    local file="$1"
    
    if command_exists "yamllint"; then
        if yamllint -d relaxed "$file" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    elif command_exists "python3"; then
        if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    else
        error_log "WARNING" "無 YAML 驗證工具，跳過語法檢查: $file"
        return 0
    fi
}

# 檢查 JSON 語法
check_json_syntax() {
    local file="$1"
    
    if command_exists "jq"; then
        if jq . "$file" >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    elif command_exists "python3"; then
        if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
            return 0
        else
            return 1
        fi
    else
        error_log "WARNING" "無 JSON 驗證工具，跳過語法檢查: $file"
        return 0
    fi
}

# 驗證 YAML 檔案
validate_yaml_files() {
    local validation_name="yaml_syntax"
    error_log "INFO" "驗證 YAML 檔案語法..."
    
    local yaml_files=($(find "$PROJECT_ROOT" -name "*.yaml" -o -name "*.yml" | grep -v ".git"))
    local total_files=${#yaml_files[@]}
    local failed_files=0
    
    for file in "${yaml_files[@]}"; do
        if ! check_yaml_syntax "$file"; then
            error_log "ERROR" "YAML 語法錯誤: $file"
            failed_files=$((failed_files + 1))
        fi
    done
    
    if [ "$failed_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="所有 $total_files 個 YAML 檔案語法正確"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "SUCCESS" "YAML 語法驗證通過"
    else
        VALIDATION_RESULTS[$validation_name]="$failed_files/$total_files 個 YAML 檔案有語法錯誤"
        VALIDATION_STATUS[$validation_name]="FAIL"
        error_log "ERROR" "YAML 語法驗證失敗"
    fi
}

# 驗證 JSON 檔案
validate_json_files() {
    local validation_name="json_syntax"
    error_log "INFO" "驗證 JSON 檔案語法..."
    
    local json_files=($(find "$PROJECT_ROOT" -name "*.json" | grep -v ".git"))
    local total_files=${#json_files[@]}
    local failed_files=0
    
    for file in "${json_files[@]}"; do
        if ! check_json_syntax "$file"; then
            error_log "ERROR" "JSON 語法錯誤: $file"
            failed_files=$((failed_files + 1))
        fi
    done
    
    if [ "$total_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="沒有找到 JSON 檔案"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "INFO" "沒有 JSON 檔案需要驗證"
    elif [ "$failed_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="所有 $total_files 個 JSON 檔案語法正確"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "SUCCESS" "JSON 語法驗證通過"
    else
        VALIDATION_RESULTS[$validation_name]="$failed_files/$total_files 個 JSON 檔案有語法錯誤"
        VALIDATION_STATUS[$validation_name]="FAIL"
        error_log "ERROR" "JSON 語法驗證失敗"
    fi
}

# 驗證腳本語法
validate_shell_scripts() {
    local validation_name="shell_syntax"
    error_log "INFO" "驗證 Shell 腳本語法..."
    
    local shell_files=($(find "$PROJECT_ROOT" -name "*.sh" | grep -v ".git"))
    local total_files=${#shell_files[@]}
    local failed_files=0
    
    for file in "${shell_files[@]}"; do
        if bash -n "$file" 2>/dev/null; then
            continue
        else
            error_log "ERROR" "Shell 語法錯誤: $file"
            failed_files=$((failed_files + 1))
        fi
    done
    
    if [ "$total_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="沒有找到 Shell 腳本"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "INFO" "沒有 Shell 腳本需要驗證"
    elif [ "$failed_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="所有 $total_files 個 Shell 腳本語法正確"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "SUCCESS" "Shell 腞本語法驗證通過"
    else
        VALIDATION_RESULTS[$validation_name]="$failed_files/$total_files 個 Shell 腳本有語法錯誤"
        VALIDATION_STATUS[$validation_name]="FAIL"
        error_log "ERROR" "Shell 腳本語法驗證失敗"
    fi
}

# 驗證 Python 語法
validate_python_files() {
    local validation_name="python_syntax"
    error_log "INFO" "驗證 Python 檔案語法..."
    
    local python_files=($(find "$PROJECT_ROOT" -name "*.py" | grep -v ".git"))
    local total_files=${#python_files[@]}
    local failed_files=0
    
    for file in "${python_files[@]}"; do
        if python3 -m py_compile "$file" 2>/dev/null; then
            continue
        else
            error_log "ERROR" "Python 語法錯誤: $file"
            failed_files=$((failed_files + 1))
        fi
    done
    
    if [ "$total_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="沒有找到 Python 檔案"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "INFO" "沒有 Python 檔案需要驗證"
    elif [ "$failed_files" -eq 0 ]; then
        VALIDATION_RESULTS[$validation_name]="所有 $total_files 個 Python 檔案語法正確"
        VALIDATION_STATUS[$validation_name]="PASS"
        error_log "SUCCESS" "Python 語法驗證通過"
    else
        VALIDATION_RESULTS[$validation_name]="$failed_files/$total_files 個 Python 檔案有語法錯誤"
        VALIDATION_STATUS[$validation_name]="FAIL"
        error_log "ERROR" "Python 語法驗證失敗"
    fi
}

# 生成驗證報告
generate_validation_report() {
    local report_file="$PROJECT_ROOT/var/log/machine-native-ops/config-validation-$(date +%Y%m%d-%H%M%S).log"
    mkdir -p "$(dirname "$report_file")"
    
    {
        echo "MachineNativeOps 配置驗證報告"
        echo "==============================="
        echo "驗證時間: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "項目路徑: $PROJECT_ROOT"
        echo ""
        
        local total_checks=0
        local passed_checks=0
        local failed_checks=0
        
        for validation_name in "${!VALIDATION_STATUS[@]}"; do
            total_checks=$((total_checks + 1))
            
            local status="${VALIDATION_STATUS[$validation_name]}"
            local result="${VALIDATION_RESULTS[$validation_name]}"
            
            case "$status" in
                "PASS")
                    echo -e "✅ ${GREEN}$validation_name${NC}: $result"
                    passed_checks=$((passed_checks + 1))
                    ;;
                "FAIL")
                    echo -e "❌ ${RED}$validation_name${NC}: $result"
                    failed_checks=$((failed_checks + 1))
                    ;;
            esac
        done
        
        echo ""
        echo "驗證摘要:"
        echo "---------"
        echo "總檢查項: $total_checks"
        echo -e "通過: ${GREEN}$passed_checks${NC}"
        echo -e "失敗: ${RED}$failed_checks${NC}"
        
        local success_rate=$((passed_checks * 100 / total_checks))
        echo "成功率: $success_rate%"
        
        if [ "$success_rate" -eq 100 ]; then
            echo -e "\n🎉 ${GREEN}配置驗證狀態: 全部通過${NC}"
        elif [ "$success_rate" -ge 80 ]; then
            echo -e "\n👍 ${BLUE}配置驗證狀態: 大部分通過${NC}"
        else
            echo -e "\n🚨 ${RED}配置驗證狀態: 需要修復${NC}"
        fi
        
    } | tee "$report_file"
    
    error_log "INFO" "配置驗證報告已生成: $report_file"
    return "${failed_checks:-0}"
}

# 主函數
main() {
    error_log "INFO" "開始執行配置驗證..."
    
    validate_yaml_files
    validate_json_files
    validate_shell_scripts
    validate_python_files
    
    # 生成報告
    generate_validation_report
    local exit_code=$?
    
    error_log "INFO" "配置驗證完成"
    exit "$exit_code"
}

# 如果直接執行此腳本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi