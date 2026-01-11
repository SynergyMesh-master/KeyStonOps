# MCP Level 1 Extended Validation System

## Overview

This system provides comprehensive artifact validation beyond basic schema checking, implementing all P0-2 requirements from the MCP Level 1 specification. It ensures artifacts are fully compliant with all validation requirements including dependencies, semantic types, endpoints, naming specifications, and reference integrity.

## 🚀 Extended Validation Features

### 1. Dependency Relationship Validation
- **Circular Dependency Detection**: Uses NetworkX graph algorithms to detect dependency cycles
- **Missing Dependency Tracking**: Identifies dependencies that don't exist in the registry
- **Version Constraint Validation**: Validates semver and version range formats
- **Dependency Graph Analysis**: Builds and analyzes dependency relationships

### 2. Semantic Type Consistency Validation
- **Type Schema Validation**: Validates artifacts against their semantic type schemas
- **Relationship Rule Enforcement**: Ensures semantic types can only depend on appropriate types
- **Field Requirement Checking**: Validates required fields for each semantic type
- **Cross-Type Compatibility**: Validates semantic type relationships

### 3. MCP Endpoint Validation
- **Live Endpoint Testing**: Tests actual HTTP endpoints for availability
- **Response Format Validation**: Validates JSON response formats
- **Performance Monitoring**: Measures endpoint response times
- **Status Code Checking**: Validates HTTP status codes

### 4. Naming Specification Validation
- **Enhanced Namespace Rules**: Validates against all naming registry specifications
- **Verification Status Checking**: Ensures namespaces are properly verified
- **Reserved Word Detection**: Identifies usage of reserved words
- **Format Compliance**: Strict adherence to naming patterns

### 5. Reference Integrity Validation
- **Reference Extraction**: Recursively extracts all references from artifacts
- **Format Validation**: Validates reference format standards
- **Target Existence**: Checks if referenced artifacts exist in registry
- **Broken Reference Detection**: Identifies and reports broken references

## 📁 System Architecture

```
validation/
├── extended-validator.py           # Main extended validation coordinator
├── tests/
│   └── test_extended_validator.py  # Comprehensive test suite
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

## 🔧 Installation

```bash
# Navigate to the validation directory
cd 00-namespaces/namespaces-mcp/level1/validation/

# Install dependencies
pip install -r requirements.txt

# Verify installation
python extended-validator.py --help
```

## 🚀 Quick Start

### Basic Extended Validation
```bash
# Validate a single artifact with extended checks
python extended-validator.py --artifact manifest.yaml

# Enable strict mode (warnings as errors)
python extended-validator.py --artifact manifest.yaml --strict

# JSON output format
python extended-validator.py --artifact manifest.yaml --format json
```

### Advanced Validation
```bash
# Include endpoint validation
python extended-validator.py --artifact manifest.yaml --validate-endpoints

# Custom API base URL for endpoints
python extended-validator.py --artifact manifest.yaml --validate-endpoints --base-url http://api.mcp.io

# Use artifact registry for enhanced validation
python extended-validator.py --artifact manifest.yaml --registry registry.yaml

# Show performance metrics
python extended-validator.py --artifact manifest.yaml --show-metrics
```

### Full Validation Pipeline
```bash
# Complete validation with all features
python extended-validator.py \
  --artifact complex-manifest.yaml \
  --schema schema.yaml \
  --registry artifact-registry.yaml \
  --strict \
  --validate-endpoints \
  --base-url http://localhost:8080 \
  --format json \
  --show-metrics
```

## 📋 Detailed Usage Examples

### Dependency Validation

**Sample Artifact with Dependencies:**
```yaml
apiVersion: mcp.io/v1
kind: Manifest
metadata:
  name: com.example/my-app
  version: 1.0.0
  semanticType: manifest
spec:
  description: "Sample application manifest"
dependsOn:
  - artifact: com.example/config
    purpose: configuration
    semanticType: schema
    version: "^1.0.0"
  - artifact: io.github.user/auth
    purpose: authentication
    semanticType: toolchain
    version: ">=2.0.0"
```

**Validation Output:**
```
🔍 Dependencies:
  ✅ Dependencies validation passed
  ⚠️  Dependency artifact not found in registry: io.github.user/auth
```

### Semantic Type Validation

**Valid Semantic Type Structure:**
```yaml
apiVersion: mcp.io/v1
kind: Governance
metadata:
  name: org.company/governance-policy
  version: 1.0.0
  semanticType: governance
policies:
  - name: security-policy
    rules:
      - id: SEC-001
        description: "Security requirements"
```

**Validation with Errors:**
```
🔍 Semantic Types:
  ❌ Semantic types validation failed
    ❌ Missing required field for governance: policies
    ⚠️  governance cannot depend on invalid-type. Allowed: manifest
```

### Endpoint Validation

**Artifact with Endpoints:**
```yaml
endpoints:
  - name: status-api
    url: /api/v1/status
  - name: health-check
    url: http://localhost:8080/health
  - name: metrics
    url: https://api.mcp.io/metrics
```

**Live Endpoint Testing:**
```bash
python extended-validator.py --artifact api-manifest.yaml --validate-endpoints --base-url http://localhost:8080
```

**Output:**
```
🔍 Endpoints:
  ✅ Endpoints validation passed
    ✅ status-api: 200 (response time: 0.123s)
    ✅ health-check: 200 (response time: 0.045s)
    ✅ metrics: 200 (response time: 0.234s)

📊 Performance Metrics:
  - validation_time_seconds: 2.456
  - dependency_count: 2
  - endpoint_count: 3
  - reference_count: 0
```

### Naming Specification Validation

**Compliant Naming:**
```yaml
metadata:
  name: my-awesome-tool
  version: 2.1.0
  namingRegistry:
    format: reverse-DNS
    namespace: io.github.username
    verificationStatus: verified
```

**Validation Results:**
```
🔍 Naming:
  ✅ Naming validation passed
    ✅ Namespace format valid: io.github.username
    ✅ Artifact name valid: my-awesome-tool
    ✅ Version format valid: 2.1.0
```

### Reference Integrity Validation

**Artifact with References:**
```yaml
spec:
  configRef: com.example/app-config
  schemaRef: org.standard/data-schema:1.0.0
  toolchainRef: io.github.devops/build-tools
```

**Reference Validation:**
```
🔍 References:
  ✅ References validation passed
  ⚠️  Reference target not found in registry: org.standard/data-schema:1.0.0
```

## 🔍 Validation Sections Explained

### 1. Dependencies Section
- **Circular Dependencies**: Detects A→B→A cycles using graph algorithms
- **Missing Dependencies**: Checks registry for dependency existence
- **Version Constraints**: Validates `^1.0.0`, `>=2.0.0`, `~1.5.0` formats
- **Required Fields**: Ensures `artifact` and `purpose` fields exist

### 2. Semantic Types Section
- **Type Compliance**: Validates against semantic type schemas
- **Field Requirements**: Checks required fields per semantic type
- **Relationship Rules**: Enforces allowed dependency relationships
- **Disallowed Fields**: Identifies unexpected fields for types

### 3. Endpoints Section
- **HTTP Status**: Validates 2xx status codes
- **Response Format**: Checks JSON response validity
- **Performance**: Measures response times
- **Availability**: Tests endpoint accessibility

### 4. Naming Section
- **Namespace Patterns**: Validates reverse-DNS formats
- **Verification Status**: Checks namespace verification
- **Artifact Names**: Validates name patterns and length
- **Version Formats**: Validates semver compliance

### 5. References Section
- **Format Validation**: Ensures proper reference format
- **Target Existence**: Checks registry for referenced artifacts
- **Reference Extraction**: Finds all references recursively

## 📊 Performance Metrics

The system provides detailed performance metrics:

```json
{
  "performance_metrics": {
    "validation_time_seconds": 2.456,
    "dependency_count": 3,
    "endpoint_count": 2,
    "reference_count": 5
  }
}
```

### Metric Definitions
- **validation_time_seconds**: Total time for all validations
- **dependency_count**: Number of dependencies validated
- **endpoint_count**: Number of endpoints tested
- **reference_count**: Number of references checked

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific test classes
pytest tests/test_extended_validator.py::TestDependencyValidator -v

# Run performance tests
pytest tests/ -k "performance" -v
```

## 🔧 Configuration

### Environment Variables
```bash
# HTTP request timeout for endpoint validation
export MCP_VALIDATION_TIMEOUT=30

# Enable debug logging
export MCP_VALIDATION_DEBUG=1

# Custom registry endpoint
export MCP_REGISTRY_URL=https://registry.mcp.io
```

### Custom Validation Rules
You can extend validation rules by modifying the validator classes:

```python
# Custom naming rules
custom_naming_rules = {
    "namespace_formats": {
        "mycompany.*": {
            "pattern": r"^mycompany\.[a-z0-9]+(\.[a-z0-9]+)*$",
            "verification_required": True
        }
    }
}
```

## 🐛 Troubleshooting

### Common Issues

#### Dependency Validation Fails
```
❌ Dependencies validation failed
   ❌ Circular dependencies detected: [['artifact-a', 'artifact-b', 'artifact-a']]
```
**Solution**: Check dependency graph and remove circular references.

#### Endpoint Validation Times Out
```
❌ Endpoint validation failed
   ❌ Endpoint request timed out: http://localhost:8080/health
```
**Solution**: Ensure endpoints are running and accessible, increase timeout.

#### Semantic Type Errors
```
❌ Semantic types validation failed
   ❌ Invalid semantic type: unknown-type
```
**Solution**: Use valid semantic types: manifest, schema, spec, governance, policy, role, toolchain, index, documentation

#### Naming Format Errors
```
❌ Naming validation failed
   ❌ Invalid namespace format: Invalid-Format
```
**Solution**: Use proper reverse-DNS format: io.github.username, com.company, org.organization

### Debug Mode
Enable detailed logging:
```bash
export MCP_VALIDATION_DEBUG=1
python extended-validator.py --artifact manifest.yaml --format json
```

## 📈 Performance Optimization

### Large Artifact Processing
```bash
# Process multiple artifacts efficiently
for artifact in *.yaml; do
  python extended-validator.py --artifact "$artifact" --format json > "${artifact%.yaml}.validation.json"
done
```

### Parallel Validation
```bash
# Use parallel processing for large sets
find . -name "*.yaml" | parallel -j 4 "python extended-validator.py --artifact {} --format json"
```

### Memory Optimization
For large registries, consider:
- Loading registry in lazy mode
- Using incremental validation
- Implementing caching for repeated validations

## 🔗 Integration with MCP Infrastructure

### Registry Integration
```python
# Load artifact registry
with open('registry.yaml') as f:
    registry = yaml.safe_load(f)

validator = ExtendedMCPValidator(artifact_registry=registry)
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Validate MCP Artifacts
  run: |
    python extended-validator.py \
      --artifact manifest.yaml \
      --strict \
      --validate-endpoints \
      --format json \
      --show-metrics
```

### API Integration
```python
# Use in Python code
validator = ExtendedMCPValidator()
result = validator.validate_artifact_extended(
    Path("manifest.yaml"),
    validate_endpoints=True,
    strict=True
)

if result.status != ExtendedValidationStatus.PASSED:
    print("Validation failed:", result.errors)
    sys.exit(1)
```

## 📄 Validation Report Format

### JSON Output Example
```json
{
  "status": "passed",
  "artifact_path": "manifest.yaml",
  "artifact_type": "Manifest",
  "errors": [],
  "warnings": ["Namespace verification recommended"],
  "dependency_results": {
    "valid": true,
    "errors": [],
    "circular_dependencies": []
  },
  "semantic_results": {
    "valid": true,
    "type_violations": []
  },
  "naming_results": {
    "valid": true,
    "namespace_compliance": {"valid": true}
  },
  "performance_metrics": {
    "validation_time_seconds": 1.234,
    "dependency_count": 2,
    "endpoint_count": 0
  }
}
```

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the test cases for usage examples
3. Enable debug mode for detailed logging
4. Open an issue in the repository
5. Consult the MCP Level 1 specification documentation

## 📚 Related Documentation

- [MCP Level 1 Specification](../spec.yaml)
- [Team Identity Registry](../registries/1-team-identity-registry.yaml)
- [Namespace Verification System](../verification/README.md)
- [Basic Validator](../tools/validator.py)

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2024-01-11  
**Compliance**: 100% MCP Level 1 P0-2 Requirements