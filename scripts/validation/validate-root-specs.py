#!/usr/bin/env python3
"""
Root Layer Specifications Validator
Version: 1.0.0
Purpose: Machine-verifiable validation of root layer specifications
"""

import os
import re
import sys
import yaml
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple, Set
from collections import defaultdict

class RootSpecsValidator:
    """Validates root layer specifications against defined rules"""
    
    def __init__(self, repo_root: str = "."):
        self.repo_root = Path(repo_root)
        self.errors = []
        self.warnings = []
        self.specs = {}
        self.registries = {}
        self.root_files = {}
        
    def load_yaml(self, file_path: Path) -> Dict:
        """Load and parse YAML file (handles multi-document YAML)"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Load all documents and return the first one
                docs = list(yaml.safe_load_all(f))
                if docs:
                    return docs[0]  # Return first document
                return {}
        except Exception as e:
            self.errors.append(f"Failed to load {file_path}: {e}")
            return {}
    
    def load_specifications(self):
        """Load all specification files"""
        spec_files = [
            "root.specs.naming.yaml",
            "root.specs.references.yaml",
            "root.specs.mapping.yaml",
            "root.specs.logic.yaml",
            "root.specs.context.yaml"
        ]
        
        for spec_file in spec_files:
            file_path = self.repo_root / spec_file
            if file_path.exists():
                self.specs[spec_file] = self.load_yaml(file_path)
            else:
                self.errors.append(f"Specification file not found: {spec_file}")
    
    def load_registries(self):
        """Load all registry files"""
        registry_files = [
            "root.registry.modules.yaml",
            "root.registry.urns.yaml"
        ]
        
        for registry_file in registry_files:
            file_path = self.repo_root / registry_file
            if file_path.exists():
                self.registries[registry_file] = self.load_yaml(file_path)
            else:
                self.errors.append(f"Registry file not found: {registry_file}")
    
    def load_root_files(self):
        """Load all root.*.yaml files"""
        for file_path in self.repo_root.glob("root.*.yaml"):
            if not file_path.name.startswith("root.specs.") and \
               not file_path.name.startswith("root.registry."):
                self.root_files[file_path.name] = self.load_yaml(file_path)
    
    def validate_naming_spec(self) -> List[str]:
        """Validate naming specifications"""
        errors = []
        spec = self.specs.get("root.specs.naming.yaml", {})
        
        if not spec:
            return ["Naming specification not loaded"]
        
        naming_rules = spec.get("spec", {}).get("naming_rules", {})
        
        # Validate all root files against naming rules
        for file_name, content in self.root_files.items():
            # Check file name format
            file_pattern = naming_rules.get("file_names", {}).get("pattern", "")
            if file_pattern and not re.match(file_pattern, file_name):
                errors.append(f"File name '{file_name}' does not match pattern: {file_pattern}")
            
            # Check YAML keys
            if content and isinstance(content, dict):
                errors.extend(self._validate_yaml_keys(content, file_name, naming_rules))
            
            # Check apiVersion format
            api_version = content.get("apiVersion", "")
            if api_version:
                api_pattern = naming_rules.get("api_version", {}).get("pattern", "")
                if api_pattern and not re.match(api_pattern, api_version):
                    errors.append(f"{file_name}: apiVersion '{api_version}' does not match pattern")
            
            # Check kind format
            kind = content.get("kind", "")
            if kind:
                kind_pattern = naming_rules.get("kind_names", {}).get("pattern", "")
                if kind_pattern and not re.match(kind_pattern, kind):
                    errors.append(f"{file_name}: kind '{kind}' does not match pattern")
        
        return errors
    
    def _validate_yaml_keys(self, data: Any, file_name: str, naming_rules: Dict, path: str = "") -> List[str]:
        """Recursively validate YAML keys"""
        errors = []
        
        if isinstance(data, dict):
            key_pattern = naming_rules.get("yaml_keys", {}).get("pattern", "")
            exceptions = naming_rules.get("yaml_keys", {}).get("exceptions", [])
            
            # Define additional exception patterns
            exception_patterns = [
                r"^[A-Z][A-Z0-9_]*$",  # Environment variables (UPPER_CASE)
                r"^apiVersion$",  # Kubernetes-style fields
                r"^kind$",
                r".*\.io/.*",  # Label keys with domain
                r"lastTransitionTime$",  # Kubernetes-style timestamps
                r"^[a-z][a-z0-9-]*$",  # kebab-case (for dependency graph keys)
            ]
            
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                
                # Check if key matches pattern or is an exception
                is_exception = False
                
                # Check defined exceptions
                for exception in exceptions:
                    if re.match(exception.get("pattern", ""), key):
                        is_exception = True
                        break
                
                # Check additional exception patterns
                if not is_exception:
                    for pattern in exception_patterns:
                        if re.match(pattern, key):
                            is_exception = True
                            break
                
                if not is_exception and key_pattern and not re.match(key_pattern, key):
                    errors.append(f"{file_name}: Key '{current_path}' does not match pattern: {key_pattern}")
                
                # Recurse into nested structures
                errors.extend(self._validate_yaml_keys(value, file_name, naming_rules, current_path))
        
        elif isinstance(data, list):
            for i, item in enumerate(data):
                errors.extend(self._validate_yaml_keys(item, file_name, naming_rules, f"{path}[{i}]"))
        
        return errors
    
    def validate_references_spec(self) -> List[str]:
        """Validate reference specifications"""
        errors = []
        spec = self.specs.get("root.specs.references.yaml", {})
        
        if not spec:
            return ["Reference specification not loaded"]
        
        reference_formats = spec.get("spec", {}).get("reference_formats", {})
        urn_pattern = reference_formats.get("urn", {}).get("pattern", "")
        
        # Check URN registry
        urn_registry = self.registries.get("root.registry.urns.yaml", {})
        if urn_registry:
            for urn_type in ["module_urns", "config_urns", "policy_urns", "certificate_urns", "audit_urns"]:
                urns = urn_registry.get("spec", {}).get(urn_type, [])
                for urn_entry in urns:
                    urn = urn_entry.get("urn", "")
                    if urn and urn_pattern and not re.match(urn_pattern, urn):
                        errors.append(f"URN '{urn}' does not match pattern: {urn_pattern}")
        
        # Check for duplicate URNs
        all_urns = []
        if urn_registry:
            for urn_type in ["module_urns", "config_urns", "policy_urns", "certificate_urns", "audit_urns"]:
                urns = urn_registry.get("spec", {}).get(urn_type, [])
                for urn_entry in urns:
                    urn = urn_entry.get("urn", "")
                    if urn:
                        if urn in all_urns:
                            errors.append(f"Duplicate URN found: {urn}")
                        all_urns.append(urn)
        
        return errors
    
    def validate_mapping_spec(self) -> List[str]:
        """Validate mapping specifications"""
        errors = []
        spec = self.specs.get("root.specs.mapping.yaml", {})
        
        if not spec:
            return ["Mapping specification not loaded"]
        
        # Validate module mappings
        module_registry = self.registries.get("root.registry.modules.yaml", {})
        if module_registry:
            modules = module_registry.get("spec", {}).get("modules", [])
            for module in modules:
                module_name = module.get("name", "")
                entrypoint = module.get("technical", {}).get("entrypoint", "")
                
                # Check if module name appears in entrypoint
                if module_name and entrypoint and module_name not in entrypoint:
                    errors.append(f"Module '{module_name}' name not found in entrypoint: {entrypoint}")
        
        return errors
    
    def validate_logic_spec(self) -> List[str]:
        """Validate logic specifications"""
        errors = []
        spec = self.specs.get("root.specs.logic.yaml", {})
        
        if not spec:
            return ["Logic specification not loaded"]
        
        # Check for circular dependencies
        module_registry = self.registries.get("root.registry.modules.yaml", {})
        if module_registry:
            modules = module_registry.get("spec", {}).get("modules", [])
            dependency_graph = {}
            
            for module in modules:
                module_id = module.get("id", "")
                dependencies = module.get("dependencies", [])
                dependency_graph[module_id] = [dep.get("module_id", "") for dep in dependencies]
            
            # Detect cycles using DFS
            cycles = self._detect_cycles(dependency_graph)
            if cycles:
                errors.append(f"Circular dependencies detected: {cycles}")
        
        return errors
    
    def _detect_cycles(self, graph: Dict[str, List[str]]) -> List[List[str]]:
        """Detect cycles in dependency graph using DFS"""
        visited = set()
        rec_stack = set()
        cycles = []
        
        def dfs(node: str, path: List[str]):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path.copy())
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])
            
            rec_stack.remove(node)
        
        for node in graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def validate_context_spec(self) -> List[str]:
        """Validate context specifications"""
        errors = []
        spec = self.specs.get("root.specs.context.yaml", {})
        
        if not spec:
            return ["Context specification not loaded"]
        
        # Check module name consistency across files
        module_registry = self.registries.get("root.registry.modules.yaml", {})
        modules_config = self.root_files.get("root.modules.yaml", {})
        
        if module_registry and modules_config:
            registry_modules = {m.get("id"): m.get("name") for m in module_registry.get("spec", {}).get("modules", [])}
            config_modules = {m.get("name"): m.get("name") for m in modules_config.get("spec", {}).get("modules", [])}
            
            for module_id, registry_name in registry_modules.items():
                if registry_name not in config_modules:
                    errors.append(f"Module '{registry_name}' in registry not found in root.modules.yaml")
        
        return errors
    
    def validate_all(self) -> Tuple[List[str], List[str]]:
        """Run all validations"""
        print("🔍 Loading specifications...")
        self.load_specifications()
        self.load_registries()
        self.load_root_files()
        
        print("✅ Validating naming specifications...")
        self.errors.extend(self.validate_naming_spec())
        
        print("✅ Validating reference specifications...")
        self.errors.extend(self.validate_references_spec())
        
        print("✅ Validating mapping specifications...")
        self.errors.extend(self.validate_mapping_spec())
        
        print("✅ Validating logic specifications...")
        self.errors.extend(self.validate_logic_spec())
        
        print("✅ Validating context specifications...")
        self.errors.extend(self.validate_context_spec())
        
        return self.errors, self.warnings
    
    def generate_report(self) -> str:
        """Generate validation report in Markdown format"""
        report = ["# Root Layer Specifications Validation Report\n"]
        report.append(f"**Generated:** {self._get_timestamp()}\n")
        report.append(f"**Repository:** {self.repo_root}\n\n")
        
        # Summary
        report.append("## Summary\n")
        report.append(f"- **Total Errors:** {len(self.errors)}\n")
        report.append(f"- **Total Warnings:** {len(self.warnings)}\n")
        report.append(f"- **Status:** {'❌ FAILED' if self.errors else '✅ PASSED'}\n\n")
        
        # Errors
        if self.errors:
            report.append("## ❌ Errors\n")
            for i, error in enumerate(self.errors, 1):
                report.append(f"{i}. {error}\n")
            report.append("\n")
        
        # Warnings
        if self.warnings:
            report.append("## ⚠️ Warnings\n")
            for i, warning in enumerate(self.warnings, 1):
                report.append(f"{i}. {warning}\n")
            report.append("\n")
        
        # Statistics
        report.append("## 📊 Statistics\n")
        report.append(f"- Specification files loaded: {len(self.specs)}\n")
        report.append(f"- Registry files loaded: {len(self.registries)}\n")
        report.append(f"- Root files validated: {len(self.root_files)}\n")
        
        return "".join(report)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def main():
    """Main entry point"""
    validator = RootSpecsValidator()
    
    print("🚀 Starting Root Layer Specifications Validation...\n")
    
    errors, warnings = validator.validate_all()
    
    print("\n" + "="*60)
    print("📋 Validation Complete!")
    print("="*60)
    
    report = validator.generate_report()
    print(report)
    
    # Write report to file
    report_file = Path("root-specs-validation-report.md")
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"\n📄 Report saved to: {report_file}")
    
    # Exit with appropriate code
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()