# @machine-native-ops/namespaces-mcp

**Model Context Protocol implementation with Taxonomy integration**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MachineNativeOps/machine-native-ops)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 🎯 Overview

The **Namespaces MCP** package provides a complete Model Context Protocol implementation with integrated Taxonomy system for consistent naming across all MCP components.

### Key Features

- ✅ **MCP Protocol Implementation**: Full MCP server and client support
- ✅ **Taxonomy Integration**: Consistent naming using taxonomy-core
- ✅ **Type Safety**: Complete TypeScript support
- ✅ **Validation**: Automatic name validation and compliance
- ✅ **Extensible**: Plugin architecture for custom protocols

## 📦 Installation

```bash
npm install @machine-native-ops/namespaces-mcp
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { MCPTaxonomyManager } from '@machine-native-ops/namespaces-mcp';

const mcpTaxonomy = MCPTaxonomyManager.getInstance();

// Generate protocol names
const names = mcpTaxonomy.generateProtocolNames('github', 'v1');
console.log(names.canonical); // platform-github-protocol-v1
console.log(names.pascal);    // PlatformGithubProtocolV1

// Validate protocol name
const validation = mcpTaxonomy.validateProtocolName('platform-github-protocol-v1');
if (validation.valid) {
  console.log('✅ Protocol name is valid');
}

// Register protocol
mcpTaxonomy.registerProtocol('github', {
  version: 'v1',
  description: 'GitHub integration protocol',
  tags: ['github', 'integration']
});
```

## 📚 API Reference

### MCPTaxonomyManager

Main class for MCP taxonomy management.

```typescript
class MCPTaxonomyManager {
  static getInstance(): MCPTaxonomyManager;
  generateProtocolNames(protocolName: string, version?: string): ResolvedName;
  validateProtocolName(name: string): ValidationResult;
  registerProtocol(protocolName: string, metadata?: any): void;
  getRegisteredProtocols(): any[];
  searchProtocols(pattern: string | RegExp): any[];
  generateServerNames(serverName: string, version?: string): ResolvedName;
  generateClientNames(clientName: string): ResolvedName;
  generateToolNames(toolName: string, version?: string): ResolvedName;
}
```

## 🎨 Naming Patterns

### Protocol Pattern
```
platform-{name}-protocol-{version}

Examples:
- platform-github-protocol-v1
- platform-openai-protocol-v2
- platform-cloudflare-protocol-v1
```

### Server Pattern
```
platform-{name}-server-{version}

Examples:
- platform-mcp-server-v1
- platform-api-server-v2
```

### Tool Pattern
```
platform-{name}-tool-{version}

Examples:
- platform-github-tool-v1
- platform-search-tool-v1
```

## 🔧 Advanced Usage

### Custom Protocol Registration

```typescript
import { MCPTaxonomyManager } from '@machine-native-ops/namespaces-mcp';

const mcpTaxonomy = MCPTaxonomyManager.getInstance();

// Register custom protocol
mcpTaxonomy.registerProtocol('custom-api', {
  version: 'v1',
  description: 'Custom API protocol',
  tags: ['custom', 'api', 'integration']
});

// Search for protocols
const results = mcpTaxonomy.searchProtocols(/github/);
console.log('Found protocols:', results);
```

### Validation and Compliance

```typescript
import { validateMCPComponentName } from '@machine-native-ops/namespaces-mcp';

const protocolName = 'platform-github-protocol-v1';
const validation = validateMCPComponentName(protocolName);

if (!validation.valid) {
  console.error('Validation errors:', validation.violations);
  validation.violations.forEach(v => {
    console.log(`- ${v.message}`);
    if (v.suggestion) {
      console.log(`  Suggestion: ${v.suggestion}`);
    }
  });
}
```

## 🔗 Integration with Other Packages

### With SDK
```typescript
import { MCPTaxonomyManager } from '@machine-native-ops/namespaces-mcp';
import { SDKTaxonomyManager } from '@machine-native-ops/namespaces-sdk';

const mcpTaxonomy = MCPTaxonomyManager.getInstance();
const sdkTaxonomy = SDKTaxonomyManager.getInstance();

// Generate consistent names across packages
const mcpNames = mcpTaxonomy.generateProtocolNames('github', 'v1');
const sdkNames = sdkTaxonomy.generateToolNames('github', 'v1');

console.log(mcpNames.canonical); // platform-github-protocol-v1
console.log(sdkNames.canonical); // platform-github-tool-v1
```

### With ADK
```typescript
// MCP and ADK integration for agent-protocol communication
const protocolNames = mcpTaxonomy.generateProtocolNames('agent-comm', 'v1');
// Use these names in ADK agent configuration
```

## 📊 Validation Rules

| Rule ID | Pattern | Severity | Description |
|---------|---------|----------|-------------|
| mcp-protocol-prefix | `/^(platform\|int\|obs\|gov)-.*-protocol-v\d+/` | error | Protocol naming pattern |
| kebab-case | `/^[a-z]+(-[a-z0-9]+)*$/` | error | Must use kebab-case |
| max-length | `/^.{1,253}$/` | error | Max 253 characters |

## 🎯 Use Cases

### 1. Protocol Registration
```typescript
const mcpTaxonomy = MCPTaxonomyManager.getInstance();

mcpTaxonomy.registerProtocol('github', {
  version: 'v1',
  description: 'GitHub API protocol',
  tags: ['github', 'vcs']
});
```

### 2. Server Naming
```typescript
const serverNames = mcpTaxonomy.generateServerNames('api-gateway', 'v2');
// Use serverNames.pascal for class name
// Use serverNames.kebab for configuration
```

### 3. Tool Registration
```typescript
const toolNames = mcpTaxonomy.generateToolNames('search', 'v1');
mcpTaxonomy.registerProtocol(toolNames.canonical, {
  description: 'Search tool protocol'
});
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Packages

- [@machine-native-ops/taxonomy-core](../taxonomy-core) - Core taxonomy system
- [@machine-native-ops/namespaces-sdk](../namespaces-sdk) - SDK integration
- [@machine-native-ops/namespaces-adk](../namespaces-adk) - ADK integration

## 📞 Support

- **Documentation**: [Integration Guide](../INTEGRATION_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/MachineNativeOps/machine-native-ops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MachineNativeOps/machine-native-ops/discussions)

---

**Version**: 1.0.0  
**Maintainer**: Machine Native Ops Team  
**Core Values**: Systematic • Rigorous • Intuitive • Consistent