#!/usr/bin/env python3
"""
Latency Monitor - Real-time latency compliance validator

Purpose: Validate latency compliance for INSTANT execution:
  - all_stages_within_threshold: Check each stage meets its latency target
  - total_latency_compliant: Verify total pipeline latency
  - no_bottlenecks: Detect potential bottleneck stages

Usage:
    python governance/scripts/latency-monitor.py
    python governance/scripts/latency-monitor.py --config pipeline-config.yaml
    python governance/scripts/latency-monitor.py --verbose
"""

import os
import sys
import yaml
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

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


class LatencyMonitor:
    """Monitors and validates latency compliance for INSTANT execution."""
    
    # Default latency thresholds (in ms)
    DEFAULT_THRESHOLDS = {
        'instant': 100,
        'fast': 500,
        'standard': 5000,
        'maxStage': 30000,
        'maxTotal': 180000
    }
    
    def __init__(self, config_path: Optional[str] = None, verbose: bool = False):
        self.verbose = verbose
        self.config_path = config_path
        self.results: Dict[str, Any] = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'standard': 'LATENCY_COMPLIANCE',
            'checks': [],
            'passed': True,
            'score': 100,
            'bottlenecks': []
        }
        self.config: Dict = {}
        self.thresholds: Dict = {}
        
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
                    
                    # Load thresholds
                    self.thresholds = self.config.get('spec', {}).get(
                        'latencyThresholds', self.DEFAULT_THRESHOLDS
                    )
                    return True
                except Exception as e:
                    self.log(f"Failed to load {path}: {e}", 'warning')
                    
        # Use default configuration if no file found
        self.log("No config file found, using default thresholds", 'warning')
        self.thresholds = self.DEFAULT_THRESHOLDS
        return True
        
    def parse_latency_string(self, latency_str: str) -> int:
        """Parse latency string like '<=30s' or '<=1000ms' to milliseconds."""
        if isinstance(latency_str, (int, float)):
            return int(latency_str)
            
        s = str(latency_str).strip().replace('<=', '').replace('<', '')
        
        # Parse time units
        if s.endswith('ms'):
            return int(s[:-2])
        elif s.endswith('s'):
            return int(float(s[:-1]) * 1000)
        elif s.endswith('m'):
            return int(float(s[:-1]) * 60000)
        else:
            try:
                return int(s)
            except ValueError:
                return 0
                
    def check_all_stages_within_threshold(self) -> Dict[str, Any]:
        """Check if all pipeline stages meet their latency thresholds."""
        check = {
            'name': 'all_stages_within_threshold',
            'passed': True,
            'details': []
        }
        
        max_stage_latency = self.thresholds.get('maxStage', 30000)
        
        # Check regular pipelines
        pipelines = self.config.get('spec', {}).get('pipelines', [])
        for pipeline in pipelines:
            name = pipeline.get('name', 'unknown')
            latency = pipeline.get('latency', 0)
            
            if latency <= max_stage_latency:
                check['details'].append({
                    'criterion': f'pipeline_{name}_latency',
                    'value': f'{latency}ms',
                    'target': f'<={max_stage_latency}ms',
                    'status': 'PASS'
                })
            else:
                check['passed'] = False
                check['details'].append({
                    'criterion': f'pipeline_{name}_latency',
                    'value': f'{latency}ms',
                    'target': f'<={max_stage_latency}ms',
                    'status': 'FAIL'
                })
                
        # Check instant pipeline stages
        instant_pipelines = self.config.get('spec', {}).get('instantPipelines', [])
        for pipeline in instant_pipelines:
            pipeline_name = pipeline.get('name', 'unknown')
            stages = pipeline.get('stages', [])
            
            for stage in stages:
                stage_name = stage.get('name', 'unknown')
                latency = stage.get('latency', 0)
                
                if latency <= max_stage_latency:
                    check['details'].append({
                        'criterion': f'{pipeline_name}_{stage_name}_latency',
                        'value': f'{latency}ms',
                        'target': f'<={max_stage_latency}ms',
                        'status': 'PASS'
                    })
                else:
                    check['passed'] = False
                    check['details'].append({
                        'criterion': f'{pipeline_name}_{stage_name}_latency',
                        'value': f'{latency}ms',
                        'target': f'<={max_stage_latency}ms',
                        'status': 'FAIL'
                    })
                    
        return check
        
    def check_total_latency_compliant(self) -> Dict[str, Any]:
        """Check if total pipeline latency meets the threshold."""
        check = {
            'name': 'total_latency_compliant',
            'passed': True,
            'details': []
        }
        
        max_total = self.thresholds.get('maxTotal', 180000)
        
        # Check instant pipelines total latency
        instant_pipelines = self.config.get('spec', {}).get('instantPipelines', [])
        for pipeline in instant_pipelines:
            name = pipeline.get('name', 'unknown')
            target_latency = pipeline.get('totalLatencyTarget', 0)
            
            # Calculate actual total from stages
            stages = pipeline.get('stages', [])
            actual_total = sum(stage.get('latency', 0) for stage in stages)
            
            # Check against configured target
            if target_latency > 0:
                if actual_total <= target_latency:
                    check['details'].append({
                        'criterion': f'{name}_total_vs_target',
                        'value': f'{actual_total}ms',
                        'target': f'<={target_latency}ms',
                        'status': 'PASS'
                    })
                else:
                    check['passed'] = False
                    check['details'].append({
                        'criterion': f'{name}_total_vs_target',
                        'value': f'{actual_total}ms',
                        'target': f'<={target_latency}ms',
                        'status': 'FAIL'
                    })
                    
            # Check against global max
            if actual_total <= max_total:
                check['details'].append({
                    'criterion': f'{name}_total_vs_global_max',
                    'value': f'{actual_total}ms',
                    'target': f'<={max_total}ms (3min)',
                    'status': 'PASS'
                })
            else:
                check['passed'] = False
                check['details'].append({
                    'criterion': f'{name}_total_vs_global_max',
                    'value': f'{actual_total}ms',
                    'target': f'<={max_total}ms (3min)',
                    'status': 'FAIL'
                })
                
        return check
        
    def check_no_bottlenecks(self) -> Dict[str, Any]:
        """Detect potential bottleneck stages."""
        check = {
            'name': 'no_bottlenecks',
            'passed': True,
            'details': []
        }
        
        bottlenecks: List[Dict[str, Any]] = []
        
        # Analyze instant pipelines for bottlenecks
        instant_pipelines = self.config.get('spec', {}).get('instantPipelines', [])
        for pipeline in instant_pipelines:
            pipeline_name = pipeline.get('name', 'unknown')
            stages = pipeline.get('stages', [])
            
            if not stages:
                continue
                
            # Calculate average latency
            total_latency = sum(stage.get('latency', 0) for stage in stages)
            avg_latency = total_latency / len(stages)
            
            # Find stages with latency > 2x average (potential bottlenecks)
            for stage in stages:
                stage_name = stage.get('name', 'unknown')
                latency = stage.get('latency', 0)
                parallelism = stage.get('parallelism', 1)
                
                # Check if this stage is a bottleneck
                is_bottleneck = latency > (avg_latency * 2) and latency > 5000
                
                if is_bottleneck:
                    bottleneck = {
                        'pipeline': pipeline_name,
                        'stage': stage_name,
                        'latency': latency,
                        'avg_latency': int(avg_latency),
                        'parallelism': parallelism,
                        'recommendation': self._get_bottleneck_recommendation(
                            latency, parallelism
                        )
                    }
                    bottlenecks.append(bottleneck)
                    check['details'].append({
                        'criterion': f'{pipeline_name}_{stage_name}_bottleneck',
                        'value': f'{latency}ms (avg: {int(avg_latency)}ms)',
                        'target': f'<={int(avg_latency * 2)}ms',
                        'status': 'WARNING'
                    })
                else:
                    check['details'].append({
                        'criterion': f'{pipeline_name}_{stage_name}_bottleneck',
                        'value': f'{latency}ms',
                        'target': f'<={int(avg_latency * 2)}ms',
                        'status': 'PASS'
                    })
                    
        self.results['bottlenecks'] = bottlenecks
        
        # Check passes if there are no critical bottlenecks
        # (stages that are > 3x average)
        critical_bottlenecks = [b for b in bottlenecks 
                               if b['latency'] > b['avg_latency'] * 3]
        if critical_bottlenecks:
            check['passed'] = False
            
        return check
        
    def _get_bottleneck_recommendation(self, latency: int, parallelism: int) -> str:
        """Generate optimization recommendation for a bottleneck."""
        recommendations = []
        
        if parallelism < 32:
            recommendations.append(f"Increase parallelism (current: {parallelism})")
        if latency > 20000:
            recommendations.append("Consider breaking into smaller stages")
        if latency > 15000:
            recommendations.append("Enable caching for this stage")
            
        return "; ".join(recommendations) if recommendations else "Monitor for optimization opportunities"
        
    def validate(self) -> bool:
        """Run all validation checks."""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}")
        print("Latency Monitor - Real-time Latency Compliance Validator")
        print(f"{'='*70}{Colors.ENDC}\n")
        
        if not self.load_config():
            return False
            
        # Print thresholds
        print(f"{Colors.BOLD}Configured Thresholds:{Colors.ENDC}")
        for name, value in self.thresholds.items():
            print(f"  - {name}: {value}ms")
        print()
            
        # Run checks
        print(f"\n{Colors.BOLD}[1/3] Checking all stages within threshold...{Colors.ENDC}")
        stages_check = self.check_all_stages_within_threshold()
        self.results['checks'].append(stages_check)
        if stages_check['passed']:
            self.log("All stages within threshold: PASSED", 'success')
        else:
            self.log("All stages within threshold: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[2/3] Checking total latency compliance...{Colors.ENDC}")
        total_check = self.check_total_latency_compliant()
        self.results['checks'].append(total_check)
        if total_check['passed']:
            self.log("Total latency compliance: PASSED", 'success')
        else:
            self.log("Total latency compliance: FAILED", 'error')
            self.results['passed'] = False
            
        print(f"\n{Colors.BOLD}[3/3] Checking for bottlenecks...{Colors.ENDC}")
        bottleneck_check = self.check_no_bottlenecks()
        self.results['checks'].append(bottleneck_check)
        if bottleneck_check['passed']:
            self.log("No critical bottlenecks: PASSED", 'success')
        else:
            self.log("Bottlenecks detected: WARNING", 'warning')
            
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
            
            # Group by pipeline for cleaner output
            if self.verbose:
                for detail in check['details']:
                    status_color = Colors.OKGREEN if detail['status'] == 'PASS' else \
                                  Colors.WARNING if detail['status'] == 'WARNING' else Colors.FAIL
                    print(f"  - {detail['criterion']}: {detail['value']} "
                          f"(target: {detail['target']}) "
                          f"[{status_color}{detail['status']}{Colors.ENDC}]")
                          
        # Print bottleneck recommendations
        if self.results['bottlenecks']:
            print(f"\n{Colors.WARNING}{Colors.BOLD}Bottleneck Recommendations:{Colors.ENDC}")
            for b in self.results['bottlenecks']:
                print(f"  {Colors.WARNING}⚡ {b['pipeline']}/{b['stage']}: "
                      f"{b['latency']}ms{Colors.ENDC}")
                print(f"     → {b['recommendation']}")
                      
        print(f"\n{Colors.BOLD}Score: {self.results['score']}/100{Colors.ENDC}")
        print(f"\n{Colors.BOLD}{'='*70}{Colors.ENDC}\n")
        
        if self.results['passed']:
            print(f"{Colors.OKGREEN}{Colors.BOLD}✅ LATENCY VALIDATION PASSED{Colors.ENDC}\n")
        else:
            print(f"{Colors.FAIL}{Colors.BOLD}❌ LATENCY VALIDATION FAILED{Colors.ENDC}\n")
            print(f"{Colors.WARNING}Action: auto-optimize{Colors.ENDC}\n")
            
    def get_results_json(self) -> str:
        """Return results as JSON string."""
        return json.dumps(self.results, indent=2)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Latency Monitor - Real-time Latency Compliance Validator',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python latency-monitor.py
  python latency-monitor.py --config pipeline-config.yaml
  python latency-monitor.py --verbose --output results.json
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
    monitor = LatencyMonitor(config_path=args.config, verbose=args.verbose)
    success = monitor.validate()
    
    # Output results if requested
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(monitor.get_results_json())
        print(f"Results written to {args.output}")
        
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
