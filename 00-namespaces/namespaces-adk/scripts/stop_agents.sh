#!/bin/bash
# Stop all ADK governance agents

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_ROOT/pids"

echo -e "${GREEN}Stopping ADK Governance Agents${NC}"
echo "=========================================="

# Function to stop an agent
stop_agent() {
    local agent_name=$1
    local pid_file="$PID_DIR/${agent_name}.pid"
    
    if [ ! -f "$pid_file" ]; then
        echo -e "${YELLOW}$agent_name is not running${NC}"
        return
    fi
    
    local pid=$(cat "$pid_file")
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${YELLOW}$agent_name is not running (stale PID file)${NC}"
        rm -f "$pid_file"
        return
    fi
    
    echo -e "${YELLOW}Stopping $agent_name (PID: $pid)...${NC}"
    
    # Send SIGTERM
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait for graceful shutdown
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${RED}Force killing $agent_name...${NC}"
        kill -KILL "$pid" 2>/dev/null || true
    fi
    
    # Remove PID file
    rm -f "$pid_file"
    
    echo -e "${GREEN}✓ $agent_name stopped${NC}"
}

# Stop all agents
stop_agent "dag-maintenance-agent"
stop_agent "cicd-repair-agent"
stop_agent "artifact-generation-agent"
stop_agent "gitops-workflow-agent"

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}All agents stopped!${NC}"