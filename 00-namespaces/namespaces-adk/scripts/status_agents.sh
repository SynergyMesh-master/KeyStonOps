#!/bin/bash
# Check status of all ADK governance agents

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_ROOT/pids"
LOG_DIR="$PROJECT_ROOT/logs"

echo -e "${BLUE}ADK Governance Agents Status${NC}"
echo "=========================================="
echo "Project Root: $PROJECT_ROOT"
echo ""

# Function to check agent status
check_agent() {
    local agent_name=$1
    local agent_display_name=$2
    local pid_file="$PID_DIR/${agent_name}.pid"
    local log_file="$LOG_DIR/${agent_name}.log"
    
    if [ ! -f "$pid_file" ]; then
        echo -e "${RED}✗ $agent_display_name${NC} - Not running (no PID file)"
        return
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${RED}✗ $agent_display_name${NC} - Not running (stale PID: $pid)"
        rm -f "$pid_file"
        return
    fi
    
    echo -e "${GREEN}✓ $agent_display_name${NC} - Running (PID: $pid)"
    
    # Show uptime
    local uptime=$(ps -o etime= -p "$pid" | tr -d ' ')
    echo "  Uptime: $uptime"
    
    # Show memory usage
    local mem=$(ps -o rss= -p "$pid" | tr -d ' ')
    local mem_mb=$((mem / 1024))
    echo "  Memory: ${mem_mb}MB"
    
    # Show CPU usage
    local cpu=$(ps -o %cpu= -p "$pid" | tr -d ' ')
    echo "  CPU: ${cpu}%"
    
    # Show recent logs
    if [ -f "$log_file" ]; then
        echo "  Recent logs:"
        tail -3 "$log_file" | sed 's/^/    /'
    fi
    
    echo ""
}

# Check all agents
check_agent "dag-maintenance-agent" "DAG Maintenance Agent"
check_agent "cicd-repair-agent" "CI/CD Repair Agent"
check_agent "artifact-generation-agent" "Artifact Generation Agent"
check_agent "gitops-workflow-agent" "GitOps Workflow Agent"

echo "=========================================="
echo ""
echo "To view logs:"
echo "  tail -f $LOG_DIR/<agent-name>.log"
echo ""
echo "To restart agents:"
echo "  $SCRIPT_DIR/restart_agents.sh"
echo ""