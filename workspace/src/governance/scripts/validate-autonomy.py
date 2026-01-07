#!/usr/bin/env python3
"""
Autonomy Validator - Validates system autonomy levels

Purpose: Validate compliance with autonomy requirements:
  - human_intervention_count: Verify zero human intervention
  - auto_rollback_success: Check auto-rollback capability
  - self_healing_success: Validate self-healing mechanisms

Usage:
    python governance/scripts/validate-autonomy.py
    python governance/scripts/validate-autonomy.py --config pipeline-config.yaml
    python governance/scripts/validate-autonomy.py --verbose
"""

import os
import sys
import yaml
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class AutonomyValidator:
    """Validates system autonomy levels and capabilities."""
    
    def __init__(self, config_path: Optional[str] = None, verbose: bool = False):
        self.verbose = verbose
        self.config_path = config_path
        self.results: Dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'standard': 'AUTONOMY_LEVEL',
            'checks': [],
            'passed': True,
            'score': 100
        }
        self.config: Dict = {}
        
    def log(self, message: str, level: str = 'info') -> None:
        """Log message with appropriate color."""
        if level == 'error':
            print(f"{Colors.FAIL}❌ ERROR: {message}{Colors.ENDC}")
        elif level == 'warning':
            print(f"{Colors.WARNING}⚠️  WARNING: {message}{Colors.ENDC}")
        elif level == 'success':
            print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")
        elif level == 'info' and self.verbose:
            print(f"{Colors.OKBLUE}ℹ️  INFO: {message}{Colors.ENDC}")
            
    def load_config(self) -> bool:
        """Load pipeline configuration."""
        config_paths = [
            self.config_path,
            'workspace/mcp/namespace-mcp/pipelines/unified-pipeline-config.yaml',
            'contracts/INSTANT-EXECUTION-MANIFEST.yaml',
            'pipeline-config.yaml'
        ]
        
        for path in config_paths:
            if path and Path(path).exists():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        self.config = yaml.safe_load(f)
                    self.log(f"Loaded configuration from {path}", 'info')
                    return True
                except Exception as e:
                    self.log(f"Failed to load {path}: {e}", 'warning')
                    
        # Use default configuration if no file found
        self.log("No config file found, using minimal config", 'warning')
        self.config = {}
        return True
        
    def check_human_intervention_count(self) -> Dict[str, Any]:
        """Check if human intervention is set to zero."""
        check = {
            'name': 'human_intervention_count',
            'passed': True,
            'details': []
        }
        
        # Check metadata labels
        metadata = self.config.get('metadata', {})
        labels = metadata.get('labels', {})
        human_intervention = labels.get('humanIntervention', None)
        
        if human_intervention is not None:
            if str(human_intervention) == '0':
                check['details'].append({
                    'criterion': 'metadata_human_intervention',
                    'value': human_intervention,
                    'target': '0',
                    'status': 'PASS'
                })
            else:
                check['passed'] = False
                check['details'].append({
                    'criterion': 'metadata_human_intervention',
                    'value': human_intervention,
                    'target': '0',
                    'status': 'FAIL'
                })
        else:
            check['details'].append({
                'criterion': 'metadata_human_intervention',
                'value': 'not specified',
                'target': '0',
                'status': 'WARNING'
            })
            
        # Check instant pipelines
        instant_pipelines = self.config.get('spec', {}).get('instantPipelines', [])
        for pipeline in instant_pipelines:
            name = pipeline.get('name', 'unknown')
            hi = pipeline.get('humanIntervention', 1)
            if hi == 0:
                check['details'].append({
                    'criterion': f'pipeline_{name}_intervention',
                    'value': hi,
                    'target': '0',
                    'status': 'PASS'
                })
            else:
                check['passed'] = False
                check['details'].append({
                    'criterion': f'pipeline_{name}_intervention',
                    'value': hi,
                    'target': '0',
                    'status': 'FAIL'
                })
                
        return check
        
    def check_auto_rollback_success(self) -> Dict[str, Any]:
        """Check if auto-rollback is properly configured."""
        check = {
            'name': 'auto_rollback_success',
            'passed': True,
            'details': []
        }
        
        # Check auto-healing strategies
        auto_healing = self.config.get('spec', {}).get('autoHealing', {})
        
        if auto_healing.get('enabled', False):
            check['details'].append({
                'criterion': 'auto_healing_enabled',
                'value': 'true',
                'target': 'enabled',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'auto_healing_enabled',
                'value': 'false',
                'target': 'enabled',
                'status': 'FAIL'
            })
            
        # Check for rollback strategy
        strategies = auto_healing.get('strategies', [])
        has_rollback = False
        has_retry = False
        has_circuit_breaker = False
        
        for strategy in strategies:
            name = strategy.get('name', '')
            actions = strategy.get('actions', [])
            
            if 'rollback' in actions or 'fallback' in name.lower():
                has_rollback = True
            if 'retry' in actions or 'retry' in name.lower():
                has_retry = True
            if 'circuit' in name.lower() or 'open_circuit' in actions:
                has_circuit_breaker = True
                
        if has_rollback:
            check['details'].append({
                'criterion': 'rollback_strategy',
                'value': 'configured',
                'target': 'configured',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'rollback_strategy',
                'value': 'not configured',
                'target': 'configured',
                'status': 'FAIL'
            })
            
        if has_retry:
            check['details'].append({
                'criterion': 'retry_strategy',
                'value': 'configured',
                'target': 'configured',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'retry_strategy',
                'value': 'not configured',
                'target': 'configured',
                'status': 'WARNING'
            })
            
        if has_circuit_breaker:
            check['details'].append({
                'criterion': 'circuit_breaker',
                'value': 'configured',
                'target': 'configured',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'circuit_breaker',
                'value': 'not configured',
                'target': 'configured',
                'status': 'WARNING'
            })
            
        return check
        
    def check_self_healing_success(self) -> Dict[str, Any]:
        """Check if self-healing mechanisms are properly configured."""
        check = {
            'name': 'self_healing_success',
            'passed': True,
            'details': []
        }
        
        # Check auto-healing configuration
        auto_healing = self.config.get('spec', {}).get('autoHealing', {})
        
        if auto_healing.get('enabled', False):
            check['details'].append({
                'criterion': 'self_healing_enabled',
                'value': 'true',
                'target': 'enabled',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'self_healing_enabled',
                'value': 'false',
                'target': 'enabled',
                'status': 'FAIL'
            })
            
        # Check agent pool for auto-restart
        pool_config = self.config.get('spec', {}).get('agentPool', {}).get('poolConfig', {})
        
        if pool_config.get('autoRestart', False):
            check['details'].append({
                'criterion': 'agent_auto_restart',
                'value': 'enabled',
                'target': 'enabled',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'agent_auto_restart',
                'value': 'disabled',
                'target': 'enabled',
                'status': 'WARNING'
            })
            
        # Check health check interval
        health_check = pool_config.get('healthCheckInterval', 0)
        if health_check > 0 and health_check <= 10000:
            check['details'].append({
                'criterion': 'health_check_interval',
                'value': f'{health_check}ms',
                'target': '<=10000ms',
                'status': 'PASS'
            })
        elif health_check > 10000:
            check['details'].append({
                'criterion': 'health_check_interval',
                'value': f'{health_check}ms',
                'target': '<=10000ms',
                'status': 'WARNING'
            })
        else:
            check['details'].append({
                'criterion': 'health_check_interval',
                'value': 'not configured',
                'target': '<=10000ms',
                'status': 'WARNING'
            })
            
        # Check failure threshold
        failure_threshold = pool_config.get('failureThreshold', 0)
        if failure_threshold > 0 and failure_threshold <= 5:
            check['details'].append({
                'criterion': 'failure_threshold',
                'value': failure_threshold,
                'target': '<=5',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'failure_threshold',
                'value': failure_threshold or 'not configured',
                'target': '<=5',
                'status': 'WARNING'
            })
            
        return check
        
    def validate(self) -> bool:
        """Run all validation checks."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
        print("Autonomy Validator - System Autonomy Level Checker")
        print(f"{'='*70}{Colors.ENDC}\n")
        
        if not self.load_config():
            return False
            
        # Run checks
        print(f"\n{Colors.BOLD}[1/3] Checking human intervention count...{Colors.ENDC}")
        intervention_check = self.check_human_intervention_count()
        self.results['checks'].append(intervention_check)
        if intervention_check['passed']:
            self.log("Human intervention count: PASSED", 'success')
        else:
            self.log("Human intervention count: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[2/3] Checking auto-rollback capability...{Colors.ENDC}")
        rollback_check = self.check_auto_rollback_success()
        self.results['checks'].append(rollback_check)
        if rollback_check['passed']:
            self.log("Auto-rollback capability: PASSED", 'success')
        else:
            self.log("Auto-rollback capability: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[3/3] Checking self-healing mechanisms...{Colors.ENDC}")
        healing_check = self.check_self_healing_success()
        self.results['checks'].append(healing_check)
        if healing_check['passed']:
            self.log("Self-healing mechanisms: PASSED", 'success')
        else:
            self.log("Self-healing mechanisms: FAILED", 'error')
            self.results['passed'] = False
            
        # Calculate score
        passed_checks = sum(1 for c in self.results['checks'] if c['passed'])
        self.results['score'] = int((passed_checks / len(self.results['checks'])) * 100)
        
        # Print summary
        self.print_summary()
        
        return self.results['passed']
        
    def print_summary(self) -> None:
        """Print validation summary."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
        print("Validation Summary")
        print(f"{'='*70}{Colors.ENDC}\n")
        
        for check in self.results['checks']:
            status = "✅ PASS" if check['passed'] else "❌ FAIL"
            print(f"{Colors.BOLD}{check['name']}: {status}{Colors.ENDC}")
            for detail in check['details']:
                status_color = Colors.OKGREEN if detail['status'] == 'PASS' else \
                              Colors.WARNING if detail['status'] == 'WARNING' else Colors.FAIL
                print(f"  - {detail['criterion']}: {detail['value']} "
                      f"(target: {detail['target']}) "
                      f"[{status_color}{detail['status']}{Colors.ENDC}]")
                      
        print(f"\n{Colors.BOLD}Score: {self.results['score']}/100{Colors.ENDC}")
        print(f"\n{Colors.BOLD}{'='*70}{Colors.ENDC}\n")
        
        if self.results['passed']:
            print(f"{Colors.OKGREEN}{Colors.BOLD}✅ AUTONOMY VALIDATION PASSED{Colors.ENDC}\n")
        else:
            print(f"{Colors.FAIL}{Colors.BOLD}❌ AUTONOMY VALIDATION FAILED{Colors.ENDC}\n")
            print(f"{Colors.WARNING}Action: escalate-to-governance{Colors.ENDC}\n")
            
    def get_results_json(self) -> str:
        """Return results as JSON string."""
        return json.dumps(self.results, indent=2)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Autonomy Validator - System Autonomy Level Checker',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate-autonomy.py
  python validate-autonomy.py --config pipeline-config.yaml
  python validate-autonomy.py --verbose --output results.json
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        help='Path to pipeline configuration file'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose output'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output results to JSON file'
    )
    
    args = parser.parse_args()
    
    # Run validation
    validator = AutonomyValidator(config_path=args.config, verbose=args.verbose)
    success = validator.validate()
    
    # Output results if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(validator.get_results_json())
        print(f"Results written to {args.output}")
        
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
