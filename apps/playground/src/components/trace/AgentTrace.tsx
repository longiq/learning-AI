"use client";

import { useState } from "react";
import type { SerializedAgentStep } from "@/types/api";

interface AgentTraceProps {
  steps: SerializedAgentStep[];
  iterations: number;
}

export function AgentTrace({ steps, iterations }: AgentTraceProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Agent Trace
        </span>
        <span className="text-xs text-gray-600">{iterations} iteration{iterations !== 1 ? "s" : ""}</span>
      </div>

      {steps.map((step, i) => (
        <AgentStepCard key={i} step={step} stepNum={i + 1} />
      ))}
    </div>
  );
}

function AgentStepCard({ step, stepNum }: { step: SerializedAgentStep; stepNum: number }) {
  const [expanded, setExpanded] = useState(true);

  if (step.type === "finish") {
    return (
      <div className="border border-emerald-700/50 rounded-lg bg-emerald-950/20 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-700/30">
          <span className="text-emerald-400 text-sm">✅</span>
          <span className="text-sm font-semibold text-emerald-300">Final Answer</span>
          <span className="ml-auto text-xs text-gray-600">Step {stepNum}</span>
        </div>
        <p className="px-4 py-3 text-sm text-gray-200 whitespace-pre-wrap">{step.text}</p>
      </div>
    );
  }

  return (
    <div className="border border-amber-700/40 rounded-lg bg-amber-950/10 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-amber-700/20 hover:bg-amber-950/20 transition-colors text-left"
      >
        <span className="text-amber-400 text-sm">🔧</span>
        <span className="text-sm font-semibold text-amber-300">
          Tool Call{step.calls.length > 1 ? "s" : ""}: {step.calls.map((c) => c.name).join(", ")}
        </span>
        <span className="ml-auto text-xs text-gray-600">Step {stepNum} {expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="divide-y divide-amber-700/20">
          {step.calls.map((call, ci) => {
            const result = step.results[ci];
            return (
              <div key={ci} className="px-4 py-3 space-y-2">
                <div>
                  <span className="text-xs font-semibold text-amber-400 uppercase">Action</span>
                  <pre className="mt-1 text-xs font-mono text-amber-200 bg-amber-950/30 rounded px-3 py-2 whitespace-pre-wrap break-all">
                    {call.name}({call.argsJson})
                  </pre>
                </div>
                {result && (
                  <div>
                    <span className="text-xs font-semibold text-blue-400 uppercase">
                      {result.error ? "Error" : "Observation"}
                    </span>
                    <pre
                      className={`mt-1 text-xs font-mono rounded px-3 py-2 whitespace-pre-wrap break-all ${
                        result.error
                          ? "bg-red-950/30 text-red-300"
                          : "bg-blue-950/20 text-blue-200"
                      }`}
                    >
                      {result.error ?? JSON.stringify(result.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
