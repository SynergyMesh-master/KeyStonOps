#!/usr/bin/env python3
"""
範例專案 - 用於演示 namespace-mcp 轉換效果
"""

import os
import sys
from typing import List, Dict

# 外部依賴
import requests
from flask import Flask, jsonify

# 內部導入
from utils import helper
from models import User


class DataProcessor:
    """數據處理器類"""
    
    MAX_SIZE = 1000
    
    def __init__(self):
        self.data = []
    
    def process_data(self, input_data: List[str]) -> Dict:
        """處理數據"""
        result = {
            'processed': len(input_data),
            'status': 'success'
        }
        return result
    
    def fetch_remote_data(self, url: str) -> Dict:
        """獲取遠程數據"""
        response = requests.get(url)
        return response.json()


def main():
    """主函數"""
    processor = DataProcessor()
    data = ['item1', 'item2', 'item3']
    result = processor.process_data(data)
    print(f"處理結果: {result}")


if __name__ == "__main__":
    main()