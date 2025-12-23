#!/usr/bin/env python3
"""
URN Validator
Validates URN format, components, and registration against specifications.
"""

import re
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

def load_urn_spec() -> Dict[str, Any]:
    """Load URN specification from baseline."""
    spec_path = Path(__file__).parent.parent.parent / "specifications" / "root.specs.urn.yaml"
    with open(spec_path, 'r') as f:
        return yaml.safe_load(f)

def load_urn_registry() -> Dict[str, Any]:
    """Load URN registry from baseline."""
    registry_path = Path(__file__).parent.parent.parent / "registries" / "root.registry.urns.yaml"
    with open(registry_path, 'r') as f:
        return yaml.safe_load(f)

def load_namespace_registry() -> Dict[str, Any]:
    """Load namespace registry from baseline."""
    registry_path = Path(__file__).parent.parent.parent / "registries" / "root.registry.namespaces.yaml"
    with open(registry_path, 'r') as f:
        return yaml.safe_load(f)

def validate_urn(urn: str, check_registration: bool = False) -> Tuple[bool, List[str], List[str]]:
    """
    Validate URN against specifications.
    
    Args:
        urn: The URN to validate
        check_registration: Whether to check if URN is registered
    
    Returns:
        Tuple of (is_valid, errors, warnings)
    """
    spec = load_urn_spec()
    errors = []
    warnings = []
    
    # Validate format
    format_errors, format_warnings = validate_urn_format(urn, spec)
    errors.extend(format_errors)
    warnings.extend(format_warnings)
    
    if errors:
        return False, errors, warnings
    
    # Parse URN components
    components = parse_urn(urn)
    if not components:
        errors.append(f"Failed to parse URN: {urn}")
        return False, errors, warnings
    
    # Validate components
    component_errors, component_warnings = validate_urn_components(components, spec)
    errors.extend(component_errors)
    warnings.extend(component_warnings)
    
    # Check registration if requested
    if check_registration and not errors:
        reg_errors, reg_warnings = check_urn_registration(urn)
        errors.extend(reg_errors)
        warnings.extend(reg_warnings)
    
    is_valid = len(errors) == 0
    return is_valid, errors, warnings

def validate_urn_format(urn: str, spec: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Validate URN format."""
    errors = []
    warnings = []
    
    format_spec = spec['spec']['format']
    syntax = format_spec['syntax']
    
    # Check scheme
    if not urn.startswith('urn:'):
        errors.append(f"URN '{urn}' must start with 'urn:' scheme")
        return errors, warnings
    
    # Check minimum components
    parts = urn.split(':')
    if len(parts) < 4:
        errors.append(f"URN '{urn}' must have at least 4 components: urn:namespace:type:identifier")
        return errors, warnings
    
    # Validate against pattern
    validation_rules = spec['spec']['validation']['rules']
    for rule in validation_rules:
        if rule['name'] == 'valid-urn-format':
            pattern = rule['pattern']
            if not re.match(pattern, urn):
                errors.append(f"URN '{urn}' does not match format pattern: {syntax}")
    
    return errors, warnings

def parse_urn(urn: str) -> Optional[Dict[str, str]]:
    """Parse URN into components."""
    parts = urn.split(':')
    if len(parts) < 4:
        return None
    
    components = {
        'scheme': parts[0],
        'namespace': parts[1],
        'resourceType': parts[2],
        'identifier': parts[3],
        'version': parts[4] if len(parts) > 4 else None
    }
    
    return components

def validate_urn_components(components: Dict[str, str], spec: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    """Validate individual URN components."""
    errors = []
    warnings = []
    
    format_spec = spec['spec']['format']['components']
    
    # Validate scheme
    if components['scheme'] != 'urn':
        errors.append(f"URN scheme must be 'urn', got '{components['scheme']}'")
    
    # Validate namespace
    namespace_pattern = format_spec['namespace']['pattern']
    if not re.match(namespace_pattern, components['namespace']):
        errors.append(f"URN namespace '{components['namespace']}' must match pattern: {namespace_pattern}")
    
    # Check if namespace is registered
    ns_errors, ns_warnings = check_namespace_exists(components['namespace'])
    errors.extend(ns_errors)
    warnings.extend(ns_warnings)
    
    # Validate resource type
    resource_type_pattern = format_spec['resourceType']['pattern']
    if not re.match(resource_type_pattern, components['resourceType']):
        errors.append(f"URN resource type '{components['resourceType']}' must match pattern: {resource_type_pattern}")
    
    # Check if resource type is allowed
    allowed_types = format_spec['resourceType']['allowedTypes']
    if components['resourceType'] not in allowed_types:
        errors.append(f"URN resource type '{components['resourceType']}' not in allowed types: {allowed_types}")
    
    # Validate identifier
    identifier_pattern = format_spec['identifier']['pattern']
    if not re.match(identifier_pattern, components['identifier']):
        errors.append(f"URN identifier '{components['identifier']}' must match pattern: {identifier_pattern}")
    
    # Check identifier length
    min_length = format_spec['identifier']['minLength']
    max_length = format_spec['identifier']['maxLength']
    if len(components['identifier']) < min_length:
        errors.append(f"URN identifier '{components['identifier']}' is too short (minimum: {min_length})")
    if len(components['identifier']) > max_length:
        errors.append(f"URN identifier '{components['identifier']}' is too long (maximum: {max_length})")
    
    # Validate version if present
    if components['version']:
        version_pattern = format_spec['version']['pattern']
        if not re.match(version_pattern, components['version']):
            errors.append(f"URN version '{components['version']}' must match pattern: {version_pattern}")
    
    return errors, warnings

def check_namespace_exists(namespace: str) -> Tuple[List[str], List[str]]:
    """Check if namespace exists in registry."""
    errors = []
    warnings = []
    
    try:
        registry = load_namespace_registry()
        registered_namespaces = [ns['name'] for ns in registry['spec']['namespaces']]
        
        if namespace not in registered_namespaces:
            warnings.append(f"URN namespace '{namespace}' is not registered in root.registry.namespaces.yaml")
    except FileNotFoundError:
        warnings.append("Namespace registry file not found; skipping namespace check")
    except Exception as e:
        warnings.append(f"Error checking namespace: {str(e)}")
    
    return errors, warnings

def check_urn_registration(urn: str) -> Tuple[List[str], List[str]]:
    """Check if URN is registered."""
    errors = []
    warnings = []
    
    try:
        registry = load_urn_registry()
        registered_urns = [u['urn'] for u in registry['spec']['urns']]
        
        if urn not in registered_urns:
            warnings.append(f"URN '{urn}' is not registered in root.registry.urns.yaml")
        else:
            # Find URN entry
            urn_entry = next((u for u in registry['spec']['urns'] if u['urn'] == urn), None)
            if urn_entry:
                # Check status
                if urn_entry.get('status') != 'active':
                    warnings.append(f"URN '{urn}' is registered but not active (status: {urn_entry.get('status')})")
    except FileNotFoundError:
        warnings.append("URN registry file not found; skipping registration check")
    except Exception as e:
        warnings.append(f"Error checking URN registration: {str(e)}")
    
    return errors, warnings

def resolve_urn(urn: str) -> Optional[Dict[str, Any]]:
    """Resolve URN to resource metadata."""
    try:
        registry = load_urn_registry()
        urn_entry = next((u for u in registry['spec']['urns'] if u['urn'] == urn), None)
        return urn_entry if urn_entry else None
    except Exception:
        return None

def validate_urn_uniqueness(urn: str) -> Tuple[bool, List[str]]:
    """Check if URN is unique (not already registered)."""
    errors = []
    
    try:
        registry = load_urn_registry()
        registered_urns = [u['urn'] for u in registry['spec']['urns']]
        
        if urn in registered_urns:
            errors.append(f"URN '{urn}' is already registered (must be globally unique)")
            return False, errors
    except FileNotFoundError:
        pass  # Registry doesn't exist yet, URN is unique
    except Exception as e:
        errors.append(f"Error checking URN uniqueness: {str(e)}")
        return False, errors
    
    return True, []

def get_urn_info(urn: str) -> Dict[str, Any]:
    """Get information about a registered URN."""
    try:
        registry = load_urn_registry()
        urn_entry = next((u for u in registry['spec']['urns'] if u['urn'] == urn), None)
        return urn_entry if urn_entry else {}
    except Exception:
        return {}

if __name__ == "__main__":
    # Test cases
    test_cases = [
        "urn:machinenativeops:module:core-validator:v1.0.0",
        "urn:machinenativeops:module:core-validator",
        "urn:chatops:command:autofix:v2.1.0",
        "urn:automation:workflow:ci-pipeline:v1.0.0",
        "urn:MachineNativeOps:module:core:v1.0.0",  # uppercase namespace
        "urn:machinenativeops:Module:core:v1.0.0",  # uppercase type
        "urn:machinenativeops:module:Core-Validator:v1.0.0",  # uppercase identifier
        "urn:machinenativeops:module:core_validator:v1.0.0",  # underscore
        "urn:machinenativeops:module:core:1.0.0",  # missing 'v' prefix
        "machinenativeops:module:core:v1.0.0",  # missing 'urn:' scheme
    ]
    
    print("=== URN Validation Test ===\n")
    for urn in test_cases:
        is_valid, errors, warnings = validate_urn(urn, check_registration=False)
        status = "✓ PASS" if is_valid else "✗ FAIL"
        print(f"{status} | URN: {urn}")
        if errors:
            for error in errors:
                print(f"  ERROR: {error}")
        if warnings:
            for warning in warnings:
                print(f"  WARNING: {warning}")
        print()