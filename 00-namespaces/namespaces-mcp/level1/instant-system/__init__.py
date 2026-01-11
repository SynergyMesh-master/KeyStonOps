"""
INSTANT System - 即時架構核心系統
實現零延遲、全自動化、無報告輸出的架構模式
"""

from .core import InstantArchitectureEngine
from .validator import InstantValidator
from .deployer import InstantDeployer

__version__ = "1.0.0"
__engine__ = "INSTANT"

class InstantSystem:
    """即時架構系統主類"""
    
    def __init__(self):
        self.engine = InstantArchitectureEngine()
        self.validator = InstantValidator()
        self.deployer = InstantDeployer()
        
    def execute_instant(self, config):
        """即時執行架構"""
        # 1. 即時解析需求
        architecture = self.engine.parse_and_build(config)
        
        # 2. 即時驗證
        self.validator.validate(architecture)
        
        # 3. 即時部署
        return self.deployer.deploy(architecture)