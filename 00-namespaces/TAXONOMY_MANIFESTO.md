# Taxonomy: The Systematic Naming Manifesto

**Establishing a Unified and Intuitive Naming Logic**

## 🎯 Vision Statement

The **Taxonomy** system represents a comprehensive, systematic approach to naming conventions across the entire Machine Native Ops ecosystem. It provides a rigorous, intuitive, and consistent framework for naming resources, components, and artifacts across all three namespace subprojects.

## 🏛️ Core Principles

### 1. **Systematic** (系統化)
Every naming decision follows a clear, documented pattern that can be traced back to core principles.

### 2. **Rigorous** (嚴謹)
Names are validated against strict rules, ensuring consistency and preventing ambiguity.

### 3. **Intuitive** (直覺)
Names should be immediately understandable to developers, operators, and machines alike.

### 4. **Consistent** (一致)
The same naming logic applies across all layers: code, configuration, documentation, and infrastructure.

## 📐 Taxonomy Architecture

```
Taxonomy System
├── Core Taxonomy (核心分類)
│   ├── Entity Classification (實體分類)
│   ├── Relationship Mapping (關係映射)
│   └── Hierarchy Definition (層級定義)
├── Naming Logic (命名邏輯)
│   ├── Pattern Registry (模式註冊)
│   ├── Validation Rules (驗證規則)
│   └── Transformation Engine (轉換引擎)
└── Integration Layer (整合層)
    ├── SDK Integration (SDK 整合)
    ├── ADK Integration (ADK 整合)
    └── MCP Integration (MCP 整合)
```

## 🔧 Technical Implementation

### Repository Structure
```
@machine-native-ops/taxonomy
├── @machine-native-ops/taxonomy-core
├── @machine-native-ops/taxonomy-sdk
├── @machine-native-ops/taxonomy-adk
└── @machine-native-ops/taxonomy-mcp
```

### Namespace Hierarchy
```typescript
namespace MachineNativeOps {
  namespace Infrastructure {
    namespace Taxonomy {
      // Core taxonomy definitions
      interface TaxonomySpec { }
      class TaxonomyMapper { }
      class UnifiedNamingLogic { }
    }
  }
}
```

### Package Naming Convention
```json
{
  "name": "@machine-native-ops/taxonomy-spec",
  "version": "1.0.0",
  "description": "Systematic Naming Taxonomy for Machine Native Operations"
}
```

## 📋 Naming Patterns

### 1. Entity Naming Pattern
```
{domain}-{entity}-{type}-{version}[-{modifier}]

Examples:
- platform-agent-service-v1
- governance-policy-rule-v2-strict
- observability-metric-collector-v1
```

### 2. Resource Naming Pattern
```
{environment}/{namespace}/{resource-type}/{name}

Examples:
- prod/platform/deployment/agent-pool
- staging/governance/configmap/policy-rules
- dev/observability/service/metrics-api
```

### 3. Component Naming Pattern
```
{project}.{layer}.{component}[.{subcomponent}]

Examples:
- Taxonomy.Core.Mapper
- Taxonomy.SDK.ToolRegistry
- Taxonomy.ADK.AgentOrchestrator
```

## 🎨 Taxonomy Categories

### Category 1: Infrastructure Components
- **Pattern**: `infra-{component}-{type}`
- **Examples**: `infra-agent-pool`, `infra-event-router`, `infra-metric-collector`

### Category 2: Governance Artifacts
- **Pattern**: `gov-{artifact}-{scope}`
- **Examples**: `gov-policy-global`, `gov-rfc-template`, `gov-audit-trail`

### Category 3: Observability Elements
- **Pattern**: `obs-{element}-{target}`
- **Examples**: `obs-metric-latency`, `obs-trace-span`, `obs-log-audit`

### Category 4: Integration Points
- **Pattern**: `int-{system}-{direction}`
- **Examples**: `int-github-inbound`, `int-cloudflare-outbound`, `int-openai-bidirectional`

## 🔄 Mapping & Reference System

### Taxonomy Mapper
```typescript
class TaxonomyMapper {
  static map(entity: Entity): TaxonomyPath {
    return {
      domain: entity.domain,
      category: this.categorize(entity),
      hierarchy: this.buildHierarchy(entity),
      reference: this.generateReference(entity)
    };
  }
}
```

### Unified Naming Logic
```typescript
class UnifiedNamingLogic {
  static resolve(input: string): ResolvedName {
    const taxonomy = TaxonomyMapper.map(input);
    return {
      canonical: this.toCanonical(taxonomy),
      kebab: this.toKebabCase(taxonomy),
      pascal: this.toPascalCase(taxonomy),
      snake: this.toSnakeCase(taxonomy)
    };
  }
}
```

## 📦 Dependency Management

### Dependabot Configuration
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      taxonomy-updates:
        patterns:
          - "@machine-native-ops/taxonomy-*"
        update-types:
          - "minor"
          - "patch"
```

### Package References
```typescript
// Import taxonomy specifications
import { Taxonomy } from '@machine-native-ops/taxonomy-core';
import { TaxonomyMapper } from '@machine-native-ops/taxonomy-sdk';
import { UnifiedNamingLogic } from '@machine-native-ops/taxonomy-adk';

// Use taxonomy for naming
const name = UnifiedNamingLogic.resolve('platform-agent-service');
```

## 🎯 Integration with Subprojects

### Namespaces-SDK Integration
```typescript
// SDK uses taxonomy for tool naming
import { Taxonomy } from '@machine-native-ops/taxonomy-core';

class ToolRegistry {
  register(tool: Tool): void {
    const taxonomyPath = Taxonomy.map(tool);
    this.tools.set(taxonomyPath.canonical, tool);
  }
}
```

### Namespaces-ADK Integration
```python
# ADK uses taxonomy for agent naming
from taxonomy import TaxonomyMapper, UnifiedNamingLogic

class AgentRegistry:
    def register(self, agent):
        taxonomy_path = TaxonomyMapper.map(agent)
        self.agents[taxonomy_path.canonical] = agent
```

### Namespaces-MCP Integration
```typescript
// MCP uses taxonomy for protocol naming
import { Taxonomy } from '@machine-native-ops/taxonomy-core';

class MCPServer {
  registerTool(tool: MCPTool): void {
    const taxonomyPath = Taxonomy.map(tool);
    this.tools.set(taxonomyPath.canonical, tool);
  }
}
```

## 📊 Validation & Compliance

### Naming Validation Rules
```typescript
interface ValidationRule {
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
}

const taxonomyRules: ValidationRule[] = [
  {
    pattern: /^[a-z]+(-[a-z]+)*$/,
    message: 'Names must use kebab-case',
    severity: 'error'
  },
  {
    pattern: /^(infra|gov|obs|int)-/,
    message: 'Names must start with valid category prefix',
    severity: 'error'
  }
];
```

### Compliance Checker
```typescript
class TaxonomyCompliance {
  static check(name: string): ComplianceResult {
    const violations = taxonomyRules
      .filter(rule => !rule.pattern.test(name))
      .map(rule => ({
        rule: rule.message,
        severity: rule.severity
      }));
    
    return {
      compliant: violations.length === 0,
      violations
    };
  }
}
```

## 🚀 Usage Examples

### Example 1: Creating a New Service
```typescript
import { UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

// Define service
const service = {
  domain: 'platform',
  entity: 'agent',
  type: 'service',
  version: 'v1'
};

// Generate names using taxonomy
const names = UnifiedNamingLogic.resolve(service);
console.log(names.canonical);  // platform-agent-service-v1
console.log(names.pascal);     // PlatformAgentServiceV1
console.log(names.snake);      // platform_agent_service_v1
```

### Example 2: Validating Resource Names
```typescript
import { TaxonomyCompliance } from '@machine-native-ops/taxonomy-core';

const resourceName = 'infra-agent-pool-v1';
const result = TaxonomyCompliance.check(resourceName);

if (result.compliant) {
  console.log('✅ Name is taxonomy compliant');
} else {
  console.error('❌ Violations:', result.violations);
}
```

### Example 3: Mapping Entities
```typescript
import { TaxonomyMapper } from '@machine-native-ops/taxonomy-core';

const entity = {
  name: 'agent-orchestrator',
  domain: 'platform',
  layer: 'infrastructure'
};

const taxonomy = TaxonomyMapper.map(entity);
console.log(taxonomy.hierarchy);  // platform/infrastructure/agent-orchestrator
console.log(taxonomy.reference);  // ref: taxonomy/platform/infrastructure/v1
```

## 📚 Documentation Standards

### File Naming
- **Markdown**: `TAXONOMY_*.md` (e.g., `TAXONOMY_MANIFESTO.md`)
- **Configuration**: `taxonomy.*.yaml` (e.g., `taxonomy.rules.yaml`)
- **Code**: `taxonomy-*.ts` (e.g., `taxonomy-mapper.ts`)

### Directory Structure
```
taxonomy/
├── core/           # Core taxonomy definitions
├── rules/          # Validation rules
├── mappers/        # Mapping logic
├── validators/     # Validation engines
└── integrations/   # Integration adapters
```

## 🎓 Best Practices

### DO ✅
- Use taxonomy for all new components
- Validate names before committing
- Document naming decisions
- Keep taxonomy rules versioned
- Update dependabot for taxonomy packages

### DON'T ❌
- Create ad-hoc naming patterns
- Skip validation checks
- Mix naming conventions
- Hardcode names without taxonomy
- Ignore taxonomy violations

## 🔮 Future Roadmap

### Phase 1: Foundation (Current)
- ✅ Core taxonomy specification
- ✅ Basic naming patterns
- ✅ Validation rules

### Phase 2: Integration (Q1 2025)
- 🔄 SDK/ADK/MCP integration
- 🔄 Automated validation in CI/CD
- 🔄 Real-time compliance checking

### Phase 3: Intelligence (Q2 2025)
- ⏳ AI-powered name suggestions
- ⏳ Automatic taxonomy mapping
- ⏳ Predictive naming patterns

### Phase 4: Ecosystem (Q3 2025)
- ⏳ Community taxonomy contributions
- ⏳ Multi-language support
- ⏳ Cross-platform compatibility

## 📞 Support & Contribution

### Getting Help
- **Documentation**: `/docs/taxonomy/`
- **Examples**: `/examples/taxonomy/`
- **Issues**: GitHub Issues with `taxonomy` label

### Contributing
1. Follow the taxonomy manifesto principles
2. Add validation rules for new patterns
3. Update documentation
4. Submit RFC for major changes

---

**Version**: 1.0.0  
**Status**: Active  
**Maintainer**: Machine Native Ops Team  
**Last Updated**: 2025-01-18

**Core Values**: Systematic • Rigorous • Intuitive • Consistent