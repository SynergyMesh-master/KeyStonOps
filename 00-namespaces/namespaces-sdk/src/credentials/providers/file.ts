/**
 * File-based Credential Provider
 * 
 * Loads credentials from JSON files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  CredentialProvider,
  AnyCredential,
  Credential,
  CredentialUtils
} from '../types';

/**
 * File credential provider configuration
 */
export interface FileProviderConfig {
  /** Path to credentials file */
  filePath: string;
  /** Auto-save on changes */
  autoSave?: boolean;
  /** File permissions (octal) */
  fileMode?: number;
}

/**
 * File-based credential provider
 */
export class FileCredentialProvider implements CredentialProvider {
  name = 'file';
  priority = 50; // Medium priority

  private credentials: Map<string, AnyCredential>;
  private config: FileProviderConfig;
  private dirty: boolean;

  constructor(config: FileProviderConfig) {
    this.credentials = new Map();
    this.config = {
      autoSave: true,
      fileMode: 0o600, // Read/write for owner only
      ...config
    };
    this.dirty = false;
  }

  async initialize(): Promise<void> {
    await this.loadFromFile();
  }

  /**
   * Load credentials from file
   */
  private async loadFromFile(): Promise<void> {
    try {
      const content = await fs.readFile(this.config.filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.credentials && Array.isArray(data.credentials)) {
        for (const cred of data.credentials) {
          // Restore Date objects
          if (cred.createdAt) cred.createdAt = new Date(cred.createdAt);
          if (cred.expiresAt) cred.expiresAt = new Date(cred.expiresAt);
          if (cred.lastUsedAt) cred.lastUsedAt = new Date(cred.lastUsedAt);

          this.credentials.set(cred.service, cred);
        }
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with empty credentials
        return;
      }
      throw new Error(`Failed to load credentials from file: ${error.message}`);
    }
  }

  /**
   * Save credentials to file
   */
  private async saveToFile(): Promise<void> {
    const data = {
      version: '1.0',
      credentials: Array.from(this.credentials.values())
    };

    const content = JSON.stringify(data, null, 2);

    // Ensure directory exists
    const dir = path.dirname(this.config.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file with restricted permissions
    await fs.writeFile(this.config.filePath, content, {
      mode: this.config.fileMode
    });

    this.dirty = false;
  }

  async getCredential(service: string, scope?: string[]): Promise<AnyCredential | null> {
    return this.credentials.get(service) || null;
  }

  async hasCredential(service: string, scope?: string[]): Promise<boolean> {
    return this.credentials.has(service);
  }

  async storeCredential(credential: AnyCredential): Promise<void> {
    this.credentials.set(credential.service, credential);
    this.dirty = true;

    if (this.config.autoSave) {
      await this.saveToFile();
    }
  }

  async deleteCredential(id: string): Promise<boolean> {
    for (const [service, cred] of this.credentials.entries()) {
      if (cred.id === id) {
        this.credentials.delete(service);
        this.dirty = true;

        if (this.config.autoSave) {
          await this.saveToFile();
        }

        return true;
      }
    }

    return false;
  }

  async listCredentials(): Promise<Credential[]> {
    return Array.from(this.credentials.values()).map(cred => CredentialUtils.sanitize(cred) as Credential);
  }

  async shutdown(): Promise<void> {
    if (this.dirty) {
      await this.saveToFile();
    }
    this.credentials.clear();
  }

  /**
   * Force save to file
   */
  async flush(): Promise<void> {
    await this.saveToFile();
  }
}