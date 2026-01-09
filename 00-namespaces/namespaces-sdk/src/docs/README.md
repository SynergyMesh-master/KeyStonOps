# namespace-sdk

A machine-native, auditable platform integration layer for MCP tool wrapping.

## Overview

The `namespace-sdk` is a comprehensive SDK designed to wrap external APIs, SDKs, and service interfaces into standardized, MCP-compatible, and auditable tools. It provides a robust foundation for building machine-native governance systems with built-in support for:

- **Standardized Tool Interfaces**: All integrations exposed as MCP-compatible tools
- **Schema Validation**: Automatic validation of inputs and outputs
- **Credential Management**: Secure handling of API keys, tokens, and secrets
- **Observability**: Built-in logging, tracing, metrics, and audit trails
- **Extensibility**: Plugin system for adding new adapters and tools
- **Governance**: Audit trails, evidence collection, and compliance support

## Features

### Core Capabilities

- **Multi-Service Integration**: Built-in adapters for GitHub, Cloudflare, OpenAI, Google, and more
- **MCP Protocol Compliance**: Full support for Model Context Protocol
- **Type Safety**: Strong TypeScript typing throughout
- **Async/Await**: Modern async patterns for all operations
- **Error Handling**: Comprehensive error types and handling
- **Configuration Management**: Flexible configuration with environment overrides

### Security & Compliance

- **Credential Providers**: Support for environment variables, files, Vault, and cloud KMS
- **Least Privilege**: Scoped credentials and minimal permissions
- **Audit Logging**: Complete audit trail of all operations
- **Data Sanitization**: Automatic removal of sensitive data from logs
- **Encryption**: Support for encryption at rest

### Developer Experience

- **Easy Setup**: Simple initialization and configuration
- **Rich Documentation**: Comprehensive guides and API reference
- **Code Examples**: Working examples for common use cases
- **CLI Tools**: Command-line interface for testing and management
- **Plugin System**: Easy extension with custom adapters

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
console.log('Available tools:', tools);

// Invoke a tool
const result = await sdk.invokeTool('github_create_issue', {
  repository: 'owner/repo',
  title: 'Bug report',
  body: 'Description of the issue'
});

console.log('Issue created:', result.data);

// Shutdown
await sdk.shutdown();
```

### Configuration

Create a configuration file `config/production.json`:

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

## Architecture

The SDK is organized into several key components:

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
- **Providers**: Pluggable credential sources (env, file, vault, cloud)

### Observability Layer
- **Logger**: Structured logging
- **Tracer**: Distributed tracing
- **Metrics**: Performance metrics
- **Audit**: Audit trail capture

### Adapter Layer
- **GitHub**: GitHub API integration
- **Cloudflare**: Cloudflare API integration
- **OpenAI**: OpenAI API integration
- **Google**: Google APIs integration

### Plugin System
- **Loader**: Dynamic plugin loading
- **Registry**: Plugin management

## Documentation

- [Quick Start Guide](./quickstart.md)
- [Adapter Documentation](./adapters.md)
- [API Reference](./api.md)
- [Configuration Guide](./configuration.md)
- [Security Best Practices](./security.md)
- [Plugin Development](./plugins.md)

## Examples

See the `examples/` directory for complete working examples:

- Basic tool invocation
- Custom adapters
- Plugin development
- Credential management
- Observability setup

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../../LICENSE) for details.

## Support

- Documentation: https://namespace-sdk.io/docs
- Issues: https://github.com/namespace-sdk/issues
- Discussions: https://github.com/namespace-sdk/discussions