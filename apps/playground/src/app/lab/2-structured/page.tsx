"use client";

import { useState } from "react";
import { LabHeader } from "@/components/LabHeader";
import { TracePanel } from "@/components/trace/TracePanel";
import type { StructuredRequest, StructuredResponse, SchemaName } from "@/types/api";
import type { TraceItem } from "@/components/trace/TracePanel";

const SCHEMA_META: Record<SchemaName, { label: string; description: string; example: string }> = {
  sentiment: {
    label: "Sentiment Analysis",
    description: "{ sentiment, confidence, reasoning }",
    example: "The new iPhone is absolutely amazing! Best phone I've ever used.",
  },
  extraction: {
    label: "Entity Extraction",
    description: "{ entities[], summary }",
    example: "Apple CEO Tim Cook announced a partnership with Microsoft in Seattle on Monday.",
  },
  classification: {
    label: "Text Classification",
    description: "{ category, subcategory, tags[], confidence }",
    example: "How do I reverse a linked list in Python?",
  },
};

export default function StructuredLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [schema, setSchema] = useState<SchemaName>("sentiment");
  const [prompt, setPrompt] = useState(SCHEMA_META.sentiment.example);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StructuredResponse | null>(null);
  const [traceItems, setTraceItems] = useState<TraceItem[]>([]);

  async function run() {
    setLoading(true);
    setResult(null);

    const body: StructuredRequest = {
      provider,
      model: model || undefined,
      prompt,
      schemaName: schema,
    };

    const res = await fetch("/api/structured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as StructuredResponse;
    setResult(data);
    setTraceItems(
      data.steps.map((s) => ({ label: s.label, value: s.value, status: s.status }))
    );
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={2}
        title="Structured Output"
        modules={["@llm-series/structured-output"]}
        description="LLMs return plain text. This lab shows how parseStructured() extracts JSON using regex, parses it, and validates it against a Zod schema — with specific errors at each step."
        concept="extractJSON() finds the JSON block. JSON.parse() decodes it. Zod safeParse() validates the shape. Three distinct failure modes, three distinct error types."
      />

      <div className="flex flex-1 min-h-0">
        {/* Config */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
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

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Schema</label>
            <div className="mt-1.5 space-y-1.5">
              {(Object.entries(SCHEMA_META) as [SchemaName, typeof SCHEMA_META[SchemaName]][]).map(([key, meta]) => (
                <button key={key} onClick={() => { setSchema(key); setPrompt(meta.example); }}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${schema === key ? "border-indigo-500 bg-indigo-900/30" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}>
                  <div className="text-sm font-medium text-white">{meta.label}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{meta.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Input Text</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          <button onClick={run} disabled={loading || !prompt.trim()}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? "Parsing…" : "Run parseStructured()"}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!result && !loading && (
            <div className="text-center text-gray-600 text-sm pt-10">
              Select a schema and click Run to see the extraction pipeline.
            </div>
          )}

          {result && (
            <>
              <div className={`p-4 rounded-lg border ${result.error ? "border-red-700/50 bg-red-950/20" : "border-emerald-700/50 bg-emerald-950/20"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{result.error ? "❌" : "✅"}</span>
                  <span className={`text-sm font-semibold ${result.error ? "text-red-300" : "text-emerald-300"}`}>
                    {result.error ? `${result.error.type}: ${result.error.message}` : "Parsed successfully"}
                  </span>
                </div>
                {result.extracted != null && (
                  <pre className="text-xs font-mono text-gray-200 whitespace-pre-wrap">
                    {JSON.stringify(result.extracted, null, 2)}
                  </pre>
                )}
              </div>

              <TracePanel title="Extraction Pipeline" items={traceItems} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
