import { NextRequest, NextResponse } from "next/server";
import { runAgent, MaxIterationsError } from "@llm-series/simple-react-agent";
import { getClient } from "@/lib/client-factory";
import { buildRegistry } from "@/lib/tool-presets";
import { env } from "@/lib/env";
import type { AgentRequest, AgentResponse, SerializedAgentStep } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AgentRequest;
  const {
    provider,
    model,
    query,
    enabledTools,
    maxIterations = 10,
  } = body;

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;
  const registry = buildRegistry(enabledTools);

  try {
    const result = await runAgent({
      client,
      registry,
      model: resolvedModel,
      messages: [{ role: "user", content: query }],
      maxIterations,
    });

    const steps: SerializedAgentStep[] = result.steps.map((step) => {
      if (step.type === "finish") {
        return { type: "finish", text: step.text };
      }
      return {
        type: "tool_call",
        calls: step.calls.map((c) => ({ id: c.id, name: c.name, argsJson: c.argsJson })),
        results: step.results.map((r) => ({
          id: r.id,
          name: r.name,
          output: r.output,
          ...(r.error !== undefined ? { error: r.error } : {}),
        })),
      };
    });

    const response: AgentResponse = {
      answer: result.answer,
      steps,
      iterations: result.iterations,
    };
    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof MaxIterationsError) {
      return NextResponse.json(
        { error: `Reached max iterations (${err.iterations})`, code: "MAX_ITERATIONS" },
        { status: 422 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
