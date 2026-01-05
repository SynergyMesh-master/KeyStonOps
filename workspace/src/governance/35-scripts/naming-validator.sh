#!/bin/bash
# Naming Validator Script
# 驗證資源名稱是否符合標準
#
# Usage: ./naming-validator.sh <resource-type> <name>
# Example: ./naming-validator.sh pod api-server-main-001

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print usage
usage() {
    echo "Usage: $0 <resource-type> <name>"
    echo ""
    echo "Resource Types:"
    echo "  pod                    Validate pod name"
    echo "  deployment             Validate deployment name"
    echo "  service                Validate service name"
    echo "  configmap              Validate ConfigMap name"
    echo "  secret                 Validate Secret name"
    echo "  microservice           Validate microservice name"
    echo "  database               Validate database name"
    echo "  table                  Validate table name"
    echo "  version                Validate version string"
    echo ""
    echo "Examples:"
    echo "  $0 pod api-server-main-001"
    echo "  $0 deployment auth-service"
    echo "  $0 microservice user-auth-service"
    echo "  $0 database prod_ecommerce_main"
    echo "  $0 version v1.0.0"
    exit 1
}

# Validate kebab-case format
validate_kebab_case() {
    local name="$1"
    local max_length="${2:-253}"
    
    # Check length
    if [ ${#name} -gt $max_length ]; then
        echo -e "${RED}✗ Length exceeds ${max_length} characters${NC}"
        return 1
    fi
    
    # Check pattern
    if [[ ! "$name" =~ ^[a-z0-9](-?[a-z0-9])*$ ]]; then
        echo -e "${RED}✗ Invalid format${NC}"
        echo -e "  Expected: lowercase letters, numbers, and hyphens only"
        echo -e "  Pattern: ^[a-z0-9](-?[a-z0-9])*$"
        return 1
    fi
    
    # Check for consecutive hyphens
    if [[ "$name" =~ -- ]]; then
        echo -e "${RED}✗ Contains consecutive hyphens${NC}"
        return 1
    fi
    
    # Check for leading/trailing hyphens
    if [[ "$name" =~ ^- ]] || [[ "$name" =~ -$ ]]; then
        echo -e "${RED}✗ Starts or ends with hyphen${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Valid kebab-case format${NC}"
    return 0
}

# Validate snake_case format
validate_snake_case() {
    local name="$1"
    local max_length="${2:-128}"
    
    # Check length
    if [ ${#name} -gt $max_length ]; then
        echo -e "${RED}✗ Length exceeds ${max_length} characters${NC}"
        return 1
    fi
    
    # Check pattern
    if [[ ! "$name" =~ ^[a-z][a-z0-9_]*$ ]]; then
        echo -e "${RED}✗ Invalid format${NC}"
        echo -e "  Expected: lowercase letters, numbers, and underscores"
        echo -e "  Pattern: ^[a-z][a-z0-9_]*$"
        return 1
    fi
    
    echo -e "${GREEN}✓ Valid snake_case format${NC}"
    return 0
}

# Validate SemVer format
validate_semver() {
    local version="$1"
    
    if [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$ ]]; then
        echo -e "${RED}✗ Invalid SemVer format${NC}"
        echo -e "  Expected: vMAJOR.MINOR.PATCH"
        echo -e "  Example: v1.0.0, v2.1.3-beta.1, v1.0.0+build.123"
        return 1
    fi
    
    echo -e "${GREEN}✓ Valid SemVer format${NC}"
    return 0
}

# Validate pod name
validate_pod() {
    local name="$1"
    
    echo -e "${BLUE}Validating Pod name: $name${NC}"
    
    if ! validate_kebab_case "$name" 253; then
        return 1
    fi
    
    # Check structure: service-name-type-instance
    IFS='-' read -ra parts <<< "$name"
    if [ ${#parts[@]} -lt 3 ]; then
        echo -e "${YELLOW}⚠ Warning: Expected format service-name-type-instance${NC}"
    fi
    
    # Check instance ID (last part)
    local instance="${parts[-1]}"
    if [[ ! "$instance" =~ ^[0-9]{3}$ ]]; then
        echo -e "${YELLOW}⚠ Warning: Instance ID should be 3-digit number${NC}"
    fi
    
    return 0
}

# Validate deployment name
validate_deployment() {
    local name="$1"
    
    echo -e "${BLUE}Validating Deployment name: $name${NC}"
    
    if ! validate_kebab_case "$name" 63; then
        return 1
    fi
    
    return 0
}

# Validate service name
validate_service() {
    local name="$1"
    
    echo -e "${BLUE}Validating Service name: $name${NC}"
    
    if ! validate_kebab_case "$name" 63; then
        return 1
    fi
    
    return 0
}

# Validate ConfigMap name
validate_configmap() {
    local name="$1"
    
    echo -e "${BLUE}Validating ConfigMap name: $name${NC}"
    
    if ! validate_kebab_case "$name" 253; then
        return 1
    fi
    
    # Check for config- prefix
    if [[ ! "$name" =~ ^config- ]]; then
        echo -e "${YELLOW}⚠ Warning: ConfigMap should start with 'config-' prefix${NC}"
    fi
    
    return 0
}

# Validate Secret name
validate_secret() {
    local name="$1"
    
    echo -e "${BLUE}Validating Secret name: $name${NC}"
    
    if ! validate_kebab_case "$name" 253; then
        return 1
    fi
    
    # Check for secret- prefix
    if [[ ! "$name" =~ ^secret- ]]; then
        echo -e "${YELLOW}⚠ Warning: Secret should start with 'secret-' prefix${NC}"
    fi
    
    return 0
}

# Validate microservice name
validate_microservice() {
    local name="$1"
    
    echo -e "${BLUE}Validating Microservice name: $name${NC}"
    
    if ! validate_kebab_case "$name" 63; then
        return 1
    fi
    
    # Check structure: domain-service
    IFS='-' read -ra parts <<< "$name"
    if [ ${#parts[@]} -lt 2 ]; then
        echo -e "${YELLOW}⚠ Warning: Expected format domain-service${NC}"
    fi
    
    return 0
}

# Validate database name
validate_database() {
    local name="$1"
    
    echo -e "${BLUE}Validating Database name: $name${NC}"
    
    if ! validate_snake_case "$name" 128; then
        return 1
    fi
    
    # Check structure: environment_project_purpose
    IFS='_' read -ra parts <<< "$name"
    if [ ${#parts[@]} -ne 3 ]; then
        echo -e "${YELLOW}⚠ Warning: Expected format environment_project_purpose${NC}"
    fi
    
    # Check environment
    local env="${parts[0]}"
    case "$env" in
        dev|staging|prod)
            echo -e "${GREEN}✓ Valid environment: $env${NC}"
            ;;
        *)
            echo -e "${YELLOW}⚠ Warning: Environment should be dev, staging, or prod${NC}"
            ;;
    esac
    
    return 0
}

# Validate table name
validate_table() {
    local name="$1"
    
    echo -e "${BLUE}Validating Table name: $name${NC}"
    
    if ! validate_snake_case "$name" 128; then
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    local resource_type=""
    local name=""
    
    # Parse arguments
    if [ $# -lt 2 ]; then
        usage
    fi
    
    resource_type="$1"
    name="$2"
    
    # Validate based on resource type
    case "$resource_type" in
        pod)
            validate_pod "$name"
            ;;
        deployment)
            validate_deployment "$name"
            ;;
        service)
            validate_service "$name"
            ;;
        configmap)
            validate_configmap "$name"
            ;;
        secret)
            validate_secret "$name"
            ;;
        microservice)
            validate_microservice "$name"
            ;;
        database)
            validate_database "$name"
            ;;
        table)
            validate_table "$name"
            ;;
        version)
            validate_semver "$name"
            ;;
        *)
            echo -e "${RED}Error: Unknown resource type '$resource_type'${NC}"
            usage
            ;;
    esac
}

# Run main function
main "$@"