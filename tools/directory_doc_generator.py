#!/usr/bin/env python3
"""
DIRECTORY.md 自動生成工具

此工具自動掃描目錄結構，分析文件內容，並生成初始的 DIRECTORY.md 文檔。
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Set
import json

class DirectoryDocGenerator:
    """DIRECTORY.md 文檔生成器"""
    
    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.exclude_dirs = {
            '.git', '.github-private', '__pycache__', 'node_modules', 
            '.pytest_cache', '.mypy_cache', 'dist', 'build', 
            '*.egg-info', '.venv', 'venv', '.DS_Store'
        }
        self.exclude_files = {
            '.gitignore', '.gitkeep', '__init__.py', 
            '.DS_Store', 'Thumbs.db'
        }
    
    def should_exclude(self, path: Path) -> bool:
        """判斷是否應該排除此路徑"""
        name = path.name
        return any(
            name == exclude or name.startswith(exclude.rstrip('*'))
            for exclude in self.exclude_dirs
        )
    
    def scan_directory(self, dir_path: Path) -> Dict:
        """掃描目錄並收集信息"""
        if not dir_path.is_dir():
            return None
        
        info = {
            'path': str(dir_path.relative_to(self.root_path)),
            'name': dir_path.name,
            'files': [],
            'subdirs': [],
            'has_directory_md': (dir_path / 'DIRECTORY.md').exists()
        }
        
        try:
            for item in sorted(dir_path.iterdir()):
                if self.should_exclude(item):
                    continue
                
                if item.is_file() and item.name not in self.exclude_files:
                    file_info = self.analyze_file(item)
                    info['files'].append(file_info)
                elif item.is_dir():
                    info['subdirs'].append(item.name)
        except PermissionError:
            print(f"⚠️  無法訪問目錄: {dir_path}")
        
        return info
    
    def analyze_file(self, file_path: Path) -> Dict:
        """分析文件並提取信息"""
        file_info = {
            'name': file_path.name,
            'extension': file_path.suffix,
            'size': file_path.stat().st_size,
            'type': self.determine_file_type(file_path)
        }
        
        # 嘗試讀取文件的前幾行來推斷用途
        try:
            if file_path.suffix in ['.py', '.js', '.ts', '.go', '.rs']:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = [f.readline() for _ in range(10)]
                    file_info['docstring'] = self.extract_docstring(lines, file_path.suffix)
        except Exception as e:
            file_info['docstring'] = None
        
        return file_info
    
    def determine_file_type(self, file_path: Path) -> str:
        """判斷文件類型"""
        ext = file_path.suffix.lower()
        name = file_path.name.lower()
        
        type_mapping = {
            '.py': 'Python 源代碼',
            '.js': 'JavaScript 源代碼',
            '.ts': 'TypeScript 源代碼',
            '.go': 'Go 源代碼',
            '.rs': 'Rust 源代碼',
            '.java': 'Java 源代碼',
            '.cpp': 'C++ 源代碼',
            '.c': 'C 源代碼',
            '.h': 'C/C++ 頭文件',
            '.md': 'Markdown 文檔',
            '.yaml': 'YAML 配置文件',
            '.yml': 'YAML 配置文件',
            '.json': 'JSON 配置文件',
            '.toml': 'TOML 配置文件',
            '.sh': 'Shell 腳本',
            '.bash': 'Bash 腳本',
            '.dockerfile': 'Dockerfile',
            '.sql': 'SQL 腳本',
            '.txt': '文本文件',
        }
        
        if 'dockerfile' in name:
            return 'Dockerfile'
        elif 'makefile' in name:
            return 'Makefile'
        elif 'requirements' in name:
            return 'Python 依賴文件'
        elif 'package.json' in name:
            return 'Node.js 包配置'
        
        return type_mapping.get(ext, '其他文件')
    
    def extract_docstring(self, lines: List[str], extension: str) -> str:
        """提取文件的文檔字符串"""
        if extension == '.py':
            # Python docstring
            for i, line in enumerate(lines):
                if '"""' in line or "'''" in line:
                    docstring = line.strip().strip('"""').strip("'''")
                    if docstring:
                        return docstring
        elif extension in ['.js', '.ts']:
            # JavaScript/TypeScript comment
            for line in lines:
                if line.strip().startswith('//'):
                    return line.strip().lstrip('//').strip()
                elif line.strip().startswith('/*'):
                    return line.strip().lstrip('/*').strip()
        
        return None
    
    def determine_directory_type(self, dir_info: Dict) -> str:
        """判斷目錄類型"""
        path = dir_info['path']
        name = dir_info['name']
        
        if 'test' in name.lower():
            return 'test'
        elif 'doc' in name.lower():
            return 'docs'
        elif 'config' in name.lower() or 'conf' in name.lower():
            return 'config'
        elif 'script' in name.lower():
            return 'scripts'
        elif 'tool' in name.lower():
            return 'tools'
        elif 'src' in path or 'source' in path:
            return 'source'
        elif 'deploy' in name.lower():
            return 'deploy'
        elif 'ops' in name.lower():
            return 'ops'
        elif 'example' in name.lower():
            return 'examples'
        else:
            return 'general'
    
    def generate_directory_md(self, dir_info: Dict) -> str:
        """生成 DIRECTORY.md 內容"""
        dir_type = self.determine_directory_type(dir_info)
        template = self.get_template(dir_type)
        
        # 填充模板
        content = template.format(
            directory_name=dir_info['name'],
            directory_path=dir_info['path'],
            file_list=self.format_file_list(dir_info['files']),
            subdir_list=self.format_subdir_list(dir_info['subdirs'])
        )
        
        return content
    
    def format_file_list(self, files: List[Dict]) -> str:
        """格式化文件列表"""
        if not files:
            return "（此目錄暫無文件）"
        
        formatted = []
        for file in files:
            docstring = file.get('docstring', '')
            desc = f" - {docstring}" if docstring else ""
            formatted.append(f"### {file['name']}\n"
                           f"- **職責**：{file['type']}{desc}\n"
                           f"- **功能**：[待補充具體功能說明]\n"
                           f"- **依賴**：[待補充依賴關係]\n")
        
        return "\n".join(formatted)
    
    def format_subdir_list(self, subdirs: List[str]) -> str:
        """格式化子目錄列表"""
        if not subdirs:
            return ""
        
        return "\n".join(f"- `{subdir}/`" for subdir in subdirs)
    
    def get_template(self, dir_type: str) -> str:
        """獲取對應類型的模板"""
        templates = {
            'source': self.get_source_template(),
            'test': self.get_test_template(),
            'config': self.get_config_template(),
            'docs': self.get_docs_template(),
            'tools': self.get_tools_template(),
            'scripts': self.get_scripts_template(),
            'deploy': self.get_deploy_template(),
            'ops': self.get_ops_template(),
            'examples': self.get_examples_template(),
            'general': self.get_general_template()
        }
        
        return templates.get(dir_type, self.get_general_template())
    
    def get_general_template(self) -> str:
        """通用模板"""
        return """# {directory_name}

## 目錄職責
此目錄位於 `{directory_path}`，負責 [待補充：描述此目錄的主要職責和在系統中的定位]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
[待補充：說明此目錄內各檔案如何實現職責分離，以及職責邊界的劃分]

## 設計原則
[待補充：說明如何遵循單一職責原則，以及未來維護時應注意的事項]

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_source_template(self) -> str:
        """源代碼目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：模組名稱] 的源代碼實現，負責 [待補充：核心功能描述]。作為系統的 [待補充：定位描述]，它與 [待補充：相關目錄] 緊密協作。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
此目錄實現了嚴格的職責分離原則：
- [待補充：各層次的職責說明]

## 設計原則

### 單一職責原則 (SRP) 遵循
1. **模組級別職責單一化**：[待補充]
2. **文件級別職責專一化**：[待補充]
3. **接口級別職責清晰化**：[待補充]

### 未來維護注意事項
1. **添加新功能時**：[待補充]
2. **修改現有功能時**：[待補充]
3. **擴展策略**：[待補充]

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_test_template(self) -> str:
        """測試目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：測試對象] 的測試用例，確保代碼質量和功能正確性。測試覆蓋 [待補充：測試類型]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 單元測試專注於獨立功能測試
- 集成測試專注於模組協作測試
- 測試數據與測試邏輯分離

## 設計原則
每個測試檔案對應一個源代碼檔案或功能模組，測試邏輯清晰，避免測試間的相互依賴。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_config_template(self) -> str:
        """配置目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：環境/系統] 的配置文件，管理 [待補充：配置類型]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 環境特定配置與通用配置分離
- 不同類型的配置分開管理
- 敏感信息使用環境變量或密鑰管理

## 設計原則
配置文件層次化，支持繼承和覆蓋機制，確保配置的可維護性和安全性。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_docs_template(self) -> str:
        """文檔目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：文檔類型] 的技術文檔，提供 [待補充：文檔用途]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 按文檔類型組織
- 圖片資源與文字內容分離
- 不同語言版本的文檔分開管理

## 設計原則
文檔結構清晰，便於查找和維護，確保文檔與代碼同步更新。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_tools_template(self) -> str:
        """工具目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：工具類型] 工具和實用程序，用於 [待補充：工具用途]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 開發工具與部署工具分開
- 數據處理腳本與系統維護腳本分離
- 一次性腳本與常用工具分開管理

## 設計原則
每個工具專注於特定任務，避免功能重疊，確保工具的獨立性和可重用性。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_scripts_template(self) -> str:
        """腳本目錄模板"""
        return self.get_tools_template()  # 使用相同的模板
    
    def get_deploy_template(self) -> str:
        """部署目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：部署環境] 的部署配置和腳本，用於 [待補充：部署用途]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 不同環境的部署配置分離
- 部署腳本與配置文件分離
- 基礎設施代碼與應用配置分離

## 設計原則
部署配置標準化，支持多環境部署，確保部署的可重複性和可靠性。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_ops_template(self) -> str:
        """運維目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：運維類型] 的運維工具和配置，用於 [待補充：運維用途]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 監控配置與告警規則分離
- 自動化腳本與手動操作指南分離
- 不同系統的運維工具分開管理

## 設計原則
運維工具標準化，支持自動化運維，確保系統的穩定性和可維護性。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def get_examples_template(self) -> str:
        """示例目錄模板"""
        return """# {directory_name}

## 目錄職責
此目錄包含 [待補充：示例類型] 的示例代碼和模板，用於 [待補充：示例用途]。

{subdir_list}

## 檔案說明

{file_list}

## 職責分離說明
- 基礎示例與高級示例分離
- 不同功能的示例分開組織
- 示例代碼與文檔說明配套

## 設計原則
示例代碼簡潔明了，易於理解和使用，確保示例的實用性和教育性。

---

*此文檔由 directory_doc_generator.py 自動生成，請根據實際情況補充和完善內容。*
"""
    
    def process_directory(self, dir_path: Path, generate: bool = False) -> Dict:
        """處理單個目錄"""
        dir_info = self.scan_directory(dir_path)
        
        if dir_info and generate and not dir_info['has_directory_md']:
            content = self.generate_directory_md(dir_info)
            output_path = dir_path / 'DIRECTORY.md'
            
            try:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已生成: {output_path}")
                dir_info['generated'] = True
            except Exception as e:
                print(f"❌ 生成失敗 {output_path}: {e}")
                dir_info['generated'] = False
        else:
            dir_info['generated'] = False
        
        return dir_info
    
    def scan_all_directories(self, generate: bool = False) -> List[Dict]:
        """掃描所有目錄"""
        results = []
        
        for root, dirs, files in os.walk(self.root_path):
            root_path = Path(root)
            
            # 排除特殊目錄
            dirs[:] = [d for d in dirs if not self.should_exclude(root_path / d)]
            
            dir_info = self.process_directory(root_path, generate)
            if dir_info:
                results.append(dir_info)
        
        return results
    
    def generate_report(self, results: List[Dict]) -> str:
        """生成掃描報告"""
        total = len(results)
        has_doc = sum(1 for r in results if r['has_directory_md'])
        generated = sum(1 for r in results if r.get('generated', False))
        
        report = f"""
# DIRECTORY.md 生成報告

## 統計信息
- 總目錄數: {total}
- 已有文檔: {has_doc} ({has_doc/total*100:.1f}%)
- 本次生成: {generated}
- 待完善: {total - has_doc}

## 詳細列表

### 已有文檔的目錄
"""
        
        for r in results:
            if r['has_directory_md']:
                report += f"- ✅ {r['path']}\n"
        
        report += "\n### 本次生成的目錄\n"
        for r in results:
            if r.get('generated', False):
                report += f"- 🆕 {r['path']}\n"
        
        report += "\n### 待生成的目錄\n"
        for r in results:
            if not r['has_directory_md'] and not r.get('generated', False):
                report += f"- ⏳ {r['path']}\n"
        
        return report


def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description='DIRECTORY.md 自動生成工具')
    parser.add_argument('path', nargs='?', default='.', help='要掃描的根目錄路徑')
    parser.add_argument('--generate', '-g', action='store_true', help='生成缺失的 DIRECTORY.md 文件')
    parser.add_argument('--report', '-r', type=str, help='生成報告文件路徑')
    
    args = parser.parse_args()
    
    generator = DirectoryDocGenerator(args.path)
    
    print(f"🔍 掃描目錄: {args.path}")
    print(f"{'🔧 生成模式' if args.generate else '📊 掃描模式'}")
    print("-" * 60)
    
    results = generator.scan_all_directories(generate=args.generate)
    
    report = generator.generate_report(results)
    print(report)
    
    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"\n📄 報告已保存到: {args.report}")


if __name__ == '__main__':
    main()