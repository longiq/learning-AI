"use client";

import { useState } from "react";

export interface TraceItem {
  label: string;
  value: string;
  status: "ok" | "error" | "info";
}

interface TracePanelProps {
  title?: string;
  items: TraceItem[];
}

export function TracePanel({ title = "Trace", items }: TracePanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-900 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
      >
        <span>{title}</span>
        <span className="text-xs text-gray-500">{open ? "▲" : "▼"} {items.length} steps</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-800/60">
          {items.map((item, i) => (
            <TraceItem key={i} index={i + 1} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function TraceItem({ index, item }: { index: number; item: TraceItem }) {
  const [expanded, setExpanded] = useState(true);

  const colors = {
    ok: "border-l-emerald-500",
    error: "border-l-red-500",
    info: "border-l-blue-500",
  };

  const icons = { ok: "✓", error: "✗", info: "ℹ" };

  return (
    <div className={`border-l-2 ${colors[item.status]} bg-gray-950`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-900/50 transition-colors"
      >
        <span
          className={`text-xs font-bold w-4 text-center ${
            item.status === "ok"
              ? "text-emerald-400"
              : item.status === "error"
              ? "text-red-400"
              : "text-blue-400"
          }`}
        >
          {icons[item.status]}
        </span>
        <span className="text-xs text-gray-400 w-5 text-center font-mono">{index}</span>
        <span className="text-sm font-medium text-gray-200 flex-1">{item.label}</span>
        <span className="text-xs text-gray-600">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <pre className="px-4 pb-3 text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
          {item.value}
        </pre>
      )}
    </div>
  );
}
