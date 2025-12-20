"""
Language Islands Configuration

島嶼配置管理模組
"""

import importlib.util
import sys
from pathlib import Path

_module_path = Path(__file__).parent / 'island-config.py'
_qualified_name = 'bridges.language_islands.config.island_config'

if not _module_path.exists():
    raise ImportError(f"Module file not found: {_module_path}")

spec = importlib.util.spec_from_file_location(_qualified_name, _module_path)
if spec and spec.loader:
    _module = importlib.util.module_from_spec(spec)
    sys.modules[_qualified_name] = _module
    spec.loader.exec_module(_module)
    IslandConfig = _module.IslandConfig
else:
    raise ImportError(f"Could not load island-config.py from {_module_path}")

__all__ = [
    "IslandConfig",
]
