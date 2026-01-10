/**
 * Zero-Trust Security System
 * 
 * Unified system integrating all security components for
 * comprehensive zero-trust security architecture.
 * 
 * @module security/zero-trust-security-system
 */

import { EventEmitter } from 'events';
import { QuantumCryptography, createQuantumCryptography } from './quantum-cryptography';
import { AIThreatDetection, createAIThreatDetection } from './ai-threat-detection';
import { BehavioralAuthentication, createBehavioralAuthentication } from './behavioral-authentication';
import { ZeroTrustGateway, createZeroTrustGateway } from './zero-trust-gateway';
import { SecurityIntelligence, createSecurityIntelligence } from './security-intelligence';

export interface ZeroTrustSecuritySystemConfig {
  enableQuantumCrypto: boolean;
  enableThreatDetection: boolean;
  enableBehavioralAuth: boolean;
  enableZeroTrustGateway: boolean;
  enableSecurityIntelligence: boolean;
}

export class ZeroTrustSecuritySystem extends EventEmitter {
  private config: ZeroTrustSecuritySystemConfig;
  private quantumCrypto?: QuantumCryptography;
  private threatDetection?: AIThreatDetection;
  private behavioralAuth?: BehavioralAuthentication;
  private zeroTrustGateway?: ZeroTrustGateway;
  private securityIntelligence?: SecurityIntelligence;
  private isRunning: boolean;

  constructor(config: ZeroTrustSecuritySystemConfig) {
    super();
    this.config = config;
    this.isRunning = false;
    this.initializeComponents();
  }

  private initializeComponents(): void {
    if (this.config.enableQuantumCrypto) {
      this.quantumCrypto = createQuantumCryptography();
    }
    if (this.config.enableThreatDetection) {
      this.threatDetection = createAIThreatDetection();
    }
    if (this.config.enableBehavioralAuth) {
      this.behavioralAuth = createBehavioralAuthentication();
    }
    if (this.config.enableZeroTrustGateway) {
      this.zeroTrustGateway = createZeroTrustGateway();
    }
    if (this.config.enableSecurityIntelligence) {
      this.securityIntelligence = createSecurityIntelligence();
    }
  }

  async start(): Promise<void> {
    this.isRunning = true;
    
    if (this.quantumCrypto) await this.quantumCrypto.start();
    if (this.threatDetection) await this.threatDetection.start();
    if (this.behavioralAuth) await this.behavioralAuth.start();
    if (this.zeroTrustGateway) await this.zeroTrustGateway.start();
    if (this.securityIntelligence) await this.securityIntelligence.start();
    
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.quantumCrypto) await this.quantumCrypto.stop();
    if (this.threatDetection) await this.threatDetection.stop();
    if (this.behavioralAuth) await this.behavioralAuth.stop();
    if (this.zeroTrustGateway) await this.zeroTrustGateway.stop();
    if (this.securityIntelligence) await this.securityIntelligence.stop();
    
    this.emit('stopped');
  }

  getSystemStatus() {
    return {
      quantumCrypto: this.quantumCrypto ? 'active' : 'disabled',
      threatDetection: this.threatDetection ? 'active' : 'disabled',
      behavioralAuth: this.behavioralAuth ? 'active' : 'disabled',
      zeroTrustGateway: this.zeroTrustGateway ? 'active' : 'disabled',
      securityIntelligence: this.securityIntelligence ? 'active' : 'disabled'
    };
  }
}

export function createZeroTrustSecuritySystem(
  config?: Partial<ZeroTrustSecuritySystemConfig>
): ZeroTrustSecuritySystem {
  const defaultConfig: ZeroTrustSecuritySystemConfig = {
    enableQuantumCrypto: true,
    enableThreatDetection: true,
    enableBehavioralAuth: true,
    enableZeroTrustGateway: true,
    enableSecurityIntelligence: true
  };

  return new ZeroTrustSecuritySystem({ ...defaultConfig, ...config });
}