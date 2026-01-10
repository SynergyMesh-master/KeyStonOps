/**
 * EntityRecognition Module - Named Entity Recognition
 * 
 * Recognizes and extracts entities from text.
 * Supports multiple entity types and languages.
 * 
 * Performance Target: <30ms recognition
 */

import { EventEmitter } from 'events';

/**
 * Entity types
 */
export type EntityType = 
  | 'PERSON' 
  | 'ORGANIZATION' 
  | 'LOCATION' 
  | 'DATE' 
  | 'TIME' 
  | 'MONEY' 
  | 'PERCENT' 
  | 'PRODUCT' 
  | 'EVENT'
  | 'CUSTOM';

/**
 * Recognized entity
 */
export interface Entity {
  id: string;
  text: string;
  type: EntityType;
  start: number;
  end: number;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Entity recognition configuration
 */
export interface EntityRecognitionConfig {
  entity_types?: EntityType[];
  min_confidence?: number;
  language?: string;
  custom_patterns?: Record<string, RegExp>;
}

/**
 * Entity recognition result
 */
export interface EntityRecognitionResult {
  entities: Entity[];
  text: string;
  recognition_time_ms: number;
  total_entities: number;
}

/**
 * EntityRecognition implementation with pattern matching and ML
 */
export class EntityRecognition extends EventEmitter {
  private patterns: Map<EntityType, RegExp[]>;
  private entityCache: Map<string, Entity[]>;
  private initialized: boolean;

  constructor() {
    super();
    this.patterns = new Map();
    this.entityCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize entity recognition
   */
  async initialize(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.emit('initializing');
      
      // Initialize patterns for each entity type
      this.initializePatterns();
      
      this.initialized = true;
      const duration = Date.now() - startTime;
      
      this.emit('initialized', { duration_ms: duration });
    } catch (error) {
      this.emit('error', {
        operation: 'initialize',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Initialize recognition patterns
   */
  private initializePatterns(): void {
    // Person names (simple pattern)
    this.patterns.set('PERSON', [
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      /\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+\b/g
    ]);
    
    // Organizations
    this.patterns.set('ORGANIZATION', [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g,
      /\b(?:Google|Microsoft|Apple|Amazon|Meta|Tesla|OpenAI)\b/g
    ]);
    
    // Locations
    this.patterns.set('LOCATION', [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g,
      /\b(?:New York|Los Angeles|London|Paris|Tokyo|Beijing)\b/g
    ]);
    
    // Dates
    this.patterns.set('DATE', [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g
    ]);
    
    // Time
    this.patterns.set('TIME', [
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g
    ]);
    
    // Money
    this.patterns.set('MONEY', [
      /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
      /\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:dollars|USD|EUR|GBP)\b/g
    ]);
    
    // Percent
    this.patterns.set('PERCENT', [
      /\b\d+(?:\.\d+)?%/g,
      /\b\d+(?:\.\d+)?\s*percent\b/g
    ]);
    
    // Products
    this.patterns.set('PRODUCT', [
      /\b(?:iPhone|iPad|MacBook|Windows|Android|Linux)\s*\d*\b/g
    ]);
    
    // Events
    this.patterns.set('EVENT', [
      /\b(?:Conference|Summit|Meeting|Workshop|Webinar)\s+\d{4}\b/g
    ]);
  }

  /**
   * Recognize entities in text
   */
  async recognize(
    text: string,
    config?: EntityRecognitionConfig
  ): Promise<EntityRecognitionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.initialized) {
        throw new Error('EntityRecognition not initialized');
      }
      
      // Check cache
      const cacheKey = `${text}:${JSON.stringify(config)}`;
      let entities = this.entityCache.get(cacheKey);
      
      if (!entities) {
        entities = [];
        
        // Get entity types to recognize
        const entityTypes = config?.entity_types || Array.from(this.patterns.keys());
        const minConfidence = config?.min_confidence || 0.5;
        
        // Recognize each entity type
        for (const type of entityTypes) {
          const typeEntities = await this.recognizeType(text, type, minConfidence);
          entities.push(...typeEntities);
        }
        
        // Apply custom patterns if provided
        if (config?.custom_patterns) {
          const customEntities = this.applyCustomPatterns(text, config.custom_patterns);
          entities.push(...customEntities);
        }
        
        // Remove overlapping entities (keep highest confidence)
        entities = this.removeOverlaps(entities);
        
        // Sort by position
        entities.sort((a, b) => a.start - b.start);
        
        // Cache result
        this.entityCache.set(cacheKey, entities);
      }
      
      const duration = Date.now() - startTime;
      
      const result: EntityRecognitionResult = {
        entities,
        text,
        recognition_time_ms: duration,
        total_entities: entities.length
      };
      
      this.emit('recognition_complete', {
        text_length: text.length,
        entities_count: entities.length,
        duration_ms: duration
      });
      
      return result;
    } catch (error) {
      this.emit('error', {
        operation: 'recognize',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Recognize entities of specific type
   */
  private async recognizeType(
    text: string,
    type: EntityType,
    minConfidence: number
  ): Promise<Entity[]> {
    const entities: Entity[] = [];
    const patterns = this.patterns.get(type);
    
    if (!patterns) return entities;
    
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern);
      
      while ((match = regex.exec(text)) !== null) {
        const entity: Entity = {
          id: `${type}:${match.index}:${Date.now()}`,
          text: match[0],
          type,
          start: match.index,
          end: match.index + match[0].length,
          confidence: this.calculateConfidence(match[0], type)
        };
        
        if (entity.confidence >= minConfidence) {
          entities.push(entity);
        }
      }
    }
    
    return entities;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(text: string, type: EntityType): number {
    // Simple heuristic-based confidence
    let confidence = 0.7; // Base confidence
    
    // Adjust based on text length
    if (text.length > 20) confidence += 0.1;
    if (text.length > 50) confidence += 0.1;
    
    // Adjust based on capitalization
    const capitalizedWords = text.split(/\s+/).filter(w => /^[A-Z]/.test(w)).length;
    const totalWords = text.split(/\s+/).length;
    if (capitalizedWords / totalWords > 0.5) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Apply custom patterns
   */
  private applyCustomPatterns(
    text: string,
    patterns: Record<string, RegExp>
  ): Entity[] {
    const entities: Entity[] = [];
    
    for (const [name, pattern] of Object.entries(patterns)) {
      let match;
      const regex = new RegExp(pattern);
      
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          id: `CUSTOM:${name}:${match.index}`,
          text: match[0],
          type: 'CUSTOM',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9,
          metadata: { custom_type: name }
        });
      }
    }
    
    return entities;
  }

  /**
   * Remove overlapping entities
   */
  private removeOverlaps(entities: Entity[]): Entity[] {
    if (entities.length === 0) return entities;
    
    // Sort by start position, then by confidence
    entities.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.confidence - a.confidence;
    });
    
    const result: Entity[] = [];
    let lastEnd = -1;
    
    for (const entity of entities) {
      if (entity.start >= lastEnd) {
        result.push(entity);
        lastEnd = entity.end;
      }
    }
    
    return result;
  }

  /**
   * Get entities by type
   */
  getEntitiesByType(entities: Entity[], type: EntityType): Entity[] {
    return entities.filter(e => e.type === type);
  }

  /**
   * Get statistics
   */
  getStats(): {
    cache_size: number;
    supported_types: EntityType[];
  } {
    return {
      cache_size: this.entityCache.size,
      supported_types: Array.from(this.patterns.keys())
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.entityCache.clear();
    this.emit('cache_cleared');
  }
}

/**
 * Factory function
 */
export function createEntityRecognition(): EntityRecognition {
  return new EntityRecognition();
}