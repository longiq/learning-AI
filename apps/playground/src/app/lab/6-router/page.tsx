"use client";

import { useState } from "react";
import { LabHeader } from "@/components/LabHeader";
import type { RouterRequest, RouterResponse } from "@/types/api";

const PRESET_QUERIES = [
  "What is 15% of 340?",
  "Can you help me rewrite this sentence to be more formal: 'hey so i was thinking maybe we could do the thing tomorrow'",
  "How do I reverse a string in Python?",
  "Calculate the compound interest on $1000 at 5% for 3 years",
  "What's the difference between TypeScript interfaces and types?",
];

const AGENT_COLORS: Record<string, string> = {
  "math-agent": "text-amber-300 border-amber-700/50 bg-amber-950/20",
  "writing-agent": "text-violet-300 border-violet-700/50 bg-violet-950/20",
  "code-agent": "text-blue-300 border-blue-700/50 bg-blue-950/20",
};

export default function RouterLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [message, setMessage] = useState(PRESET_QUERIES[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function route() {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const body: RouterRequest = {
      provider,
      model: model || undefined,
      message,
    };

    const res = await fetch("/api/router", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json()) as { error: string };
      setError(err.error);
    } else {
      setResult((await res.json()) as RouterResponse);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={6}
        title="Multi-Agent Router"
        modules={["@llm-series/agent-router"]}
        description="AgentRouter uses an LLM to classify your query and dispatch it to the most appropriate specialized agent. Each agent has a name, description, and its own system prompt."
        concept="The routing LLM sees all agent names + descriptions and returns {&quot;agent&quot;: &quot;name&quot;}. AgentRouter.route() then calls that agent's run() with the original messages."
      />

      <div className="flex flex-1 min-h-0">
        {/* Config */}
        <div className="w-64 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Example Queries</label>
            <div className="mt-1.5 space-y-1">
              {PRESET_QUERIES.map((q) => (
                <button key={q} onClick={() => setMessage(q)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                  {q.slice(0, 55)}{q.length > 55 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Query input */}
          <div className="flex gap-3">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); route(); } }}
              rows={2} placeholder="Ask anything…"
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 resize-none" />
            <button onClick={route} disabled={loading || !message.trim()}
              className="px-5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? "Routing…" : "Route & Run"}
            </button>
          </div>

          {/* Agent registry */}
          {result && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Agents</p>
              <div className="flex gap-3 flex-wrap">
                {result.availableAgents.map((a) => (
                  <div key={a.name}
                    className={`px-4 py-3 rounded-lg border text-sm flex-1 min-w-48 ${
                      a.name === result.chosenAgent
                        ? AGENT_COLORS[a.name] ?? "text-rose-300 border-rose-700/50 bg-rose-950/20"
                        : "text-gray-400 border-gray-700 bg-gray-900"
                    }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold">{a.name}</span>
                      {a.name === result.chosenAgent && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">✓ chosen</span>
                      )}
                    </div>
                    <p className="text-xs opacity-70">{a.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-rose-400 text-sm">
              <span className="animate-spin">⟳</span> Router is classifying your query…
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg border border-red-700/50 bg-red-950/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {result && (
            <>
              {/* Routing decision */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Routing Decision</p>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Router LLM output (raw JSON):</p>
                  <pre className="text-sm font-mono text-yellow-300 bg-yellow-950/20 px-3 py-2 rounded border border-yellow-700/30">
                    {result.routingReasoning}
                  </pre>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">→ Dispatched to:</span>
                  <span className={`font-mono font-semibold px-2 py-0.5 rounded text-sm ${
                    AGENT_COLORS[result.chosenAgent] ?? "text-rose-300 bg-rose-950/30"
                  }`}>
                    {result.chosenAgent}
                  </span>
                </div>
              </div>

              {/* Agent answer */}
              <div className="p-4 rounded-lg border border-gray-700 bg-gray-900">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Answer from {result.chosenAgent}</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{result.answer}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
