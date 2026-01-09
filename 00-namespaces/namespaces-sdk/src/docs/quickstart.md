# Quick Start Guide

This guide will help you get started with namespace-sdk in minutes.

## Installation

```bash
npm install namespace-sdk
```

## Your First Tool Invocation

### 1. Set Up Credentials

Create a `.env` file:

```bash
SDK_CRED_GITHUB_TOKEN=your_github_token_here
```

### 2. Initialize the SDK

```typescript
import { initializeSDK } from 'namespace-sdk';

async function main() {
  // Initialize SDK
  const sdk = await initializeSDK({
    environment: 'development',
    debug: true
  });

  console.log('SDK initialized successfully!');
  
  // Your code here
  
  await sdk.shutdown();
}

main().catch(console.error);
```

### 3. List Available Tools

```typescript
// List all tools
const tools = await sdk.listTools();
console.log(`Found ${tools.length} tools`);

// Filter by adapter
const githubTools = await sdk.listTools({ adapter: 'github' });
console.log('GitHub tools:', githubTools.map(t => t.name));
```

### 4. Invoke a Tool

```typescript
// Create a GitHub issue
const result = await sdk.invokeTool('github_create_issue', {
  repository: 'owner/repo',
  title: 'Test Issue',
  body: 'This is a test issue created via namespace-sdk',
  labels: ['bug', 'test']
});

if (result.success) {
  console.log('Issue created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await sdk.invokeTool('github_create_issue', input);
  
  if (!result.success) {
    console.error('Tool execution failed:', result.error);
    return;
  }
  
  console.log('Success:', result.data);
} catch (error) {
  console.error('SDK error:', error);
}
```

### Using Context

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

### Checking Tool Metadata

```typescript
const metadata = await sdk.getToolMetadata('github_create_issue');
console.log('Tool:', metadata.title);
console.log('Description:', metadata.description);
console.log('Input Schema:', metadata.inputSchema);
console.log('Output Schema:', metadata.outputSchema);
```

## Configuration

### Basic Configuration

```typescript
const sdk = await initializeSDK({
  environment: 'production',
  debug: false,
  observability: {
    logging: true,
    tracing: true,
    metrics: true,
    audit: true
  }
});
```

### Using Configuration Files

Create `config/development.json`:

```json
{
  "environment": "development",
  "sdk": {
    "debug": true
  },
  "observability": {
    "logging": {
      "enabled": true,
      "level": "debug"
    }
  }
}
```

Then initialize:

```typescript
const sdk = await initializeSDK({
  configPath: './config/development.json'
});
```

## Next Steps

- Read the [Adapter Documentation](./adapters.md) to learn about available integrations
- Check the [API Reference](./api.md) for detailed API documentation
- Explore [Plugin Development](./plugins.md) to create custom adapters
- Review [Security Best Practices](./security.md) for production deployments

## Troubleshooting

### SDK Won't Initialize

Check that:
1. Credentials are properly set in environment variables
2. Configuration file is valid JSON
3. Required dependencies are installed

### Tool Not Found

```typescript
// Check if tool exists
const tools = await sdk.listTools();
const exists = tools.some(t => t.name === 'your_tool_name');
console.log('Tool exists:', exists);
```

### Credential Errors

```typescript
// Check credential availability
const hasCredential = await sdk.getCredentialManager()
  .hasCredential('github');
console.log('GitHub credential available:', hasCredential);
```

## Complete Example

```typescript
import { initializeSDK } from 'namespace-sdk';

async function createIssueExample() {
  // Initialize
  const sdk = await initializeSDK({
    environment: 'development',
    debug: true
  });

  try {
    // List tools
    const tools = await sdk.listTools({ adapter: 'github' });
    console.log('Available GitHub tools:', tools.length);

    // Create issue
    const result = await sdk.invokeTool('github_create_issue', {
      repository: 'owner/repo',
      title: 'Automated Issue',
      body: 'Created via namespace-sdk',
      labels: ['automated']
    });

    if (result.success) {
      console.log('✓ Issue created:', result.data.url);
    } else {
      console.error('✗ Failed:', result.error);
    }

  } finally {
    await sdk.shutdown();
  }
}

createIssueExample().catch(console.error);
```