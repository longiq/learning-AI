import Link from "next/link";

const labs = [
  {
    num: 1,
    href: "/lab/1-chat",
    title: "Chat & Streaming",
    description: "Interact with OpenAI or Anthropic using a unified client. Use prompt templates with variables.",
    modules: ["llm-client", "prompt-template"],
    color: "from-indigo-900/40 to-indigo-950/20 border-indigo-700/40",
    badge: "bg-indigo-900/50 text-indigo-300",
  },
  {
    num: 2,
    href: "/lab/2-structured",
    title: "Structured Output",
    description: "Extract and validate JSON from LLM responses using Zod schemas. See each extraction step.",
    modules: ["structured-output"],
    color: "from-violet-900/40 to-violet-950/20 border-violet-700/40",
    badge: "bg-violet-900/50 text-violet-300",
  },
  {
    num: 3,
    href: "/lab/3-agent",
    title: "ReAct Agent",
    description: "Run a multi-step agent that reasons and calls tools. Visualize the Thought→Action→Observation loop.",
    modules: ["tool-registry", "simple-react-agent"],
    color: "from-amber-900/40 to-amber-950/20 border-amber-700/40",
    badge: "bg-amber-900/50 text-amber-300",
  },
  {
    num: 4,
    href: "/lab/4-memory",
    title: "Memory Store",
    description: "Chat with a sliding-window memory. Watch entries get evicted when the context fills up.",
    modules: ["memory-store"],
    color: "from-teal-900/40 to-teal-950/20 border-teal-700/40",
    badge: "bg-teal-900/50 text-teal-300",
  },
  {
    num: 5,
    href: "/lab/5-rag",
    title: "RAG Pipeline",
    description: "Ingest documents → chunk → embed → store vectors → retrieve by similarity → generate answers.",
    modules: ["chunker", "embedder", "vector-store-lite", "retriever"],
    color: "from-emerald-900/40 to-emerald-950/20 border-emerald-700/40",
    badge: "bg-emerald-900/50 text-emerald-300",
  },
  {
    num: 6,
    href: "/lab/6-router",
    title: "Multi-Agent Router",
    description: "Let an LLM classify your query and route it to the most appropriate specialized agent.",
    modules: ["agent-router"],
    color: "from-rose-900/40 to-rose-950/20 border-rose-700/40",
    badge: "bg-rose-900/50 text-rose-300",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-3">LLM Agent Playground</h1>
        <p className="text-gray-400 text-base leading-relaxed">
          6 interactive labs covering the full LLM agent stack — from raw API calls to multi-agent routing.
          Each lab is backed by a real <code className="text-indigo-300 font-mono text-sm">@llm-series</code> module you can explore and extend.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {labs.map((lab) => (
          <Link
            key={lab.href}
            href={lab.href}
            className={`group relative rounded-xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.01] hover:shadow-lg ${lab.color}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-gray-500 font-mono">Lab {lab.num}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {lab.modules.map((m) => (
                  <span key={m} className={`text-xs px-1.5 py-0.5 rounded font-mono ${lab.badge}`}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <h2 className="text-base font-semibold text-white mb-1.5">{lab.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">{lab.description}</p>
            <span className="absolute bottom-4 right-4 text-gray-600 group-hover:text-gray-400 transition-colors text-sm">
              →
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 p-4 rounded-lg bg-gray-900 border border-gray-800">
        <p className="text-xs text-gray-500">
          <span className="text-gray-400 font-medium">Setup:</span> Copy{" "}
          <code className="font-mono text-indigo-400">.env.example</code> →{" "}
          <code className="font-mono text-indigo-400">.env.local</code> and add your API keys.
          Labs 1–4 and 6 need <code className="font-mono text-indigo-400">OPENAI_API_KEY</code> or{" "}
          <code className="font-mono text-indigo-400">ANTHROPIC_API_KEY</code>.
          Lab 5 (RAG) additionally needs an embeddings key.
        </p>
      </div>
    </div>
  );
}
