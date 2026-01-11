# Taxonomy Integration Guide

**Complete integration guide for all three namespace subprojects**

## 🎯 Overview

This guide provides comprehensive instructions for integrating the Taxonomy system across all three namespace subprojects:

1. **namespaces-sdk** - Platform Integration Layer
2. **namespaces-adk** - Agent Development Kit
3. **namespaces-mcp** - Model Context Protocol

## 📐 Architecture Overview

```
Taxonomy System
├── taxonomy-core (Core System)
│   ├── Taxonomy Management
│   ├── Naming Logic
│   ├── Validation Engine
│   └── Mapping System
├── namespaces-sdk (SDK Integration)
│   ├── Tool Registry with Taxonomy
│   ├── Credential Management
│   └── API Wrappers
├── namespaces-adk (ADK Integration)
│   ├── Agent Registry with Taxonomy
│   ├── Orchestration Layer
│   └── Workflow Management
└── namespaces-mcp (MCP Integration)
    ├── Protocol Registry with Taxonomy
    ├── Server Implementation
    └── Client Tools
```

## 🔧 Integration Steps

### Step 1: Install Taxonomy Core

All three subprojects should depend on `@machine-native-ops/taxonomy-core`:

```json
{
  "dependencies": {
    "@machine-native-ops/taxonomy-core": "^1.0.0"
  }
}
```

### Step 2: SDK Integration

#### Update Tool Registry

```typescript
// namespaces-sdk/src/core/registry.ts
import { Taxonomy, TaxonomyMapper } from '@machine-native-ops/taxonomy-core';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private taxonomy = Taxonomy.getInstance();

  register(tool: Tool): void {
    // Use taxonomy for naming
    const entity = {
      domain: 'platform',
      name: tool.name,
      type: 'tool',
      version: tool.version
    };
    
    const path = Taxonomy.map(entity);
    
    // Register with canonical name
    this.tools.set(path.canonical, tool);
    
    // Register in taxonomy
    this.taxonomy.register(entity, {
      description: tool.description,
      tags: tool.tags
    });
  }

  get(name: string): Tool | undefined {
    // Support both canonical and custom names
    const normalized = TaxonomyMapper.mapToCase(name, 'kebab');
    return this.tools.get(normalized);
  }
}
```

#### Update SDK Class

```typescript
// namespaces-sdk/src/core/sdk.ts
import { Taxonomy, UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

export class NamespacesSDK {
  private taxonomy = Taxonomy.getInstance();

  constructor(config: SDKConfig) {
    // Initialize with taxonomy
    this.initializeTaxonomy();
  }

  private initializeTaxonomy(): void {
    // Register SDK itself in taxonomy
    this.taxonomy.register({
      domain: 'platform',
      name: 'namespaces',
      type: 'sdk',
      version: 'v1'
    });
  }

  createTool(name: string, config: ToolConfig): Tool {
    // Use unified naming logic
    const names = UnifiedNamingLogic.resolve({
      domain: 'platform',
      name: name,
      type: 'tool',
      version: config.version || 'v1'
    });

    return new Tool({
      ...config,
      canonicalName: names.canonical,
      className: names.pascal,
      functionName: names.camel
    });
  }
}
```

### Step 3: ADK Integration

#### Update Agent Registry

```python
# namespaces-adk/adk/core/registry.py
from taxonomy import Taxonomy, TaxonomyMapper

class AgentRegistry:
    def __init__(self):
        self.agents = {}
        self.taxonomy = Taxonomy.get_instance()
    
    def register(self, agent):
        # Use taxonomy for naming
        entity = {
            'domain': 'platform',
            'name': agent.name,
            'type': 'agent',
            'version': agent.version
        }
        
        path = Taxonomy.map(entity)
        
        # Register with canonical name
        self.agents[path['canonical']] = agent
        
        # Register in taxonomy
        self.taxonomy.register(entity, {
            'description': agent.description,
            'tags': agent.tags
        })
    
    def get(self, name):
        # Support both canonical and custom names
        normalized = TaxonomyMapper.map_to_case(name, 'kebab')
        return self.agents.get(normalized)
```

#### Update Agent Orchestrator

```python
# namespaces-adk/adk/orchestration/orchestrator.py
from taxonomy import UnifiedNamingLogic, TaxonomyValidator

class AgentOrchestrator:
    def __init__(self):
        self.taxonomy = Taxonomy.get_instance()
    
    def create_agent(self, name, config):
        # Validate name using taxonomy
        validation = TaxonomyValidator.validate(name)
        if not validation['valid']:
            raise ValueError(f"Invalid agent name: {validation['violations']}")
        
        # Use unified naming logic
        names = UnifiedNamingLogic.resolve({
            'domain': 'platform',
            'name': name,
            'type': 'agent',
            'version': config.get('version', 'v1')
        })
        
        return Agent(
            canonical_name=names['canonical'],
            class_name=names['pascal'],
            function_name=names['camel'],
            config=config
        )
```

### Step 4: MCP Integration

#### Update Protocol Registry

```typescript
// namespaces-mcp/src/core/registry.ts
import { Taxonomy, TaxonomyMapper } from '@machine-native-ops/taxonomy-core';

export class ProtocolRegistry {
  private protocols: Map<string, MCPProtocol> = new Map();
  private taxonomy = Taxonomy.getInstance();

  register(protocol: MCPProtocol): void {
    // Use taxonomy for naming
    const entity = {
      domain: 'platform',
      name: protocol.name,
      type: 'protocol',
      version: protocol.version
    };
    
    const path = Taxonomy.map(entity);
    
    // Register with canonical name
    this.protocols.set(path.canonical, protocol);
    
    // Register in taxonomy
    this.taxonomy.register(entity, {
      description: protocol.description,
      tags: ['mcp', 'protocol']
    });
  }

  resolve(name: string): MCPProtocol | undefined {
    const normalized = TaxonomyMapper.mapToCase(name, 'kebab');
    return this.protocols.get(normalized);
  }
}
```

#### Update MCP Server

```typescript
// namespaces-mcp/src/server/mcp-server.ts
import { Taxonomy, UnifiedNamingLogic, TaxonomyValidator } from '@machine-native-ops/taxonomy-core';

export class MCPServer {
  private taxonomy = Taxonomy.getInstance();

  registerTool(tool: MCPTool): void {
    // Validate tool name
    const validation = TaxonomyValidator.validate(tool.name);
    if (!validation.valid) {
      throw new Error(`Invalid tool name: ${validation.violations[0]?.message}`);
    }

    // Use unified naming logic
    const names = UnifiedNamingLogic.resolve({
      domain: 'platform',
      name: tool.name,
      type: 'tool',
      version: tool.version || 'v1'
    });

    // Register with taxonomy-compliant names
    this.tools.set(names.canonical, {
      ...tool,
      canonicalName: names.canonical,
      mcpName: names.kebab,
      internalName: names.camel
    });
  }
}
```

## 📦 Package Dependencies

### namespaces-sdk/package.json
```json
{
  "name": "@machine-native-ops/namespaces-sdk",
  "dependencies": {
    "@machine-native-ops/taxonomy-core": "^1.0.0"
  }
}
```

### namespaces-adk/requirements.txt
```txt
taxonomy-core>=1.0.0
```

### namespaces-mcp/package.json
```json
{
  "name": "@machine-native-ops/namespaces-mcp",
  "dependencies": {
    "@machine-native-ops/taxonomy-core": "^1.0.0"
  }
}
```

## 🔄 Cross-Project Naming Consistency

### Example: GitHub Tool Integration

#### SDK Implementation
```typescript
// namespaces-sdk/src/adapters/github/index.ts
import { UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

const githubTool = {
  domain: 'int',
  name: 'github',
  type: 'tool',
  version: 'v1'
};

const names = UnifiedNamingLogic.resolve(githubTool);
// names.canonical: int-github-tool-v1
// names.pascal: IntGithubToolV1
// names.camel: intGithubToolV1
```

#### ADK Implementation
```python
# namespaces-adk/adk/integrations/github.py
from taxonomy import UnifiedNamingLogic

github_agent = {
    'domain': 'int',
    'name': 'github',
    'type': 'agent',
    'version': 'v1'
}

names = UnifiedNamingLogic.resolve(github_agent)
# names['canonical']: int-github-agent-v1
# names['pascal']: IntGithubAgentV1
# names['snake']: int_github_agent_v1
```

#### MCP Implementation
```typescript
// namespaces-mcp/src/tools/github.ts
import { UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

const githubProtocol = {
  domain: 'int',
  name: 'github',
  type: 'protocol',
  version: 'v1'
};

const names = UnifiedNamingLogic.resolve(githubProtocol);
// names.canonical: int-github-protocol-v1
// names.kebab: int-github-protocol-v1
```

## 🎯 Validation Integration

### CI/CD Validation

```yaml
# .github/workflows/taxonomy-validation.yml
name: Taxonomy Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate SDK Names
        run: |
          cd 00-namespaces/namespaces-sdk
          npm run taxonomy:validate
      
      - name: Validate ADK Names
        run: |
          cd 00-namespaces/namespaces-adk
          python -m taxonomy.validate
      
      - name: Validate MCP Names
        run: |
          cd 00-namespaces/namespaces-mcp
          npm run taxonomy:validate
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running taxonomy validation..."

# Validate SDK
cd 00-namespaces/namespaces-sdk
npm run taxonomy:validate || exit 1

# Validate ADK
cd ../namespaces-adk
python -m taxonomy.validate || exit 1

# Validate MCP
cd ../namespaces-mcp
npm run taxonomy:validate || exit 1

echo "✅ Taxonomy validation passed"
```

## 📊 Monitoring & Compliance

### Compliance Dashboard

```typescript
// monitoring/taxonomy-compliance.ts
import { TaxonomyValidator } from '@machine-native-ops/taxonomy-core';

async function checkCompliance() {
  const sdkNames = await getSDKNames();
  const adkNames = await getADKNames();
  const mcpNames = await getMCPNames();

  const allNames = [...sdkNames, ...adkNames, ...mcpNames];
  const compliance = TaxonomyValidator.checkCompliance(allNames);

  console.log(`Overall Compliance: ${compliance.score}%`);
  console.log(`Status: ${compliance.compliant ? '✅' : '❌'}`);
  
  if (!compliance.compliant) {
    console.log('Violations:', compliance.violations);
    console.log('Recommendations:', compliance.recommendations);
  }
}
```

## 🚀 Migration Guide

### Migrating Existing Names

```typescript
// scripts/migrate-to-taxonomy.ts
import { TaxonomyValidator, UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

const oldNames = [
  'GitHubTool',
  'payment_service',
  'AGENT_ORCHESTRATOR'
];

for (const oldName of oldNames) {
  const normalized = UnifiedNamingLogic.normalize(oldName);
  const { fixed, changes } = TaxonomyValidator.validateAndFix(normalized);
  
  console.log(`Old: ${oldName}`);
  console.log(`New: ${fixed}`);
  console.log(`Changes: ${changes.join(', ')}`);
  console.log('---');
}
```

## 📚 Best Practices

### 1. Always Use Taxonomy for New Components
```typescript
// ✅ Good
const names = UnifiedNamingLogic.resolve(entity);
const tool = new Tool({ name: names.canonical });

// ❌ Bad
const tool = new Tool({ name: 'MyCustomTool' });
```

### 2. Validate Before Registration
```typescript
// ✅ Good
const validation = TaxonomyValidator.validate(name);
if (validation.valid) {
  registry.register(tool);
}

// ❌ Bad
registry.register(tool); // No validation
```

### 3. Use Consistent Case Styles
```typescript
// ✅ Good - Use appropriate case for context
const className = names.pascal;    // PlatformAgentServiceV1
const functionName = names.camel;  // platformAgentServiceV1
const tableName = names.snake;     // platform_agent_service_v1

// ❌ Bad - Mixing case styles
const className = 'platform-agent-service-v1'; // Wrong case
```

## 🔗 Related Documentation

- [Taxonomy Manifesto](./TAXONOMY_MANIFESTO.md)
- [Taxonomy Core README](./taxonomy-core/README.md)
- [SDK Integration Guide](./namespaces-sdk/README.md)
- [ADK Integration Guide](./namespaces-adk/README.md)
- [MCP Integration Guide](./namespaces-mcp/README.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-18  
**Maintainer**: Machine Native Ops Team