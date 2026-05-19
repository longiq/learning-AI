"use client";

import { useState } from "react";
import { LabHeader } from "@/components/LabHeader";
import type { MemoryRequest, MemoryResponse, MemoryHistoryEntry } from "@/types/api";

export default function MemoryLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant with a concise memory.");
  const [maxEntries, setMaxEntries] = useState(6);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<MemoryHistoryEntry[]>([]);
  const [droppedTotal, setDroppedTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    setLoading(true);

    const body: MemoryRequest = {
      provider,
      model: model || undefined,
      message: input,
      history,
      systemPrompt: systemPrompt || undefined,
      maxEntries,
    };

    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as MemoryResponse;
    setHistory(data.updatedHistory);
    setDroppedTotal((n) => n + data.droppedCount);
    setInput("");
    setLoading(false);
  }

  function reset() {
    setHistory([]);
    setDroppedTotal(0);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={4}
        title="Memory Store"
        modules={["@llm-series/memory-store"]}
        description="MemoryStore manages a sliding window of conversation history. When maxEntries is reached, the oldest entries are evicted. The system prompt is always prepended but not stored as an entry."
        concept="The server is stateless — client sends the full history each request. MemoryStore.fromJSON() restores it, enforces the window, and getMessages() prepends the system prompt."
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
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System Prompt</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={3}
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Max Entries: {maxEntries}
              <span className="ml-1 text-gray-600 font-normal">(sliding window)</span>
            </label>
            <input type="range" min={2} max={20} value={maxEntries} onChange={(e) => setMaxEntries(Number(e.target.value))}
              className="w-full mt-1.5 accent-teal-500" />
            <p className="text-xs text-gray-600 mt-1">
              Set low (e.g. 4) to see eviction in action.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Entries in window</span>
              <span className="text-teal-400 font-mono">{history.length} / {maxEntries}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total evicted</span>
              <span className="text-orange-400 font-mono">{droppedTotal}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (history.length / maxEntries) * 100)}%` }} />
            </div>
          </div>

          <button onClick={reset}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 rounded transition-colors">
            Reset conversation
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* System prompt indicator */}
            <div className="flex justify-center">
              <span className="text-xs text-gray-600 px-3 py-1 rounded-full border border-gray-800">
                system: {systemPrompt.slice(0, 60)}{systemPrompt.length > 60 ? "…" : ""}
              </span>
            </div>

            {history.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-8">
                Start chatting. Try to recall something from early in the conversation after the window fills.
              </div>
            )}

            {history.map((entry, i) => (
              <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  entry.role === "user"
                    ? "bg-teal-700 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-100 rounded-bl-sm"
                }`}>
                  {entry.content}
                  <div className="text-xs opacity-40 mt-1">
                    #{i + 1} · {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {droppedTotal > 0 && (
            <div className="mx-4 mb-2 px-3 py-2 rounded bg-orange-950/30 border border-orange-700/30 text-xs text-orange-400">
              ⚠ {droppedTotal} message{droppedTotal !== 1 ? "s" : ""} evicted from context window. The LLM can no longer see them.
            </div>
          )}

          <div className="border-t border-gray-800 p-3">
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Type a message…"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 disabled:opacity-50" />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>
        </div>

        {/* Memory entries panel */}
        <div className="w-56 flex-shrink-0 border-l border-gray-800 p-3 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Memory Entries</p>
          {history.length === 0 ? (
            <p className="text-xs text-gray-600">No entries yet.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((e, i) => (
                <div key={i} className={`p-2 rounded text-xs border ${
                  e.role === "user" ? "border-teal-800/50 bg-teal-950/20" : "border-gray-700 bg-gray-900"
                }`}>
                  <div className="flex justify-between text-gray-500 mb-0.5">
                    <span>{e.role}</span>
                    <span>#{i + 1}</span>
                  </div>
                  <p className="text-gray-300 line-clamp-2">{e.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
