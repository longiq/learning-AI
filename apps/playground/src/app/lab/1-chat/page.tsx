"use client";

import { useState, useRef } from "react";
import { LabHeader } from "@/components/LabHeader";
import { TracePanel } from "@/components/trace/TracePanel";
import type { ChatRequest, ChatResponse } from "@/types/api";
import type { TraceItem } from "@/components/trace/TracePanel";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatLab() {
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [templateSystem, setTemplateSystem] = useState("You are a helpful assistant.");
  const [templateUser, setTemplateUser] = useState("{{message}}");
  const [variables, setVariables] = useState<Record<string, string>>({ message: "" });
  const [streamMode, setStreamMode] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [traceItems, setTraceItems] = useState<TraceItem[]>([]);
  const streamRef = useRef<string>("");

  // Extract variable names from template
  const varNames = [...new Set(
    [...(templateSystem + " " + templateUser).matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_-]*)\}\}/g)]
      .map((m) => m[1])
      .filter((v): v is string => v !== undefined)
  )];

  async function sendMessage() {
    const userContent = variables["message"] ?? templateUser;
    if (!userContent.trim()) return;

    setLoading(true);
    const newMessages: Message[] = [...messages, { role: "user", content: userContent }];
    setMessages(newMessages);
    streamRef.current = "";

    const body: ChatRequest = {
      provider,
      model: model || undefined,
      templateSystem: templateSystem || undefined,
      templateUser,
      variables,
      stream: streamMode,
    };

    if (streamMode) {
      setMessages([...newMessages, { role: "assistant", content: "▌" }]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const renderedRaw = res.headers.get("X-Rendered-Messages");
      const rendered = renderedRaw ? JSON.parse(renderedRaw) as Array<{role: string; content: string}> : [];

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data) as { chunk?: string; error?: string };
                if (parsed.chunk) {
                  full += parsed.chunk;
                  setMessages([
                    ...newMessages,
                    { role: "assistant", content: full + "▌" },
                  ]);
                }
              } catch {/* skip malformed lines */}
            }
          }
        }
      }

      setMessages([...newMessages, { role: "assistant", content: full }]);
      setTraceItems([
        { label: "Rendered messages sent to LLM", value: JSON.stringify(rendered, null, 2), status: "info" },
        { label: "Streaming response", value: full, status: "ok" },
      ]);
    } else {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ChatResponse;
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
      setTraceItems([
        { label: "Rendered messages sent to LLM", value: JSON.stringify(data.renderedMessages, null, 2), status: "info" },
        { label: "Response", value: data.content, status: "ok" },
        ...(data.usage ? [{
          label: "Token usage",
          value: JSON.stringify(data.usage, null, 2),
          status: "info" as const,
        }] : []),
      ]);
    }

    setVariables((v) => ({ ...v, message: "" }));
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <LabHeader
        labNum={1}
        title="Chat & Streaming"
        modules={["@llm-series/llm-client", "@llm-series/prompt-template"]}
        description="Send messages to OpenAI or Anthropic through a unified LLMClient. Use PromptTemplate to define reusable message structures with {{variables}}."
        concept="createClient() abstracts provider differences. PromptTemplate.render(vars) returns Message[] ready for the API."
      />

      <div className="flex flex-1 min-h-0">
        {/* Left: Config */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Provider</label>
            <div className="flex gap-2 mt-1.5">
              {(["openai", "anthropic"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    provider === p ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Model</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "openai" ? "gpt-4o-mini" : "claude-3-5-haiku-latest"}
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">System Template</label>
            <textarea
              value={templateSystem}
              onChange={(e) => setTemplateSystem(e.target.value)}
              rows={2}
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              User Template <span className="text-gray-600 normal-case font-normal">(use {"{{var}}"})</span>
            </label>
            <textarea
              value={templateUser}
              onChange={(e) => setTemplateUser(e.target.value)}
              rows={3}
              className="w-full mt-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {varNames.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Variables</label>
              <div className="mt-1.5 space-y-1.5">
                {varNames.map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 w-20 truncate">{`{{${name}}}`}</span>
                    <input
                      value={variables[name] ?? ""}
                      onChange={(e) => setVariables((v) => ({ ...v, [name]: e.target.value }))}
                      placeholder={name}
                      className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stream</label>
            <button
              onClick={() => setStreamMode((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${streamMode ? "bg-indigo-600" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${streamMode ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <button
            onClick={() => { setMessages([]); setTraceItems([]); }}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 rounded transition-colors"
          >
            Clear conversation
          </button>
        </div>

        {/* Right: Chat + Trace */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-10">
                Fill in the template variables and press Enter (or click Send) to start.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Send bar */}
          <div className="border-t border-gray-800 p-3">
            <div className="flex gap-2">
              <input
                value={variables["message"] ?? ""}
                onChange={(e) => setVariables((v) => ({ ...v, message: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={varNames.includes("message") ? 'Fill {{message}} above or type here' : 'Type a message…'}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "…" : "Send"}
              </button>
            </div>
          </div>

          {/* Trace */}
          {traceItems.length > 0 && (
            <div className="border-t border-gray-800 p-4">
              <TracePanel title="Template & Response Trace" items={traceItems} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
