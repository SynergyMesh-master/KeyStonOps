#!/usr/bin/env python3
"""
MCP Level 1 Extended Artifact Validator

Implements comprehensive validation beyond basic schema checking:
- Dependency relationship validation
- Semantic type consistency validation  
- MCP endpoint validation
- Naming specification validation
- Reference integrity validation
- Circular dependency detection
"""

import sys
import json
import yaml
import argparse
import networkx as nx
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
import jsonschema
import re
import requests
from datetime import datetime

# Import existing validator
sys.path.append(str(Path(__file__).parent.parent / "tools"))
from validator import MCPValidator, ValidationStatus, ValidationResult

class ExtendedValidationStatus(Enum):
    """Extended validation status enumeration"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"  # For optional validations

@dataclass
class ExtendedValidationResult(ValidationResult):
    """Extended validation result with additional fields"""
    dependency_results: Dict[str, Any] = field(default_factory=dict)
    semantic_results: Dict[str, Any] = field(default_factory=dict)
    endpoint_results: Dict[str, Any] = field(default_factory=dict)
    naming_results: Dict[str, Any] = field(default_factory=dict)
    reference_results: Dict[str, Any] = field(default_factory=dict)
    circular_dependency_detected: bool = False
    performance_metrics: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to extended dictionary"""
        base_dict = super().to_dict()
        base_dict.update({
            "dependency_results": self.dependency_results,
            "semantic_results": self.semantic_results,
            "endpoint_results": self.endpoint_results,
            "naming_results": self.naming_results,
            "reference_results": self.reference_results,
            "circular_dependency_detected": self.circular_dependency_detected,
            "performance_metrics": self.performance_metrics
        })
        return base_dict

class DependencyValidator:
    """Validates artifact dependencies and relationships"""
    
    def __init__(self, artifact_registry: Optional[Dict] = None):
        self.artifact_registry = artifact_registry or {}
        self.dependency_graph = nx.DiGraph()
    
    def validate_dependencies(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """Validate artifact dependencies"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "missing_dependencies": [],
            "invalid_versions": [],
            "circular_dependencies": []
        }
        
        if "dependsOn" not in artifact:
            return result
        
        dependencies = artifact["dependsOn"]
        if not isinstance(dependencies, list):
            result["valid"] = False
            result["errors"].append("dependsOn must be an array")
            return result
        
        # Build dependency graph
        self.dependency_graph.add_node(artifact.get("metadata", {}).get("name", "unknown"))
        
        for i, dep in enumerate(dependencies):
            dep_result = self._validate_single_dependency(dep, i)
            if not dep_result["valid"]:
                result["valid"] = False
                result["errors"].extend(dep_result["errors"])
            result["warnings"].extend(dep_result["warnings"])
            result["missing_dependencies"].extend(dep_result["missing_dependencies"])
            result["invalid_versions"].extend(dep_result["invalid_versions"])
            
            # Add to dependency graph
            if "artifact" in dep:
                self.dependency_graph.add_edge(
                    artifact.get("metadata", {}).get("name", "unknown"),
                    dep["artifact"]
                )
        
        # Check for circular dependencies
        try:
            cycles = list(nx.find_cycles(self.dependency_graph))
            if cycles:
                result["valid"] = False
                result["circular_dependencies"] = cycles
                result["errors"].append(f"Circular dependencies detected: {cycles}")
        except nx.NetworkXError:
            pass  # No cycles found
        
        return result
    
    def _validate_single_dependency(self, dep: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Validate a single dependency"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "missing_dependencies": [],
            "invalid_versions": []
        }
        
        if not isinstance(dep, dict):
            result["valid"] = False
            result["errors"].append(f"Dependency {index} must be an object")
            return result
        
        # Check required fields
        required_fields = ["artifact", "purpose"]
        for field in required_fields:
            if field not in dep:
                result["valid"] = False
                result["errors"].append(f"Dependency {index} missing required field: {field}")
        
        # Validate artifact exists (if registry is available)
        if "artifact" in dep and self.artifact_registry:
            artifact_name = dep["artifact"]
            if artifact_name not in self.artifact_registry:
                result["missing_dependencies"].append(artifact_name)
                result["warnings"].append(f"Dependency artifact not found in registry: {artifact_name}")
        
        # Validate version constraints
        if "version" in dep:
            version = dep["version"]
            if not self._is_valid_version_constraint(version):
                result["invalid_versions"].append(version)
                result["warnings"].append(f"Invalid version constraint: {version}")
        
        return result
    
    def _is_valid_version_constraint(self, version: str) -> bool:
        """Check if version constraint is valid"""
        # Simple semver or semver range validation
        patterns = [
            r'^\d+\.\d+\.\d+$',  # Exact version
            r'^\^\d+\.\d+\.\d+$',  # Caret range
            r'^~\d+\.\d+\.\d+$',  # Tilde range
            r'^>=\d+\.\d+\.\d+$',  # Greater than or equal
            r'^<=\d+\.\d+\.\d+$',  # Less than or equal
        ]
        return any(re.match(pattern, version) for pattern in patterns)

class SemanticTypeValidator:
    """Validates semantic type consistency"""
    
    def __init__(self):
        self.semantic_type_schemas = self._load_semantic_schemas()
        self.type_relationships = self._load_type_relationships()
    
    def validate_semantic_consistency(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """Validate semantic type consistency"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "type_violations": [],
            "relationship_violations": []
        }
        
        if "metadata" not in artifact or "semanticType" not in artifact["metadata"]:
            result["valid"] = False
            result["errors"].append("Missing semanticType in metadata")
            return result
        
        semantic_type = artifact["metadata"]["semanticType"]
        
        # Validate semantic type is valid
        if semantic_type not in self.semantic_type_schemas:
            result["valid"] = False
            result["errors"].append(f"Invalid semantic type: {semantic_type}")
            return result
        
        # Validate against semantic type schema
        schema_violations = self._validate_against_semantic_schema(artifact, semantic_type)
        result["type_violations"] = schema_violations
        if schema_violations:
            result["valid"] = False
            result["errors"].extend(schema_violations)
        
        # Validate semantic type relationships
        if "dependsOn" in artifact:
            relationship_violations = self._validate_semantic_relationships(
                artifact, semantic_type
            )
            result["relationship_violations"] = relationship_violations
            result["warnings"].extend(relationship_violations)
        
        return result
    
    def _load_semantic_schemas(self) -> Dict[str, Dict]:
        """Load semantic type schemas"""
        return {
            "manifest": {
                "required_fields": ["apiVersion", "kind", "metadata", "spec"],
                "optional_fields": ["dependsOn", "governance"],
                "can_depend_on": ["schema", "spec", "governance", "policy"]
            },
            "schema": {
                "required_fields": ["apiVersion", "kind", "metadata", "schema"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "governance"]
            },
            "spec": {
                "required_fields": ["apiVersion", "kind", "metadata", "specification"],
                "optional_fields": ["dependsOn", "examples"],
                "can_depend_on": ["manifest", "schema", "governance"]
            },
            "governance": {
                "required_fields": ["apiVersion", "kind", "metadata", "policies"],
                "optional_fields": ["dependsOn", "roles"],
                "can_depend_on": ["manifest"]
            },
            "policy": {
                "required_fields": ["apiVersion", "kind", "metadata", "rules"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "governance"]
            },
            "role": {
                "required_fields": ["apiVersion", "kind", "metadata", "permissions"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "governance", "policy"]
            },
            "toolchain": {
                "required_fields": ["apiVersion", "kind", "metadata", "tools"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "spec", "schema"]
            },
            "index": {
                "required_fields": ["apiVersion", "kind", "metadata", "artifacts"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "schema"]
            },
            "documentation": {
                "required_fields": ["apiVersion", "kind", "metadata", "content"],
                "optional_fields": ["dependsOn"],
                "can_depend_on": ["manifest", "spec", "examples"]
            }
        }
    
    def _load_type_relationships(self) -> Dict[str, List[str]]:
        """Load semantic type relationship rules"""
        return {
            "manifest": ["schema", "spec", "governance", "policy", "role", "toolchain"],
            "schema": ["spec"],
            "spec": ["documentation", "examples"],
            "governance": ["policy", "role"],
            "policy": ["role", "documentation"],
            "role": ["documentation"],
            "toolchain": ["documentation"]
        }
    
    def _validate_against_semantic_schema(self, artifact: Dict[str, Any], semantic_type: str) -> List[str]:
        """Validate artifact against its semantic type schema"""
        violations = []
        schema = self.semantic_type_schemas.get(semantic_type, {})
        
        # Check required fields
        for field in schema.get("required_fields", []):
            if field not in artifact:
                violations.append(f"Missing required field for {semantic_type}: {field}")
        
        # Check for disallowed fields (basic check)
        allowed_fields = set(schema.get("required_fields", []) + schema.get("optional_fields", []))
        common_fields = {"apiVersion", "kind", "metadata", "dependsOn"}
        allowed_fields.update(common_fields)
        
        for field in artifact:
            if field not in allowed_fields:
                violations.append(f"Unexpected field for {semantic_type}: {field}")
        
        return violations
    
    def _validate_semantic_relationships(self, artifact: Dict[str, Any], semantic_type: str) -> List[str]:
        """Validate semantic type relationships in dependencies"""
        violations = []
        allowed_dependencies = self.semantic_type_schemas.get(semantic_type, {}).get("can_depend_on", [])
        
        if "dependsOn" in artifact:
            for dep in artifact["dependsOn"]:
                if "semanticType" in dep:
                    dep_type = dep["semanticType"]
                    if dep_type not in allowed_dependencies:
                        violations.append(
                            f"{semantic_type} cannot depend on {dep_type}. "
                            f"Allowed: {', '.join(allowed_dependencies)}"
                        )
        
        return violations

class EndpointValidator:
    """Validates MCP endpoints"""
    
    def __init__(self):
        self.base_endpoints = {
            "registry": "/api/v1/registry",
            "artifacts": "/api/v1/artifacts",
            "validation": "/api/v1/validation",
            "governance": "/api/v1/governance",
            "namespaces": "/api/v1/namespaces",
            "dependencies": "/api/v1/dependencies",
            "toolchain": "/api/v1/toolchain",
            "monitoring": "/api/v1/monitoring",
            "compliance": "/api/v1/compliance"
        }
    
    def validate_endpoints(self, artifact: Dict[str, Any], base_url: str = "http://localhost:8080") -> Dict[str, Any]:
        """Validate MCP endpoints referenced in artifact"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "endpoint_status": {},
            "response_times": {}
        }
        
        if "endpoints" not in artifact:
            return result
        
        endpoints = artifact["endpoints"]
        if not isinstance(endpoints, list):
            result["valid"] = False
            result["errors"].append("endpoints must be an array")
            return result
        
        for endpoint in endpoints:
            endpoint_result = self._validate_single_endpoint(endpoint, base_url)
            result["endpoint_status"][endpoint.get("name", "unknown")] = endpoint_result["status"]
            
            if endpoint_result["response_time"]:
                result["response_times"][endpoint.get("name", "unknown")] = endpoint_result["response_time"]
            
            if not endpoint_result["valid"]:
                result["valid"] = False
                result["errors"].extend(endpoint_result["errors"])
            result["warnings"].extend(endpoint_result["warnings"])
        
        return result
    
    def _validate_single_endpoint(self, endpoint: Dict[str, Any], base_url: str) -> Dict[str, Any]:
        """Validate a single endpoint"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "status": "unknown",
            "response_time": None
        }
        
        # Check required fields
        if "url" not in endpoint:
            result["valid"] = False
            result["errors"].append("Endpoint missing 'url' field")
            return result
        
        url = endpoint["url"]
        if not url.startswith(("http://", "https://")):
            url = f"{base_url}{url}"
        
        # Test endpoint availability
        try:
            start_time = datetime.now()
            response = requests.get(url, timeout=10)
            end_time = datetime.now()
            
            result["response_time"] = (end_time - start_time).total_seconds()
            result["status"] = f"{response.status_code}"
            
            if response.status_code >= 400:
                result["valid"] = False
                result["errors"].append(f"Endpoint returned error status: {response.status_code}")
            
            # Check response format
            try:
                json_response = response.json()
                if not isinstance(json_response, dict):
                    result["warnings"].append("Endpoint response is not a valid JSON object")
            except json.JSONDecodeError:
                result["warnings"].append("Endpoint response is not valid JSON")
                
        except requests.exceptions.Timeout:
            result["valid"] = False
            result["errors"].append("Endpoint request timed out")
            result["status"] = "timeout"
        except requests.exceptions.ConnectionError:
            result["valid"] = False
            result["errors"].append("Could not connect to endpoint")
            result["status"] = "connection_error"
        except Exception as e:
            result["valid"] = False
            result["errors"].append(f"Endpoint validation failed: {str(e)}")
        
        return result

class NamingSpecificationValidator:
    """Enhanced naming specification validation"""
    
    def __init__(self):
        self.naming_rules = self._load_naming_rules()
        self.reserved_namespaces = self._load_reserved_namespaces()
    
    def validate_naming_specifications(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """Validate artifact against naming specifications"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "namespace_compliance": {},
            "artifact_name_compliance": {},
            "version_compliance": {}
        }
        
        if "metadata" not in artifact:
            result["valid"] = False
            result["errors"].append("Missing metadata")
            return result
        
        metadata = artifact["metadata"]
        
        # Validate namespace compliance
        if "namingRegistry" in metadata:
            namespace_result = self._validate_naming_registry(metadata["namingRegistry"])
            result["namespace_compliance"] = namespace_result
            if not namespace_result["valid"]:
                result["valid"] = False
                result["errors"].extend(namespace_result["errors"])
            result["warnings"].extend(namespace_result["warnings"])
        
        # Validate artifact name compliance
        if "name" in metadata:
            name_result = self._validate_artifact_name(metadata["name"])
            result["artifact_name_compliance"] = name_result
            if not name_result["valid"]:
                result["valid"] = False
                result["errors"].extend(name_result["errors"])
            result["warnings"].extend(name_result["warnings"])
        
        # Validate version compliance
        if "version" in metadata:
            version_result = self._validate_version(metadata["version"])
            result["version_compliance"] = version_result
            if not version_result["valid"]:
                result["valid"] = False
                result["errors"].extend(version_result["errors"])
            result["warnings"].extend(version_result["warnings"])
        
        return result
    
    def _load_naming_rules(self) -> Dict[str, Any]:
        """Load naming rules"""
        return {
            "namespace_formats": {
                "io.github.*": {
                    "pattern": r"^io\.github\.[a-z0-9]+([.-][a-z0-9]+)*$",
                    "verification_required": True,
                    "verification_methods": ["github-oauth"]
                },
                "com.*": {
                    "pattern": r"^com\.[a-z0-9]+([.-][a-z0-9]+)*$",
                    "verification_required": True,
                    "verification_methods": ["dns-txt", "http-well-known"]
                },
                "org.*": {
                    "pattern": r"^org\.[a-z0-9]+([.-][a-z0-9]+)*$",
                    "verification_required": True,
                    "verification_methods": ["dns-txt", "http-well-known"]
                }
            },
            "artifact_patterns": {
                "format": r"^[a-z0-9-]+$",
                "max_length": 50,
                "min_length": 3,
                "reserved_words": ["mcp", "system", "core", "api", "internal"]
            },
            "version_patterns": {
                "semver": r"^\d+\.\d+\.\d+$",
                "prerelease": r"^\d+\.\d+\.\d+-[a-zA-Z0-9-]+$",
                "build": r"^\d+\.\d+\.\d+\+[a-zA-Z0-9-]+$"
            }
        }
    
    def _load_reserved_namespaces(self) -> Set[str]:
        """Load reserved namespaces"""
        return {
            "io.github.machinenativeops",
            "com.mcp",
            "org.mcp",
            "net.mcp"
        }
    
    def _validate_naming_registry(self, naming_registry: Dict[str, Any]) -> Dict[str, Any]:
        """Validate naming registry compliance"""
        result = {"valid": True, "errors": [], "warnings": []}
        
        # Check format field
        if naming_registry.get("format") != "reverse-DNS":
            result["valid"] = False
            result["errors"].append("Naming registry format must be 'reverse-DNS'")
        
        # Check namespace pattern
        namespace = naming_registry.get("namespace", "")
        namespace_valid = False
        
        for pattern_info in self.naming_rules["namespace_formats"].values():
            pattern = pattern_info["pattern"]
            if re.match(pattern, namespace):
                namespace_valid = True
                if pattern_info.get("verification_required"):
                    if "verificationStatus" not in naming_registry:
                        result["warnings"].append(f"Namespace {namespace} requires verification")
                    elif naming_registry.get("verificationStatus") != "verified":
                        result["warnings"].append(f"Namespace {namespace} is not verified")
                break
        
        if not namespace_valid:
            result["valid"] = False
            result["errors"].append(f"Invalid namespace format: {namespace}")
        
        return result
    
    def _validate_artifact_name(self, name: str) -> Dict[str, Any]:
        """Validate artifact name"""
        result = {"valid": True, "errors": [], "warnings": []}
        
        # Check pattern
        pattern = self.naming_rules["artifact_patterns"]["pattern"]
        if not re.match(pattern, name):
            result["valid"] = False
            result["errors"].append(f"Invalid artifact name format: {name}")
        
        # Check length
        max_len = self.naming_rules["artifact_patterns"]["max_length"]
        min_len = self.naming_rules["artifact_patterns"]["min_length"]
        if len(name) > max_len:
            result["valid"] = False
            result["errors"].append(f"Artifact name too long (max {max_len} characters)")
        if len(name) < min_len:
            result["valid"] = False
            result["errors"].append(f"Artifact name too short (min {min_len} characters)")
        
        # Check reserved words
        reserved = self.naming_rules["artifact_patterns"]["reserved_words"]
        if name in reserved:
            result["warnings"].append(f"Artifact name uses reserved word: {name}")
        
        return result
    
    def _validate_version(self, version: str) -> Dict[str, Any]:
        """Validate version format"""
        result = {"valid": True, "errors": [], "warnings": []}
        
        patterns = self.naming_rules["version_patterns"]
        
        # Try each pattern
        valid = False
        for pattern_name, pattern in patterns.items():
            if re.match(pattern, version):
                valid = True
                if pattern_name == "prerelease":
                    result["warnings"].append("Using prerelease version")
                elif pattern_name == "build":
                    result["warnings"].append("Using build version with metadata")
                break
        
        if not valid:
            result["valid"] = False
            result["errors"].append(f"Invalid version format: {version}")
        
        return result

class ReferenceValidator:
    """Validates reference integrity"""
    
    def __init__(self, artifact_registry: Optional[Dict] = None):
        self.artifact_registry = artifact_registry or {}
    
    def validate_references(self, artifact: Dict[str, Any]) -> Dict[str, Any]:
        """Validate all references in artifact"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "broken_references": [],
            "missing_targets": []
        }
        
        # Find all references in the artifact
        references = self._extract_references(artifact)
        
        for ref in references:
            ref_result = self._validate_reference(ref)
            if not ref_result["valid"]:
                result["valid"] = False
                result["errors"].extend(ref_result["errors"])
            result["warnings"].extend(ref_result["warnings"])
            
            if ref_result["broken"]:
                result["broken_references"].append(ref)
            
            if not ref_result["target_exists"]:
                result["missing_targets"].append(ref)
        
        return result
    
    def _extract_references(self, artifact: Dict[str, Any], path: str = "") -> List[Dict[str, Any]]:
        """Extract all references from artifact recursively"""
        references = []
        
        if isinstance(artifact, dict):
            for key, value in artifact.items():
                current_path = f"{path}.{key}" if path else key
                
                if key.endswith("Ref") or key.endswith("Reference"):
                    references.append({
                        "field": current_path,
                        "reference": value,
                        "type": "direct_reference"
                    })
                elif isinstance(value, (dict, list)):
                    references.extend(self._extract_references(value, current_path))
        
        elif isinstance(artifact, list):
            for i, item in enumerate(artifact):
                current_path = f"{path}[{i}]" if path else f"[{i}]"
                if isinstance(item, (dict, list)):
                    references.extend(self._extract_references(item, current_path))
        
        return references
    
    def _validate_reference(self, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a single reference"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "broken": False,
            "target_exists": True
        }
        
        ref_value = reference["reference"]
        
        # Check if reference is valid
        if not isinstance(ref_value, str):
            result["valid"] = False
            result["errors"].append(f"Invalid reference format at {reference['field']}")
            result["broken"] = True
            return result
        
        # Check if target exists in registry
        if self.artifact_registry and ref_value not in self.artifact_registry:
            result["warnings"].append(f"Reference target not found in registry: {ref_value}")
            result["target_exists"] = False
        
        # Validate reference format
        if not self._is_valid_reference_format(ref_value):
            result["valid"] = False
            result["errors"].append(f"Invalid reference format: {ref_value}")
            result["broken"] = True
        
        return result
    
    def _is_valid_reference_format(self, reference: str) -> bool:
        """Check if reference has valid format"""
        # Expected format: namespace/artifact-name or namespace/artifact-name:version
        patterns = [
            r'^[a-z0-9.-]+/[a-z0-9-]+$',  # namespace/artifact
            r'^[a-z0-9.-]+/[a-z0-9-]+:\d+\.\d+\.\d+$'  # namespace/artifact:version
        ]
        return any(re.match(pattern, reference) for pattern in patterns)

class ExtendedMCPValidator(MCPValidator):
    """Extended MCP validator with comprehensive validation capabilities"""
    
    def __init__(self, schema_path: Optional[Path] = None, artifact_registry: Optional[Dict] = None):
        super().__init__(schema_path)
        self.artifact_registry = artifact_registry or {}
        
        # Initialize specialized validators
        self.dependency_validator = DependencyValidator(self.artifact_registry)
        self.semantic_validator = SemanticTypeValidator()
        self.endpoint_validator = EndpointValidator()
        self.naming_validator = NamingSpecificationValidator()
        self.reference_validator = ReferenceValidator(self.artifact_registry)
    
    def validate_artifact_extended(self, artifact_path: Path, strict: bool = False, 
                                 validate_endpoints: bool = False, 
                                 base_url: str = "http://localhost:8080") -> ExtendedValidationResult:
        """Perform comprehensive artifact validation"""
        
        # Start timing
        start_time = datetime.now()
        
        # Load and parse artifact
        try:
            with open(artifact_path, 'r') as f:
                artifact = yaml.safe_load(f)
        except Exception as e:
            return ExtendedValidationResult(
                status=ExtendedValidationStatus.FAILED,
                artifact_path=str(artifact_path),
                errors=[f"Failed to load artifact: {str(e)}"],
                warnings=[]
            )
        
        # Perform basic validation first
        basic_result = self.validate_artifact(artifact_path, strict)
        
        # Initialize extended result
        errors = basic_result.errors.copy()
        warnings = basic_result.warnings.copy()
        
        # Perform extended validations
        dependency_results = self.dependency_validator.validate_dependencies(artifact)
        semantic_results = self.semantic_validator.validate_semantic_consistency(artifact)
        naming_results = self.naming_validator.validate_naming_specifications(artifact)
        reference_results = self.reference_validator.validate_references(artifact)
        
        # Endpoint validation (optional)
        endpoint_results = {"valid": True, "errors": [], "warnings": []}
        if validate_endpoints:
            endpoint_results = self.endpoint_validator.validate_endpoints(artifact, base_url)
        
        # Collect all errors and warnings
        all_results = [dependency_results, semantic_results, naming_results, reference_results, endpoint_results]
        
        for result in all_results:
            errors.extend(result.get("errors", []))
            warnings.extend(result.get("warnings", []))
        
        # Determine final status
        if errors:
            status = ExtendedValidationStatus.FAILED
        elif warnings and strict:
            status = ExtendedValidationStatus.FAILED
        elif warnings:
            status = ExtendedValidationStatus.WARNING
        else:
            status = ExtendedValidationStatus.PASSED
        
        # Calculate performance metrics
        end_time = datetime.now()
        performance_metrics = {
            "validation_time_seconds": (end_time - start_time).total_seconds(),
            "dependency_count": len(artifact.get("dependsOn", [])),
            "endpoint_count": len(artifact.get("endpoints", [])),
            "reference_count": len(reference_results.get("broken_references", []))
        }
        
        return ExtendedValidationResult(
            status=status,
            artifact_path=str(artifact_path),
            artifact_type=artifact.get("kind", "Unknown"),
            errors=errors,
            warnings=warnings,
            dependency_results=dependency_results,
            semantic_results=semantic_results,
            endpoint_results=endpoint_results,
            naming_results=naming_results,
            reference_results=reference_results,
            circular_dependency_detected=bool(dependency_results.get("circular_dependencies")),
            performance_metrics=performance_metrics
        )

def main():
    """Main entry point for extended validator"""
    parser = argparse.ArgumentParser(
        description='MCP Level 1 Extended Artifact Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic validation
  extended-validator --artifact manifest.yaml
  
  # Extended validation with endpoint checking
  extended-validator --artifact manifest.yaml --validate-endpoints --base-url http://api.mcp.io
  
  # Strict mode with all validations
  extended-validator --artifact manifest.yaml --strict --validate-endpoints --validate-references
  
  # JSON output with performance metrics
  extended-validator --artifact manifest.yaml --format json --show-metrics
        """
    )
    
    parser.add_argument(
        '--artifact',
        type=Path,
        required=True,
        help='Path to artifact file to validate'
    )
    
    parser.add_argument(
        '--schema',
        type=Path,
        help='Path to schema.yaml file'
    )
    
    parser.add_argument(
        '--registry',
        type=Path,
        help='Path to artifact registry file'
    )
    
    parser.add_argument(
        '--strict',
        action='store_true',
        help='Treat warnings as errors'
    )
    
    parser.add_argument(
        '--validate-endpoints',
        action='store_true',
        help='Validate MCP endpoints'
    )
    
    parser.add_argument(
        '--base-url',
        default='http://localhost:8080',
        help='Base URL for endpoint validation'
    )
    
    parser.add_argument(
        '--format',
        choices=['text', 'json'],
        default='text',
        help='Output format (default: text)'
    )
    
    parser.add_argument(
        '--show-metrics',
        action='store_true',
        help='Show performance metrics'
    )
    
    args = parser.parse_args()
    
    # Validate artifact path
    if not args.artifact.exists():
        print(f"Error: Artifact file not found: {args.artifact}", file=sys.stderr)
        sys.exit(1)
    
    # Load artifact registry if provided
    artifact_registry = {}
    if args.registry and args.registry.exists():
        with open(args.registry, 'r') as f:
            artifact_registry = yaml.safe_load(f)
    
    # Create extended validator
    validator = ExtendedMCPValidator(
        schema_path=args.schema,
        artifact_registry=artifact_registry
    )
    
    # Validate artifact
    result = validator.validate_artifact_extended(
        args.artifact, 
        strict=args.strict,
        validate_endpoints=args.validate_endpoints,
        base_url=args.base_url
    )
    
    # Output results
    if args.format == 'json':
        print(json.dumps(result.to_dict(), indent=2))
    else:
        # Enhanced text output
        print(f"\n{'='*80}")
        print(f"MCP Level 1 EXTENDED Artifact Validator")
        print(f"{'='*80}\n")
        print(f"Artifact: {result.artifact_path}")
        print(f"Type: {result.artifact_type or 'Unknown'}")
        print(f"Status: {result.status.value.upper()}")
        
        if args.show_metrics and result.performance_metrics:
            print(f"\n📊 Performance Metrics:")
            for metric, value in result.performance_metrics.items():
                print(f"  - {metric}: {value}")
        
        # Section-specific results
        sections = [
            ("Dependencies", result.dependency_results),
            ("Semantic Types", result.semantic_results),
            ("Naming", result.naming_results),
            ("References", result.reference_results),
            ("Endpoints", result.endpoint_results)
        ]
        
        for section_name, section_results in sections:
            if section_results:
                print(f"\n🔍 {section_name}:")
                if section_results.get("valid", True):
                    print(f"  ✅ {section_name} validation passed")
                else:
                    print(f"  ❌ {section_name} validation failed")
                
                for error in section_results.get("errors", []):
                    print(f"    ❌ {error}")
                
                for warning in section_results.get("warnings", []):
                    print(f"    ⚠️  {warning}")
        
        # General errors and warnings
        if result.errors:
            print(f"\n❌ General Errors ({len(result.errors)}):")
            for error in result.errors:
                print(f"  - {error}")
        
        if result.warnings:
            print(f"\n⚠️  General Warnings ({len(result.warnings)}):")
            for warning in result.warnings:
                print(f"  - {warning}")
        
        if result.circular_dependency_detected:
            print(f"\n🔄 Circular Dependencies Detected!")
        
        # Final status
        if result.status == ExtendedValidationStatus.PASSED:
            print(f"\n🎉 All validations passed!")
        else:
            print(f"\n❌ Validation failed!")
        
        print(f"\n{'='*80}\n")
    
    # Exit with appropriate code
    sys.exit(0 if result.status == ExtendedValidationStatus.PASSED else 1)

if __name__ == '__main__':
    main()