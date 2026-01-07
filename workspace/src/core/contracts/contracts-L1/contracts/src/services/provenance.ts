import { createHash, randomUUID } from 'crypto';
import { readFile, stat, realpath } from 'fs/promises';
import path from 'path';

import sanitize from 'sanitize-filename';

import { PathValidationError } from '../errors';
import { SLSAAttestationService, SLSAProvenance, BuildMetadata } from './attestation';

/**
 * Retrieves the safe root directory path for file operations.
 *
 * This function returns the base directory within which all file operations
 * are constrained. Files outside this directory cannot be accessed, providing
 * a security boundary against path traversal attacks.
 *
 * @returns {string} The absolute path to the safe root directory.
 *                   Defaults to `<cwd>/safefiles` if SAFE_ROOT_PATH env var is not set.
 *
 * @example
 * // With SAFE_ROOT_PATH=/var/app/secure
 * const root = getSafeRoot(); // returns '/var/app/secure'
 *
 * // Without SAFE_ROOT_PATH env var
 * const root = getSafeRoot(); // returns '/path/to/cwd/safefiles'
 */
const getSafeRoot = (): string =>
  path.resolve(process.env.SAFE_ROOT_PATH ?? path.resolve(process.cwd(), 'safefiles'));

/**
 * Validates a file path for security threats including path traversal,
 * null bytes, and invalid characters.
 *
 * This function performs multiple security checks:
 * 1. Ensures the path is a non-empty string
 * 2. Checks for null bytes (\0) which can bypass security checks
 * 3. Validates filename characters using sanitize-filename
 * 4. Prevents directory traversal attempts (.., //)
 *
 * @param {string} filePath - The file path to validate
 *
 * @throws {PathValidationError} If the path is invalid, contains null bytes,
 *                                has invalid characters, or contains traversal sequences
 *
 * @example
 * // Valid paths
 * assertPathValid('document.txt'); // OK
 * assertPathValid('folder/file.txt'); // OK
 *
 * // Invalid paths
 * assertPathValid('../../../etc/passwd'); // throws PathValidationError
 * assertPathValid('file\0.txt'); // throws PathValidationError
 * assertPathValid(''); // throws PathValidationError
 */
const assertPathValid = (filePath: string): void => {
  if (!filePath || typeof filePath !== 'string') {
    throw new PathValidationError('Invalid file path: Path must be a non-empty string');
  }

  if (filePath.includes('\0')) {
    throw new PathValidationError('Invalid file path');
  }

  const hasDirectorySeparators = filePath.includes('/') || filePath.includes(path.sep);
  if (!hasDirectorySeparators) {
    const sanitized = sanitize(filePath);
    if (sanitized !== filePath || !sanitized) {
      throw new PathValidationError('Invalid file path');
    }
    return;
  }

  if (filePath.split(path.sep).includes('..') || filePath.includes('//')) {
    throw new PathValidationError('Invalid file path');
  }
};

/**
 * Resolves a user-provided path to a safe, canonical path within the configured safe root directory.
 *
 * This function provides robust protection against path traversal and symlink attacks by:
 * 1. Validating the input path for security threats
 * 2. Normalizing the path and resolving it relative to the safe root
 * 3. Resolving symlinks to their canonical paths
 * 4. Ensuring the final canonical path is within the safe root directory
 *
 * The function handles both absolute and relative input paths, always constraining
 * the result to be within the safe root directory defined by SAFE_ROOT_PATH.
 *
 * @param {string} userInputPath - The user-provided file path (absolute or relative)
 *
 * @returns {Promise<string>} The canonical absolute path within the safe root directory
 *
 * @throws {PathValidationError} If the path is invalid, contains traversal sequences,
 *                                or resolves outside the safe root directory
 * @throws {NodeJS.ErrnoException} If the file doesn't exist (ENOENT) or other filesystem errors occur
 *
 * @example
 * // Assuming SAFE_ROOT_PATH=/var/app/secure
 * const safe = await resolveSafePath('data/file.txt');
 * // returns '/var/app/secure/data/file.txt'
 *
 * const safe2 = await resolveSafePath('/absolute/path/file.txt');
 * // returns '/var/app/secure/absolute/path/file.txt' (re-rooted within safe directory)
 *
 * // Path traversal attempts are blocked
 * await resolveSafePath('../../etc/passwd'); // throws PathValidationError
 *
 * // Symlinks pointing outside safe root are blocked
 * await resolveSafePath('symlink-to-external'); // throws PathValidationError
 */
async function resolveSafePath(userInputPath: string): Promise<string> {
  assertPathValid(userInputPath);

  const safeRoot = getSafeRoot();
  const normalizedInput = path.normalize(userInputPath);
  const root = path.parse(normalizedInput).root || '/';
  const relativeToRoot = path.relative(root, normalizedInput);
  const resolvedCandidate = path.isAbsolute(normalizedInput)
    ? path.resolve(safeRoot, relativeToRoot)
    : path.resolve(safeRoot, normalizedInput);

  // Ensure the resolved candidate path is within the configured safe root
  const relFromSafeRoot = path.relative(safeRoot, resolvedCandidate);
  if (
    relFromSafeRoot.startsWith('..') ||
    path.isAbsolute(relFromSafeRoot) ||
    relFromSafeRoot === ''
  ) {
    throw new PathValidationError('Invalid file path');
  }

  let canonicalSafeRoot: string;
  try {
    canonicalSafeRoot = await realpath(safeRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PathValidationError('Invalid file path');
    }
    throw error;
  }

  let canonicalPath: string;
  try {
    canonicalPath = await realpath(resolvedCandidate);
  } catch (error) {
    // Allow caller to handle missing files (ENOENT)
    throw error;
  }

  // Check that canonicalPath is within canonicalSafeRoot using path.relative
  // This prevents directory traversal and symlink attacks robustly, regardless of separator/casing.
  const rel = path.relative(canonicalSafeRoot, canonicalPath);
  if (
    rel.startsWith('..') ||
    path.isAbsolute(rel) ||
    rel === '' // Optionally, disallow accessing the root directory itself. Remove or comment this line to allow.
  ) {
    throw new PathValidationError('Invalid file path');
  }

  return canonicalPath;
}

/**
 * Represents a cryptographically verifiable build attestation for a software artifact.
 *
 * A BuildAttestation provides tamper-evident evidence of how a software artifact was built,
 * including what builder was used, what materials went into the build, and metadata about
 * the build process. This is essential for supply chain security and SLSA compliance.
 *
 * @property {string} id - Unique identifier for the attestation (format: `att_<timestamp>_<hash>`)
 * @property {string} timestamp - ISO 8601 timestamp when the build started
 * @property {object} subject - The artifact being attested
 * @property {string} subject.name - Name/path of the artifact relative to cwd
 * @property {string} subject.digest - SHA256 digest in format `sha256:<hex>`
 * @property {string} [subject.path] - Optional original file path provided by user
 * @property {object} predicate - Attestation claims about the build
 * @property {string} predicate.type - Type of predicate (SLSA provenance type URI)
 * @property {BuilderInfo} predicate.builder - Information about the build system
 * @property {RecipeInfo} predicate.recipe - Build instructions and configuration
 * @property {MetadataInfo} predicate.metadata - Build execution metadata
 * @property {Material[]} [predicate.materials] - Optional input materials used in the build
 * @property {string} [signature] - Optional cryptographic signature over the attestation
 * @property {SLSAProvenance} [slsaProvenance] - Full SLSA provenance document if generated
 *
 * @see https://slsa.dev/provenance/v1 for SLSA provenance specification
 */
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
  slsaProvenance?: SLSAProvenance;
}

/**
 * Information about the builder system that produced an artifact.
 *
 * @property {string} id - Unique identifier for the builder (e.g., URL or URN)
 * @property {string} version - Version of the builder software
 * @property {Dependency[]} [builderDependencies] - Optional list of builder's own dependencies
 *
 * @example
 * {
 *   id: 'https://github.com/myorg/builder',
 *   version: '1.2.3',
 *   builderDependencies: [
 *     { uri: 'pkg:npm/webpack@5.0.0', digest: { sha256: 'abc123...' } }
 *   ]
 * }
 */
export interface BuilderInfo {
  id: string;
  version: string;
  builderDependencies?: Dependency[];
}

/**
 * Describes the build recipe or instructions used to produce an artifact.
 *
 * @property {string} type - Type/format of the recipe (typically a URL)
 * @property {string} [definedInMaterial] - File where the recipe is defined (e.g., 'package.json')
 * @property {string} [entryPoint] - Command or script that invokes the build (e.g., 'npm run build')
 * @property {Record<string, unknown>} [arguments] - Arguments passed to the build command
 * @property {Record<string, unknown>} [environment] - Environment variables used during build
 *
 * @example
 * {
 *   type: 'https://github.com/synergymesh/build',
 *   definedInMaterial: 'package.json',
 *   entryPoint: 'npm run build',
 *   environment: { NODE_ENV: 'production', NODE_VERSION: 'v20.0.0' }
 * }
 */
export interface RecipeInfo {
  type: string;
  definedInMaterial?: string;
  entryPoint?: string;
  arguments?: Record<string, unknown>;
  environment?: Record<string, unknown>;
}

/**
 * Metadata about the build execution and its completeness.
 *
 * @property {string} buildStartedOn - ISO 8601 timestamp when build started
 * @property {string} buildFinishedOn - ISO 8601 timestamp when build completed
 * @property {object} completeness - Indicates which information is complete in the attestation
 * @property {boolean} completeness.parameters - Whether all build parameters are included
 * @property {boolean} completeness.environment - Whether all environment variables are included
 * @property {boolean} completeness.materials - Whether all input materials are included
 * @property {boolean} reproducible - Whether the build is reproducible (same inputs = same output)
 * @property {string} [buildInvocationId] - Optional unique ID for this specific build invocation
 */
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

/**
 * Represents an input material used during the build process.
 *
 * Materials are source files, dependencies, or other inputs that went into producing
 * the build artifact. Each material is identified by a URI and verified by cryptographic digest.
 *
 * @property {string} uri - URI identifying the material (e.g., git+https://..., pkg:npm/...)
 * @property {Record<string, string>} digest - Cryptographic digests of the material
 *                                             (keys are hash algorithms like 'sha256')
 *
 * @example
 * {
 *   uri: 'git+https://github.com/myorg/repo@abc123',
 *   digest: { sha256: 'def456...' }
 * }
 */
export interface Material {
  uri: string;
  digest: Record<string, string>;
}

/**
 * Represents a dependency with optional name and version information.
 *
 * Dependencies are external components required by the builder or the build process.
 *
 * @property {string} uri - URI identifying the dependency (e.g., pkg:npm/lodash@4.17.21)
 * @property {Record<string, string>} digest - Cryptographic digests of the dependency
 * @property {string} [name] - Optional human-readable name
 * @property {string} [version] - Optional version string
 *
 * @example
 * {
 *   uri: 'pkg:npm/express@4.18.0',
 *   digest: { sha256: 'abc123...' },
 *   name: 'express',
 *   version: '4.18.0'
 * }
 */
export interface Dependency {
  uri: string;
  digest: Record<string, string>;
  name?: string;
  version?: string;
}

/**
 * ProvenanceService provides secure file attestation and SLSA provenance generation.
 *
 * This service is responsible for creating cryptographically verifiable build attestations
 * that document how software artifacts were produced. It implements:
 * - Secure file digest generation with path traversal protection
 * - SLSA (Supply-chain Levels for Software Artifacts) provenance creation
 * - Attestation verification and integrity checking
 * - Safe import/export of attestation documents
 *
 * ## Security Features
 * - All file operations are constrained to a safe root directory (SAFE_ROOT_PATH)
 * - Path traversal attacks are prevented through multiple validation layers
 * - Symlink attacks are mitigated by resolving to canonical paths
 * - Cryptographic digests (SHA-256) ensure file integrity
 *
 * ## SLSA Compliance
 * This service generates SLSA provenance documents that include:
 * - Subject information (artifact name and digest)
 * - Builder information (ID, version, dependencies)
 * - Build recipe (entry point, arguments, environment)
 * - Build metadata (timestamps, completeness, reproducibility)
 *
 * @example
 * ```typescript
 * const service = new ProvenanceService();
 *
 * // Generate file digest
 * const digest = await service.generateFileDigest('build/app.js');
 * console.log(digest); // 'sha256:abc123...'
 *
 * // Create build attestation
 * const attestation = await service.createBuildAttestation(
 *   'build/app.js',
 *   { id: 'https://builder.example.com', version: '1.0.0' }
 * );
 *
 * // Verify attestation
 * const isValid = await service.verifyAttestation(attestation);
 *
 * // Export to JSON
 * const json = service.exportAttestation(attestation);
 * ```
 *
 * @see https://slsa.dev for SLSA framework documentation
 * @see SLSAAttestationService for underlying SLSA provenance implementation
 */
export class ProvenanceService {
  private readonly slsaService: SLSAAttestationService;

  constructor() {
    this.slsaService = new SLSAAttestationService();
  }

  /**
   * Generates a SHA-256 cryptographic digest for a file with path traversal protection.
   *
   * This method securely reads a file and computes its SHA-256 hash. The file path
   * is validated and constrained to the safe root directory to prevent unauthorized
   * file access through path traversal attacks.
   *
   * @param {string} filePath - Path to the file (absolute or relative to safe root)
   *
   * @returns {Promise<string>} SHA-256 digest in format `sha256:<hex>`
   *
   * @throws {PathValidationError} If the path is invalid or attempts directory traversal
   * @throws {Error} If the file cannot be read (permissions, doesn't exist, etc.)
   *
   * @example
   * ```typescript
   * // Generate digest for a build artifact
   * const digest = await service.generateFileDigest('dist/bundle.js');
   * // Returns: 'sha256:a1b2c3d4e5f6...'
   *
   * // Attempting path traversal will throw
   * await service.generateFileDigest('../../etc/passwd');
   * // Throws: PathValidationError
   * ```
   *
   * @see resolveSafePath for path validation details
   */
  async generateFileDigest(filePath: string): Promise<string> {
    const validatedPath = await resolveSafePath(filePath);
    const content = await readFile(validatedPath);
    const hash = createHash('sha256');
    hash.update(content);
    return `sha256:${hash.digest('hex')}`;
  }

  /**
   * Creates a comprehensive build attestation for a software artifact using SLSA format.
   *
   * This method generates a cryptographically verifiable attestation that documents how
   * an artifact was built. The attestation includes:
   * - Subject information (artifact name, digest, path)
   * - Builder information (ID, version, dependencies)
   * - Build recipe (type, entry point, environment)
   * - Build metadata (timestamps, completeness, reproducibility)
   * - Full SLSA provenance document
   *
   * The attestation ID is generated in the format `att_<timestamp>_<hash>` where the hash
   * is derived from the timestamp and validated file path.
   *
   * ## Security
   * - File path is validated to prevent path traversal attacks
   * - Only regular files are accepted (directories are rejected)
   * - File digest is computed to ensure integrity
   *
   * ## SLSA Provenance
   * The generated attestation includes a full SLSA provenance document that can be
   * verified independently using standard SLSA tools.
   *
   * @param {string} subjectPath - Path to the artifact file to attest
   * @param {BuilderInfo} builder - Information about the builder system
   * @param {Partial<MetadataInfo>} [metadata={}] - Optional build metadata overrides
   * @param {string} [metadata.buildStartedOn] - Override build start timestamp (ISO 8601)
   * @param {string} [metadata.buildFinishedOn] - Override build finish timestamp (ISO 8601)
   * @param {string} [metadata.buildInvocationId] - Override build invocation UUID
   * @param {boolean} [metadata.reproducible] - Whether the build is reproducible
   *
   * @returns {Promise<BuildAttestation>} Complete build attestation with SLSA provenance
   *
   * @throws {PathValidationError} If the path is invalid or attempts directory traversal
   * @throws {Error} If the subject path is not a file or cannot be accessed
   *
   * @example
   * ```typescript
   * // Create attestation for a production build
   * const attestation = await service.createBuildAttestation(
   *   'dist/app.bundle.js',
   *   {
   *     id: 'https://github.com/myorg/builder',
   *     version: '2.1.0',
   *     builderDependencies: [
   *       {
   *         uri: 'pkg:npm/webpack@5.88.0',
   *         digest: { sha256: 'abc123...' },
   *         name: 'webpack',
   *         version: '5.88.0'
   *       }
   *     ]
   *   },
   *   {
   *     buildStartedOn: '2024-01-15T10:30:00Z',
   *     buildFinishedOn: '2024-01-15T10:35:00Z',
   *     reproducible: true
   *   }
   * );
   *
   * console.log(attestation.id); // 'att_1705319400000_a1b2c3d4'
   * console.log(attestation.subject.digest); // 'sha256:def456...'
   * console.log(attestation.slsaProvenance.predicateType);
   * // 'https://slsa.dev/provenance/v1'
   * ```
   *
   * @see BuildAttestation for the complete attestation structure
   * @see SLSAAttestationService.createProvenance for SLSA provenance details
   */
  async createBuildAttestation(
    subjectPath: string,
    builder: BuilderInfo,
    metadata: Partial<MetadataInfo> = {}
  ): Promise<BuildAttestation> {
    const validatedPath = await resolveSafePath(subjectPath);
    const stats = await stat(validatedPath);
    if (!stats.isFile()) {
      throw new Error(`Subject path must be a file: ${subjectPath}`);
    }

    const content = await readFile(validatedPath);
    const relativePath = path.relative(process.cwd(), validatedPath);
    const subjectName =
      relativePath === '' ? validatedPath : relativePath || path.basename(validatedPath);
    const subject = this.slsaService.createSubjectFromContent(subjectName, content);

    // 生成格式為 att_timestamp_hash 的 ID
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`${timestamp}${validatedPath}`)
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
        name: subjectName,
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
      slsaProvenance,
    };
  }

  /**
   * Verifies the integrity and validity of a build attestation.
   *
   * This method performs a two-level verification:
   * 1. **Structural validation**: Ensures all required fields are present
   *    (id, timestamp, subject, predicate)
   * 2. **Digest verification**: If the attestation includes a file path, verifies
   *    that the current file digest matches the attested digest
   *
   * ## Verification Logic
   * - If no file path is provided, only structural validation is performed
   * - If a file path is provided, the current file is read and its digest is
   *   computed and compared to the attested digest
   * - Any errors during verification (file not found, path traversal, etc.)
   *   result in a `false` return value rather than throwing
   *
   * ## Security
   * - File paths are validated to prevent path traversal attacks
   * - All exceptions are caught and converted to `false` returns
   * - This prevents information leakage through error messages
   *
   * @param {BuildAttestation} attestation - The attestation to verify
   *
   * @returns {Promise<boolean>} `true` if the attestation is valid and the digest
   *                             matches (if applicable), `false` otherwise
   *
   * @example
   * ```typescript
   * // Verify an attestation with file path
   * const attestation = await service.createBuildAttestation(
   *   'dist/app.js',
   *   builderInfo
   * );
   * const isValid = await service.verifyAttestation(attestation);
   * console.log(isValid); // true (if file hasn't changed)
   *
   * // Verification fails if file was modified
   * // ... modify dist/app.js ...
   * const isStillValid = await service.verifyAttestation(attestation);
   * console.log(isStillValid); // false
   *
   * // Verification fails for malformed attestations
   * const invalid = { id: 'test' } as BuildAttestation;
   * const result = await service.verifyAttestation(invalid);
   * console.log(result); // false
   * ```
   *
   * @see generateFileDigest for digest computation details
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
   * Exports a build attestation to a formatted JSON string.
   *
   * This method serializes a BuildAttestation object into a human-readable JSON
   * format with 2-space indentation. The exported JSON can be:
   * - Stored in a file for archival purposes
   * - Transmitted to verification services
   * - Shared with consumers of the artifact
   * - Imported later using `importAttestation()`
   *
   * The exported format preserves all attestation data including the SLSA provenance
   * document, making it suitable for independent verification using standard SLSA tools.
   *
   * @param {BuildAttestation} attestation - The attestation to export
   *
   * @returns {string} JSON string representation of the attestation with pretty-printing
   *
   * @example
   * ```typescript
   * const attestation = await service.createBuildAttestation(
   *   'dist/app.js',
   *   builderInfo
   * );
   *
   * // Export to JSON string
   * const json = service.exportAttestation(attestation);
   *
   * // Save to file
   * await fs.writeFile('attestation.json', json);
   *
   * // Later, load and verify
   * const loaded = service.importAttestation(json);
   * const isValid = await service.verifyAttestation(loaded);
   * ```
   *
   * @see importAttestation for importing attestations from JSON
   */
  exportAttestation(attestation: BuildAttestation): string {
    return JSON.stringify(attestation, null, 2);
  }

  /**
   * Imports a build attestation from a JSON string.
   *
   * This method deserializes a JSON string back into a BuildAttestation object.
   * It performs basic validation to ensure the JSON contains required fields
   * (id and predicate).
   *
   * ## Validation
   * - Checks for presence of `id` field
   * - Checks for presence of `predicate` field
   * - Does NOT verify the attestation's cryptographic integrity
   * - Does NOT validate file digests
   *
   * For full verification including digest checks, use `verifyAttestation()`
   * after importing.
   *
   * @param {string} jsonData - JSON string containing the attestation
   *
   * @returns {BuildAttestation} Parsed attestation object
   *
   * @throws {SyntaxError} If the JSON is malformed
   * @throws {Error} If the attestation format is invalid (missing id or predicate)
   *
   * @example
   * ```typescript
   * // Import from JSON string
   * const json = await fs.readFile('attestation.json', 'utf8');
   * const attestation = service.importAttestation(json);
   *
   * // Verify after importing
   * const isValid = await service.verifyAttestation(attestation);
   *
   * if (isValid) {
   *   console.log('Attestation is valid:', attestation.subject.name);
   * } else {
   *   console.error('Attestation verification failed');
   * }
   *
   * // Invalid JSON throws
   * try {
   *   service.importAttestation('not valid json');
   * } catch (error) {
   *   console.error('Invalid JSON:', error.message);
   * }
   *
   * // Missing required fields throws
   * try {
   *   service.importAttestation('{"timestamp": "2024-01-01"}');
   * } catch (error) {
   *   console.error('Invalid format:', error.message);
   *   // Error: Invalid attestation format
   * }
   * ```
   *
   * @see exportAttestation for exporting attestations to JSON
   * @see verifyAttestation for verifying imported attestations
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
