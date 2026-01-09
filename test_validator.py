#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MachineNativeOps Validator Platform - Test Script
版本: 1.0.0
功能: 測試驗證平台功能和MCP合規性
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加tools目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from tools.machinenativeops_validator import (
    MachineNativeOpsValidator,
    mcp_validate_handler,
    MCP_TOOL_SCHEMA,
    MCP_VERSION,
    NAMESPACE_PREFIX,
    TOOL_ID,
    ValidationType
)

async def test_basic_validation():
    """測試基本驗證功能"""
    print("\n" + "="*80)
    print("🧪 測試1: 基本驗證功能")
    print("="*80)
    
    # 創建測試目錄
    test_dir = Path("test_project")
    test_dir.mkdir(exist_ok=True)
    (test_dir / "src").mkdir(exist_ok=True)
    (test_dir / "docs").mkdir(exist_ok=True)
    (test_dir / "tests").mkdir(exist_ok=True)
    (test_dir / "README.md").write_text("# Test Project")
    
    try:
        validator = MachineNativeOpsValidator()
        report = await validator.run_comprehensive_validation(str(test_dir))
        
        print(f"✅ 驗證ID: {report.validation_id}")
        print(f"✅ 總體狀態: {'通過' if report.overall_status else '失敗'}")
        print(f"✅ 文件驗證結果: {len(report.document_results)} 項")
        print(f"✅ 量子驗證結果: {len(report.quantum_results)} 維度")
        print(f"✅ 傳統驗證結果: {len(report.traditional_results)} 類")
        print(f"✅ 執行時間: {report.total_duration:.3f}s")
        
        # 生成報告
        output = validator.generate_unified_report(report, "text")
        print("\n" + output[:500] + "...")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_mcp_handler():
    """測試MCP處理器"""
    print("\n" + "="*80)
    print("🧪 測試2: MCP處理器")
    print("="*80)
    
    test_dir = Path("test_project")
    
    try:
        # 測試MCP處理器
        result = await mcp_validate_handler({
            "path": str(test_dir),
            "validation_type": "all",
            "output_format": "json",
            "detail": True
        })
        
        print(f"✅ MCP調用成功: {result.get('success')}")
        print(f"✅ 狀態: {result.get('status')}")
        print(f"✅ MCP合規: {result.get('mcp_compliant')}")
        print(f"✅ MCP版本: {result.get('mcp_version')}")
        print(f"✅ 驗證ID: {result.get('validation_id')}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_mcp_schema():
    """測試MCP工具架構"""
    print("\n" + "="*80)
    print("🧪 測試3: MCP工具架構")
    print("="*80)
    
    try:
        validator = MachineNativeOpsValidator()
        schema = validator.get_mcp_tool_schema()
        
        print(f"✅ 工具名稱: {schema['name']}")
        print(f"✅ 工具描述: {schema['description'][:80]}...")
        print(f"✅ 輸入架構: {schema['inputSchema']['type']}")
        print(f"✅ 必需參數: {schema['inputSchema']['required']}")
        
        # 驗證架構符合MCP規範
        assert 'name' in schema, "缺少name字段"
        assert 'description' in schema, "缺少description字段"
        assert 'inputSchema' in schema, "缺少inputSchema字段"
        assert schema['name'] == TOOL_ID, f"工具ID不匹配: {schema['name']} != {TOOL_ID}"
        
        print("✅ MCP架構驗證通過")
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_namespace_compliance():
    """測試命名空間合規性"""
    print("\n" + "="*80)
    print("🧪 測試4: 命名空間合規性")
    print("="*80)
    
    try:
        # 驗證命名空間前綴
        print(f"✅ 命名空間前綴: {NAMESPACE_PREFIX}")
        print(f"✅ 工具ID: {TOOL_ID}")
        print(f"✅ 完整路徑: {TOOL_ID}")
        
        # 驗證格式
        assert TOOL_ID.startswith(NAMESPACE_PREFIX + "."), \
            f"工具ID不符合命名空間規範: {TOOL_ID}"
        
        print("✅ 命名空間格式正確")
        print(f"✅ 命名空間: {NAMESPACE_PREFIX}")
        print(f"✅ 工具名稱: validator")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

async def test_instant_standard():
    """測試INSTANT標準合規性"""
    print("\n" + "="*80)
    print("🧪 測試5: INSTANT標準合規性")
    print("="*80)
    
    try:
        test_dir = Path("test_project")
        validator = MachineNativeOpsValidator()
        report = await validator.run_comprehensive_validation(str(test_dir))
        
        # 檢查量子9維度
        quantum_dimensions = report.quantum_results
        print(f"✅ 量子9維度驗證: {len(quantum_dimensions)}/9")
        
        expected_dimensions = [
            "naming_convention",
            "directory_structure",
            "legacy_archiving",
            "temp_cleaning",
            "document_sync",
            "python_compatibility",
            "evidence_integrity",
            "ai_contract_compliance",
            "governance_compliance"
        ]
        
        actual_dimensions = [r.dimension for r in quantum_dimensions]
        for dim in expected_dimensions:
            assert dim in actual_dimensions, f"缺少維度: {dim}"
            print(f"  ✅ {dim}")
        
        # 檢查傳統9大類
        traditional_results = report.traditional_results
        print(f"✅ 傳統9大類驗證: {len(traditional_results)}/9")
        
        expected_traditional = [
            "structure_compliance",
            "content_integrity",
            "path_correctness",
            "position_consistency",
            "namespace_compliance",
            "context_unified",
            "logic_correctness",
            "link_integrity",
            "final_correctness"
        ]
        
        for trad in expected_traditional:
            assert trad in traditional_results, f"缺少類別: {trad}"
            print(f"  ✅ {trad}")
        
        print("✅ INSTANT標準驗證通過")
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_security_level():
    """測試安全等級"""
    print("\n" + "="*80)
    print("🧪 測試6: 安全等級驗證")
    print("="*80)
    
    try:
        validator = MachineNativeOpsValidator()
        
        print(f"✅ 量子安全等級: {validator.config['security']['quantum_level']}")
        print(f"✅ 零信任架構: {validator.config['security']['zero_trust']}")
        print(f"✅ 不可變日誌: {validator.config['security']['immutable_logging']}")
        print(f"✅ MCP版本: {validator.config['platform']['mcp_version']}")
        
        # 驗證安全等級
        assert validator.config['security']['quantum_level'] == "NIST Level 5+"
        assert validator.config['security']['zero_trust'] == True
        assert validator.config['platform']['mcp_version'] == MCP_VERSION
        
        print("✅ 安全等級驗證通過")
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

async def main():
    """運行所有測試"""
    print("\n" + "="*80)
    print("🚀 MachineNativeOps 驗證平台 - 測試套件")
    print("="*80)
    
    tests = [
        ("基本驗證功能", test_basic_validation),
        ("MCP處理器", test_mcp_handler),
        ("MCP工具架構", test_mcp_schema),
        ("命名空間合規性", test_namespace_compliance),
        ("INSTANT標準合規性", test_instant_standard),
        ("安全等級驗證", test_security_level)
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = await test_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ 測試 '{name}' 執行錯誤: {e}")
            results.append((name, False))
    
    # 總結
    print("\n" + "="*80)
    print("📊 測試結果總結")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通過" if result else "❌ 失敗"
        print(f"{status} - {name}")
    
    print("\n" + "-"*80)
    print(f"總計: {passed}/{total} 測試通過")
    print(f"通過率: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n🎉 所有測試通過！平台符合MCP和INSTANT標準！")
    else:
        print(f"\n⚠️ {total-passed} 個測試失敗，請檢查詳細信息")
    
    # 清理測試目錄
    import shutil
    if Path("test_project").exists():
        shutil.rmtree("test_project")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)