"use client";

import { useState } from "react";
import { LabHeader } from "@/components/LabHeader";
import { AgentTrace } from "@/components/trace/AgentTrace";
import type { AgentRequest, AgentResponse } from "@/types/api";

const TOOLS = [
  { name: "calculator", icon: "🧮", desc: "Math expressions via mathjs" },
  { name: "get_weather", icon: "🌤", desc: "City weather (demo stub)" },
  { name: "word_count", icon: "📝", desc: "Text word/char count" },
  { name: "get_current_date", icon: "📅", desc: "Current date & time" },
];

const EXAMPLE_QUERIES = [
  "What is 15% of 340, then multiply by 3?",
  "How many words are in: 'The quick brown fox jumps over the lazy dog'?",
  "What's the weather in Tokyo, and what day of the week is it today?",
  "Calculate the area of a circle with radius 7 (use pi = 3.14159)",
];

export default function AgentLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0] ?? "");
  const [enabledTools, setEnabledTools] = useState<Set<string>>(
    new Set(["calculator", "get_weather", "word_count", "get_current_date"])
  );
  const [maxIterations, setMaxIterations] = useState(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleTool(name: string) {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function runAgent() {
    if (!query.trim() || enabledTools.size === 0) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const body: AgentRequest = {
      provider,
      model: model || undefined,
      query,
      enabledTools: [...enabledTools],
      maxIterations,
    };

    const res = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      setError(err.error);
    } else {
      setResult((await res.json()) as AgentResponse);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={3}
        title="ReAct Agent"
        modules={["@llm-series/tool-registry", "@llm-series/simple-react-agent"]}
        description="ToolRegistry holds Zod-validated tools. runAgent() loops: LLM reasons → picks a tool → executes it → LLM reasons again → until it has an answer."
        concept="The Thought→Action→Observation loop is how LLMs use tools. Each iteration adds tool results to the conversation history."
      />

      <div className="flex flex-1 min-h-0">
        {/* Config */}
        <div className="w-72 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
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
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini"
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tools</label>
            <div className="mt-1.5 space-y-1.5">
              {TOOLS.map((t) => (
                <label key={t.name} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors">
                  <input type="checkbox" checked={enabledTools.has(t.name)} onChange={() => toggleTool(t.name)}
                    className="accent-indigo-500" />
                  <span className="text-sm">{t.icon}</span>
                  <div>
                    <div className="text-xs font-mono text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Max Iterations: {maxIterations}
            </label>
            <input type="range" min={1} max={20} value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))}
              className="w-full mt-1.5 accent-indigo-500" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Example Queries</label>
            <div className="mt-1.5 space-y-1">
              {EXAMPLE_QUERIES.map((q) => (
                <button key={q} onClick={() => setQuery(q)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors truncate">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4 overflow-y-auto">
          <div className="flex gap-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAgent(); } }}
              rows={2}
              placeholder="Ask something that requires a tool…"
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <button onClick={runAgent} disabled={loading || enabledTools.size === 0}
              className="px-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? "Running…" : "Run Agent"}
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-amber-400 text-sm">
              <span className="animate-spin">⟳</span> Agent is thinking and using tools…
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg border border-red-700/50 bg-red-950/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {result && <AgentTrace steps={result.steps} iterations={result.iterations} />}
        </div>
      </div>
    </div>
  );
}
