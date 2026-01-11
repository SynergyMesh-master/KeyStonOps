#!/usr/bin/env python3
"""
MCP Level 1 Validator
Validates MCP artifacts against Level 1 schemas and policies
"""

import sys
import json
import yaml
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import jsonschema
import re


class ValidationStatus(Enum):
    """Validation status enumeration"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


@dataclass
class ValidationResult:
    """Validation result data class"""
    status: ValidationStatus
    artifact_path: str
    errors: List[str]
    warnings: List[str]
    artifact_type: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "status": self.status.value,
            "artifact_path": self.artifact_path,
            "artifact_type": self.artifact_type,
            "errors": self.errors,
            "warnings": self.warnings,
            "passed": self.status == ValidationStatus.PASSED
        }


class MCPValidator:
    """
    MCP Level 1 Artifact Validator
    
    Validates artifacts against:
    - Schema definitions
    - Naming conventions
    - Dependency requirements
    - Policy compliance
    """
    
    def __init__(self, schema_path: Optional[Path] = None):
        """
        Initialize validator
        
        Args:
            schema_path: Path to schema.yaml file
        """
        self.schema_path = schema_path
        self.schema = None
        
        if schema_path and schema_path.exists():
            with open(schema_path, 'r') as f:
                schema_data = yaml.safe_load(f)
                self.schema = schema_data.get('schema', {})
    
    def validate_artifact(self, artifact_path: Path, strict: bool = False) -> ValidationResult:
        """
        Validate a single artifact
        
        Args:
            artifact_path: Path to artifact file
            strict: Enable strict validation mode
            
        Returns:
            ValidationResult object
        """
        errors = []
        warnings = []
        artifact_type = None
        
        try:
            # Load artifact
            with open(artifact_path, 'r') as f:
                artifact = yaml.safe_load(f)
            
            # Extract artifact type
            artifact_type = artifact.get('kind', 'Unknown')
            
            # Validate structure
            structure_errors = self._validate_structure(artifact)
            errors.extend(structure_errors)
            
            # Validate naming
            naming_errors, naming_warnings = self._validate_naming(artifact)
            errors.extend(naming_errors)
            warnings.extend(naming_warnings)
            
            # Validate dependencies
            dep_errors = self._validate_dependencies(artifact)
            errors.extend(dep_errors)
            
            # Validate against schema if available
            if self.schema:
                schema_errors = self._validate_against_schema(artifact)
                errors.extend(schema_errors)
            
            # Validate semantic type
            semantic_errors = self._validate_semantic_type(artifact)
            errors.extend(semantic_errors)
            
            # Determine status
            if errors:
                status = ValidationStatus.FAILED
            elif warnings and strict:
                status = ValidationStatus.FAILED
            elif warnings:
                status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.PASSED
                
        except Exception as e:
            errors.append(f"Failed to load artifact: {str(e)}")
            status = ValidationStatus.FAILED
        
        return ValidationResult(
            status=status,
            artifact_path=str(artifact_path),
            artifact_type=artifact_type,
            errors=errors,
            warnings=warnings
        )
    
    def _validate_structure(self, artifact: Dict[str, Any]) -> List[str]:
        """Validate artifact structure"""
        errors = []
        
        # Check required fields
        required_fields = ['apiVersion', 'kind', 'metadata']
        for field in required_fields:
            if field not in artifact:
                errors.append(f"Missing required field: {field}")
        
        # Check metadata structure
        if 'metadata' in artifact:
            metadata = artifact['metadata']
            required_metadata = ['name', 'version', 'semanticType']
            for field in required_metadata:
                if field not in metadata:
                    errors.append(f"Missing required metadata field: {field}")
        
        return errors
    
    def _validate_naming(self, artifact: Dict[str, Any]) -> tuple[List[str], List[str]]:
        """Validate naming conventions"""
        errors = []
        warnings = []
        
        if 'metadata' not in artifact:
            return errors, warnings
        
        metadata = artifact['metadata']
        
        # Validate name format (reverse-DNS)
        if 'name' in metadata:
            name = metadata['name']
            # Pattern: namespace/artifact-name
            pattern = r'^[a-z0-9.-]+/[a-z0-9-]+$'
            if not re.match(pattern, name):
                errors.append(
                    f"Invalid name format: '{name}'. "
                    f"Must match pattern: namespace/artifact-name (lowercase, hyphens allowed)"
                )
        
        # Validate version format (semver)
        if 'version' in metadata:
            version = metadata['version']
            pattern = r'^\d+\.\d+\.\d+$'
            if not re.match(pattern, version):
                errors.append(
                    f"Invalid version format: '{version}'. "
                    f"Must follow semantic versioning: MAJOR.MINOR.PATCH"
                )
        
        # Check naming registry compliance
        if 'namingRegistry' in metadata:
            naming_registry = metadata['namingRegistry']
            if naming_registry.get('format') != 'reverse-DNS':
                warnings.append("Naming registry format should be 'reverse-DNS'")
        
        return errors, warnings
    
    def _validate_dependencies(self, artifact: Dict[str, Any]) -> List[str]:
        """Validate dependencies"""
        errors = []
        
        if 'dependsOn' not in artifact:
            return errors
        
        depends_on = artifact['dependsOn']
        if not isinstance(depends_on, list):
            errors.append("dependsOn must be an array")
            return errors
        
        for i, dep in enumerate(depends_on):
            if not isinstance(dep, dict):
                errors.append(f"Dependency {i} must be an object")
                continue
            
            # Check required dependency fields
            if 'artifact' not in dep:
                errors.append(f"Dependency {i} missing 'artifact' field")
            if 'purpose' not in dep:
                errors.append(f"Dependency {i} missing 'purpose' field")
        
        return errors
    
    def _validate_against_schema(self, artifact: Dict[str, Any]) -> List[str]:
        """Validate against JSON schema"""
        errors = []
        
        try:
            jsonschema.validate(instance=artifact, schema=self.schema)
        except jsonschema.exceptions.ValidationError as e:
            errors.append(f"Schema validation error: {e.message}")
        except Exception as e:
            errors.append(f"Schema validation failed: {str(e)}")
        
        return errors
    
    def _validate_semantic_type(self, artifact: Dict[str, Any]) -> List[str]:
        """Validate semantic type"""
        errors = []
        
        if 'metadata' not in artifact:
            return errors
        
        metadata = artifact['metadata']
        
        if 'semanticType' not in metadata:
            errors.append("Missing semanticType in metadata")
            return errors
        
        semantic_type = metadata['semanticType']
        valid_types = [
            'manifest', 'schema', 'spec', 'index', 'taxonomy',
            'governance', 'policy', 'role', 'toolchain', 'documentation'
        ]
        
        if semantic_type not in valid_types:
            errors.append(
                f"Invalid semanticType: '{semantic_type}'. "
                f"Must be one of: {', '.join(valid_types)}"
            )
        
        return errors


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='MCP Level 1 Artifact Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate a single artifact
  mcp-validator --artifact manifest.yaml
  
  # Validate with schema
  mcp-validator --artifact manifest.yaml --schema schema.yaml
  
  # Strict mode (warnings as errors)
  mcp-validator --artifact manifest.yaml --strict
  
  # JSON output
  mcp-validator --artifact manifest.yaml --format json
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
        '--strict',
        action='store_true',
        help='Treat warnings as errors'
    )
    
    parser.add_argument(
        '--format',
        choices=['text', 'json'],
        default='text',
        help='Output format (default: text)'
    )
    
    args = parser.parse_args()
    
    # Validate artifact path
    if not args.artifact.exists():
        print(f"Error: Artifact file not found: {args.artifact}", file=sys.stderr)
        sys.exit(1)
    
    # Create validator
    validator = MCPValidator(schema_path=args.schema)
    
    # Validate artifact
    result = validator.validate_artifact(args.artifact, strict=args.strict)
    
    # Output results
    if args.format == 'json':
        print(json.dumps(result.to_dict(), indent=2))
    else:
        # Text output
        print(f"\n{'='*60}")
        print(f"MCP Level 1 Artifact Validator")
        print(f"{'='*60}\n")
        print(f"Artifact: {result.artifact_path}")
        print(f"Type: {result.artifact_type or 'Unknown'}")
        print(f"Status: {result.status.value.upper()}")
        
        if result.errors:
            print(f"\n❌ Errors ({len(result.errors)}):")
            for error in result.errors:
                print(f"  - {error}")
        
        if result.warnings:
            print(f"\n⚠️  Warnings ({len(result.warnings)}):")
            for warning in result.warnings:
                print(f"  - {warning}")
        
        if result.status == ValidationStatus.PASSED:
            print(f"\n✅ Validation passed!")
        else:
            print(f"\n❌ Validation failed!")
        
        print(f"\n{'='*60}\n")
    
    # Exit with appropriate code
    sys.exit(0 if result.status == ValidationStatus.PASSED else 1)


if __name__ == '__main__':
    main()