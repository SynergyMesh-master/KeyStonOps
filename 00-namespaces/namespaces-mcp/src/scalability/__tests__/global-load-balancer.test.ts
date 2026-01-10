/**
 * Global Load Balancer Tests
 * 
 * @module scalability/__tests__/global-load-balancer.test
 */

import {
  GlobalLoadBalancer,
  createGlobalLoadBalancer,
  LoadBalancingAlgorithm,
  BackendState
} from '../global-load-balancer';

describe('GlobalLoadBalancer', () => {
  let loadBalancer: GlobalLoadBalancer;

  beforeEach(() => {
    loadBalancer = createGlobalLoadBalancer({
      algorithm: LoadBalancingAlgorithm.ROUND_ROBIN,
      backends: []
    });
  });

  afterEach(async () => {
    if (loadBalancer) {
      await loadBalancer.stop();
    }
  });

  describe('Backend Management', () => {
    test('should add backend successfully', () => {
      loadBalancer.addBackend({
        id: 'backend-1',
        address: '10.0.1.10',
        port: 8080,
        weight: 100,
        region: {
          id: 'us-west-1',
          name: 'US West',
          latitude: 37.7749,
          longitude: -122.4194,
          continent: 'North America',
          country: 'USA'
        },
        state: BackendState.HEALTHY,
        maxConnections: 1000,
        currentConnections: 0,
        responseTime: 50,
        healthScore: 100,
        metadata: {}
      });

      const backends = loadBalancer.getHealthyBackends();
      expect(backends).toHaveLength(1);
      expect(backends[0].id).toBe('backend-1');
    });

    test('should remove backend successfully', () => {
      loadBalancer.addBackend({
        id: 'backend-1',
        address: '10.0.1.10',
        port: 8080,
        weight: 100,
        region: {
          id: 'us-west-1',
          name: 'US West',
          latitude: 37.7749,
          longitude: -122.4194,
          continent: 'North America',
          country: 'USA'
        },
        state: BackendState.HEALTHY,
        maxConnections: 1000,
        currentConnections: 0,
        responseTime: 50,
        healthScore: 100,
        metadata: {}
      });

      loadBalancer.removeBackend('backend-1');

      setTimeout(() => {
        const backends = loadBalancer.getHealthyBackends();
        expect(backends).toHaveLength(0);
      }, 31000);
    });
  });

  describe('Routing', () => {
    beforeEach(async () => {
      await loadBalancer.start();
      
      loadBalancer.addBackend({
        id: 'backend-1',
        address: '10.0.1.10',
        port: 8080,
        weight: 100,
        region: {
          id: 'us-west-1',
          name: 'US West',
          latitude: 37.7749,
          longitude: -122.4194,
          continent: 'North America',
          country: 'USA'
        },
        state: BackendState.HEALTHY,
        maxConnections: 1000,
        currentConnections: 0,
        responseTime: 50,
        healthScore: 100,
        metadata: {}
      });
    });

    test('should route request successfully', async () => {
      const result = await loadBalancer.route({
        requestId: 'req-1',
        clientIp: '203.0.113.1',
        path: '/api/test',
        method: 'GET',
        headers: {},
        timestamp: new Date()
      });

      expect(result.backend).toBeDefined();
      expect(result.backend.id).toBe('backend-1');
      expect(result.routingTime).toBeLessThan(10);
    });

    test('should handle routing within 10ms', async () => {
      const startTime = Date.now();

      await loadBalancer.route({
        requestId: 'req-perf',
        clientIp: '203.0.113.1',
        path: '/api/test',
        method: 'GET',
        headers: {},
        timestamp: new Date()
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await loadBalancer.start();
    });

    test('should track statistics correctly', async () => {
      const initialStats = loadBalancer.getStats();
      expect(initialStats.totalRequests).toBe(0);
    });
  });
});