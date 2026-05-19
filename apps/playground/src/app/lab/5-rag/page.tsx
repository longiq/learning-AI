"use client";

import { useState } from "react";
import { LabHeader } from "@/components/LabHeader";
import type { RagIngestRequest, RagIngestResponse, RagQueryRequest, RagQueryResponse, RagChunkPreview } from "@/types/api";

const SAMPLE_DOCS = [
  {
    title: "TypeScript Basics",
    text: `TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale. TypeScript adds optional static typing and class-based object-oriented programming to the language.

TypeScript files have the extension .ts, and TypeScript is compiled into JavaScript before it can run in a browser or Node.js. The TypeScript compiler, tsc, is used to compile TypeScript files.

Key features of TypeScript include: type annotations, interfaces, generics, enums, and decorators. TypeScript is a superset of JavaScript, meaning all valid JavaScript is also valid TypeScript.

TypeScript was developed by Microsoft and released in 2012. It is now one of the most popular programming languages, used extensively in Angular, React, and Node.js applications.`,
  },
  {
    title: "Vector Databases",
    text: `A vector database is a type of database that stores data as high-dimensional vectors, which are mathematical representations of features or attributes. Each vector has a set number of dimensions, which can range from tens to thousands.

Vector databases are designed to efficiently store and query these vectors, using approximate nearest neighbor (ANN) algorithms. These algorithms find the most similar vectors to a given query vector without exhaustively comparing every vector in the database.

Popular vector databases include Pinecone, Weaviate, Milvus, Qdrant, and pgvector (an extension for PostgreSQL). They are commonly used for semantic search, recommendation systems, and AI applications.

The key metric used in vector databases is cosine similarity, which measures the angle between two vectors. Values closer to 1 indicate more similarity, while values closer to 0 indicate less similarity.`,
  },
];

export default function RagLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [chunkSize, setChunkSize] = useState(256);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const [strategy, setStrategy] = useState<"character" | "sentence">("character");
  const [documents, setDocuments] = useState(SAMPLE_DOCS);
  const [ingestResult, setIngestResult] = useState<RagIngestResponse | null>(null);
  const [ingesting, setIngesting] = useState(false);

  const [query, setQuery] = useState("What is cosine similarity?");
  const [topK, setTopK] = useState(3);
  const [queryResult, setQueryResult] = useState<RagQueryResponse | null>(null);
  const [querying, setQuerying] = useState(false);

  async function ingest(reset = false) {
    setIngesting(true);
    const body: RagIngestRequest & { reset?: boolean } = {
      documents,
      chunkSize,
      chunkOverlap,
      strategy,
      reset,
    };
    const res = await fetch("/api/rag/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setIngestResult((await res.json()) as RagIngestResponse);
    setQueryResult(null);
    setIngesting(false);
  }

  async function runQuery() {
    if (!query.trim() || !ingestResult) return;
    setQuerying(true);
    const body: RagQueryRequest = {
      provider,
      model: model || undefined,
      query,
      topK,
    };
    const res = await fetch("/api/rag/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setQueryResult((await res.json()) as RagQueryResponse);
    setQuerying(false);
  }

  const chunksByDoc: Record<string, RagChunkPreview[]> = {};
  for (const c of ingestResult?.chunkPreview ?? []) {
    (chunksByDoc[c.docTitle] ??= []).push(c);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={5}
        title="RAG Pipeline"
        modules={["@llm-series/chunker", "@llm-series/embedder", "@llm-series/vector-store-lite", "@llm-series/retriever"]}
        description="Retrieval-Augmented Generation: split documents into chunks → embed with OpenAI → store vectors → find similar chunks for a query → build context → generate answer."
        concept="Retriever.addDocument() chunks + embeds in one call. retrieve() embeds the query and finds closest vectors by cosine similarity. The LLM only sees the retrieved chunks as context."
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Config */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Step 1: Ingest</p>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Strategy</label>
            <div className="flex gap-2 mt-1.5">
              {(["character", "sentence"] as const).map((s) => (
                <button key={s} onClick={() => setStrategy(s)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${strategy === s ? "bg-emerald-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Chunk size: {chunkSize}
            </label>
            <input type="range" min={64} max={1024} step={64} value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full mt-1 accent-emerald-500" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Overlap: {chunkOverlap}
            </label>
            <input type="range" min={0} max={chunkSize - 1} step={16} value={Math.min(chunkOverlap, chunkSize - 1)}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full mt-1 accent-emerald-500" />
          </div>

          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={i} className="p-2 rounded border border-gray-700 bg-gray-900">
                <div className="flex items-center justify-between mb-1">
                  <input value={doc.title} onChange={(e) => setDocuments((d) => d.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    className="text-xs font-medium text-white bg-transparent focus:outline-none focus:text-indigo-300 w-full" />
                </div>
                <textarea value={doc.text} onChange={(e) => setDocuments((d) => d.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                  rows={3} className="w-full text-xs text-gray-400 bg-transparent resize-none focus:outline-none focus:text-gray-300" />
              </div>
            ))}
          </div>

          <button onClick={() => ingest(true)} disabled={ingesting}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {ingesting ? "Embedding…" : "Ingest Documents"}
          </button>

          {ingestResult && (
            <div className="text-xs text-emerald-400 text-center">
              ✓ {ingestResult.totalChunks} chunks from {ingestResult.docsAdded} docs
            </div>
          )}

          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Step 2: Query</p>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Provider</label>
              <div className="flex gap-2 mt-1.5">
                {(["openai", "anthropic"] as const).map((p) => (
                  <button key={p} onClick={() => setProvider(p)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${provider === p ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Top K: {topK}
              </label>
              <input type="range" min={1} max={5} value={topK} onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full mt-1 accent-emerald-500" />
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Chunk preview */}
          {ingestResult && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Chunk Preview ({ingestResult.totalChunks} total)
              </p>
              <div className="space-y-3">
                {Object.entries(chunksByDoc).map(([title, chunks]) => (
                  <div key={title}>
                    <p className="text-xs font-mono text-emerald-400 mb-1">{title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {chunks.map((c) => (
                        <div key={c.chunkIndex}
                          className="text-xs px-2 py-1.5 rounded bg-gray-800 border border-gray-700 max-w-xs">
                          <span className="text-gray-500 font-mono">#{c.chunkIndex} [{c.start}–{c.end}]</span>
                          <p className="text-gray-300 mt-0.5 line-clamp-2">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query */}
          <div className="flex gap-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runQuery(); }}
              placeholder="Ask a question about the documents…"
              disabled={!ingestResult}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 disabled:opacity-40" />
            <button onClick={runQuery} disabled={querying || !ingestResult}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {querying ? "Searching…" : "Retrieve & Generate"}
            </button>
          </div>

          {!ingestResult && (
            <div className="text-center text-gray-600 text-sm pt-4">
              Ingest documents first (Step 1) to enable querying.
            </div>
          )}

          {/* Results */}
          {queryResult && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Retrieved Chunks ({queryResult.retrievedChunks.length})
                </p>
                <div className="space-y-2">
                  {queryResult.retrievedChunks.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg border border-emerald-700/40 bg-emerald-950/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-emerald-400 font-mono">
                          {c.docTitle ?? "doc"} · chunk #{c.chunkIndex}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          score: {c.score.toFixed(4)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1 mb-2">
                        <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${c.score * 100}%` }} />
                      </div>
                      <p className="text-sm text-gray-300">{c.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Generated Answer</p>
                <div className="p-4 rounded-lg border border-gray-700 bg-gray-900">
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{queryResult.answer}</p>
                </div>
              </div>

              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">
                  Context sent to LLM ▼
                </summary>
                <pre className="mt-2 text-xs font-mono text-gray-500 bg-gray-900 rounded p-3 whitespace-pre-wrap overflow-x-auto">
                  {queryResult.contextUsed}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
