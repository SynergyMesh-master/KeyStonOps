#!/bin/bash
# Start all ADK governance agents

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="$PROJECT_ROOT/pids"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

echo -e "${GREEN}Starting ADK Governance Agents${NC}"
echo "=========================================="
echo "Project Root: $PROJECT_ROOT"
echo "Log Directory: $LOG_DIR"
echo "PID Directory: $PID_DIR"
echo ""

# Function to start an agent
start_agent() {
    local agent_name=$1
    local agent_module=$2
    local log_file="$LOG_DIR/${agent_name}.log"
    local pid_file="$PID_DIR/${agent_name}.pid"
    
    echo -e "${YELLOW}Starting $agent_name...${NC}"
    
    # Check if agent is already running
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}$agent_name is already running (PID: $pid)${NC}"
            return
        else
            rm -f "$pid_file"
        fi
    fi
    
    # Start agent in background
    cd "$PROJECT_ROOT"
    nohup python -m "$agent_module" > "$log_file" 2>&1 &
    local pid=$!
    
    # Save PID
    echo "$pid" > "$pid_file"
    
    # Wait a moment to check if agent started successfully
    sleep 2
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $agent_name started successfully (PID: $pid)${NC}"
        echo "  Log: $log_file"
    else
        echo -e "${RED}✗ $agent_name failed to start${NC}"
        echo "  Check log: $log_file"
        cat "$log_file"
        return 1
    fi
    
    echo ""
}

# Start all agents
start_agent "dag-maintenance-agent" "enhanced_adk.governance_agents.dag_maintenance_agent" || true
start_agent "cicd-repair-agent" "enhanced_adk.governance_agents.cicd_repair_agent" || true
start_agent "artifact-generation-agent" "enhanced_adk.governance_agents.artifact_generation_agent" || true
start_agent "gitops-workflow-agent" "enhanced_adk.governance_agents.gitops_workflow_agent" || true

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}All agents started!${NC}"
echo ""
echo "To view logs:"
echo "  tail -f $LOG_DIR/dag-maintenance-agent.log"
echo "  tail -f $LOG_DIR/cicd-repair-agent.log"
echo "  tail -f $LOG_DIR/artifact-generation-agent.log"
echo "  tail -f $LOG_DIR/gitops-workflow-agent.log"
echo ""
echo "To stop agents:"
echo "  $SCRIPT_DIR/stop_agents.sh"
echo ""
echo "To check status:"
echo "  $SCRIPT_DIR/status_agents.sh"
echo ""