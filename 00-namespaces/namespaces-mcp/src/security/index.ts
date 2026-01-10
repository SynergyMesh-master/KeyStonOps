/**
 * Security Module
 * 
 * Zero-trust security fabric with quantum cryptography,
 * AI threat detection, and behavioral authentication.
 * 
 * @module security
 */

// Quantum Cryptography
export {
  QuantumCryptography,
  createQuantumCryptography,
  QuantumAlgorithm,
  EncryptionMode,
  KeyType,
  CryptoKey,
  EncryptionResult,
  DecryptionResult,
  DigitalSignature,
  KeyRotationPolicy,
  QuantumCryptographyConfig
} from './quantum-cryptography';

// AI Threat Detection
export {
  AIThreatDetection,
  createAIThreatDetection,
  ThreatLevel,
  ThreatType,
  ThreatEvent,
  BehaviorProfile,
  AIThreatDetectionConfig
} from './ai-threat-detection';

// Behavioral Authentication
export {
  BehavioralAuthentication,
  createBehavioralAuthentication,
  AuthenticationMethod,
  RiskLevel,
  AuthenticationRequest,
  AuthenticationContext,
  AuthenticationResult,
  BehavioralAuthenticationConfig
} from './behavioral-authentication';

// Zero-Trust Gateway
export {
  ZeroTrustGateway,
  createZeroTrustGateway,
  AccessDecision,
  AccessRequest,
  AccessPolicy,
  ZeroTrustGatewayConfig
} from './zero-trust-gateway';

// Security Intelligence
export {
  SecurityIntelligence,
  createSecurityIntelligence,
  IncidentSeverity,
  SecurityEvent,
  SecurityIncident,
  SecurityIntelligenceConfig
} from './security-intelligence';

// Zero-Trust Security System
export {
  ZeroTrustSecuritySystem,
  createZeroTrustSecuritySystem,
  ZeroTrustSecuritySystemConfig
} from './zero-trust-security-system';

/**
 * Module version
 */
export const VERSION = '1.0.0';

/**
 * Module metadata
 */
export const METADATA = {
  name: 'Zero-Trust Security Fabric',
  version: VERSION,
  description: 'Next-generation quantum-resistant security with AI-powered threat detection',
  components: [
    'Quantum Cryptography',
    'AI Threat Detection',
    'Behavioral Authentication',
    'Zero-Trust Gateway',
    'Security Intelligence'
  ],
  performanceTargets: {
    encryptionTime: '<10ms',
    detectionTime: '<50ms',
    authenticationTime: '<100ms',
    policyEvaluation: '<25ms',
    responseTime: '<1s'
  }
};