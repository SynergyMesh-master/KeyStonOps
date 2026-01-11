# Taxonomy Compliance for 00-Namespaces Root

## Overview

This document defines the taxonomy compliance requirements for the `00-namespaces` root project, ensuring systematic, rigorous, intuitive, and consistent naming across all components.

## Taxonomy Integration

### Core Dependency
```json
{
  "dependencies": {
    "@machine-native-ops/taxonomy-core": "^1.0.0"
  }
}
```

### Python Requirements
```txt
taxonomy-core>=1.0.0
```

## Naming Patterns

### 1. Component Naming

#### Pattern
```
{domain}-{component}-{type}-{version}
```

#### Domains
- `platform`: Core platform components
- `gov`: Governance components
- `obs`: Observability components
- `sec`: Security components
- `data`: Data/storage components
- `int`: Integration components

#### Examples
```
platform-registry-manager-v1
gov-policy-engine-v1
obs-metrics-collector-v1
sec-auth-manager-v1
data-object-store-v1
int-mcp-interface-v1
```

### 2. File Naming

#### Pattern
```
{component}_{type}.{extension}
```

#### Examples
```python
# Python files
registry_manager.py
policy_engine.py
schema_validator.py
metrics_collector.py

# Configuration files
registry.yaml
governance.yaml
instant.yaml

# Schema files
base_schema.json
mcp_schema.json
```

### 3. Class Naming

#### Pattern
```
{Domain}{Component}{Type}
```

#### Examples
```python
class PlatformRegistryManager:
    """Registry manager for platform namespaces"""
    pass

class GovPolicyEngine:
    """Policy enforcement engine for governance"""
    pass

class ObsMetricsCollector:
    """Metrics collection for observability"""
    pass

class SecAuthManager:
    """Authentication manager for security"""
    pass
```

### 4. Function Naming

#### Pattern
```
{action}_{component}_{object}
```

#### Examples
```python
def register_namespace(namespace_id: str) -> bool:
    """Register a new namespace"""
    pass

def validate_schema(schema: dict) -> ValidationResult:
    """Validate schema against taxonomy"""
    pass

def resolve_namespace(namespace_ref: str) -> Namespace:
    """Resolve namespace reference"""
    pass

def enforce_policy(policy: Policy) -> EnforcementResult:
    """Enforce governance policy"""
    pass
```

### 5. Variable Naming

#### Pattern
```
{descriptor}_{type}
```

#### Examples
```python
# Good examples
namespace_id: str
registry_manager: PlatformRegistryManager
policy_engine: GovPolicyEngine
validation_result: ValidationResult

# Bad examples (avoid)
ns_id  # Too abbreviated
rm     # Not descriptive
pe     # Not clear
vr     # Ambiguous
```

## Taxonomy Validation

### Validation Rules

#### Rule 1: Domain Prefix
All component names MUST start with a valid domain prefix.

```python
from taxonomy import TaxonomyValidator

validator = TaxonomyValidator()
result = validator.validate("platform-registry-manager-v1")
assert result.valid == True
```

#### Rule 2: Kebab Case
All component names MUST use kebab-case.

```python
# Valid
"platform-registry-manager-v1"
"gov-policy-engine-v1"

# Invalid
"PlatformRegistryManager"  # PascalCase
"platform_registry_manager"  # snake_case
```

#### Rule 3: Version Suffix
All component names MUST include version suffix.

```python
# Valid
"platform-registry-manager-v1"
"gov-policy-engine-v2.1"

# Invalid
"platform-registry-manager"  # No version
"platform-registry-manager-1"  # Wrong format
```

#### Rule 4: Class Names
All class names MUST use PascalCase with domain prefix.

```python
# Valid
class PlatformRegistryManager: pass
class GovPolicyEngine: pass

# Invalid
class registryManager: pass  # Wrong case
class Registry_Manager: pass  # Wrong separator
```

## Taxonomy Integration Points

### 1. Registry Integration

```python
from taxonomy import Taxonomy, TaxonomyMapper

class PlatformRegistryManager:
    def __init__(self):
        self.taxonomy = Taxonomy.getInstance()
    
    def register_namespace(self, namespace: dict):
        # Generate taxonomy-compliant names
        names = TaxonomyMapper.mapToAllFormats({
            'domain': 'platform',
            'name': namespace['name'],
            'type': 'namespace',
            'version': namespace.get('version', 'v1')
        })
        
        # Use canonical name for registration
        namespace['canonical_name'] = names['canonical']
        namespace['class_name'] = names['pascal']
        
        # Register in taxonomy
        self.taxonomy.register({
            'domain': 'platform',
            'name': namespace['name'],
            'type': 'namespace',
            'version': namespace.get('version', 'v1')
        }, {
            'description': namespace.get('description'),
            'tags': namespace.get('tags', [])
        })
```

### 2. Schema Integration

```python
from taxonomy import UnifiedNamingLogic, TaxonomyValidator

class PlatformSchemaValidator:
    def validate_schema(self, schema: dict) -> ValidationResult:
        # Validate schema name using taxonomy
        if 'name' in schema:
            validation = TaxonomyValidator.validate(schema['name'])
            if not validation['valid']:
                return ValidationResult(
                    valid=False,
                    errors=validation['violations']
                )
        
        # Normalize names using taxonomy
        if 'components' in schema:
            for component in schema['components']:
                normalized = UnifiedNamingLogic.normalize(component['name'])
                component['canonical_name'] = normalized
        
        return ValidationResult(valid=True)
```

### 3. Governance Integration

```python
from taxonomy import TaxonomyMapper

class GovPolicyEngine:
    def enforce_naming_policy(self, resource: dict) -> bool:
        # Check if resource name follows taxonomy
        names = TaxonomyMapper.mapToAllFormats({
            'domain': resource['domain'],
            'name': resource['name'],
            'type': resource['type'],
            'version': resource.get('version', 'v1')
        })
        
        # Enforce canonical naming
        if resource.get('canonical_name') != names['canonical']:
            self.log_violation({
                'resource': resource['name'],
                'expected': names['canonical'],
                'actual': resource.get('canonical_name'),
                'severity': 'error'
            })
            return False
        
        return True
```

## Compliance Checking

### Automated Validation

```python
#!/usr/bin/env python3
"""Taxonomy compliance checker for 00-namespaces"""

from taxonomy import TaxonomyValidator, TaxonomyMapper
import os
import re

def check_file_naming(directory: str) -> list:
    """Check if all files follow taxonomy naming"""
    violations = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                # Check snake_case pattern
                if not re.match(r'^[a-z]+(_[a-z]+)*\.py$', file):
                    violations.append({
                        'file': os.path.join(root, file),
                        'violation': 'File name must use snake_case',
                        'severity': 'error'
                    })
    
    return violations

def check_class_naming(file_path: str) -> list:
    """Check if all classes follow taxonomy naming"""
    violations = []
    
    with open(file_path, 'r') as f:
        content = f.read()
        
    # Find all class definitions
    classes = re.findall(r'class\s+(\w+)', content)
    
    for class_name in classes:
        # Check PascalCase pattern
        if not re.match(r'^[A-Z][a-zA-Z0-9]*$', class_name):
            violations.append({
                'file': file_path,
                'class': class_name,
                'violation': 'Class name must use PascalCase',
                'severity': 'error'
            })
    
    return violations

def check_component_naming(registry_file: str) -> list:
    """Check if all components follow taxonomy naming"""
    violations = []
    
    # Load registry
    import yaml
    with open(registry_file, 'r') as f:
        registry = yaml.safe_load(f)
    
    # Validate each component
    for component in registry.get('components', []):
        name = component.get('name')
        if name:
            validation = TaxonomyValidator.validate(name)
            if not validation['valid']:
                violations.append({
                    'component': name,
                    'violations': validation['violations'],
                    'severity': 'error'
                })
    
    return violations

if __name__ == '__main__':
    print("Checking taxonomy compliance...")
    
    # Check file naming
    file_violations = check_file_naming('.')
    print(f"File naming violations: {len(file_violations)}")
    
    # Check class naming
    class_violations = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                class_violations.extend(
                    check_class_naming(os.path.join(root, file))
                )
    print(f"Class naming violations: {len(class_violations)}")
    
    # Check component naming
    if os.path.exists('namespace_registry/registry.yaml'):
        component_violations = check_component_naming(
            'namespace_registry/registry.yaml'
        )
        print(f"Component naming violations: {len(component_violations)}")
    
    # Report results
    total_violations = (
        len(file_violations) + 
        len(class_violations) + 
        len(component_violations)
    )
    
    if total_violations == 0:
        print("✅ All taxonomy compliance checks passed!")
        exit(0)
    else:
        print(f"❌ Found {total_violations} taxonomy violations")
        exit(1)
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Taxonomy Compliance

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  taxonomy-compliance:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install Dependencies
      run: |
        pip install taxonomy-core>=1.0.0
        pip install pyyaml
    
    - name: Check Taxonomy Compliance
      run: |
        cd 00-namespaces
        python scripts/validate_taxonomy.py
    
    - name: Generate Compliance Report
      if: always()
      run: |
        cd 00-namespaces
        python scripts/generate_compliance_report.py > taxonomy_report.md
    
    - name: Upload Report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: taxonomy-compliance-report
        path: 00-namespaces/taxonomy_report.md
```

## Compliance Metrics

### Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| File Naming Compliance | 100% | TBD |
| Class Naming Compliance | 100% | TBD |
| Component Naming Compliance | 100% | TBD |
| API Naming Compliance | 100% | TBD |
| Variable Naming Compliance | 95% | TBD |

### Measurement

```python
def calculate_compliance_score(violations: list, total: int) -> float:
    """Calculate compliance score as percentage"""
    if total == 0:
        return 100.0
    
    compliant = total - len(violations)
    return (compliant / total) * 100.0
```

## Best Practices

### DO ✅
- Use taxonomy-core for all naming operations
- Validate names before registration
- Use canonical names for storage
- Generate multiple formats for different contexts
- Document naming decisions

### DON'T ❌
- Create ad-hoc naming patterns
- Skip taxonomy validation
- Mix naming conventions
- Hardcode names without taxonomy
- Ignore taxonomy violations

## References

- [Taxonomy Manifesto](../TAXONOMY_MANIFESTO.md)
- [Taxonomy Core README](../taxonomy-core/README.md)
- [Integration Guide](../INTEGRATION_GUIDE.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-18  
**Status**: ✅ Active  
**Maintainer**: Machine Native Ops Team