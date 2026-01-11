#!/usr/bin/env python3
"""
Test suite for MCP Level 1 Extended Validation System
"""

import pytest
import json
import yaml
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from pathlib import Path

# Import the extended validation system
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extended_validator import (
    ExtendedMCPValidator, DependencyValidator, SemanticTypeValidator,
    EndpointValidator, NamingSpecificationValidator, ReferenceValidator,
    ExtendedValidationStatus, ExtendedValidationResult
)

class TestDependencyValidator:
    """Test the dependency validation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = DependencyValidator()
        
        # Sample artifact registry
        self.artifact_registry = {
            "com.example/artifact1": {"version": "1.0.0", "type": "spec"},
            "io.github.user/tool": {"version": "2.1.0", "type": "toolchain"}
        }
    
    def test_validate_dependencies_empty(self):
        """Test validation of artifact with no dependencies"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "kind": "manifest"
        }
        
        result = self.validator.validate_dependencies(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_validate_dependencies_valid(self):
        """Test validation of artifact with valid dependencies"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "kind": "manifest",
            "dependsOn": [
                {
                    "artifact": "com.example/artifact1",
                    "purpose": "configuration",
                    "version": "^1.0.0"
                }
            ]
        }
        
        self.validator.artifact_registry = self.artifact_registry
        result = self.validator.validate_dependencies(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_validate_dependencies_missing_fields(self):
        """Test validation with missing dependency fields"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "kind": "manifest",
            "dependsOn": [
                {
                    "artifact": "com.example/artifact1"
                    # Missing "purpose" field
                }
            ]
        }
        
        result = self.validator.validate_dependencies(artifact)
        
        assert result["valid"] is False
        assert any("missing required field" in error for error in result["errors"])
    
    def test_validate_circular_dependencies(self):
        """Test circular dependency detection"""
        # Create a circular dependency scenario
        artifact_a = {
            "metadata": {"name": "artifact-a"},
            "dependsOn": [{"artifact": "artifact-b", "purpose": "reference"}]
        }
        
        artifact_b = {
            "metadata": {"name": "artifact-b"},
            "dependsOn": [{"artifact": "artifact-a", "purpose": "reference"}]
        }
        
        # Validate artifact A
        result_a = self.validator.validate_dependencies(artifact_a)
        
        # Validate artifact B (which creates the cycle)
        self.validator.dependency_graph.add_node("artifact-b")
        result_b = self.validator.validate_dependencies(artifact_b)
        
        # Check if cycle is detected
        assert result_b["valid"] is False
        assert len(result_b["circular_dependencies"]) > 0

class TestSemanticTypeValidator:
    """Test the semantic type validation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = SemanticTypeValidator()
    
    def test_validate_semantic_consistency_valid(self):
        """Test validation of artifact with valid semantic type"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "semanticType": "manifest"
            },
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest",
            "spec": {}
        }
        
        result = self.validator.validate_semantic_consistency(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_validate_semantic_consistency_invalid_type(self):
        """Test validation with invalid semantic type"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "semanticType": "invalid-type"
            },
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest"
        }
        
        result = self.validator.validate_semantic_consistency(artifact)
        
        assert result["valid"] is False
        assert "Invalid semantic type" in str(result["errors"])
    
    def test_validate_semantic_consistency_missing_required_fields(self):
        """Test validation with missing required fields for semantic type"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "semanticType": "manifest"
            },
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest"
            # Missing "spec" field required for manifest type
        }
        
        result = self.validator.validate_semantic_consistency(artifact)
        
        assert result["valid"] is False
        assert "Missing required field for manifest" in str(result["errors"])
    
    def test_validate_semantic_relationships(self):
        """Test semantic type relationship validation"""
        artifact = {
            "metadata": {
                "name": "test-manifest",
                "semanticType": "manifest"
            },
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest",
            "spec": {},
            "dependsOn": [
                {
                    "artifact": "com.example/invalid-dependency",
                    "semanticType": "invalid-type",  # Manifests can't depend on this
                    "purpose": "reference"
                }
            ]
        }
        
        result = self.validator.validate_semantic_consistency(artifact)
        
        # Should have relationship warnings
        assert len(result["relationship_violations"]) > 0

class TestEndpointValidator:
    """Test the endpoint validation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = EndpointValidator()
    
    @patch('requests.get')
    def test_validate_endpoints_success(self, mock_get):
        """Test validation of working endpoints"""
        # Mock successful HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok"}
        mock_get.return_value = mock_response
        
        artifact = {
            "metadata": {"name": "test-artifact"},
            "endpoints": [
                {
                    "name": "api-endpoint",
                    "url": "/api/v1/status"
                }
            ]
        }
        
        result = self.validator.validate_endpoints(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        assert "api-endpoint" in result["endpoint_status"]
        assert result["endpoint_status"]["api-endpoint"] == "200"
    
    @patch('requests.get')
    def test_validate_endpoints_failure(self, mock_get):
        """Test validation of failing endpoints"""
        # Mock failed HTTP response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        artifact = {
            "metadata": {"name": "test-artifact"},
            "endpoints": [
                {
                    "name": "api-endpoint",
                    "url": "/api/v1/notfound"
                }
            ]
        }
        
        result = self.validator.validate_endpoints(artifact)
        
        assert result["valid"] is False
        assert len(result["errors"]) > 0
        assert "404" in str(result["errors"])
    
    @patch('requests.get')
    def test_validate_endpoints_timeout(self, mock_get):
        """Test endpoint timeout handling"""
        # Mock timeout exception
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
        
        artifact = {
            "metadata": {"name": "test-artifact"},
            "endpoints": [
                {
                    "name": "slow-endpoint",
                    "url": "/api/v1/slow"
                }
            ]
        }
        
        result = self.validator.validate_endpoints(artifact)
        
        assert result["valid"] is False
        assert any("timed out" in error for error in result["errors"])

class TestNamingSpecificationValidator:
    """Test the naming specification validation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = NamingSpecificationValidator()
    
    def test_validate_naming_specifications_valid(self):
        """Test validation of compliant naming"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "version": "1.0.0",
                "namingRegistry": {
                    "format": "reverse-DNS",
                    "namespace": "io.github.username",
                    "verificationStatus": "verified"
                }
            }
        }
        
        result = self.validator.validate_naming_specifications(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_validate_naming_specifications_invalid_namespace(self):
        """Test validation with invalid namespace"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "version": "1.0.0",
                "namingRegistry": {
                    "format": "reverse-DNS",
                    "namespace": "invalid-namespace"
                }
            }
        }
        
        result = self.validator.validate_naming_specifications(artifact)
        
        assert result["valid"] is False
        assert "Invalid namespace format" in str(result["errors"])
    
    def test_validate_naming_specifications_invalid_version(self):
        """Test validation with invalid version"""
        artifact = {
            "metadata": {
                "name": "test-artifact",
                "version": "invalid-version",
                "namingRegistry": {
                    "format": "reverse-DNS",
                    "namespace": "io.github.username"
                }
            }
        }
        
        result = self.validator.validate_naming_specifications(artifact)
        
        assert result["valid"] is False
        assert "Invalid version format" in str(result["errors"])
    
    def test_validate_artifact_name_reserved(self):
        """Test validation with reserved artifact name"""
        artifact = {
            "metadata": {
                "name": "mcp",  # Reserved word
                "version": "1.0.0"
            }
        }
        
        result = self.validator.validate_naming_specifications(artifact)
        
        # Should have warning about reserved word
        assert len(result["warnings"]) > 0
        assert "reserved word" in str(result["warnings"])

class TestReferenceValidator:
    """Test the reference validation functionality"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.artifact_registry = {
            "com.example/artifact1": {"version": "1.0.0"},
            "io.github.user/tool": {"version": "2.0.0"}
        }
        self.validator = ReferenceValidator(self.artifact_registry)
    
    def test_validate_references_valid(self):
        """Test validation of valid references"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "configRef": "com.example/artifact1",
            "toolRef": "io.github.user/tool:2.0.0"
        }
        
        result = self.validator.validate_references(artifact)
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
        assert len(result["broken_references"]) == 0
    
    def test_validate_references_invalid_format(self):
        """Test validation with invalid reference format"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "configRef": "invalid-reference-format"
        }
        
        result = self.validator.validate_references(artifact)
        
        assert result["valid"] is False
        assert len(result["broken_references"]) > 0
        assert "Invalid reference format" in str(result["errors"])
    
    def test_validate_references_missing_target(self):
        """Test validation with reference to missing target"""
        artifact = {
            "metadata": {"name": "test-artifact"},
            "configRef": "com.example/nonexistent"
        }
        
        result = self.validator.validate_references(artifact)
        
        assert result["valid"] is True  # Still valid but with warning
        assert len(result["missing_targets"]) > 0

class TestExtendedMCPValidator:
    """Test the extended MCP validator integration"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.validator = ExtendedMCPValidator()
        
        # Create a temporary test artifact
        self.test_artifact = {
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest",
            "metadata": {
                "name": "test-artifact",
                "version": "1.0.0",
                "semanticType": "manifest",
                "namingRegistry": {
                    "format": "reverse-DNS",
                    "namespace": "io.github.testuser",
                    "verificationStatus": "verified"
                }
            },
            "spec": {
                "description": "Test artifact"
            },
            "dependsOn": [
                {
                    "artifact": "io.github.testuser/dependency",
                    "purpose": "configuration",
                    "version": "^1.0.0"
                }
            ]
        }
    
    @patch('builtins.open', create=True)
    @patch('yaml.safe_load')
    @patch('pathlib.Path.exists')
    def test_validate_artifact_extended_success(self, mock_exists, mock_yaml, mock_open):
        """Test successful extended validation"""
        # Mock file operations
        mock_exists.return_value = True
        mock_yaml.return_value = self.test_artifact
        mock_open.return_value.__enter__.return_value.read.return_value = yaml.dump(self.test_artifact)
        
        artifact_path = Path("test-artifact.yaml")
        
        result = self.validator.validate_artifact_extended(artifact_path)
        
        assert result.status == ExtendedValidationStatus.PASSED
        assert len(result.errors) == 0
    
    @patch('builtins.open', create=True)
    @patch('yaml.safe_load')
    @patch('pathlib.Path.exists')
    def test_validate_artifact_extended_with_endpoint_validation(self, mock_exists, mock_yaml, mock_open):
        """Test extended validation with endpoint checking"""
        # Add endpoints to test artifact
        artifact_with_endpoints = self.test_artifact.copy()
        artifact_with_endpoints["endpoints"] = [
            {
                "name": "status-endpoint",
                "url": "/api/v1/status"
            }
        ]
        
        # Mock file operations
        mock_exists.return_value = True
        mock_yaml.return_value = artifact_with_endpoints
        mock_open.return_value.__enter__.return_value.read.return_value = yaml.dump(artifact_with_endpoints)
        
        artifact_path = Path("test-artifact.yaml")
        
        with patch('requests.get') as mock_get:
            # Mock successful endpoint response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "ok"}
            mock_get.return_value = mock_response
            
            result = self.validator.validate_artifact_extended(
                artifact_path, 
                validate_endpoints=True
            )
            
            assert result.status == ExtendedValidationStatus.PASSED
            assert len(result.endpoint_results["errors"]) == 0
    
    @patch('builtins.open', create=True)
    @patch('yaml.safe_load')
    @patch('pathlib.Path.exists')
    def test_validate_artifact_extended_strict_mode(self, mock_exists, mock_yaml, mock_open):
        """Test extended validation in strict mode"""
        # Create artifact with warnings
        artifact_with_warnings = self.test_artifact.copy()
        artifact_with_warnings["metadata"]["name"] = "mcp"  # Reserved word (warning)
        
        # Mock file operations
        mock_exists.return_value = True
        mock_yaml.return_value = artifact_with_warnings
        mock_open.return_value.__enter__.return_value.read.return_value = yaml.dump(artifact_with_warnings)
        
        artifact_path = Path("test-artifact.yaml")
        
        result = self.validator.validate_artifact_extended(artifact_path, strict=True)
        
        # In strict mode, warnings should become failures
        assert result.status == ExtendedValidationStatus.FAILED
        assert len(result.errors) > 0
    
    def test_performance_metrics_collection(self):
        """Test that performance metrics are collected"""
        # Mock the artifact loading
        with patch('builtins.open', create=True), \
             patch('yaml.safe_load') as mock_yaml, \
             patch('pathlib.Path.exists') as mock_exists:
            
            mock_exists.return_value = True
            mock_yaml.return_value = self.test_artifact
            
            artifact_path = Path("test-artifact.yaml")
            
            with patch('builtins.open', create=True):
                result = self.validator.validate_artifact_extended(artifact_path)
            
            # Check that performance metrics are included
            assert "performance_metrics" in result.__dict__
            assert "validation_time_seconds" in result.performance_metrics
            assert "dependency_count" in result.performance_metrics
            assert result.performance_metrics["dependency_count"] == 1

class TestIntegration:
    """Integration tests for the complete validation system"""
    
    def test_full_validation_pipeline(self):
        """Test the complete validation pipeline"""
        validator = ExtendedMCPValidator()
        
        # Create complex test artifact
        complex_artifact = {
            "apiVersion": "mcp.io/v1",
            "kind": "Manifest",
            "metadata": {
                "name": "complex-artifact",
                "version": "2.1.0",
                "semanticType": "manifest",
                "namingRegistry": {
                    "format": "reverse-DNS",
                    "namespace": "com.example",
                    "verificationStatus": "verified"
                }
            },
            "spec": {
                "description": "Complex test artifact",
                "configRef": "com.example/config:1.0.0"
            },
            "dependsOn": [
                {
                    "artifact": "com.example/config",
                    "purpose": "configuration",
                    "semanticType": "schema",
                    "version": "^1.0.0"
                },
                {
                    "artifact": "io.github.user/tool",
                    "purpose": "tools",
                    "semanticType": "toolchain",
                    "version": ">=2.0.0"
                }
            ],
            "endpoints": [
                {
                    "name": "status",
                    "url": "/api/v1/status"
                },
                {
                    "name": "health",
                    "url": "http://localhost:8080/health"
                }
            ]
        }
        
        # Mock file operations and endpoint validation
        with patch('builtins.open', create=True), \
             patch('yaml.safe_load') as mock_yaml, \
             patch('pathlib.Path.exists') as mock_exists, \
             patch('requests.get') as mock_get:
            
            mock_exists.return_value = True
            mock_yaml.return_value = complex_artifact
            
            # Mock successful endpoint responses
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "ok"}
            mock_get.return_value = mock_response
            
            artifact_path = Path("complex-artifact.yaml")
            
            result = validator.validate_artifact_extended(
                artifact_path,
                validate_endpoints=True
            )
            
            # Verify all validation sections ran
            assert "dependency_results" in result.__dict__
            assert "semantic_results" in result.__dict__
            assert "naming_results" in result.__dict__
            assert "reference_results" in result.__dict__
            assert "endpoint_results" in result.__dict__
            
            # Verify performance metrics
            assert result.performance_metrics["dependency_count"] == 2
            assert result.performance_metrics["endpoint_count"] == 2

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])