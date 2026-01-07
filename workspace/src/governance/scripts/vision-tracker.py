#!/usr/bin/env python3
"""
Vision Tracker - INSTANT Execution Standard Validator

Purpose: Validate compliance with INSTANT execution standards:
  - latency_compliance: Check if operations meet latency thresholds
  - parallelism_level: Verify agent parallelism configuration
  - autonomy_degree: Validate human intervention is zero

Usage:
    python governance/scripts/vision-tracker.py
    python governance/scripts/vision-tracker.py --config pipeline-config.yaml
    python governance/scripts/vision-tracker.py --verbose
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


class VisionTracker:
    """Tracks and validates INSTANT execution standards compliance."""
    
    # Default latency thresholds (in ms)
    DEFAULT_THRESHOLDS = {
        'instant': 100,
        'fast': 500,
        'standard': 5000,
        'maxStage': 30000,
        'maxTotal': 180000
    }
    
    # Minimum parallelism requirements
    MIN_AGENTS = 64
    RECOMMENDED_AGENTS = 128
    MAX_AGENTS = 256
    
    def __init__(self, config_path: Optional[str] = None, verbose: bool = False):
        self.verbose = verbose
        self.config_path = config_path
        self.results: Dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
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
        self.log("No config file found, using default thresholds", 'warning')
        self.config = {
            'spec': {
                'latencyThresholds': self.DEFAULT_THRESHOLDS,
                'coreScheduling': {
                    'minParallelAgents': self.MIN_AGENTS,
                    'maxParallelAgents': self.MAX_AGENTS
                }
            },
            'metadata': {
                'labels': {
                    'humanIntervention': '0'
                }
            }
        }
        return True
        
    def check_latency_compliance(self) -> Dict[str, Any]:
        """Check if latency thresholds are properly configured."""
        check = {
            'name': 'latency_compliance',
            'passed': True,
            'details': []
        }
        
        thresholds = self.config.get('spec', {}).get('latencyThresholds', self.DEFAULT_THRESHOLDS)
        
        # Validate instant threshold
        instant = thresholds.get('instant', 0)
        if instant <= 100:
            check['details'].append({
                'criterion': 'instant_threshold',
                'value': instant,
                'target': '<=100ms',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'instant_threshold',
                'value': instant,
                'target': '<=100ms',
                'status': 'FAIL'
            })
            
        # Validate max total latency
        max_total = thresholds.get('maxTotal', 0)
        if max_total <= 180000:
            check['details'].append({
                'criterion': 'max_total_latency',
                'value': max_total,
                'target': '<=180000ms (3min)',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'max_total_latency',
                'value': max_total,
                'target': '<=180000ms (3min)',
                'status': 'FAIL'
            })
            
        # Validate stage latency
        max_stage = thresholds.get('maxStage', 0)
        if max_stage <= 30000:
            check['details'].append({
                'criterion': 'max_stage_latency',
                'value': max_stage,
                'target': '<=30000ms (30s)',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'max_stage_latency',
                'value': max_stage,
                'target': '<=30000ms (30s)',
                'status': 'FAIL'
            })
            
        return check
        
    def check_parallelism_level(self) -> Dict[str, Any]:
        """Check if parallelism configuration meets requirements."""
        check = {
            'name': 'parallelism_level',
            'passed': True,
            'details': []
        }
        
        scheduling = self.config.get('spec', {}).get('coreScheduling', {})
        
        # Check minimum agents
        min_agents = scheduling.get('minParallelAgents', 0)
        if min_agents >= self.MIN_AGENTS:
            check['details'].append({
                'criterion': 'min_parallel_agents',
                'value': min_agents,
                'target': f'>={self.MIN_AGENTS}',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'min_parallel_agents',
                'value': min_agents,
                'target': f'>={self.MIN_AGENTS}',
                'status': 'FAIL'
            })
            
        # Check maximum agents
        max_agents = scheduling.get('maxParallelAgents', 0)
        if max_agents >= self.RECOMMENDED_AGENTS:
            check['details'].append({
                'criterion': 'max_parallel_agents',
                'value': max_agents,
                'target': f'>={self.RECOMMENDED_AGENTS}',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'max_parallel_agents',
                'value': max_agents,
                'target': f'>={self.RECOMMENDED_AGENTS}',
                'status': 'FAIL'
            })
            
        # Check auto-scaling
        auto_scaling = scheduling.get('autoScaling', {})
        if auto_scaling.get('enabled', False):
            check['details'].append({
                'criterion': 'auto_scaling',
                'value': 'enabled',
                'target': 'enabled',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'auto_scaling',
                'value': 'disabled',
                'target': 'enabled',
                'status': 'WARNING'
            })
            
        return check
        
    def check_autonomy_degree(self) -> Dict[str, Any]:
        """Check if system operates with zero human intervention."""
        check = {
            'name': 'autonomy_degree',
            'passed': True,
            'details': []
        }
        
        # Check metadata for human intervention setting
        metadata = self.config.get('metadata', {})
        labels = metadata.get('labels', {})
        human_intervention = labels.get('humanIntervention', '1')
        
        if str(human_intervention) == '0':
            check['details'].append({
                'criterion': 'human_intervention',
                'value': human_intervention,
                'target': '0',
                'status': 'PASS'
            })
        else:
            check['passed'] = False
            check['details'].append({
                'criterion': 'human_intervention',
                'value': human_intervention,
                'target': '0',
                'status': 'FAIL'
            })
            
        # Check execution mode
        mode = metadata.get('mode', '')
        if 'Autonomous' in str(mode) or 'instant' in str(mode).lower():
            check['details'].append({
                'criterion': 'execution_mode',
                'value': mode,
                'target': 'Autonomous/INSTANT',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'execution_mode',
                'value': mode or 'not specified',
                'target': 'Autonomous/INSTANT',
                'status': 'WARNING'
            })
            
        # Check for auto-healing
        auto_healing = self.config.get('spec', {}).get('autoHealing', {})
        if auto_healing.get('enabled', False):
            check['details'].append({
                'criterion': 'auto_healing',
                'value': 'enabled',
                'target': 'enabled',
                'status': 'PASS'
            })
        else:
            check['details'].append({
                'criterion': 'auto_healing',
                'value': 'disabled',
                'target': 'enabled',
                'status': 'WARNING'
            })
            
        return check
        
    def validate(self) -> bool:
        """Run all validation checks."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
        print("Vision Tracker - INSTANT Execution Standard Validator")
        print(f"{'='*70}{Colors.ENDC}\n")
        
        if not self.load_config():
            return False
            
        # Run checks
        print(f"\n{Colors.BOLD}[1/3] Checking latency compliance...{Colors.ENDC}")
        latency_check = self.check_latency_compliance()
        self.results['checks'].append(latency_check)
        if latency_check['passed']:
            self.log("Latency compliance: PASSED", 'success')
        else:
            self.log("Latency compliance: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[2/3] Checking parallelism level...{Colors.ENDC}")
        parallelism_check = self.check_parallelism_level()
        self.results['checks'].append(parallelism_check)
        if parallelism_check['passed']:
            self.log("Parallelism level: PASSED", 'success')
        else:
            self.log("Parallelism level: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[3/3] Checking autonomy degree...{Colors.ENDC}")
        autonomy_check = self.check_autonomy_degree()
        self.results['checks'].append(autonomy_check)
        if autonomy_check['passed']:
            self.log("Autonomy degree: PASSED", 'success')
        else:
            self.log("Autonomy degree: FAILED", 'error')
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
            print(f"{Colors.OKGREEN}{Colors.BOLD}✅ VALIDATION PASSED{Colors.ENDC}\n")
        else:
            print(f"{Colors.FAIL}{Colors.BOLD}❌ VALIDATION FAILED{Colors.ENDC}\n")
            
    def get_results_json(self) -> str:
        """Return results as JSON string."""
        return json.dumps(self.results, indent=2)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Vision Tracker - INSTANT Execution Standard Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python vision-tracker.py
  python vision-tracker.py --config pipeline-config.yaml
  python vision-tracker.py --verbose --output results.json
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
    tracker = VisionTracker(config_path=args.config, verbose=args.verbose)
    success = tracker.validate()
    
    # Output results if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(tracker.get_results_json())
        print(f"Results written to {args.output}")
        
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
