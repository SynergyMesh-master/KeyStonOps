"""
Bridges package initialization.

Provides a namespaced alias for the language-islands package (stored with a hyphenated
directory name) so it can be imported as bridges.language_islands.
"""

import importlib.util
import sys
from pathlib import Path

_pkg_root = Path(__file__).parent
_hyphen_pkg = _pkg_root / "language-islands"
language_islands = None

if (_hyphen_pkg / "__init__.py").exists():
    spec = importlib.util.spec_from_file_location(
        f"{__name__}.language_islands",
        _hyphen_pkg / "__init__.py",
        submodule_search_locations=[str(_hyphen_pkg)]
    )
    if spec is not None and spec.loader is not None:
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        language_islands = module
__all__ = ["language_islands"]
