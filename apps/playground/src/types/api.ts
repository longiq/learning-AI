// Shared request/response types for all API routes and client fetch calls

// ── Lab 1: Chat & Streaming ──────────────────────────────────────────────────
export interface ChatRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  templateSystem?: string;
  templateUser: string;
  variables?: Record<string, string>;
  stream?: boolean;
}
export interface ChatResponse {
  content: string;
  renderedMessages: Array<{ role: string; content: string }>;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

// ── Lab 2: Structured Output ─────────────────────────────────────────────────
export type SchemaName = "sentiment" | "extraction" | "classification";
export interface StructuredRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  prompt: string;
  schemaName: SchemaName;
}
export interface StructuredStep {
  label: string;
  value: string;
  status: "ok" | "error";
}
export interface StructuredResponse {
  rawText: string;
  extracted: unknown;
  steps: StructuredStep[];
  error?: { type: string; message: string };
}

// ── Lab 3: ReAct Agent ───────────────────────────────────────────────────────
export interface AgentRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  query: string;
  enabledTools: string[];
  maxIterations?: number;
}
export interface SerializedToolCall {
  id: string;
  name: string;
  argsJson: string;
}
export interface SerializedToolResult {
  id: string;
  name: string;
  output: unknown;
  error?: string;
}
export type SerializedAgentStep =
  | { type: "tool_call"; calls: SerializedToolCall[]; results: SerializedToolResult[] }
  | { type: "finish"; text: string };

export interface AgentResponse {
  answer: string;
  steps: SerializedAgentStep[];
  iterations: number;
}

// ── Lab 4: Memory Store ──────────────────────────────────────────────────────
export interface MemoryHistoryEntry {
  role: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
export interface MemoryRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  message: string;
  history: MemoryHistoryEntry[];
  systemPrompt?: string;
  maxEntries?: number;
}
export interface MemoryResponse {
  reply: string;
  updatedHistory: MemoryHistoryEntry[];
  windowSize: number;
  droppedCount: number;
}

// ── Lab 5: RAG Pipeline ──────────────────────────────────────────────────────
export interface RagDocument {
  title: string;
  text: string;
}
export interface RagChunkPreview {
  docTitle: string;
  chunkIndex: number;
  text: string;
  start: number;
  end: number;
}
export interface RagIngestRequest {
  documents: RagDocument[];
  chunkSize?: number;
  chunkOverlap?: number;
  strategy?: "character" | "sentence";
}
export interface RagIngestResponse {
  totalChunks: number;
  chunkPreview: RagChunkPreview[];
  docsAdded: number;
}

export interface RagQueryRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  query: string;
  topK?: number;
  minScore?: number;
}
export interface RetrievedChunkResult {
  text: string;
  score: number;
  chunkIndex: number;
  docTitle?: string;
}
export interface RagQueryResponse {
  retrievedChunks: RetrievedChunkResult[];
  answer: string;
  contextUsed: string;
}

// ── Lab 6: Multi-Agent Router ────────────────────────────────────────────────
export interface RouterRequest {
  provider?: "openai" | "anthropic";
  model?: string;
  message: string;
}
export interface RouterAgentMeta {
  name: string;
  description: string;
}
export interface RouterResponse {
  chosenAgent: string;
  routingReasoning: string;
  answer: string;
  availableAgents: RouterAgentMeta[];
}
