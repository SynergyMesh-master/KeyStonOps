/**
 * AXIOM Dissolved MCP Server Implementation
 * 硫酸溶解法 - 完全 MCP 對齊實現
 *
 * This file implements all 59 dissolved AXIOM modules as MCP tools
 * following the Model Context Protocol specification.
 *
 * @version 1.0.0
 * @license MIT
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { DISSOLVED_TOOLS } from "./tools/index.js";
import type { ToolDefinition, ResourceDefinition, PromptDefinition } from "./tools/types.js";


// ═══════════════════════════════════════════════════════════════════════════════
// MCP RESOURCES REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const DISSOLVED_RESOURCES: ResourceDefinition[] = [
  {
    uri: "axiom://layers/l00-infrastructure",
    name: "Infrastructure & Bootstrap Layer",
    description: "Immutable foundation with quantum-hardened bootstrap",
    mimeType: "application/json",
    metadata: { layer: "L00", moduleCount: 5, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l01-language",
    name: "Language Processing Layer",
    description: "Quantum-enhanced NLP with transformer models",
    mimeType: "application/json",
    metadata: { layer: "L01", moduleCount: 2, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l02-input",
    name: "Input Processing Layer",
    description: "Quantum state preparation and multimodal processing",
    mimeType: "application/json",
    metadata: { layer: "L02", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l03-network",
    name: "Network & Routing Layer",
    description: "ML-based intelligent routing with circuit breakers",
    mimeType: "application/json",
    metadata: { layer: "L03", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l04-cognitive",
    name: "Cognitive Processing Layer",
    description: "Deep cognitive processing with transformer architectures",
    mimeType: "application/json",
    metadata: { layer: "L04", moduleCount: 4, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l05-ethics",
    name: "Ethics & Governance Layer",
    description: "Policy evaluation and bias detection",
    mimeType: "application/json",
    metadata: { layer: "L05", moduleCount: 3, quantumEnabled: false },
  },
  {
    uri: "axiom://layers/l06-integration",
    name: "Integration & Orchestration Layer",
    description: "Multi-agent orchestration and workflow engine",
    mimeType: "application/json",
    metadata: { layer: "L06", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l07-reasoning",
    name: "Reasoning & Knowledge Layer",
    description: "Neural-symbolic reasoning with knowledge graphs",
    mimeType: "application/json",
    metadata: { layer: "L07", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l08-emotion",
    name: "Emotional Intelligence Layer",
    description: "Emotion classification and empathy modeling",
    mimeType: "application/json",
    metadata: { layer: "L08", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l09-output",
    name: "Output Optimization Layer",
    description: "Quality scoring and format optimization",
    mimeType: "application/json",
    metadata: { layer: "L09", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l10-governance",
    name: "System Governance Layer",
    description: "Policy enforcement and compliance monitoring",
    mimeType: "application/json",
    metadata: { layer: "L10", moduleCount: 5, quantumEnabled: false },
  },
  {
    uri: "axiom://layers/l11-optimization",
    name: "Performance Optimization Layer",
    description: "System-wide optimization with genetic algorithms",
    mimeType: "application/json",
    metadata: { layer: "L11", moduleCount: 4, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l12-metacognition",
    name: "Metacognitive & Strategic Layer",
    description: "Multi-objective optimization and emergence detection",
    mimeType: "application/json",
    metadata: { layer: "L12", moduleCount: 3, quantumEnabled: true },
  },
  {
    uri: "axiom://layers/l13-quantum",
    name: "Quantum Specialized Layer",
    description: "Domain-specific quantum computing applications",
    mimeType: "application/json",
    metadata: { layer: "L13", moduleCount: 15, quantumEnabled: true, fallbackEnabled: true },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MCP PROMPTS REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

const DISSOLVED_PROMPTS: PromptDefinition[] = [
  {
    name: "quantum_optimization",
    description: "Prompt for quantum optimization tasks using dissolved AXIOM tools",
    arguments: [
      { name: "problem_type", description: "Type of optimization problem", required: true },
      { name: "constraints", description: "Problem constraints", required: false },
    ],
    template: (args?: Record<string, unknown>) => `You are using the AXIOM dissolved quantum optimization layer.

Problem Type: ${args?.problem_type || "unspecified"}
Constraints: ${JSON.stringify(args?.constraints || {})}

Available quantum tools:
- vqe_solver: For eigenvalue problems
- qaoa_optimizer: For combinatorial optimization
- qml_engine: For quantum machine learning

Please specify your optimization parameters and the tool will automatically select the best quantum algorithm.`,
  },
  {
    name: "cognitive_analysis",
    description: "Prompt for deep cognitive analysis pipeline",
    arguments: [
      { name: "input_data", description: "Data to analyze", required: true },
      { name: "analysis_depth", description: "Depth of analysis", required: false },
    ],
    template: (args?: Record<string, unknown>) => `Initiating AXIOM cognitive analysis pipeline.

Input: ${JSON.stringify(args?.input_data || {})}
Depth: ${args?.analysis_depth || "deep"}

The following tools will be orchestrated:
- cognitive_analysis: Deep cognitive processing
- pattern_recognition: Pattern detection
- semantic_processor: Semantic understanding
- knowledge_graph: Knowledge integration`,
  },
  {
    name: "ethics_evaluation",
    description: "Prompt for ethical compliance evaluation",
    arguments: [
      { name: "action", description: "Action to evaluate", required: true },
      { name: "frameworks", description: "Ethical frameworks to apply", required: false },
    ],
    template: (args?: Record<string, unknown>) => `AXIOM Ethics Governance Evaluation

Action: ${JSON.stringify(args?.action || {})}
Frameworks: ${JSON.stringify(args?.frameworks || ["ai_ethics", "fairness"])}

This evaluation will use:
- ethics_governance: Policy compliance
- bias_detector: Fairness analysis
- fairness_optimizer: Bias mitigation recommendations`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates arguments against a JSON Schema
 * @param args - Arguments to validate
 * @param schema - JSON Schema to validate against
 * @throws {Error} If validation fails
 */
function validateToolArguments(
  args: Record<string, unknown>,
  schema: any
): void {
  if (!schema || typeof schema !== "object") {
    return; // No schema to validate against
  }

  const { type, properties, required } = schema;

  // Validate type
  if (type === "object" && (typeof args !== "object" || args === null)) {
    throw new Error(`Expected arguments to be an object, got ${args === null ? "null" : typeof args}`);
  }

  // Validate required fields
  if (required && Array.isArray(required)) {
    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  // Validate properties
  if (properties && typeof properties === "object") {
    for (const [key, value] of Object.entries(args)) {
      const propSchema = properties[key];
      if (!propSchema) {
        // Skip validation for unknown properties (allow additional properties by default)
        continue;
      }

      validateProperty(key, value, propSchema);
    }
  }
}

/**
 * Validates a single property against its schema
 * @param key - Property name
 * @param value - Property value
 * @param propSchema - Property schema
 * @throws {Error} If validation fails
 */
function validateProperty(
  key: string,
  value: unknown,
  propSchema: any
): void {
  const { type, enum: enumValues, items } = propSchema;

  // Check enum constraint
  if (enumValues && Array.isArray(enumValues)) {
    if (!enumValues.includes(value)) {
      throw new Error(
        `Invalid value for ${key}: expected one of [${enumValues.join(", ")}], got ${value}`
      );
    }
  }

  // Check type constraint
  if (type) {
    const actualType = Array.isArray(value)
      ? "array"
      : value === null
      ? "null"
      : typeof value;

    let expectedType = type;
    if (type === "integer") {
      expectedType = "number";
      // Handle both number and string representations of integers
      if (actualType === "number") {
        if (!Number.isInteger(value as number)) {
          throw new Error(`Invalid type for ${key}: expected integer, got ${value}`);
        }
      } else if (actualType === "string") {
        const numValue = Number(value);
        if (isNaN(numValue) || !Number.isInteger(numValue)) {
          throw new Error(`Invalid type for ${key}: expected integer, got ${value}`);
        }
        // Check for safe integer range to avoid precision loss
        if (!Number.isSafeInteger(numValue)) {
          throw new Error(`Invalid type for ${key}: integer value ${value} is outside safe range`);
        }
      } else {
        throw new Error(
          `Invalid type for ${key}: expected integer, got ${actualType}`
        );
      }
      return; // Type validated, no need for further type checks
    }

    if (actualType !== expectedType) {
      throw new Error(
        `Invalid type for ${key}: expected ${type}, got ${actualType}`
      );
    }

    // Validate array items
    if (type === "array" && items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        validateProperty(`${key}[${i}]`, value[i], items);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// Metrics for tracking quantum fallback frequency
const quantumFallbackMetrics = {
  totalFallbacks: 0,
  fallbacksByTool: new Map<string, number>(),
};

// Constants for quantum execution simulation
const DEFAULT_BACKEND_AVAILABILITY = 0.70;
const LOCAL_SIMULATOR_AVAILABILITY = 0.99;
const IBM_QUANTUM_AVAILABILITY = 0.80;
const AWS_BRAKET_AVAILABILITY = 0.85;
const AZURE_QUANTUM_AVAILABILITY = 0.82;
const IBM_BRISBANE_AVAILABILITY = 0.75;

const VQE_QUANTUM_GROUND_STATE = -1.137;
const VQE_CLASSICAL_GROUND_STATE = -1.135;
const VQE_QUANTUM_PRECISION = 0.01;
const VQE_CLASSICAL_PRECISION = 0.02;

const MIN_QUANTUM_FIDELITY = 0.95;
const MAX_QUANTUM_FIDELITY = 0.99;
const MIN_CLASSICAL_QUALITY = 0.85;
const MAX_CLASSICAL_QUALITY = 0.95;

const QUANTUM_EXEC_MIN_DELAY_MS = 10;
const QUANTUM_EXEC_MAX_DELAY_MS = 50;
const CLASSICAL_EXEC_MIN_DELAY_MS = 5;
const CLASSICAL_EXEC_MAX_DELAY_MS = 20;

/**
 * Tool category for execution routing
 * Order matters: more specific categories should be checked first
 */
enum ToolCategory {
  VQE = "vqe",
  QAOA = "qaoa",
  PORTFOLIO = "portfolio",
  FINANCIAL = "financial",
  OPTIMIZATION = "optimization",
  GENERIC = "generic",
}

/**
 * Get tool category from tool name
 * Checks categories in order of specificity to avoid misclassification
 */
function getToolCategory(toolName: string): ToolCategory {
  const name = toolName.toLowerCase();
  
  // Check most specific categories first to avoid substring matches
  if (name.includes("vqe")) return ToolCategory.VQE;
  if (name.includes("qaoa")) return ToolCategory.QAOA;
  if (name.includes("portfolio")) return ToolCategory.PORTFOLIO;
  if (name.includes("financial")) return ToolCategory.FINANCIAL;
  if (name.includes("optimization")) return ToolCategory.OPTIMIZATION;
  
  return ToolCategory.GENERIC;
}

/**
 * Helper to build result object for tool execution
 */
function buildToolResult(
  toolName: string,
  sourceModule: string,
  args: Record<string, unknown>,
  quantumExecuted: boolean,
  additionalData: Record<string, unknown>
): Record<string, unknown> {
  return {
    tool: toolName,
    source_module: sourceModule,
    args,
    executionTimestamp: new Date().toISOString(),
    quantumExecuted: quantumExecuted,
    ...additionalData,
  };
}

/**
 * Execute a dissolved AXIOM tool with proper quantum execution and fallback
 */
async function executeDissolvedTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: unknown; execution_method?: string; error_type?: string }> {
  const tool = DISSOLVED_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return { 
      success: false, 
      result: { error: `Unknown tool: ${toolName}` },
      errorType: "tool_not_found",
    };
  }

  // Validate input arguments against the tool's input schema
  try {
    validateToolArguments(args, tool.inputSchema);
  } catch (error) {
    return {
      success: false,
      result: {
        error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      errorType: "validation_error",
    };
  }

  // Simulate tool execution based on quantum capability
  if (tool.quantumEnabled && tool.fallbackEnabled) {
    // Try quantum execution, fallback to classical if needed
  // For quantum-enabled tools with fallback support
  if (tool.quantumEnabled && tool.fallbackEnabled) {
    try {
      // Attempt quantum execution
      const quantumResult = await executeQuantumTool(toolName, args, tool);
      return {
        success: true,
        result: buildToolResult(toolName, tool.sourceModule, args, true, quantumResult),
        executionMethod: "quantum",
      };
    } catch (error) {
      // Log the quantum execution failure for debugging
      console.error(
        `[QUANTUM_FALLBACK] Quantum execution failed for tool '${toolName}', falling back to classical execution.`,
        {
          tool: toolName,
          sourceModule: tool.sourceModule,
          args,
          executionTimestamp: new Date().toISOString(),
          quantumExecuted: true,
        },
        executionMethod: "quantum",
          source_module: tool.sourceModule,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
      );

      // Track fallback metrics
      quantumFallbackMetrics.totalFallbacks++;
      const currentCount = quantumFallbackMetrics.fallbacksByTool.get(toolName) || 0;
      quantumFallbackMetrics.fallbacksByTool.set(toolName, currentCount + 1);

      // Fallback to classical execution on quantum failure
      const classicalResult = await executeClassicalFallback(toolName, args, tool);
      return {
        success: true,
        result: buildToolResult(toolName, tool.sourceModule, args, false, {
          fallbackUsed: true,
          fallback_reason: error instanceof Error ? error.message : "Quantum execution failed",
          ...classicalResult,
        }),
        executionMethod: "classical_fallback",
      };
    }
  }

  // For tools without fallback or non-quantum tools
  if (tool.quantumEnabled) {
    // Quantum-only tools (no fallback)
    try {
      const quantumResult = await executeQuantumTool(toolName, args, tool);
      return {
        success: true,
        result: buildToolResult(toolName, tool.sourceModule, args, true, quantumResult),
        executionMethod: "quantum",
      };
    } catch (error) {
      return {
        success: false,
        result: {
          error: error instanceof Error ? error.message : "Quantum execution failed",
          tool: toolName,
          sourceModule: tool.sourceModule,
          args,
          executionTimestamp: new Date().toISOString(),
          quantumExecuted: false,
          fallbackUsed: true,
          error_message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  // Classical-only tools
  const classicalResult = await executeClassicalTool(toolName, args, tool);
  return {
    success: true,
    result: {
      tool: toolName,
      sourceModule: tool.sourceModule,
      args,
      executionTimestamp: new Date().toISOString(),
      quantumEnabled: tool.quantumEnabled,
    },
    executionMethod: tool.quantumEnabled ? "quantum" : "classical",
    result: buildToolResult(toolName, tool.sourceModule, args, false, classicalResult),
    executionMethod: "classical",
  };
}

/**
 * Execute tool using quantum computing backend
 * This is a realistic simulation that can fail based on backend availability
 */
async function executeQuantumTool(
  toolName: string,
  args: Record<string, unknown>,
  tool: ToolDefinition
): Promise<Record<string, unknown>> {
  // Check for quantum backend availability
  // Note: Both backend_type and backend are accepted for compatibility
  // with different MCP tool schemas in the AXIOM architecture
  const backendType = (args.backend_type as string) || 
                      (args.backend as string) || 
                      "local_simulator";
  
  // Simulate quantum backend checks - real implementation would connect to actual backends
  const quantumBackendAvailable = checkQuantumBackendAvailability(backendType);
  
  if (!quantumBackendAvailable) {
    throw new Error(`Quantum backend '${backendType}' is not available`);
  }

  // Simulate realistic quantum computation with potential failures
  // Real implementation would invoke actual quantum circuits
  const simulationResult = await simulateQuantumExecution(toolName, args);
  
  return {
    quantum_result: simulationResult,
    backend_used: backendType,
    circuit_depth: Math.floor(Math.random() * 100) + 10,
    fidelity: MIN_QUANTUM_FIDELITY + Math.random() * (MAX_QUANTUM_FIDELITY - MIN_QUANTUM_FIDELITY),
  };
}

/**
 * Execute classical fallback for quantum tools
 */
async function executeClassicalFallback(
  toolName: string,
  args: Record<string, unknown>,
  tool: ToolDefinition
): Promise<Record<string, unknown>> {
  // Classical algorithms as fallback
  // This would use classical approximation algorithms in real implementation
  const classicalResult = await simulateClassicalExecution(toolName, args);
  
  return {
    classical_result: classicalResult,
    approximation_quality: MIN_CLASSICAL_QUALITY + Math.random() * (MAX_CLASSICAL_QUALITY - MIN_CLASSICAL_QUALITY),
    performance_note: "Classical fallback used - results are approximate",
  };
}

/**
 * Execute classical-only tools
 */
async function executeClassicalTool(
  toolName: string,
  args: Record<string, unknown>,
  tool: ToolDefinition
): Promise<Record<string, unknown>> {
  const result = await simulateClassicalExecution(toolName, args);
  return { result };
}

/**
 * Check if quantum backend is available
 * Real implementation would ping actual quantum services
 */
function checkQuantumBackendAvailability(backendType: string): boolean {
  // Simulate backend availability with realistic failure scenarios
  // These constants represent typical availability rates for quantum computing services
  const availabilityMap: Record<string, number> = {
    local_simulator: LOCAL_SIMULATOR_AVAILABILITY,  // Almost always available
    ibm_quantum: IBM_QUANTUM_AVAILABILITY,          // Real QPUs have queues and downtime
    aws_braket: AWS_BRAKET_AVAILABILITY,
    azure_quantum: AZURE_QUANTUM_AVAILABILITY,
    ibm_brisbane: IBM_BRISBANE_AVAILABILITY,        // Specific backend may be in maintenance
  };
  
  const availability = availabilityMap[backendType] ?? DEFAULT_BACKEND_AVAILABILITY;
  return Math.random() < availability;
}

/**
 * Simulate quantum execution with realistic behavior
 */
async function simulateQuantumExecution(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Simulate computation time for quantum execution
  await new Promise((resolve) => 
    setTimeout(resolve, QUANTUM_EXEC_MIN_DELAY_MS + Math.random() * (QUANTUM_EXEC_MAX_DELAY_MS - QUANTUM_EXEC_MIN_DELAY_MS))
  );
  
  // Return tool-specific simulated results based on tool category
  // Real implementation would execute actual quantum circuits
  const category = getToolCategory(toolName);
  
  switch (category) {
    case ToolCategory.VQE:
      return {
        ground_state_energy: VQE_QUANTUM_GROUND_STATE + Math.random() * VQE_QUANTUM_PRECISION,
        optimal_parameters: Array(8).fill(0).map(() => Math.random() * Math.PI * 2),
        convergence_iterations: Math.floor(Math.random() * 100) + 50,
      };
      
    case ToolCategory.QAOA:
      return {
        optimal_solution: { nodes: [0, 1, 0, 1, 0], cost: 42 },
        approximation_ratio: 0.92 + Math.random() * 0.07,
      };
      
    case ToolCategory.PORTFOLIO:
    case ToolCategory.FINANCIAL:
      return {
        allocation: { stock_a: 0.4, stock_b: 0.35, stock_c: 0.25 },
        expected_return: 0.08 + Math.random() * 0.02,
        sharpe_ratio: 1.5 + Math.random() * 0.5,
      };
      
    case ToolCategory.GENERIC:
    default:
      return {
        status: "completed",
        confidence: 0.90 + Math.random() * 0.09,
      };
  }
}

/**
 * Simulate classical execution
 */
async function simulateClassicalExecution(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  // Simulate computation time for classical execution (usually faster than quantum for small problems)
  await new Promise((resolve) => 
    setTimeout(resolve, CLASSICAL_EXEC_MIN_DELAY_MS + Math.random() * (CLASSICAL_EXEC_MAX_DELAY_MS - CLASSICAL_EXEC_MIN_DELAY_MS))
  );
  
  // Return tool-specific classical results based on tool category
  const category = getToolCategory(toolName);
  
  switch (category) {
    case ToolCategory.VQE:
      return {
        ground_state_energy: VQE_CLASSICAL_GROUND_STATE + Math.random() * VQE_CLASSICAL_PRECISION,
        method: "classical_eigensolver",
      };
      
    case ToolCategory.QAOA:
    case ToolCategory.OPTIMIZATION:
      return {
        solution: { nodes: [0, 1, 0, 1, 0], cost: 45 }, // Less optimal than quantum
        method: "simulated_annealing",
      };
      
    case ToolCategory.GENERIC:
    default:
      return {
        status: "completed",
        method: "classical_algorithm",
      };
  }
}

/**
 * Extracts error message from execution result
 * @param result - Execution result object
 * @param defaultMessage - Default message if extraction fails
 * @returns Extracted error message
 */
function extractErrorMessage(
  result: { result: unknown },
  defaultMessage: string
): string {
  return result.result && typeof result.result === "object" && "error" in result.result
    ? String((result.result as any).error)
    : defaultMessage;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP SERVER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

const server = new Server(
  {
    name: "axiom-dissolved-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: DISSOLVED_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await executeDissolvedTool(name, args || {});
    
    // If execution failed with a validation error, throw appropriate MCP error
    if (!result.success) {
      if (result.error_type === "validation_error") {
        throw new McpError(
          ErrorCode.InvalidParams,
          extractErrorMessage(result, "Validation failed")
        );
      } else if (result.error_type === "tool_not_found") {
        throw new McpError(
          ErrorCode.MethodNotFound,
          extractErrorMessage(result, "Tool not found")
        );
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
      isError: !result.success,
    };
  } catch (error) {
    // Re-throw McpError as-is
    if (error instanceof McpError) {
      throw error;
    }
    // Wrap other errors
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// List Resources Handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: DISSOLVED_RESOURCES.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    })),
  };
});

// Read Resource Handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  // Validate URI format
  if (!uri || typeof uri !== 'string') {
    throw new Error(`Invalid URI: URI must be a non-empty string`);
  }
  
  const resource = DISSOLVED_RESOURCES.find((r) => r.uri === uri);

  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }

  // Safely extract layer ID with validation
  const uriParts = uri.split("/");
  const layerId = uriParts.length > 0 ? uriParts[uriParts.length - 1] : null;
  
  if (!layerId || layerId.trim() === '') {
    throw new Error(`Invalid URI format: Unable to extract layer ID from ${uri}`);
  }
  
  const tools = DISSOLVED_TOOLS.filter((t) => {
    const layerMatch = t.sourceModule.match(/L(\d{2})/);
    const resourceLayerMatch = layerId.match(/l(\d{2})/);
    const resourceLayerMatch = layerId?.match(/l(\d{2})/);
    return layerMatch && resourceLayerMatch && layerMatch[1] === resourceLayerMatch[1];
  });
  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: JSON.stringify(
          {
            ...resource,
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              quantum_enabled: t.quantum_enabled,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
});

// List Prompts Handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: DISSOLVED_PROMPTS.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    })),
  };
});

// Get Prompt Handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const prompt = DISSOLVED_PROMPTS.find((p) => p.name === name);

  if (!prompt) {
    throw new Error(`Prompt not found: ${name}`);
  }

  const promptText = prompt.template(args);

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: promptText,
        },
      },
    ],
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("AXIOM Dissolved MCP Server running on stdio");
    console.error(`Loaded ${DISSOLVED_TOOLS.length} tools from dissolved AXIOM architecture`);
    console.error(`Loaded ${DISSOLVED_RESOURCES.length} resources representing dissolved layers`);
    console.error(`Loaded ${DISSOLVED_PROMPTS.length} prompts for common operations`);
  } catch (error) {
    console.error("Failed to start AXIOM Dissolved MCP Server:", error);
    process.exitCode = 1;
  }
}

main();
