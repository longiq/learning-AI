interface LabHeaderProps {
  labNum: number;
  title: string;
  modules: string[];
  description: string;
  concept: string;
}

export function LabHeader({ labNum, title, modules, description, concept }: LabHeaderProps) {
  return (
    <div className="border-b border-gray-800 px-6 py-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-mono text-gray-500">Lab {labNum}</span>
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <div className="flex gap-1.5 ml-auto">
          {modules.map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 text-xs rounded bg-indigo-900/50 text-indigo-300 font-mono border border-indigo-700/50"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
      <p className="text-xs text-indigo-400 mt-1.5 font-medium">💡 {concept}</p>
    </div>
  );
}
