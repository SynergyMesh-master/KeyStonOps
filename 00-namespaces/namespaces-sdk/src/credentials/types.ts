/**
 * Credential Types and Interfaces
 * 
 * Defines types and interfaces for credentials, tokens, and provider configurations.
 */

/**
 * Credential type enumeration
 */
export enum CredentialType {
  API_KEY = 'api_key',
  OAUTH_TOKEN = 'oauth_token',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  SSH_KEY = 'ssh_key',
  CERTIFICATE = 'certificate',
  SERVICE_ACCOUNT = 'service_account',
  CUSTOM = 'custom'
}

/**
 * Base credential interface
 */
export interface Credential {
  /** Unique credential identifier */
  id: string;
  /** Credential type */
  type: CredentialType;
  /** Service/adapter name */
  service: string;
  /** Credential scope */
  scope?: string[];
  /** Expiration timestamp */
  expiresAt?: Date;
  /** Creation timestamp */
  createdAt: Date;
  /** Last used timestamp */
  lastUsedAt?: Date;
  /** Metadata */
  metadata?: Record<string, any>;
}

/**
 * API Key credential
 */
export interface APIKeyCredential extends Credential {
  type: CredentialType.API_KEY;
  apiKey: string;
}

/**
 * OAuth token credential
 */
export interface OAuthTokenCredential extends Credential {
  type: CredentialType.OAUTH_TOKEN;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string[];
  expiresAt?: Date;
}

/**
 * Bearer token credential
 */
export interface BearerTokenCredential extends Credential {
  type: CredentialType.BEARER_TOKEN;
  token: string;
}

/**
 * Basic auth credential
 */
export interface BasicAuthCredential extends Credential {
  type: CredentialType.BASIC_AUTH;
  username: string;
  password: string;
}

/**
 * SSH key credential
 */
export interface SSHKeyCredential extends Credential {
  type: CredentialType.SSH_KEY;
  privateKey: string;
  publicKey?: string;
  passphrase?: string;
}

/**
 * Certificate credential
 */
export interface CertificateCredential extends Credential {
  type: CredentialType.CERTIFICATE;
  certificate: string;
  privateKey: string;
  passphrase?: string;
  chain?: string[];
}

/**
 * Service account credential
 */
export interface ServiceAccountCredential extends Credential {
  type: CredentialType.SERVICE_ACCOUNT;
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  additionalFields?: Record<string, any>;
}

/**
 * Custom credential
 */
export interface CustomCredential extends Credential {
  type: CredentialType.CUSTOM;
  data: Record<string, any>;
}

/**
 * Union type for all credentials
 */
export type AnyCredential =
  | APIKeyCredential
  | OAuthTokenCredential
  | BearerTokenCredential
  | BasicAuthCredential
  | SSHKeyCredential
  | CertificateCredential
  | ServiceAccountCredential
  | CustomCredential;

/**
 * Credential provider interface
 */
export interface CredentialProvider {
  /** Provider name */
  name: string;
  /** Provider priority (higher = checked first) */
  priority: number;
  /** Initialize provider */
  initialize(): Promise<void>;
  /** Get credential by service and scope */
  getCredential(service: string, scope?: string[]): Promise<AnyCredential | null>;
  /** Check if provider has credential */
  hasCredential(service: string, scope?: string[]): Promise<boolean>;
  /** Store credential */
  storeCredential(credential: AnyCredential): Promise<void>;
  /** Delete credential */
  deleteCredential(id: string): Promise<boolean>;
  /** List all credentials */
  listCredentials(): Promise<Credential[]>;
  /** Shutdown provider */
  shutdown(): Promise<void>;
}

/**
 * Credential usage record
 */
export interface CredentialUsage {
  credentialId: string;
  service: string;
  timestamp: Date;
  operation?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Credential rotation policy
 */
export interface RotationPolicy {
  /** Enable automatic rotation */
  enabled: boolean;
  /** Rotation interval in days */
  intervalDays: number;
  /** Warning threshold in days before expiration */
  warningThresholdDays: number;
  /** Rotation callback */
  onRotate?: (credential: AnyCredential) => Promise<AnyCredential>;
}

/**
 * Credential validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Credential manager configuration
 */
export interface CredentialManagerConfig {
  /** Credential providers */
  providers?: CredentialProvider[];
  /** Enable usage tracking */
  trackUsage?: boolean;
  /** Enable automatic rotation */
  autoRotate?: boolean;
  /** Rotation policies by service */
  rotationPolicies?: Record<string, RotationPolicy>;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Enable encryption at rest */
  encryptAtRest?: boolean;
  /** Encryption key */
  encryptionKey?: string;
}

/**
 * Type guards
 */
export class CredentialTypeGuards {
  static isAPIKey(cred: AnyCredential): cred is APIKeyCredential {
    return cred.type === CredentialType.API_KEY;
  }

  static isOAuthToken(cred: AnyCredential): cred is OAuthTokenCredential {
    return cred.type === CredentialType.OAUTH_TOKEN;
  }

  static isBearerToken(cred: AnyCredential): cred is BearerTokenCredential {
    return cred.type === CredentialType.BEARER_TOKEN;
  }

  static isBasicAuth(cred: AnyCredential): cred is BasicAuthCredential {
    return cred.type === CredentialType.BASIC_AUTH;
  }

  static isSSHKey(cred: AnyCredential): cred is SSHKeyCredential {
    return cred.type === CredentialType.SSH_KEY;
  }

  static isCertificate(cred: AnyCredential): cred is CertificateCredential {
    return cred.type === CredentialType.CERTIFICATE;
  }

  static isServiceAccount(cred: AnyCredential): cred is ServiceAccountCredential {
    return cred.type === CredentialType.SERVICE_ACCOUNT;
  }

  static isCustom(cred: AnyCredential): cred is CustomCredential {
    return cred.type === CredentialType.CUSTOM;
  }
}

/**
 * Credential utilities
 */
export class CredentialUtils {
  /**
   * Check if credential is expired
   */
  static isExpired(credential: AnyCredential): boolean {
    if (!credential.expiresAt) {
      return false;
    }
    return new Date() >= credential.expiresAt;
  }

  /**
   * Check if credential is expiring soon
   */
  static isExpiringSoon(credential: AnyCredential, thresholdDays: number = 7): boolean {
    if (!credential.expiresAt) {
      return false;
    }
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + thresholdDays);
    return credential.expiresAt <= threshold;
  }

  /**
   * Sanitize credential for logging (remove sensitive data)
   */
  static sanitize(credential: AnyCredential): Partial<AnyCredential> {
    const { id, type, service, scope, expiresAt, createdAt, lastUsedAt, metadata } = credential;
    return {
      id,
      type,
      service,
      scope,
      expiresAt,
      createdAt,
      lastUsedAt,
      metadata
    };
  }

  /**
   * Generate credential ID
   */
  static generateId(service: string, type: CredentialType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${service}_${type}_${timestamp}_${random}`;
  }

  /**
   * Validate credential structure
   */
  static validate(credential: AnyCredential): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!credential.id) {
      errors.push('Credential ID is required');
    }

    if (!credential.type) {
      errors.push('Credential type is required');
    }

    if (!credential.service) {
      errors.push('Service name is required');
    }

    if (this.isExpired(credential)) {
      errors.push('Credential is expired');
    }

    if (this.isExpiringSoon(credential)) {
      warnings.push('Credential is expiring soon');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}