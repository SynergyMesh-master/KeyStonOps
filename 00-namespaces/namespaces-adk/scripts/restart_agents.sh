#!/bin/bash
# Restart all ADK governance agents

set -e

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}Restarting ADK Governance Agents${NC}"
echo "=========================================="
echo ""

# Stop agents
echo "Stopping agents..."
"$SCRIPT_DIR/stop_agents.sh"

echo ""
echo "Waiting 3 seconds..."
sleep 3

echo ""
echo "Starting agents..."
"$SCRIPT_DIR/start_agents.sh"