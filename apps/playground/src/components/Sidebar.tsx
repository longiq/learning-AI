"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labs = [
  { href: "/lab/1-chat", label: "Chat & Streaming", num: 1, modules: "#1 #2" },
  { href: "/lab/2-structured", label: "Structured Output", num: 2, modules: "#3" },
  { href: "/lab/3-agent", label: "ReAct Agent", num: 3, modules: "#4 #5" },
  { href: "/lab/4-memory", label: "Memory Store", num: 4, modules: "#6" },
  { href: "/lab/5-rag", label: "RAG Pipeline", num: 5, modules: "#7 #8" },
  { href: "/lab/6-router", label: "Multi-Agent Router", num: 6, modules: "#9" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-800">
        <Link href="/" className="text-sm font-bold text-white tracking-tight">
          🤖 LLM Playground
        </Link>
        <p className="text-xs text-gray-500 mt-1">9 modules · 6 labs</p>
      </div>

      <ul className="flex-1 py-3 space-y-0.5 px-2">
        {labs.map((lab) => {
          const active = pathname.startsWith(lab.href);
          return (
            <li key={lab.href}>
              <Link
                href={lab.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    active ? "bg-indigo-400 text-indigo-900" : "bg-gray-700 text-gray-300"
                  }`}
                >
                  {lab.num}
                </span>
                <span className="flex-1 min-w-0 truncate">{lab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600">@llm-series monorepo</p>
      </div>
    </nav>
  );
}
