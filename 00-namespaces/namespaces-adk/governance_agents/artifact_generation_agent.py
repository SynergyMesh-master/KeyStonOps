"""
Artifact Generation Agent
Autonomous agent for generating and managing artifacts (schemas, configs, docs)
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from dataclasses import dataclass
import json
import yaml

from adk.core.agent_runtime import AgentRuntime
from adk.core.memory_manager import MemoryManager
from adk.core.workflow_orchestrator import WorkflowOrchestrator
from adk.mcp.mcp_client import MCPClient
from adk.governance.mi9_runtime import MI9Runtime
from adk.observability.metrics import MetricsCollector
from adk.taxonomy_integration import ADKTaxonomyManager


@dataclass
class SchemaSpec:
    """Specification for generating a JSON Schema"""
    name: str
    version: str
    type: str
    fields: List[Dict[str, Any]]
    description: Optional[str] = None


@dataclass
class JSONSchema:
    """Generated JSON Schema"""
    name: str
    version: str
    schema: Dict[str, Any]
    format: str = "json"


@dataclass
class Template:
    """Template configuration"""
    name: str
    type: str
    template: str
    variables: List[str]


@dataclass
class YAMLConfig:
    """Generated YAML configuration"""
    name: str
    version: str
    config: Dict[str, Any]
    format: str = "yaml"


@dataclass
class Documentation:
    """Generated documentation"""
    title: str
    content: str
    format: str = "markdown"
    sections: List[str] = None


@dataclass
class Artifact:
    """Generic artifact"""
    name: str
    type: str
    version: str
    content: Any
    metadata: Dict[str, Any]


@dataclass
class ValidationResult:
    """Result of artifact validation"""
    valid: bool
    errors: List[str]
    warnings: List[str]


@dataclass
class VersionedArtifact:
    """Artifact with version information"""
    artifact: Artifact
    version: str
    timestamp: datetime
    hash: str


class ArtifactGenerationAgent:
    """
    Autonomous agent for generating and managing artifacts
    
    Responsibilities:
    - Generate JSON Schemas from specifications
    - Create YAML configurations
    - Generate documentation
    - Validate generated artifacts
    - Version artifacts properly
    """
    
    def __init__(
        self,
        runtime: AgentRuntime,
        memory: MemoryManager,
        orchestrator: WorkflowOrchestrator,
        mcp_client: MCPClient,
        mi9_runtime: MI9Runtime,
        metrics: MetricsCollector
    ):
        self.runtime = runtime
        self.memory = memory
        self.orchestrator = orchestrator
        self.mcp_client = mcp_client
        self.mi9_runtime = mi9_runtime
        self.metrics = metrics
        
        # Taxonomy integration
        self.taxonomy = ADKTaxonomyManager.get_instance()
        
        # Agent configuration
        self.agent_name = "platform-artifact-generator-agent-v1"
        self.autonomy_threshold = 0.9
        
        # Logging
        self.logger = logging.getLogger(__name__)
        
        # Metrics
        self.schema_generation_counter = self.metrics.counter(
            'artifact_schema_generations_total',
            'Total schema generations',
            ['status']
        )
        self.config_generation_counter = self.metrics.counter(
            'artifact_config_generations_total',
            'Total config generations',
            ['status']
        )
        self.doc_generation_counter = self.metrics.counter(
            'artifact_doc_generations_total',
            'Total doc generations',
            ['status']
        )
        self.validation_counter = self.metrics.counter(
            'artifact_validations_total',
            'Total artifact validations',
            ['result']
        )
    
    async def generate_schema(self, spec: SchemaSpec) -> JSONSchema:
        """
        Generate a JSON Schema from specification
        
        Args:
            spec: Schema specification
            
        Returns:
            Generated JSON Schema
        """
        self.logger.info(f"Generating schema: {spec.name}")
        
        try:
            # Validate spec name against taxonomy
            name_validation = self.taxonomy.validate_agent_name(spec.name)
            if not name_validation.get("valid", True):
                self.logger.warning(f"Schema name '{spec.name}' does not follow taxonomy")
            
            # Build JSON Schema structure
            schema = {
                "$schema": "http://json-schema.org/draft-07/schema#",
                "title": spec.name,
                "description": spec.description or f"Schema for {spec.name}",
                "type": "object",
                "version": spec.version,
                "properties": {},
                "required": []
            }
            
            # Add fields
            for field in spec.fields:
                field_name = field["name"]
                field_type = field.get("type", "string")
                
                schema["properties"][field_name] = {
                    "type": field_type,
                    "description": field.get("description", "")
                }
                
                # Add validation rules
                if "enum" in field:
                    schema["properties"][field_name]["enum"] = field["enum"]
                if "pattern" in field:
                    schema["properties"][field_name]["pattern"] = field["pattern"]
                if "default" in field:
                    schema["properties"][field_name]["default"] = field["default"]
                
                # Mark as required if needed
                if field.get("required", False):
                    schema["required"].append(field_name)
            
            json_schema = JSONSchema(
                name=spec.name,
                version=spec.version,
                schema=schema,
                format="json"
            )
            
            self.schema_generation_counter.labels(status='success').inc()
            self.logger.info(f"Generated schema: {spec.name} v{spec.version}")
            
            return json_schema
            
        except Exception as e:
            self.schema_generation_counter.labels(status='error').inc()
            self.logger.error(f"Error generating schema: {e}")
            raise
    
    async def generate_config(
        self,
        template: Template,
        params: Dict[str, Any]
    ) -> YAMLConfig:
        """
        Generate a YAML configuration from template and parameters
        
        Args:
            template: Template configuration
            params: Parameters to fill template
            
        Returns:
            Generated YAML configuration
        """
        self.logger.info(f"Generating config from template: {template.name}")
        
        try:
            # Validate template name against taxonomy
            name_validation = self.taxonomy.validate_agent_name(template.name)
            if not name_validation.get("valid", True):
                self.logger.warning(f"Template name '{template.name}' does not follow taxonomy")
            
            # Render template
            rendered = template.template
            for var in template.variables:
                placeholder = f"{{{{{var}}}}}"
                if placeholder in rendered:
                    rendered = rendered.replace(placeholder, str(params.get(var, "")))
            
            # Parse as YAML
            config_dict = yaml.safe_load(rendered)
            
            # Validate config structure
            if not isinstance(config_dict, dict):
                raise ValueError("Rendered template must produce a YAML object")
            
            yaml_config = YAMLConfig(
                name=template.name,
                version=params.get("version", "v1"),
                config=config_dict,
                format="yaml"
            )
            
            self.config_generation_counter.labels(status='success').inc()
            self.logger.info(f"Generated config: {template.name}")
            
            return yaml_config
            
        except Exception as e:
            self.config_generation_counter.labels(status='error').inc()
            self.logger.error(f"Error generating config: {e}")
            raise
    
    async def generate_docs(self, artifacts: List[Artifact]) -> Documentation:
        """
        Generate documentation from artifacts
        
        Args:
            artifacts: List of artifacts to document
            
        Returns:
            Generated documentation
        """
        self.logger.info(f"Generating documentation for {len(artifacts)} artifacts")
        
        try:
            content = f"# Artifact Documentation\n\n"
            content += f"Generated at: {datetime.now().isoformat()}\n\n"
            content += f"Total artifacts: {len(artifacts)}\n\n"
            
            sections = []
            
            for artifact in artifacts:
                # Generate section for each artifact
                section = f"## {artifact.name}\n\n"
                section += f"**Type:** {artifact.type}\n"
                section += f"**Version:** {artifact.version}\n\n"
                
                if artifact.type == "schema":
                    section += f"### Schema Definition\n\n"
                    section += f"```json\n{json.dumps(artifact.content, indent=2)}\n```\n\n"
                elif artifact.type == "config":
                    section += f"### Configuration\n\n"
                    section += f"```yaml\n{yaml.dump(artifact.content, default_flow_style=False)}\n```\n\n"
                
                content += section
                sections.append(artifact.name)
            
            # Add metadata section
            content += "## Metadata\n\n"
            content += f"- Generated by: {self.agent_name}\n"
            content += f"- Taxonomy version: 1.0.0\n"
            content += f"- Artifact count: {len(artifacts)}\n"
            
            documentation = Documentation(
                title="Artifact Documentation",
                content=content,
                format="markdown",
                sections=sections
            )
            
            self.doc_generation_counter.labels(status='success').inc()
            self.logger.info(f"Generated documentation with {len(sections)} sections")
            
            return documentation
            
        except Exception as e:
            self.doc_generation_counter.labels(status='error').inc()
            self.logger.error(f"Error generating documentation: {e}")
            raise
    
    async def validate_artifact(
        self,
        artifact: Artifact,
        schema: Optional[JSONSchema] = None
    ) -> ValidationResult:
        """
        Validate an artifact against schema or taxonomy rules
        
        Args:
            artifact: Artifact to validate
            schema: Optional schema to validate against
            
        Returns:
            ValidationResult with errors and warnings
        """
        self.logger.info(f"Validating artifact: {artifact.name}")
        
        errors = []
        warnings = []
        
        try:
            # Validate artifact name against taxonomy
            name_validation = self.taxonomy.validate_agent_name(artifact.name)
            if not name_validation.get("valid", True):
                errors.extend([
                    f"Name validation: {v}" for v in name_validation.get("violations", [])
                ])
            
            # Validate against schema if provided
            if schema and artifact.type == "schema":
                # Validate schema structure
                required_fields = ["$schema", "title", "type", "properties"]
                for field in required_fields:
                    if field not in artifact.content:
                        errors.append(f"Missing required field: {field}")
                
                # Check if it's valid JSON Schema
                if not artifact.content.get("$schema", "").startswith("http://json-schema.org/"):
                    warnings.append("Missing or invalid $schema reference")
            
            # Validate config structure
            if artifact.type == "config":
                if not isinstance(artifact.content, dict):
                    errors.append("Config must be a dictionary")
            
            valid = len(errors) == 0
            
            if valid:
                self.validation_counter.labels(result='valid').inc()
            else:
                self.validation_counter.labels(result='invalid').inc()
            
            self.logger.info(f"Validation complete: {len(errors)} errors, {len(warnings)} warnings")
            
            return ValidationResult(
                valid=valid,
                errors=errors,
                warnings=warnings
            )
            
        except Exception as e:
            self.validation_counter.labels(result='error').inc()
            self.logger.error(f"Error validating artifact: {e}")
            return ValidationResult(
                valid=False,
                errors=[f"Validation error: {e}"],
                warnings=[]
            )
    
    async def version_artifact(self, artifact: Artifact) -> VersionedArtifact:
        """
        Version an artifact with timestamp and hash
        
        Args:
            artifact: Artifact to version
            
        Returns:
            VersionedArtifact with version information
        """
        self.logger.info(f"Versioning artifact: {artifact.name}")
        
        try:
            # Generate version
            version = artifact.version
            
            # Generate timestamp
            timestamp = datetime.now()
            
            # Generate hash (simplified - in production, use proper hash)
            content_str = json.dumps(artifact.content, sort_keys=True) if isinstance(artifact.content, dict) else str(artifact.content)
            hash_value = str(hash(content_str))
            
            versioned = VersionedArtifact(
                artifact=artifact,
                version=version,
                timestamp=timestamp,
                hash=hash_value
            )
            
            self.logger.info(f"Versioned artifact: {artifact.name} v{version}")
            
            return versioned
            
        except Exception as e:
            self.logger.error(f"Error versioning artifact: {e}")
            raise
    
    async def generate_from_spec(self, spec: Dict[str, Any]) -> List[Artifact]:
        """
        Generate multiple artifacts from a specification
        
        Args:
            spec: Specification containing schemas, configs, and docs
            
        Returns:
            List of generated artifacts
        """
        self.logger.info("Generating artifacts from specification")
        
        artifacts = []
        
        try:
            # Generate schemas
            for schema_spec in spec.get("schemas", []):
                schema = await self.generate_schema(SchemaSpec(**schema_spec))
                artifact = Artifact(
                    name=schema.name,
                    type="schema",
                    version=schema.version,
                    content=schema.schema,
                    metadata={"format": "json"}
                )
                artifacts.append(artifact)
            
            # Generate configs
            for config_spec in spec.get("configs", []):
                template = Template(**config_spec["template"])
                params = config_spec.get("params", {})
                config = await self.generate_config(template, params)
                artifact = Artifact(
                    name=config.name,
                    type="config",
                    version=config.version,
                    content=config.config,
                    metadata={"format": "yaml"}
                )
                artifacts.append(artifact)
            
            # Generate documentation
            if spec.get("generate_docs", False):
                docs = await self.generate_docs(artifacts)
                artifact = Artifact(
                    name="artifact-documentation",
                    type="documentation",
                    version="v1",
                    content=docs.content,
                    metadata={"format": "markdown"}
                )
                artifacts.append(artifact)
            
            # Validate all artifacts
            for artifact in artifacts:
                validation = await self.validate_artifact(artifact)
                if not validation.valid:
                    self.logger.warning(
                        f"Artifact {artifact.name} has validation errors: {validation.errors}"
                    )
            
            self.logger.info(f"Generated {len(artifacts)} artifacts")
            
            return artifacts
            
        except Exception as e:
            self.logger.error(f"Error generating artifacts from spec: {e}")
            raise


# Factory function
async def create_artifact_generation_agent(
    runtime: AgentRuntime,
    memory: MemoryManager,
    orchestrator: WorkflowOrchestrator,
    mcp_client: MCPClient,
    mi9_runtime: MI9Runtime,
    metrics: MetricsCollector
) -> ArtifactGenerationAgent:
    """
    Factory function to create an artifact generation agent
    
    Args:
        runtime: Agent runtime instance
        memory: Memory manager instance
        orchestrator: Workflow orchestrator instance
        mcp_client: MCP client instance
        mi9_runtime: MI9 runtime instance
        metrics: Metrics collector instance
        
    Returns:
        ArtifactGenerationAgent instance
    """
    agent = ArtifactGenerationAgent(
        runtime=runtime,
        memory=memory,
        orchestrator=orchestrator,
        mcp_client=mcp_client,
        mi9_runtime=mi9_runtime,
        metrics=metrics
    )
    
    return agent