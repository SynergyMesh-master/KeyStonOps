"""
Taxonomy Integration for Namespaces ADK

Integrates the Taxonomy system with ADK components for consistent naming
"""

from typing import Dict, List, Optional, Any
from taxonomy import Taxonomy, TaxonomyMapper, UnifiedNamingLogic, TaxonomyValidator


class ADKTaxonomyManager:
    """ADK Taxonomy Manager for consistent naming"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.taxonomy = Taxonomy.get_instance({
            'version': '1.0.0',
            'custom_rules': [
                {
                    'id': 'adk-agent-prefix',
                    'pattern': r'^(platform|int|obs|gov)-.*-agent-v\d+',
                    'message': 'ADK agents must follow pattern: {domain}-{name}-agent-{version}',
                    'severity': 'error'
                }
            ]
        })
        
        # Register ADK itself
        self.taxonomy.register({
            'domain': 'platform',
            'name': 'namespaces',
            'type': 'adk',
            'version': 'v1'
        }, {
            'description': 'Machine-Native Agent Development Kit',
            'tags': ['adk', 'platform', 'agents']
        })
        
        self._initialized = True
    
    @classmethod
    def get_instance(cls) -> 'ADKTaxonomyManager':
        """Get singleton instance"""
        return cls()
    
    def generate_agent_names(self, agent_name: str, version: Optional[str] = None) -> Dict[str, str]:
        """Generate agent names using taxonomy"""
        entity = {
            'domain': 'platform',
            'name': agent_name,
            'type': 'agent',
            'version': version or 'v1'
        }
        
        return UnifiedNamingLogic.resolve(entity)
    
    def validate_agent_name(self, name: str) -> Dict[str, Any]:
        """Validate agent name"""
        return TaxonomyValidator.validate(name)
    
    def register_agent(self, agent_name: str, metadata: Optional[Dict] = None) -> None:
        """Register agent in taxonomy"""
        metadata = metadata or {}
        entity = {
            'domain': 'platform',
            'name': agent_name,
            'type': 'agent',
            'version': metadata.get('version', 'v1')
        }
        
        self.taxonomy.register(entity, {
            'description': metadata.get('description'),
            'tags': metadata.get('tags', ['agent'])
        })
    
    def get_registered_agents(self) -> List[Any]:
        """Get all registered agents"""
        return self.taxonomy.list({'type': 'agent'})
    
    def search_agents(self, pattern: str) -> List[Any]:
        """Search agents by pattern"""
        return self.taxonomy.search(pattern)
    
    def generate_workflow_names(self, workflow_name: str, version: Optional[str] = None) -> Dict[str, str]:
        """Generate workflow names"""
        entity = {
            'domain': 'platform',
            'name': workflow_name,
            'type': 'workflow',
            'version': version or 'v1'
        }
        
        return UnifiedNamingLogic.resolve(entity)
    
    def generate_orchestrator_names(self, orchestrator_name: str) -> Dict[str, str]:
        """Generate orchestrator names"""
        entity = {
            'domain': 'platform',
            'name': orchestrator_name,
            'type': 'orchestrator',
            'version': 'v1'
        }
        
        return UnifiedNamingLogic.resolve(entity)
    
    def validate_and_fix(self, name: str) -> Dict[str, Any]:
        """Validate and fix name"""
        return TaxonomyValidator.validate_and_fix(name)
    
    def export_registry(self) -> str:
        """Export taxonomy registry"""
        return self.taxonomy.export()
    
    def import_registry(self, json_data: str) -> None:
        """Import taxonomy registry"""
        self.taxonomy.import_registry(json_data)


def get_adk_component_names(component_name: str, component_type: str) -> Dict[str, str]:
    """Helper function to get taxonomy-compliant names for ADK components"""
    entity = {
        'domain': 'platform',
        'name': component_name,
        'type': component_type,
        'version': 'v1'
    }
    
    return UnifiedNamingLogic.resolve(entity)


def validate_adk_component_name(name: str) -> Dict[str, Any]:
    """Validate ADK component name"""
    return TaxonomyValidator.validate(name)


# Export taxonomy integration
__all__ = [
    'ADKTaxonomyManager',
    'get_adk_component_names',
    'validate_adk_component_name',
    'Taxonomy',
    'TaxonomyMapper',
    'UnifiedNamingLogic',
    'TaxonomyValidator'
]