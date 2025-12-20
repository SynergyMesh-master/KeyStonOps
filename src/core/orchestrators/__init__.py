"""
Orchestrators Module - 協調器模組

提供統一的系統協調和管理功能：
- 基礎協調器 (SynergyMeshOrchestrator)
- 島嶼協調器 (LanguageIslandOrchestrator)
- 企業級協調器 (EnterpriseSynergyMeshOrchestrator)
- 依賴解析 (DependencyResolver)
"""

import importlib.util
import sys
from pathlib import Path

# ===== 工具函數：動態導入 kebab-case 模塊 =====
def _import_kebab_module(module_alias: str, file_name: str, legacy_alias: str | None = None):
    """
    動態導入 kebab-case 的 Python 模塊並註冊命名空間別名。

    參數說明：
    - module_alias:
        以底線（underscore）為分隔的簡短模塊別名，例如
        "synergy_mesh_orchestrator"。這不是完整的模塊路徑，
        而是會作為末端名稱附加在目前套件名稱（__name__）後，
        共同組成 qualified_name。
    - file_name:
        實際的檔案名稱（通常為 kebab-case，例如
        "synergy-mesh-orchestrator.py"），用來定位要載入的檔案。
    - legacy_alias:
        可選的舊有匯入別名（通常為頂層名稱，例如
        "synergy_mesh_orchestrator"），若提供則會額外在
        sys.modules[legacy_alias] 中註冊同一個模塊，以維持向後相容。

    名稱關係：
    - qualified_name:
        由當前模塊名稱 __name__ 與 module_alias 組成，
        形如 f"{__name__}.{module_alias}"，並註冊於
        sys.modules[qualified_name] 中，作為新的命名空間路徑。
    - module_alias:
        僅代表 qualified_name 的最後一段（underscore 形式），
        不包含上層套件路徑。
    - legacy_alias:
        若指定，則為額外的頂層匯入路徑（不包含 __name__ 前綴），
        與 qualified_name 指向同一個已載入的模塊物件。

    返回值：
        成功載入時返回動態載入的模塊物件；載入失敗時返回 None。
    """
    module_path = Path(__file__).parent / file_name
    if not module_path.exists():
        return None
    qualified_name = f"{__name__}.{module_alias}"
    spec = importlib.util.spec_from_file_location(qualified_name, module_path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        sys.modules[qualified_name] = module
        if legacy_alias:
            sys.modules[legacy_alias] = module
        try:
            spec.loader.exec_module(module)
        except Exception:
            # Clear partially-initialized modules from cache on failure
            if qualified_name in sys.modules:
                del sys.modules[qualified_name]
            if legacy_alias and legacy_alias in sys.modules:
                del sys.modules[legacy_alias]
            raise
        return module
    return None

# ===== 基礎協調器 =====
synergy_mesh = _import_kebab_module("synergy_mesh_orchestrator", "synergy-mesh-orchestrator.py", legacy_alias="synergy_mesh_orchestrator")
if synergy_mesh:
    SynergyMeshOrchestrator = synergy_mesh.SynergyMeshOrchestrator
    ExecutionResult = synergy_mesh.ExecutionResult
    SystemStatus = synergy_mesh.SystemStatus
    ExecutionStatus = synergy_mesh.ExecutionStatus
    ComponentType = synergy_mesh.ComponentType
else:
    raise ImportError("Failed to import synergy-mesh-orchestrator.py")

# ===== 企業級協調器 =====
enterprise_mesh = _import_kebab_module("enterprise_synergy_mesh_orchestrator", "enterprise-synergy-mesh-orchestrator.py", legacy_alias="enterprise_synergy_mesh_orchestrator")
if enterprise_mesh:
    EnterpriseSynergyMeshOrchestrator = enterprise_mesh.EnterpriseSynergyMeshOrchestrator
    TenantConfig = enterprise_mesh.TenantConfig
    TenantTier = enterprise_mesh.TenantTier
    ResourceQuota = enterprise_mesh.ResourceQuota
    RetryPolicy = enterprise_mesh.RetryPolicy
    AuditLog = enterprise_mesh.AuditLog
else:
    raise ImportError("Failed to import enterprise-synergy-mesh-orchestrator.py")

# ===== 依賴解析 =====
dependency_resolver = _import_kebab_module("dependency_resolver", "dependency-resolver.py", legacy_alias="dependency_resolver")
if dependency_resolver:
    DependencyResolver = dependency_resolver.DependencyResolver
    DependencyNode = dependency_resolver.DependencyNode
    ExecutionPhase = dependency_resolver.ExecutionPhase
else:
    raise ImportError("Failed to import dependency-resolver.py")

# ===== 島嶼協調器 =====
language_island_orchestrator = _import_kebab_module(
    "language_island_orchestrator",
    "language-island-orchestrator.py",
    legacy_alias="language_island_orchestrator"
)
if language_island_orchestrator:
    LanguageIslandOrchestrator = language_island_orchestrator.LanguageIslandOrchestrator
else:
    raise ImportError("Failed to import language-island-orchestrator.py")


__all__ = [
    # 基礎
    "SynergyMeshOrchestrator",
    "LanguageIslandOrchestrator",
    "ExecutionResult",
    "SystemStatus",
    "ExecutionStatus",
    "ComponentType",

    # 企業級
    "EnterpriseSynergyMeshOrchestrator",
    "TenantConfig",
    "TenantTier",
    "ResourceQuota",
    "RetryPolicy",
    "AuditLog",

    # 依賴管理
    "DependencyResolver",
    "DependencyNode",
    "ExecutionPhase"
]
