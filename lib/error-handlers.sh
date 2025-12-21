#!/bin/bash
# MachineNativeOps 錯誤處理函式庫
# 版本: v1.0.0
# 用途: 提供統一的錯誤處理機制

# 錯誤代碼定義
readonly MNO_SUCCESS=0
readonly MNO_ERROR_GENERAL=1
readonly MNO_ERROR_INVALID_ARGS=2
readonly MNO_ERROR_FILE_NOT_FOUND=3
readonly MNO_ERROR_PERMISSION_DENIED=4
readonly MNO_ERROR_NETWORK=5
readonly MNO_ERROR_CONFIG=6
readonly MNO_ERROR_SERVICE=7
readonly MNO_ERROR_TIMEOUT=8

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 項目根目錄
readonly MNO_PROJECT_ROOT="${MNO_PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

# 日誌目錄
readonly MNO_LOG_DIR="${MNO_PROJECT_ROOT}/var/log/machine-native-ops"
readonly MNO_ERROR_LOG="${MNO_LOG_DIR}/error.log"

# 確保日誌目錄存在
mkdir -p "$MNO_LOG_DIR"

# 錯誤日誌函數
error_log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local level="$1"
    local message="$2"
    local exit_code="${3:-$MNO_ERROR_GENERAL}"
    local script_name="${BASH_SOURCE[1]##*/}"
    local line_number="${BASH_LINENO[0]}"
    
    # 寫入錯誤日誌檔案
    echo "[$timestamp] [$level] [$script_name:$line_number] $message" >> "$MNO_ERROR_LOG"
    
    # 輸出到控制台
    case "$level" in
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message" >&2
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message" >&2
            ;;
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message" >&2
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message" >&2
            ;;
    esac
}

# 錯誤處理函數
handle_error() {
    local exit_code="$1"
    local message="$2"
    local line_number="${BASH_LINENO[1]}"
    local script_name="${BASH_SOURCE[2]##*/}"
    
    error_log "ERROR" "$message (退出代碼: $exit_code)" "$exit_code"
    
    # 如果是嚴重錯誤，執行清理
    if [ "$exit_code" -gt 4 ]; then
        cleanup_on_error "$exit_code" "$message"
    fi
    
    exit "$exit_code"
}

# 錯誤清理函數
cleanup_on_error() {
    local exit_code="$1"
    local message="$2"
    
    # TODO: 實作清理邏輯
    # - 清理臨時檔案
    # - 停止相關服務
    # - 保存錯誤狀態
    
    error_log "INFO" "執行錯誤清理: $message"
}

# 檢查是否為有效錯誤代碼
is_valid_exit_code() {
    local exit_code="$1"
    [[ "$exit_code" =~ ^[0-9]+$ ]] && [ "$exit_code" -ge 0 ] && [ "$exit_code" -le 255 ]
}

# 檢查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 檢查檔案是否存在
file_exists() {
    [ -f "$1" ]
}

# 檢查目錄是否存在
directory_exists() {
    [ -d "$1" ]
}

# 檢查讀取權限
can_read() {
    [ -r "$1" ]
}

# 檢查寫入權限
can_write() {
    [ -w "$1" ]
}

# 檢查執行權限
can_execute() {
    [ -x "$1" ]
}

# 安全的讀取檔案
safe_read_file() {
    local file="$1"
    local default_value="${2:-}"
    
    if ! file_exists "$file"; then
        error_log "WARNING" "檔案不存在: $file，使用預設值"
        echo "$default_value"
        return "$MNO_ERROR_FILE_NOT_FOUND"
    fi
    
    if ! can_read "$file"; then
        error_log "ERROR" "無讀取權限: $file"
        echo "$default_value"
        return "$MNO_ERROR_PERMISSION_DENIED"
    fi
    
    cat "$file"
}

# 安全的寫入檔案
safe_write_file() {
    local file="$1"
    local content="$2"
    local mode="${3:-644}"
    
    # 確保目錄存在
    local dir=$(dirname "$file")
    mkdir -p "$dir"
    
    # 寫入內容
    if ! echo "$content" > "$file"; then
        error_log "ERROR" "無法寫入檔案: $file"
        return "$MNO_ERROR_PERMISSION_DENIED"
    fi
    
    # 設定權限
    chmod "$mode" "$file"
    
    error_log "SUCCESS" "檔案寫入成功: $file"
}

# 執行命令並捕獲錯誤
safe_execute() {
    local command="$1"
    local timeout="${2:-30}"
    local description="${3:-執行命令}"
    
    error_log "INFO" "$description: $command"
    
    # 設定超時
    if command_exists timeout; then
        if ! timeout "$timeout" bash -c "$command"; then
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                error_log "ERROR" "命令執行超時 ($timeout 秒): $command"
                return "$MNO_ERROR_TIMEOUT"
            else
                error_log "ERROR" "命令執行失敗 (退出代碼: $exit_code): $command"
                return "$exit_code"
            fi
        fi
    else
        if ! bash -c "$command"; then
            local exit_code=$?
            error_log "ERROR" "命令執行失敗 (退出代碼: $exit_code): $command"
            return "$exit_code"
        fi
    fi
    
    error_log "SUCCESS" "命令執行成功: $command"
}

# 檢查網路連線
check_network() {
    local host="${1:-8.8.8.8}"
    local timeout="${2:-5}"
    
    if command_exists ping; then
        if ping -c 1 -W "$timeout" "$host" >/dev/null 2>&1; then
            return "$MNO_SUCCESS"
        else
            return "$MNO_ERROR_NETWORK"
        fi
    else
        error_log "WARNING" "ping 命令不存在，無法檢查網路連線"
        return "$MNO_SUCCESS"
    fi
}

# 檢查磁碟空間
check_disk_space() {
    local directory="${1:-$MNO_PROJECT_ROOT}"
    local required_mb="${2:-100}"
    
    if ! directory_exists "$directory"; then
        error_log "ERROR" "目錄不存在: $directory"
        return "$MNO_ERROR_FILE_NOT_FOUND"
    fi
    
    local available_kb=$(df "$directory" | awk 'NR==2 {print $4}')
    local available_mb=$((available_kb / 1024))
    
    if [ "$available_mb" -lt "$required_mb" ]; then
        error_log "ERROR" "磁碟空間不足，需要 ${required_mb}MB，可用 ${available_mb}MB"
        return "$MNO_ERROR_GENERAL"
    fi
    
    error_log "SUCCESS" "磁碟空間檢查通過，可用 ${available_mb}MB"
}

# 設定錯誤陷阱
set_error_trap() {
    set -Eeuo pipefail
    
    # 設定錯誤處理陷阱
    trap 'handle_error $? "腳本執行錯誤"' ERR
    
    # 設定退出陷阱
    trap 'error_log "INFO" "腳本正常退出"' EXIT
}

# 載入錯誤處理
load_error_handling() {
    # 匯出變數
    export MNO_SUCCESS MNO_ERROR_GENERAL MNO_ERROR_INVALID_ARGS
    export MNO_ERROR_FILE_NOT_FOUND MNO_ERROR_PERMISSION_DENIED
    export MNO_ERROR_NETWORK MNO_ERROR_CONFIG MNO_ERROR_SERVICE
    export MNO_ERROR_TIMEOUT
    export MNO_PROJECT_ROOT MNO_LOG_DIR MNO_ERROR_LOG
    export RED GREEN YELLOW BLUE NC
    
    # 設定錯誤陷阱
    set_error_trap
}

# 如果直接執行此腳本，顯示版本資訊
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "MachineNativeOps 錯誤處理函式庫 v1.0.0"
    echo "載入此檔案以使用錯誤處理功能"
    echo ""
    echo "使用方法:"
    echo "  source /path/to/lib/error-handlers.sh"
    echo ""
    echo "可用函數:"
    echo "  error_log, handle_error, safe_read_file, safe_write_file"
    echo "  safe_execute, check_network, check_disk_space"
fi