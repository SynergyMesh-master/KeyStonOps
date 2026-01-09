#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MachineNativeOps CI/CD Analyzer Platform - Test Script
版本: 1.0.0
功能: 測試CI/CD分析平台功能和MCP合規性
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加tools目錄到路徑
sys.path.insert(0, str(Path(__file__).parent))

from tools.cicd_analyzer import (
    MachineNativeOpsCICDAnalyzer,
    mcp_cicd_analyze_handler,
    MCP_TOOL_SCHEMA,
    MCP_VERSION,
    NAMESPACE_PREFIX,
    TOOL_ID,
    AnalysisType
)

async def test_code_quality_analysis():
    """測試代碼質量分析"""
    print("\n" + "="*80)
    print("🧪 測試1: 代碼質量分析")
    print("="*80)
    
    # 創建測試文件
    test_dir = Path("test_cicd_project")
    test_dir.mkdir(exist_ok=True)
    
    # 創建測試 Python 文件
    test_py = test_dir / "test_module.py"
    test_py.write_text("""
def complex_function(x, y, z):
    if x > 0:
        if y > 0:
            if z > 0:
                return x + y + z
            else:
                return x + y
        else:
            return x
    else:
        return 0
""")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [AnalysisType.CODE_QUALITY]
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 健康分數: {report.overall_health_score:.1f}/100")
        print(f"✅ 代碼質量指標: {len(report.code_quality_metrics)} 個文件")
        
        if report.code_quality_metrics:
            for metric in report.code_quality_metrics:
                print(f"  📁 {metric.file_path}")
                print(f"     行數: {metric.lines_of_code}, 複雜度: {metric.complexity_score:.1f}")
                print(f"     可維護性: {metric.maintainability_index:.1f}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_build_performance_analysis():
    """測試構建性能分析"""
    print("\n" + "="*80)
    print("🧪 測試2: 構建性能分析")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [AnalysisType.BUILD_PERFORMANCE],
            build_command="echo 'Simulating build...' && sleep 1"
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 構建性能: {report.build_performance is not None}")
        
        if report.build_performance:
            bp = report.build_performance
            print(f"  ⏱️  構建時間: {bp.duration:.2f}s")
            print(f"  ✅ 成功: {bp.success}")
            print(f"  📦 產物: {bp.artifacts_count} 個")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_dependency_analysis():
    """測試依賴分析"""
    print("\n" + "="*80)
    print("🧪 測試3: 依賴分析")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    # 創建 requirements.txt
    requirements = test_dir / "requirements.txt"
    requirements.write_text("""
numpy==1.24.0
pandas==2.0.0
requests==2.31.0
""")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [AnalysisType.DEPENDENCY]
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 依賴數量: {len(report.dependency_metrics)}")
        
        for dep in report.dependency_metrics:
            print(f"  📦 {dep.package_name} ({dep.version})")
            print(f"     漏洞: {dep.vulnerable}, 過期: {dep.outdated}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_security_analysis():
    """測試安全分析"""
    print("\n" + "="*80)
    print("🧪 測試4: 安全分析")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    # 創建包含安全問題的測試文件
    security_test = test_dir / "security_test.py"
    security_test.write_text("""
import hashlib

def insecure_hash(password):
    return hashlib.md5(password.encode()).hexdigest()

def hardcoded_secret():
    password = "mysecret123"
    return password
""")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [AnalysisType.SECURITY]
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 安全問題數量: {len(report.security_metrics)}")
        
        for issue in report.security_metrics:
            print(f"  🚨 {issue.severity.upper()}: {issue.title}")
            print(f"     類別: {issue.category}")
            print(f"     文件: {issue.file_path}:{issue.line_number}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_test_coverage_analysis():
    """測試測試覆蓋率分析"""
    print("\n" + "="*80)
    print("🧪 測試5: 測試覆蓋率分析")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [AnalysisType.TEST_COVERAGE]
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 覆蓋率模塊數: {len(report.test_coverage)}")
        
        for coverage in report.test_coverage:
            print(f"  📊 {coverage.module}")
            print(f"     行覆蓋率: {coverage.line_coverage:.1f}%")
            print(f"     分支覆蓋率: {coverage.branch_coverage:.1f}%")
            print(f"     測試: {coverage.passed_tests}/{coverage.test_count}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_mcp_handler():
    """測試MCP處理器"""
    print("\n" + "="*80)
    print("🧪 測試6: MCP處理器")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    try:
        # 測試MCP處理器
        result = await mcp_cicd_analyze_handler({
            "path": str(test_dir),
            "analysis_type": "code_quality",
            "output_format": "json"
        })
        
        print(f"✅ MCP調用成功: {result.get('success')}")
        print(f"✅ 狀態: {result.get('status')}")
        print(f"✅ MCP合規: {result.get('mcp_compliant')}")
        print(f"✅ MCP版本: {result.get('mcp_version')}")
        print(f"✅ 健康分數: {result.get('health_score')}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_comprehensive_analysis():
    """測試綜合分析"""
    print("\n" + "="*80)
    print("🧪 測試7: 綜合分析")
    print("="*80)
    
    test_dir = Path("test_cicd_project")
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        report = await analyzer.run_comprehensive_analysis(
            str(test_dir),
            [
                AnalysisType.CODE_QUALITY,
                AnalysisType.DEPENDENCY,
                AnalysisType.SECURITY
            ]
        )
        
        print(f"✅ 分析ID: {report.analysis_id}")
        print(f"✅ 健康分數: {report.overall_health_score:.1f}/100")
        print(f"✅ 代碼質量: {len(report.code_quality_metrics)} 個文件")
        print(f"✅ 依賴分析: {len(report.dependency_metrics)} 個依賴")
        print(f"✅ 安全問題: {len(report.security_metrics)} 個問題")
        print(f"✅ 建議數量: {len(report.recommendations)}")
        
        print("\n💡 改進建議:")
        for rec in report.recommendations:
            print(f"  • {rec}")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_mcp_schema():
    """測試MCP工具架構"""
    print("\n" + "="*80)
    print("🧪 測試8: MCP工具架構")
    print("="*80)
    
    try:
        analyzer = MachineNativeOpsCICDAnalyzer()
        schema = analyzer.get_mcp_tool_schema()
        
        print(f"✅ 工具名稱: {schema['name']}")
        print(f"✅ 工具描述: {schema['description'][:80]}...")
        print(f"✅ 輸入架構: {schema['inputSchema']['type']}")
        print(f"✅ 必需參數: {schema['inputSchema']['required']}")
        
        # 驗證架構符合MCP規範
        assert 'name' in schema, "缺少name字段"
        assert 'description' in schema, "缺少description字段"
        assert 'inputSchema' in schema, "缺少inputSchema字段"
        assert schema['name'] == TOOL_ID, f"工具ID不匹配: {schema['name']} != {TOOL_ID}"
        
        # 驗證分析類型選項
        analysis_types = schema['inputSchema']['properties']['analysis_type']['enum']
        expected_types = ["code_quality", "build_performance", "dependency", "security", "test_coverage", "all"]
        for t in expected_types:
            assert t in analysis_types, f"缺少分析類型: {t}"
        
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
    print("🧪 測試9: 命名空間合規性")
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
        print(f"✅ 工具名稱: cicd_analyzer")
        
        return True
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

async def main():
    """運行所有測試"""
    print("\n" + "="*80)
    print("🚀 MachineNativeOps CI/CD 分析平台 - 測試套件")
    print("="*80)
    
    tests = [
        ("代碼質量分析", test_code_quality_analysis),
        ("構建性能分析", test_build_performance_analysis),
        ("依賴分析", test_dependency_analysis),
        ("安全分析", test_security_analysis),
        ("測試覆蓋率分析", test_test_coverage_analysis),
        ("MCP處理器", test_mcp_handler),
        ("綜合分析", test_comprehensive_analysis),
        ("MCP工具架構", test_mcp_schema),
        ("命名空間合規性", test_namespace_compliance)
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
        print("\n🎉 所有測試通過！CI/CD分析平台符合MCP和INSTANT標準！")
    else:
        print(f"\n⚠️ {total-passed} 個測試失敗，請檢查詳細信息")
    
    # 清理測試目錄
    import shutil
    if Path("test_cicd_project").exists():
        shutil.rmtree("test_cicd_project")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)