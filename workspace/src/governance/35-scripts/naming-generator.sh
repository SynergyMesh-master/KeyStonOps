#!/bin/bash
# Naming Generator Script
# 生成符合標準的資源名稱
#
# Usage: ./naming-generator.sh <resource-type> <parameters>
# Example: ./naming-generator.sh pod --service api-server --type main --instance 001

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print usage
usage() {
    echo "Usage: $0 <resource-type> [options]"
    echo ""
    echo "Resource Types:"
    echo "  pod                    Generate pod name"
    echo "  deployment             Generate deployment name"
    echo "  service                Generate service name"
    echo "  configmap              Generate ConfigMap name"
    echo "  secret                 Generate Secret name"
    echo "  microservice           Generate microservice name"
    echo "  database               Generate database name"
    echo "  table                  Generate table name"
    echo ""
    echo "Options:"
    echo "  --service <name>       Service name"
    echo "  --type <type>          Resource type (main, worker, etc.)"
    echo "  --instance <id>        Instance ID (3-digit number)"
    echo "  --namespace <ns>       Namespace"
    echo "  --environment <env>    Environment (dev, staging, prod)"
    echo "  --domain <domain>      Domain (user, order, payment, etc.)"
    echo "  --purpose <purpose>    Purpose (main, analytics, cache, logs)"
    echo "  --version <version>    Version (v1.0.0 format)"
    echo ""
    echo "Examples:"
    echo "  $0 pod --service api-server --type main --instance 001"
    echo "  $0 deployment --service auth-service"
    echo "  $0 microservice --domain user --service auth"
    echo "  $0 database --environment prod --project ecommerce --purpose main"
    exit 1
}

# Validate kebab-case format
validate_kebab_case() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z0-9](-?[a-z0-9])*$ ]]; then
        echo -e "${RED}Error: '$name' is not valid kebab-case${NC}"
        echo "Expected format: lowercase letters, numbers, and hyphens only"
        return 1
    fi
    return 0
}

# Validate snake_case format
validate_snake_case() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z][a-z0-9_]*$ ]]; then
        echo -e "${RED}Error: '$name' is not valid snake_case${NC}"
        echo "Expected format: lowercase letters, numbers, and underscores"
        return 1
    fi
    return 0
}

# Validate version format
validate_version() {
    local version="$1"
    if [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}Error: '$version' is not valid SemVer format${NC}"
        echo "Expected format: v1.0.0"
        return 1
    fi
    return 0
}

# Generate pod name
generate_pod() {
    local service="$1"
    local type="$2"
    local instance="$3"
    
    validate_kebab_case "$service" || exit 1
    
    # Validate instance ID
    if [[ ! "$instance" =~ ^[0-9]{3}$ ]]; then
        echo -e "${RED}Error: Instance ID must be 3-digit number (000-999)${NC}"
        exit 1
    fi
    
    echo "${service}-${type}-${instance}"
}

# Generate deployment name
generate_deployment() {
    local service="$1"
    validate_kebab_case "$service" || exit 1
    echo "$service"
}

# Generate service name
generate_service() {
    local service="$1"
    validate_kebab_case "$service" || exit 1
    echo "$service"
}

# Generate ConfigMap name
generate_configmap() {
    local service="$1"
    validate_kebab_case "$service" || exit 1
    echo "config-${service}"
}

# Generate Secret name
generate_secret() {
    local purpose="$1"
    local service="$2"
    
    validate_kebab_case "$service" || exit 1
    
    case "$purpose" in
        database|api-key|certificate|token)
            ;;
        *)
            echo -e "${RED}Error: Invalid purpose '$purpose'${NC}"
            echo "Valid purposes: database, api-key, certificate, token"
            exit 1
            ;;
    esac
    
    echo "secret-${purpose}-${service}"
}

# Generate microservice name
generate_microservice() {
    local domain="$1"
    local service="$2"
    
    validate_kebab_case "$domain" || exit 1
    validate_kebab_case "$service" || exit 1
    
    echo "${domain}-${service}"
}

# Generate database name
generate_database() {
    local environment="$1"
    local project="$2"
    local purpose="$3"
    
    validate_snake_case "$project" || exit 1
    
    case "$environment" in
        dev|staging|prod)
            ;;
        *)
            echo -e "${RED}Error: Invalid environment '$environment'${NC}"
            echo "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    case "$purpose" in
        main|analytics|cache|logs)
            ;;
        *)
            echo -e "${RED}Error: Invalid purpose '$purpose'${NC}"
            echo "Valid purposes: main, analytics, cache, logs"
            exit 1
            ;;
    esac
    
    echo "${environment}_${project}_${purpose}"
}

# Generate table name
generate_table() {
    local table="$1"
    validate_snake_case "$table" || exit 1
    echo "$table"
}

# Main execution
main() {
    local resource_type=""
    local service=""
    local type=""
    local instance=""
    local environment=""
    local domain=""
    local purpose=""
    local version=""
    
    # Parse arguments
    if [ $# -lt 1 ]; then
        usage
    fi
    
    resource_type="$1"
    shift
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --service)
                service="$2"
                shift 2
                ;;
            --type)
                type="$2"
                shift 2
                ;;
            --instance)
                instance="$2"
                shift 2
                ;;
            --namespace)
                namespace="$2"
                shift 2
                ;;
            --environment)
                environment="$2"
                shift 2
                ;;
            --domain)
                domain="$2"
                shift 2
                ;;
            --purpose)
                purpose="$2"
                shift 2
                ;;
            --version)
                version="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}Error: Unknown option '$1'${NC}"
                usage
                ;;
        esac
    done
    
    # Generate name based on resource type
    case "$resource_type" in
        pod)
            if [ -z "$service" ] || [ -z "$type" ] || [ -z "$instance" ]; then
                echo -e "${RED}Error: pod requires --service, --type, and --instance${NC}"
                exit 1
            fi
            generate_pod "$service" "$type" "$instance"
            ;;
        deployment)
            if [ -z "$service" ]; then
                echo -e "${RED}Error: deployment requires --service${NC}"
                exit 1
            fi
            generate_deployment "$service"
            ;;
        service)
            if [ -z "$service" ]; then
                echo -e "${RED}Error: service requires --service${NC}"
                exit 1
            fi
            generate_service "$service"
            ;;
        configmap)
            if [ -z "$service" ]; then
                echo -e "${RED}Error: configmap requires --service${NC}"
                exit 1
            fi
            generate_configmap "$service"
            ;;
        secret)
            if [ -z "$purpose" ] || [ -z "$service" ]; then
                echo -e "${RED}Error: secret requires --purpose and --service${NC}"
                exit 1
            fi
            generate_secret "$purpose" "$service"
            ;;
        microservice)
            if [ -z "$domain" ] || [ -z "$service" ]; then
                echo -e "${RED}Error: microservice requires --domain and --service${NC}"
                exit 1
            fi
            generate_microservice "$domain" "$service"
            ;;
        database)
            if [ -z "$environment" ] || [ -z "$project" ] || [ -z "$purpose" ]; then
                echo -e "${RED}Error: database requires --environment, --project, and --purpose${NC}"
                exit 1
            fi
            generate_database "$environment" "$project" "$purpose"
            ;;
        table)
            if [ -z "$table" ]; then
                echo -e "${RED}Error: table requires --table option (use --service for table name)${NC}"
                exit 1
            fi
            generate_table "$table"
            ;;
        *)
            echo -e "${RED}Error: Unknown resource type '$resource_type'${NC}"
            usage
            ;;
    esac
}

# Run main function
main "$@"