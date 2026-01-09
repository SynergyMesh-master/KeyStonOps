# 00-namespaces

> Core namespace projects for machine-native operations

## Overview

This directory contains the foundational namespace projects that provide the core infrastructure for machine-native governance systems.

## Projects

### [namespaces-sdk](./namespaces-sdk)

**Status:** ✅ Ready

A machine-native, auditable platform integration layer for MCP tool wrapping. Provides standardized interfaces for external APIs with built-in schema validation, credential management, and audit trails.

**Key Features:**
- Multi-service integration (GitHub, Cloudflare, OpenAI, Google)
- MCP protocol compliance
- Schema validation
- Credential management
- Full observability (logging, tracing, metrics, audit)
- Plugin system

### [namespaces-mcp](./namespaces-mcp)

**Status:** 🚧 Under Development

Model Context Protocol (MCP) server implementation that exposes tools from namespaces-sdk via the MCP protocol.

**Planned Features:**
- Full MCP protocol implementation
- JSON-RPC 2.0 server
- Tool discovery and invocation
- Multiple transport support

### [namespaces-adk](./namespaces-adk)

**Status:** 🚧 Under Development

Agent Development Kit for building autonomous agents that operate within the machine-native governance system.

**Planned Features:**
- Agent lifecycle management
- Task orchestration
- State management
- Agent templates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    namespaces-adk                       │
│              (Agent Development Kit)                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    namespaces-mcp                       │
│              (MCP Server Implementation)                │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    namespaces-sdk                       │
│         (Platform Integration Layer)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  GitHub  │  │Cloudflare│  │  OpenAI  │  ...       │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn
- TypeScript 5.x

### Installation

Each project can be installed independently:

```bash
# Install namespaces-sdk
cd namespaces-sdk
npm install

# Install namespaces-mcp (when available)
cd namespaces-mcp
npm install

# Install namespaces-adk (when available)
cd namespaces-adk
npm install
```

### Quick Start

See individual project README files for detailed setup instructions:

- [namespaces-sdk Quick Start](./namespaces-sdk/src/docs/quickstart.md)
- namespaces-mcp Quick Start (coming soon)
- namespaces-adk Quick Start (coming soon)

## Development

### Building All Projects

```bash
# From the 00-namespaces directory
for dir in namespaces-*/; do
  cd "$dir"
  npm install
  npm run build
  cd ..
done
```

### Running Tests

```bash
# Test all projects
for dir in namespaces-*/; do
  cd "$dir"
  npm test
  cd ..
done
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

All projects in this directory are licensed under the MIT License - see [LICENSE](../LICENSE) for details.

## Support

- 📖 [Documentation](https://namespace-sdk.io/docs)
- 🐛 [Issue Tracker](https://github.com/ninjatech-ai/machine-native-ops/issues)
- 💬 [Discussions](https://github.com/ninjatech-ai/machine-native-ops/discussions)

---

Built with ❤️ by [NinjaTech AI](https://ninjatech.ai)