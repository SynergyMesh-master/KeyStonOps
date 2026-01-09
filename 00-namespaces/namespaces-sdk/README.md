# namespace-sdk

> A machine-native, auditable platform integration layer for MCP tool wrapping

[![npm version](https://img.shields.io/npm/v/namespace-sdk.svg)](https://www.npmjs.com/package/namespace-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

`namespace-sdk` is a comprehensive SDK designed to wrap external APIs, SDKs, and service interfaces into standardized, MCP-compatible, and auditable tools. It provides a robust foundation for building machine-native governance systems with enterprise-grade features.

## Key Features

- 🔌 **Multi-Service Integration** - Built-in adapters for GitHub, Cloudflare, OpenAI, Google, and more
- 🛡️ **Security First** - Comprehensive credential management with multiple provider support
- 📊 **Full Observability** - Logging, tracing, metrics, and audit trails out of the box
- ✅ **Schema Validation** - Automatic validation of all inputs and outputs
- 🔧 **Extensible** - Plugin system for custom adapters and tools
- 📝 **Type Safe** - Full TypeScript support with strong typing
- 🎯 **MCP Compliant** - Full support for Model Context Protocol

## Quick Start

### Installation

```bash
npm install namespace-sdk
```

### Basic Usage

```typescript
import { initializeSDK } from 'namespace-sdk';

// Initialize the SDK
const sdk = await initializeSDK({
  environment: 'production',
  observability: {
    logging: true,
    audit: true
  }
});

// List available tools
const tools = await sdk.listTools();

// Invoke a tool
const result = await sdk.invokeTool('github_create_issue', {
  repository: 'owner/repo',
  title: 'Bug report',
  body: 'Description of the issue'
});

// Shutdown
await sdk.shutdown();
```

## Architecture

The SDK is organized into several key layers:

### Core Layer
- **SDK**: Main orchestration and lifecycle management
- **Registry**: Tool and plugin registration
- **Tool**: Base classes for tool wrappers
- **Errors**: Standardized error handling

### Schema Layer
- **Validator**: JSON Schema validation engine
- **Types**: Type definitions and utilities
- **Registry**: Schema versioning and compatibility

### Credential Layer
- **Manager**: Centralized credential management
- **Providers**: Environment, File, Vault, Cloud KMS support

### Observability Layer
- **Logger**: Structured logging
- **Tracer**: Distributed tracing
- **Metrics**: Performance metrics
- **Audit**: Complete audit trail

### Adapter Layer
- **GitHub**: GitHub API integration
- **Cloudflare**: Cloudflare API integration
- **OpenAI**: OpenAI API integration
- **Google**: Google APIs integration

## Supported Adapters

| Adapter | Status | Tools |
|---------|--------|-------|
| GitHub | ✅ Ready | create_issue, list_repos, create_pr, get_file, commit_file |
| Cloudflare | 🚧 In Progress | - |
| OpenAI | 🚧 In Progress | - |
| Google | 🚧 In Progress | - |

## Configuration

### Environment Variables

```bash
# Credentials
SDK_CRED_GITHUB_TOKEN=ghp_xxxxx
SDK_CRED_OPENAI_API_KEY=sk-xxxxx

# Configuration
SDK_DEBUG=false
SDK_LOG_LEVEL=info
SDK_AUDIT_ENABLED=true
```

### Configuration File

Create `config/production.json`:

```json
{
  "environment": "production",
  "sdk": {
    "debug": false
  },
  "credentials": {
    "providers": ["env", "vault"],
    "cacheTTL": 300
  },
  "observability": {
    "logging": {
      "enabled": true,
      "level": "info"
    },
    "audit": {
      "enabled": true,
      "storage": "file"
    }
  }
}
```

## Documentation

- [Quick Start Guide](./src/docs/quickstart.md)
- [API Reference](./src/docs/api.md)
- [Adapter Documentation](./src/docs/adapters.md)
- [Plugin Development](./src/docs/plugins.md)
- [Security Best Practices](./src/docs/security.md)

## Examples

### Creating a GitHub Issue

```typescript
const result = await sdk.invokeTool('github_create_issue', {
  repository: 'owner/repo',
  title: 'Bug: Application crashes on startup',
  body: 'Detailed description of the bug...',
  labels: ['bug', 'high-priority']
});

console.log('Issue created:', result.data.url);
```

### Using Custom Context

```typescript
const result = await sdk.invokeTool(
  'github_create_issue',
  input,
  {
    userId: 'user123',
    sessionId: 'session456',
    correlationId: 'request789'
  }
);
```

### Querying Audit Logs

```typescript
const auditLogger = sdk.getAuditLogger();
const events = await auditLogger.query({
  eventTypes: ['tool_invoked'],
  startTime: new Date('2024-01-01'),
  success: true
});

console.log(`Found ${events.length} successful tool invocations`);
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- 📖 [Documentation](https://namespace-sdk.io/docs)
- 🐛 [Issue Tracker](https://github.com/ninjatech-ai/machine-native-ops/issues)
- 💬 [Discussions](https://github.com/ninjatech-ai/machine-native-ops/discussions)

## Roadmap

- [ ] Additional adapters (AWS, Azure, Stripe, etc.)
- [ ] GraphQL support
- [ ] WebSocket support for real-time tools
- [ ] Enhanced plugin marketplace
- [ ] Visual tool builder
- [ ] Performance optimizations

---

Built with ❤️ by [NinjaTech AI](https://ninjatech.ai)