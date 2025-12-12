import { createHash, randomUUID } from 'crypto';
import { readFile, stat } from 'fs/promises';
import * as path from 'path';

import { SLSAAttestationService, SLSAProvenance, BuildMetadata } from './attestation';
import { PathValidationError } from '../errors';

// Define a safe root directory for allowed file operations
const SAFE_ROOT = path.resolve(process.cwd(), 'safefiles');

export interface BuildAttestation {
  id: string;
  timestamp: string;
  subject: {
    name: string;
    digest: string;
    path?: string;
  };
  predicate: {
    type: string;
    builder: BuilderInfo;
    recipe: RecipeInfo;
    metadata: MetadataInfo;
    materials?: Material[];
  };
  signature?: string;
  // 添加 SLSA 認證支援
  slsaProvenance?: SLSAProvenance;
}

export interface BuilderInfo {
  id: string;
  version: string;
  builderDependencies?: Dependency[];
}

export interface RecipeInfo {
  type: string;
  definedInMaterial?: string;
  entryPoint?: string;
  arguments?: Record<string, unknown>;
  environment?: Record<string, unknown>;
}

export interface MetadataInfo {
  buildStartedOn: string;
  buildFinishedOn: string;
  completeness: {
    parameters: boolean;
    environment: boolean;
    materials: boolean;
  };
  reproducible: boolean;
  buildInvocationId?: string;
}

export interface Material {
  uri: string;
  digest: Record<string, string>;
}

export interface Dependency {
  uri: string;
  digest: Record<string, string>;
  name?: string;
  version?: string;
}

export class ProvenanceService {
  private slsaService: SLSAAttestationService;

  constructor() {
    this.slsaService = new SLSAAttestationService();
  }
  /**
   * Generates a SHA256 digest for a file with path traversal protection
   * 
   * @param filePath - Relative path to the file within the safe directory
   * @returns SHA256 digest in format "sha256:hexstring"
   * @throws {PathValidationError} If the path attempts to escape the safe directory
   * 
   * @security Path Traversal Protection
   * - All paths are resolved relative to SAFE_ROOT
   * - Blocks directory traversal attempts (../)
   * - Blocks absolute paths (/path or C:\path)
   * - Cross-platform compatible (Windows/Linux/macOS)
   * 
   * @example
   * // Valid usage
   * const digest = await generateFileDigest('test-file.txt');
   * 
   * @example
   * // Blocked - directory traversal
   * await generateFileDigest('../../../etc/passwd'); // throws PathValidationError
   */
  async generateFileDigest(filePath: string): Promise<string> {
    // Normalize and resolve against the SAFE_ROOT
    const resolvedPath = path.resolve(SAFE_ROOT, filePath);
    // Ensure the resolved path is within SAFE_ROOT using relative path check
    const relativePath = path.relative(SAFE_ROOT, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new PathValidationError();
    }
    const content = await readFile(resolvedPath);
    const hash = createHash('sha256');
    hash.update(content);
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Creates a build attestation using SLSA format with path traversal protection
   * 
   * @param subjectPath - Relative path to the subject file within the safe directory
   * @param builder - Builder information including ID and version
   * @param metadata - Optional build metadata (timestamps, reproducibility, etc.)
   * @returns Build attestation with SLSA provenance
   * @throws {PathValidationError} If the path attempts to escape the safe directory
   * @throws {Error} If the subject path is not a file
   * 
   * @security Path Traversal Protection
   * - All paths are resolved relative to SAFE_ROOT
   * - Blocks directory traversal attempts (../)
   * - Blocks absolute paths (/path or C:\path)
   * - Cross-platform compatible (Windows/Linux/macOS)
   * 
   * @example
   * const attestation = await createBuildAttestation(
   *   'build-artifact.tar.gz',
   *   { id: 'https://builder.example.com', version: '1.0.0' },
   *   { reproducible: true }
   * );
   */
  async createBuildAttestation(
    subjectPath: string,
    builder: BuilderInfo,
    metadata: Partial<MetadataInfo> = {}
  ): Promise<BuildAttestation> {
    // Normalize and resolve against the SAFE_ROOT
    const resolvedPath = path.resolve(SAFE_ROOT, subjectPath);
    // Ensure the resolved path is within SAFE_ROOT using relative path check
    const relativePath = path.relative(SAFE_ROOT, resolvedPath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new PathValidationError();
    }
    const stats = await stat(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Subject path must be a file: ${subjectPath}`);
    }

    const content = await readFile(resolvedPath);
    const subject = this.slsaService.createSubjectFromContent(
      path.relative(process.cwd(), resolvedPath),
      content
    );

    // 生成格式為 att_timestamp_hash 的 ID
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${timestamp}${subjectPath}`)
      .digest('hex')
      .substring(0, 8);
    const attestationId = `att_${timestamp}_${hash}`;

    const buildInvocationId = metadata.buildInvocationId || randomUUID();
    const startedOn = metadata.buildStartedOn || new Date().toISOString();
    const finishedOn = metadata.buildFinishedOn || new Date().toISOString();

    const buildMetadata: BuildMetadata = {
      buildType: 'https://synergymesh.dev/contracts/build/v1',
      invocationId: buildInvocationId,
      startedOn,
      finishedOn,
      builder: {
        id: builder.id,
        version: {
          builderVersion: builder.version,
          nodeVersion: process.version,
        },
      },
      externalParameters: {
        entryPoint: 'npm run build',
        environment: process.env.NODE_ENV || 'production',
      },
      dependencies: builder.builderDependencies?.map((dep) => ({
        uri: dep.uri,
        digest: dep.digest,
        name: dep.name,
      })),
    };

    const slsaProvenance = await this.slsaService.createProvenance([subject], buildMetadata);

    // 轉換為既有的 BuildAttestation 格式以保持相容性
    return {
      id: attestationId,
      timestamp: startedOn,
      subject: {
        name: subject.name,
        digest: `sha256:${subject.digest.sha256}`,
        path: subjectPath,
      },
      predicate: {
        type: slsaProvenance.predicateType,
        builder,
        recipe: {
          type: 'https://github.com/synergymesh/build',
          definedInMaterial: 'package.json',
          entryPoint: 'npm run build',
          arguments: buildMetadata.externalParameters || {},
          environment: {
            NODE_ENV: process.env.NODE_ENV || 'production',
            NODE_VERSION: process.version,
          },
        },
        metadata: {
          buildStartedOn: startedOn,
          buildFinishedOn: finishedOn,
          completeness: {
            parameters: true,
            environment: true,
            materials: true,
          },
          reproducible: metadata.reproducible !== undefined ? metadata.reproducible : false,
          buildInvocationId,
        },
      },
      // 附加 SLSA 認證資料
      slsaProvenance,
    };
  }

  /**
   * 驗證認證的完整性
   */
  async verifyAttestation(attestation: BuildAttestation): Promise<boolean> {
    try {
      // 基本結構驗證
      if (
        !attestation.id ||
        !attestation.timestamp ||
        !attestation.subject ||
        !attestation.predicate
      ) {
        return false;
      }

      // 如果有文件路徑，驗證摘要
      if (attestation.subject.path) {
        const currentDigest = await this.generateFileDigest(attestation.subject.path);
        return currentDigest === attestation.subject.digest;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 導出認證為 JSON 格式
   */
  exportAttestation(attestation: BuildAttestation): string {
    return JSON.stringify(attestation, null, 2);
  }

  /**
   * 從 JSON 導入認證
   */
  importAttestation(jsonData: string): BuildAttestation {
    const attestation = JSON.parse(jsonData);

    // 基本驗證
    if (!attestation.id || !attestation.predicate) {
      throw new Error('Invalid attestation format');
    }

    return attestation;
  }
}
