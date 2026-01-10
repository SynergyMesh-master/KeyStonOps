"""
數據模型模組
"""

class User:
    """用戶模型"""
    
    def __init__(self, name, email):
        self.name = name
        self.email = email
    
    def get_info(self):
        """獲取用戶信息"""
        return {
            'name': self.name,
            'email': self.email
        }