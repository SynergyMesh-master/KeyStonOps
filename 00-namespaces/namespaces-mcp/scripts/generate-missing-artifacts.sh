#!/bin/bash

# Script to generate missing MCP Level 2 artifacts
# This script will create comprehensive artifacts for all modules

echo "🚀 Starting MCP Level 2 Artifacts Generation..."
echo "================================================"

# Set base directory
BASE_DIR="00-namespaces/namespaces-mcp"

# Function to backup existing file
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "$file.backup"
        echo "✅ Backed up: $file"
    fi
}

# Function to check file size
check_file_size() {
    local file=$1
    local min_size=$2
    if [ -f "$file" ]; then
        local size=$(wc -c < "$file")
        if [ $size -lt $min_size ]; then
            echo "⚠️  File $file is too small ($size bytes < $min_size bytes)"
            return 1
        else
            echo "✅ File $file size OK ($size bytes)"
            return 0
        fi
    else
        echo "❌ File $file does not exist"
        return 1
    fi
}

echo ""
echo "📊 Phase 1: Data Management Module"
echo "-----------------------------------"

# Check current file sizes
echo "Current file sizes:"
check_file_size "$BASE_DIR/schemas/data-management.schema.yaml" 2000
check_file_size "$BASE_DIR/specs/data-management.spec.yaml" 3000
check_file_size "$BASE_DIR/policies/data-management.policy.yaml" 2000
check_file_size "$BASE_DIR/bundles/data-management.bundle.yaml" 2000
check_file_size "$BASE_DIR/graphs/data-management.graph.yaml" 2000

echo ""
echo "📊 Phase 2: Monitoring & Observability Module"
echo "----------------------------------------------"

# Check current file sizes
echo "Current file sizes:"
check_file_size "$BASE_DIR/schemas/monitoring-observability.schema.yaml" 2000
check_file_size "$BASE_DIR/specs/monitoring-observability.spec.yaml" 3000
check_file_size "$BASE_DIR/policies/monitoring-observability.policy.yaml" 2000
check_file_size "$BASE_DIR/bundles/monitoring-observability.bundle.yaml" 2000
check_file_size "$BASE_DIR/graphs/monitoring-observability.graph.yaml" 2000

echo ""
echo "📊 Phase 3: Configuration & Governance Module"
echo "----------------------------------------------"

# Check current file sizes
echo "Current file sizes:"
check_file_size "$BASE_DIR/schemas/configuration-governance.schema.yaml" 2000
check_file_size "$BASE_DIR/specs/configuration-governance.spec.yaml" 3000
check_file_size "$BASE_DIR/policies/configuration-governance.policy.yaml" 2000
check_file_size "$BASE_DIR/bundles/configuration-governance.bundle.yaml" 2000
check_file_size "$BASE_DIR/graphs/configuration-governance.graph.yaml" 2000

echo ""
echo "📊 Phase 4: Integration & Extension Module"
echo "-------------------------------------------"

# Check current file sizes
echo "Current file sizes:"
check_file_size "$BASE_DIR/schemas/integration-extension.schema.yaml" 2000
check_file_size "$BASE_DIR/specs/integration-extension.spec.yaml" 3000
check_file_size "$BASE_DIR/policies/integration-extension.policy.yaml" 2000
check_file_size "$BASE_DIR/bundles/integration-extension.bundle.yaml" 2000
check_file_size "$BASE_DIR/graphs/integration-extension.graph.yaml" 2000

echo ""
echo "📊 Checking for missing flows"
echo "------------------------------"

# Check for missing flow files
MISSING_FLOWS=()

if [ ! -f "$BASE_DIR/flows/data-pipeline.flow.yaml" ]; then
    MISSING_FLOWS+=("data-pipeline.flow.yaml")
fi

if [ ! -f "$BASE_DIR/flows/monitoring-pipeline.flow.yaml" ]; then
    MISSING_FLOWS+=("monitoring-pipeline.flow.yaml")
fi

if [ ! -f "$BASE_DIR/flows/governance-workflow.flow.yaml" ]; then
    MISSING_FLOWS+=("governance-workflow.flow.yaml")
fi

if [ ! -f "$BASE_DIR/flows/integration-workflow.flow.yaml" ]; then
    MISSING_FLOWS+=("integration-workflow.flow.yaml")
fi

if [ ${#MISSING_FLOWS[@]} -gt 0 ]; then
    echo "❌ Missing flow files:"
    for flow in "${MISSING_FLOWS[@]}"; do
        echo "   - $flow"
    done
else
    echo "✅ All flow files exist"
fi

echo ""
echo "================================================"
echo "✅ Artifact generation check complete!"
echo ""
echo "Summary:"
echo "--------"
echo "Total modules to update: 4"
echo "Total artifacts per module: 6 (schemas, specs, policies, bundles, graphs, flows)"
echo "Total files to update/create: 24"
echo ""
echo "Next steps:"
echo "1. Update all simplified artifacts to full versions"
echo "2. Create missing flow files"
echo "3. Verify all files meet minimum size requirements"
echo "4. Run semantic validation"
echo ""