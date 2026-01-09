# @machine-native-ops/taxonomy-core

**Core taxonomy system for systematic naming across Machine Native Ops**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MachineNativeOps/machine-native-ops)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Overview

The **Taxonomy Core** package provides a comprehensive, systematic approach to naming conventions across the entire Machine Native Ops ecosystem. It implements the principles outlined in the [Taxonomy Manifesto](../TAXONOMY_MANIFESTO.md).

### Core Principles

- **Systematic** (系統化): Every naming decision follows documented patterns
- **Rigorous** (嚴謹): Names validated against strict rules
- **Intuitive** (直覺): Immediately understandable names
- **Consistent** (一致): Same logic across all layers

## 📦 Installation

```bash
npm install @machine-native-ops/taxonomy-core
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { Taxonomy, TaxonomyMapper, UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

// Define an entity
const entity = {
  domain: 'platform',
  name: 'agent',
  type: 'service',
  version: 'v1'
};

// Map to taxonomy path
const path = Taxonomy.map(entity);
console.log(path.canonical); // platform-agent-service-v1

// Resolve to all naming formats
const names = UnifiedNamingLogic.resolve(entity);
console.log(names.pascal);    // PlatformAgentServiceV1
console.log(names.snake);     // platform_agent_service_v1
console.log(names.constant);  // PLATFORM_AGENT_SERVICE_V1
```

### Validation

```typescript
import { TaxonomyValidator } from '@machine-native-ops/taxonomy-core';

// Validate a name
const result = TaxonomyValidator.validate('platform-agent-service-v1');

if (result.valid) {
  console.log('✅ Name is valid');
} else {
  console.log('❌ Violations:', result.violations);
}

// Validate and fix
const { fixed, changes } = TaxonomyValidator.validateAndFix('Platform_Agent_Service');
console.log(fixed);   // platform-agent-service
console.log(changes); // ['Converted to lowercase', 'Replaced invalid characters']
```

## 📚 API Reference

### Taxonomy

Core taxonomy management class.

```typescript
class Taxonomy {
  static map(entity: Entity | string): TaxonomyPath;
  register(entity: Entity, metadata?: Partial<TaxonomyMetadata>): TaxonomyEntry;
  get(id: string): TaxonomyEntry | undefined;
  list(filter?: Partial<Entity>): TaxonomyEntry[];
  search(pattern: string | RegExp): TaxonomyEntry[];
}
```

### TaxonomyMapper

Entity to taxonomy path mapping.

```typescript
class TaxonomyMapper {
  static map(entity: Entity | string): TaxonomyPath;
  static mapToCase(entity: Entity | string, caseStyle: NamingCase): string;
  static mapToNamespace(entity: Entity | string): string;
  static mapToPackageName(entity: Entity | string, scope?: string): string;
  static mapToClassName(entity: Entity | string): string;
  static mapToAllFormats(entity: Entity | string): Record<string, string>;
}
```

### UnifiedNamingLogic

Unified naming resolution and transformation.

```typescript
class UnifiedNamingLogic {
  static resolve(entity: Entity | string): ResolvedName;
  static transform(input: string, from: NamingCase, to: NamingCase): string;
  static normalize(input: string): string;
  static detectCase(input: string): NamingCase;
  static areEquivalent(name1: string, name2: string): boolean;
}
```

### TaxonomyValidator

Naming validation and compliance checking.

```typescript
class TaxonomyValidator {
  static validate(name: string): ValidationResult;
  static validateMany(names: string[]): Map<string, ValidationResult>;
  static checkCompliance(names: string[]): ComplianceResult;
  static validateAndFix(name: string): { fixed: string; changes: string[] };
  static generateReport(names: string[]): string;
}
```

## 🎨 Naming Patterns

### Entity Pattern
```
{domain}-{name}-{type}[-{version}][-{modifier}]

Examples:
- platform-agent-service-v1
- governance-policy-rule-v2-strict
- observability-metric-collector-v1
```

### Resource Pattern
```
{environment}/{namespace}/{type}/{name}

Examples:
- prod/platform/deployment/agent-pool
- staging/governance/configmap/policy-rules
```

### Component Pattern
```
{project}.{layer}.{component}[.{subcomponent}]

Examples:
- Taxonomy.Core.Mapper
- Taxonomy.SDK.ToolRegistry
```

## 🔧 Advanced Usage

### Custom Validation Rules

```typescript
import { TaxonomyValidator, ValidationRule } from '@machine-native-ops/taxonomy-core';

const customRule: ValidationRule = {
  id: 'custom-prefix',
  pattern: /^custom-/,
  message: 'Names must start with "custom-"',
  severity: 'warning'
};

TaxonomyValidator.addRule(customRule);
```

### Batch Operations

```typescript
import { TaxonomyMapper, UnifiedNamingLogic } from '@machine-native-ops/taxonomy-core';

// Map multiple entities
const entities = [
  'platform-agent-service-v1',
  'governance-policy-rule-v2',
  'observability-metric-collector-v1'
];

const paths = TaxonomyMapper.mapMany(entities);
const names = UnifiedNamingLogic.resolveMany(entities);
```

### Registry Management

```typescript
import { Taxonomy } from '@machine-native-ops/taxonomy-core';

const taxonomy = Taxonomy.getInstance();

// Register entities
taxonomy.register({
  domain: 'platform',
  name: 'agent',
  type: 'service',
  version: 'v1'
}, {
  description: 'Platform agent service',
  tags: ['core', 'platform']
});

// Search registry
const results = taxonomy.search(/agent/);

// Export/Import
const json = taxonomy.export();
taxonomy.import(json);
```

## 📊 Validation Rules

| Rule ID | Pattern | Severity | Description |
|---------|---------|----------|-------------|
| kebab-case | `/^[a-z]+(-[a-z0-9]+)*$/` | error | Must use kebab-case |
| domain-prefix | `/^(infra\|gov\|obs\|int\|platform\|sec\|data)-/` | error | Must start with valid domain |
| no-consecutive-hyphens | `/^(?!.*--)/` | error | No consecutive hyphens |
| max-length | `/^.{1,253}$/` | error | Max 253 characters |
| version-format | `/.*-v\d+(\.\d+)*$/` | warning | Version format: -v1.2.3 |

## 🎯 Use Cases

### 1. Service Naming
```typescript
const service = {
  domain: 'platform',
  name: 'payment',
  type: 'service',
  version: 'v1'
};

const names = TaxonomyMapper.mapToAllFormats(service);
// Use names.className for TypeScript class
// Use names.tableName for database table
// Use names.packageName for npm package
```

### 2. Resource Naming
```typescript
const resource = 'infra-agent-pool-v1';
const k8sName = TaxonomyMapper.mapToK8sResource(resource);
const envVar = TaxonomyMapper.mapToEnvVar(resource);
```

### 3. Compliance Checking
```typescript
const names = [
  'platform-agent-service-v1',
  'InvalidName',
  'governance-policy-rule-v2'
];

const compliance = TaxonomyValidator.checkCompliance(names);
console.log(`Compliance: ${compliance.score}%`);
```

## 🔗 Integration

### With SDK
```typescript
import { Taxonomy } from '@machine-native-ops/taxonomy-core';
import { ToolRegistry } from '@machine-native-ops/taxonomy-sdk';

const tool = {
  domain: 'platform',
  name: 'github',
  type: 'tool',
  version: 'v1'
};

const path = Taxonomy.map(tool);
ToolRegistry.register(path.canonical, tool);
```

### With ADK
```python
from taxonomy import TaxonomyMapper

agent = {
    'domain': 'platform',
    'name': 'orchestrator',
    'type': 'agent',
    'version': 'v1'
}

path = TaxonomyMapper.map(agent)
```

### With MCP
```typescript
import { Taxonomy } from '@machine-native-ops/taxonomy-core';
import { MCPServer } from '@machine-native-ops/taxonomy-mcp';

const protocol = {
  domain: 'platform',
  name: 'mcp',
  type: 'protocol',
  version: 'v1'
};

const path = Taxonomy.map(protocol);
MCPServer.registerProtocol(path.canonical);
```

## 📖 Examples

See the [examples](./examples) directory for more detailed examples:

- [Basic Usage](./examples/basic-usage.ts)
- [Validation](./examples/validation.ts)
- [Custom Rules](./examples/custom-rules.ts)
- [Batch Operations](./examples/batch-operations.ts)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [@machine-native-ops/taxonomy-sdk](../namespaces-sdk) - SDK integration
- [@machine-native-ops/taxonomy-adk](../namespaces-adk) - ADK integration
- [@machine-native-ops/taxonomy-mcp](../namespaces-mcp) - MCP integration

## 📞 Support

- **Documentation**: [Taxonomy Manifesto](../TAXONOMY_MANIFESTO.md)
- **Issues**: [GitHub Issues](https://github.com/MachineNativeOps/machine-native-ops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MachineNativeOps/machine-native-ops/discussions)

---

**Version**: 1.0.0  
**Maintainer**: Machine Native Ops Team  
**Core Values**: Systematic • Rigorous • Intuitive • Consistent