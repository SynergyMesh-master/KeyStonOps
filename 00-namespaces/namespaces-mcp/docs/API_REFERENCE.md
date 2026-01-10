# API Reference Documentation

## Overview

This document provides comprehensive API reference for all modules in the Machine Native Ops platform.

---

## Scalability Module

### Elastic Resource Manager

#### `createElasticResourceManager(config?: Partial<ElasticResourceManagerConfig>): ElasticResourceManager`

Creates a new Elastic Resource Manager instance.

**Parameters:**
- `config` (optional): Configuration object

**Returns:** `ElasticResourceManager` instance

**Example:**
```typescript
import { createElasticResourceManager, ResourceType } from '@machine-native-ops/namespaces-mcp/scalability';

const manager = createElasticResourceManager({
  defaultStrategy: AllocationStrategy.BEST_FIT,
  enableAutoScaling: true
});

await manager.start();
```

#### `allocate(request: AllocationRequest): Promise<AllocationResult>`

Allocates resources based on the request.

**Parameters:**
- `request`: Allocation request object
  - `requestId`: Unique request identifier
  - `resources`: Array of resource specifications
  - `strategy`: Allocation strategy
  - `priority`: Request priority (0-10)

**Returns:** Promise resolving to allocation result

**Performance:** <100ms

**Example:**
```typescript
const result = await manager.allocate({
  requestId: 'req-123',
  resources: [
    {
      type: ResourceType.COMPUTE,
      amount: 4,
      unit: 'cores'
    }
  ],
  strategy: AllocationStrategy.BEST_FIT,
  priority: 8
});
```

---

### Global Load Balancer

#### `createGlobalLoadBalancer(config?: Partial<GlobalLoadBalancerConfig>): GlobalLoadBalancer`

Creates a new Global Load Balancer instance.

**Parameters:**
- `config` (optional): Configuration object

**Returns:** `GlobalLoadBalancer` instance

**Example:**
```typescript
import { createGlobalLoadBalancer, LoadBalancingAlgorithm } from '@machine-native-ops/namespaces-mcp/scalability';

const loadBalancer = createGlobalLoadBalancer({
  algorithm: LoadBalancingAlgorithm.ADAPTIVE
});

await loadBalancer.start();
```

#### `route(request: RoutingRequest): Promise<RoutingResult>`

Routes a request to an appropriate backend server.

**Parameters:**
- `request`: Routing request object
  - `requestId`: Unique request identifier
  - `clientIp`: Client IP address
  - `path`: Request path
  - `method`: HTTP method
  - `headers`: Request headers

**Returns:** Promise resolving to routing result

**Performance:** <10ms

---

## Sustainability Module

### Carbon Monitor

#### `createCarbonMonitor(config?: Partial<CarbonMonitorConfig>): CarbonMonitor`

Creates a new Carbon Monitor instance.

**Parameters:**
- `config` (optional): Configuration object

**Returns:** `CarbonMonitor` instance

**Example:**
```typescript
import { createCarbonMonitor } from '@machine-native-ops/namespaces-mcp/sustainability';

const monitor = createCarbonMonitor({
  enableRealTimeTracking: true,
  trackingInterval: 60
});

await monitor.start();
```

#### `trackEmission(source: string, component: string, energyConsumption: number): Promise<CarbonEmission>`

Tracks carbon emission for a component.

**Parameters:**
- `source`: Emission source identifier
- `component`: Component name
- `energyConsumption`: Energy consumed in kWh

**Returns:** Promise resolving to carbon emission record

**Performance:** <1ms

---

## Security Module

### Quantum Cryptography

#### `createQuantumCryptography(config?: Partial<QuantumCryptographyConfig>): QuantumCryptography`

Creates a new Quantum Cryptography instance.

**Parameters:**
- `config` (optional): Configuration object

**Returns:** `QuantumCryptography` instance

**Example:**
```typescript
import { createQuantumCryptography, QuantumAlgorithm } from '@machine-native-ops/namespaces-mcp/security';

const crypto = createQuantumCryptography({
  defaultAlgorithm: QuantumAlgorithm.CRYSTALS_KYBER
});

await crypto.start();
```

#### `encrypt(plaintext: Buffer, keyId?: string): Promise<EncryptionResult>`

Encrypts data using quantum-resistant algorithms.

**Parameters:**
- `plaintext`: Data to encrypt
- `keyId` (optional): Specific key to use

**Returns:** Promise resolving to encryption result

**Performance:** <10ms

---

## Type Definitions

### ResourceType

```typescript
enum ResourceType {
  COMPUTE = 'compute',
  MEMORY = 'memory',
  STORAGE = 'storage',
  NETWORK = 'network',
  GPU = 'gpu',
  CUSTOM = 'custom'
}
```

### AllocationStrategy

```typescript
enum AllocationStrategy {
  BEST_FIT = 'best-fit',
  FIRST_FIT = 'first-fit',
  WORST_FIT = 'worst-fit',
  NEXT_FIT = 'next-fit',
  PREDICTIVE = 'predictive',
  COST_OPTIMIZED = 'cost-optimized'
}
```

### LoadBalancingAlgorithm

```typescript
enum LoadBalancingAlgorithm {
  ROUND_ROBIN = 'round-robin',
  LEAST_CONNECTIONS = 'least-connections',
  LEAST_RESPONSE_TIME = 'least-response-time',
  IP_HASH = 'ip-hash',
  WEIGHTED_ROUND_ROBIN = 'weighted-round-robin',
  GEOGRAPHIC = 'geographic',
  HEALTH_BASED = 'health-based',
  ADAPTIVE = 'adaptive'
}
```

---

## Error Handling

All async methods may throw errors. Always use try-catch blocks:

```typescript
try {
  const result = await manager.allocate(request);
  // Handle success
} catch (error) {
  console.error('Allocation failed:', error);
  // Handle error
}
```

---

## Events

All components extend EventEmitter and emit various events:

### Common Events

- `started`: Component started successfully
- `stopped`: Component stopped
- `error`: Error occurred

### Component-Specific Events

**Elastic Resource Manager:**
- `allocation-success`: Resource allocated
- `allocation-failed`: Allocation failed
- `scaled-up`: Resources scaled up
- `scaled-down`: Resources scaled down

**Global Load Balancer:**
- `route-success`: Request routed successfully
- `route-failed`: Routing failed
- `backend-added`: Backend server added
- `backend-removed`: Backend server removed

**Example:**
```typescript
manager.on('allocation-success', (data) => {
  console.log('Allocated:', data.resourceCount, 'resources');
});
```

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-10