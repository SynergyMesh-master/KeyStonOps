"""
MachineNativeOps Tools Package
MCP Compliant Tool Registry
"""

from .machinenativeops_validator import (
    MachineNativeOpsValidator,
    mcp_validate_handler,
    MCP_TOOL_SCHEMA as VALIDATOR_SCHEMA,
    MCP_VERSION,
    NAMESPACE_PREFIX,
    TOOL_ID as VALIDATOR_ID
)

from .cicd_analyzer import (
    MachineNativeOpsCICDAnalyzer,
    mcp_cicd_analyze_handler,
    MCP_TOOL_SCHEMA as CICD_ANALYZER_SCHEMA,
    TOOL_ID as CICD_ANALYZER_ID
)

__version__ = "1.0.0"
__all__ = [
    "MachineNativeOpsValidator",
    "mcp_validate_handler",
    "MachineNativeOpsCICDAnalyzer",
    "mcp_cicd_analyze_handler",
    "VALIDATOR_SCHEMA",
    "CICD_ANALYZER_SCHEMA",
    "MCP_VERSION",
    "NAMESPACE_PREFIX",
    "VALIDATOR_ID",
    "CICD_ANALYZER_ID"
]

# MCP Tool Registry
MCP_TOOLS = {
    VALIDATOR_ID: {
        "handler": mcp_validate_handler,
        "schema": VALIDATOR_SCHEMA,
        "description": "MachineNativeOps 統一驗證平台 - 企業級文件結構驗證與INSTANT觸發器驗證工具",
        "version": __version__,
        "namespace": NAMESPACE_PREFIX,
        "category": "validation"
    },
    CICD_ANALYZER_ID: {
        "handler": mcp_cicd_analyze_handler,
        "schema": CICD_ANALYZER_SCHEMA,
        "description": "MachineNativeOps CI/CD 分析平台 - 企業級持續集成分析工具，包括代碼質量、構建性能、依賴分析、安全掃描和測試覆蓋率",
        "version": __version__,
        "namespace": NAMESPACE_PREFIX,
        "category": "analysis"
    }
}

def get_tool(tool_id: str):
    """獲取MCP工具"""
    return MCP_TOOLS.get(tool_id)

def list_tools():
    """列出所有MCP工具"""
    return list(MCP_TOOLS.keys())

def get_all_tools():
    """獲取所有MCP工具"""
    return MCP_TOOLS

def get_tools_by_category(category: str):
    """按類別獲取工具"""
    return {k: v for k, v in MCP_TOOLS.items() if v.get("category") == category}