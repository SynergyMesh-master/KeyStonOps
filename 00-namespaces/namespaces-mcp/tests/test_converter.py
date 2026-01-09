#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
namespace-mcp 轉換器測試套件
"""

import unittest
import tempfile
import shutil
from pathlib import Path
import sys
import os

# 添加 src 目錄到路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from converter import MachineNativeConverter, ConversionRule


class TestMachineNativeConverter(unittest.TestCase):
    """MachineNativeConverter 測試類"""
    
    def setUp(self):
        """測試前準備"""
        self.converter = MachineNativeConverter()
        self.temp_dir = tempfile.mkdtemp()
        self.source_dir = Path(self.temp_dir) / "source"
        self.target_dir = Path(self.temp_dir) / "target"
        self.source_dir.mkdir()
        self.target_dir.mkdir()
    
    def tearDown(self):
        """測試後清理"""
        shutil.rmtree(self.temp_dir)
    
    def test_converter_initialization(self):
        """測試轉換器初始化"""
        self.assertIsNotNone(self.converter)
        self.assertIsNotNone(self.converter.config)
        self.assertIsNotNone(self.converter.conversion_rules)
    
    def test_namespace_conversion(self):
        """測試命名空間轉換"""
        # 創建測試文件
        test_file = self.source_dir / "test.py"
        test_file.write_text("class DataProcessor:\n    pass")
        
        # 執行轉換
        results = self.converter.convert_project(
            str(self.source_dir),
            str(self.target_dir)
        )
        
        # 驗證結果
        self.assertIn("namespace", results)
        self.assertTrue(results["namespace"].success)
        
        # 檢查轉換後的內容
        converted_file = self.target_dir / "test.py"
        content = converted_file.read_text()
        self.assertIn("MachineNativeDataProcessor", content)
    
    def test_dependency_conversion(self):
        """測試依賴轉換"""
        # 創建測試文件
        test_file = self.source_dir / "test.py"
        test_file.write_text('import django\nfrom flask import Flask')
        
        # 執行轉換
        results = self.converter.convert_project(
            str(self.source_dir),
            str(self.target_dir)
        )
        
        # 驗證結果
        self.assertIn("dependency", results)
        
        # 檢查轉換後的內容
        converted_file = self.target_dir / "test.py"
        content = converted_file.read_text()
        self.assertIn("machine-native-web", content)
    
    def test_reference_conversion(self):
        """測試引用轉換"""
        # 創建測試文件
        test_file = self.source_dir / "test.py"
        test_file.write_text('from utils import helper')
        
        # 執行轉換
        results = self.converter.convert_project(
            str(self.source_dir),
            str(self.target_dir)
        )
        
        # 驗證結果
        self.assertIn("reference", results)
        
        # 檢查轉換後的內容
        converted_file = self.target_dir / "test.py"
        content = converted_file.read_text()
        self.assertIn("machine_native.utils", content)
    
    def test_pattern_replacement(self):
        """測試模式替換"""
        content = "class MyClass:\n    pass"
        pattern = r'class\s+([A-Z][a-zA-Z0-9_]*)'
        replacement = r'class MachineNative\1'
        
        new_content, count = self.converter._apply_pattern_replacement(
            content, pattern, replacement
        )
        
        self.assertEqual(count, 1)
        self.assertIn("MachineNativeMyClass", new_content)
    
    def test_should_process_file(self):
        """測試文件類型檢查"""
        # Python 文件應該被處理
        py_file = Path("test.py")
        self.assertTrue(
            self.converter._should_process_file(py_file, ["source_code"])
        )
        
        # 日誌文件不應該被處理
        log_file = Path("test.log")
        self.assertFalse(
            self.converter._should_process_file(log_file, ["source_code"])
        )
    
    def test_ssot_registration(self):
        """測試 SSOT 註冊"""
        test_file = Path("test.py")
        context = "test_context"
        changes = 5
        confidence = 0.95
        
        self.converter._register_ssot_change(
            test_file, context, changes, confidence
        )
        
        self.assertIn(str(test_file), self.converter.ssot_registry)
        self.assertEqual(
            len(self.converter.ssot_registry[str(test_file)]), 1
        )
    
    def test_ssot_hash_generation(self):
        """測試 SSOT 哈希生成"""
        # 註冊一些變更
        self.converter._register_ssot_change(
            Path("test1.py"), "context1", 5, 0.9
        )
        self.converter._register_ssot_change(
            Path("test2.py"), "context2", 3, 0.8
        )
        
        # 生成哈希
        hash1 = self.converter._generate_ssot_hash()
        
        # 哈希應該是 128 個字符（SHA3-512）
        self.assertEqual(len(hash1), 128)
        
        # 相同的數據應該生成相同的哈希
        hash2 = self.converter._generate_ssot_hash()
        self.assertEqual(hash1, hash2)
    
    def test_conversion_report_generation(self):
        """測試轉換報告生成"""
        # 創建測試文件
        test_file = self.source_dir / "test.py"
        test_file.write_text("class Test:\n    pass")
        
        # 執行轉換
        results = self.converter.convert_project(
            str(self.source_dir),
            str(self.target_dir)
        )
        
        # 檢查報告文件是否生成
        md_report = self.target_dir / "CONVERSION-REPORT.md"
        json_report = self.target_dir / "conversion-report.json"
        
        self.assertTrue(md_report.exists())
        self.assertTrue(json_report.exists())
        
        # 檢查報告內容
        md_content = md_report.read_text()
        self.assertIn("MachineNativeOps", md_content)
        self.assertIn("轉換摘要", md_content)


class TestConversionRule(unittest.TestCase):
    """ConversionRule 測試類"""
    
    def test_rule_creation(self):
        """測試規則創建"""
        rule = ConversionRule(
            name="test_rule",
            pattern=r"test",
            replacement="TEST",
            file_types=["source_code"],
            context="test_context",
            priority=100,
            description="Test rule"
        )
        
        self.assertEqual(rule.name, "test_rule")
        self.assertEqual(rule.pattern, r"test")
        self.assertEqual(rule.replacement, "TEST")
        self.assertEqual(rule.priority, 100)


class TestIntegration(unittest.TestCase):
    """集成測試"""
    
    def setUp(self):
        """測試前準備"""
        self.converter = MachineNativeConverter()
        self.temp_dir = tempfile.mkdtemp()
        self.source_dir = Path(self.temp_dir) / "source"
        self.target_dir = Path(self.temp_dir) / "target"
        self.source_dir.mkdir()
        self.target_dir.mkdir()
    
    def tearDown(self):
        """測試後清理"""
        shutil.rmtree(self.temp_dir)
    
    def test_full_conversion_workflow(self):
        """測試完整轉換流程"""
        # 創建複雜的測試專案
        (self.source_dir / "main.py").write_text("""
import django
from flask import Flask

class DataProcessor:
    MAX_SIZE = 1000
    
    def process_data(self):
        pass

def main():
    processor = DataProcessor()
    processor.process_data()
""")
        
        (self.source_dir / "utils.py").write_text("""
from models import User

def helper(data):
    return data.upper()
""")
        
        # 執行轉換
        results = self.converter.convert_project(
            str(self.source_dir),
            str(self.target_dir)
        )
        
        # 驗證所有層級都成功
        for layer in ["namespace", "dependency", "reference", "structure", "semantic", "governance"]:
            self.assertIn(layer, results)
        
        # 驗證文件存在
        self.assertTrue((self.target_dir / "main.py").exists())
        self.assertTrue((self.target_dir / "utils.py").exists())
        
        # 驗證報告生成
        self.assertTrue((self.target_dir / "CONVERSION-REPORT.md").exists())
        self.assertTrue((self.target_dir / "conversion-report.json").exists())


def run_tests():
    """運行所有測試"""
    # 創建測試套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加測試
    suite.addTests(loader.loadTestsFromTestCase(TestMachineNativeConverter))
    suite.addTests(loader.loadTestsFromTestCase(TestConversionRule))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))
    
    # 運行測試
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 返回結果
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    exit(run_tests())