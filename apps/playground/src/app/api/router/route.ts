import { NextRequest, NextResponse } from "next/server";
import { AgentRouter } from "@llm-series/agent-router";
import { getClient } from "@/lib/client-factory";
import { buildPresetAgents } from "@/lib/agent-presets";
import { env } from "@/lib/env";
import type { RouterRequest, RouterResponse } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RouterRequest;
  const { provider, model, message } = body;

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;
  const agents = buildPresetAgents(provider);

  const router = new AgentRouter({ client, model: resolvedModel, agents });

  const messages = [{ role: "user" as const, content: message }];

  // Capture routing reasoning by making the routing LLM call ourselves first
  // so we can show the raw JSON in the UI
  const agentList = agents
    .map((a) => `- name: "${a.name}"\n  description: "${a.description}"`)
    .join("\n");

  const routingResult = await client.complete({
    model: resolvedModel,
    messages: [
      {
        role: "system",
        content:
          `You are a router. Select the most appropriate agent for the user's query.\n\n` +
          `Available agents:\n${agentList}\n\n` +
          `Respond with ONLY a JSON object: {"agent": "<name>"}`,
      },
      { role: "user", content: message },
    ],
    maxTokens: 50,
  });

  const routingReasoning = routingResult.content;

  // Now route for real (AgentRouter will do the same call + dispatch)
  const result = await router.route(messages);

  const response: RouterResponse = {
    chosenAgent: result.agentName,
    routingReasoning,
    answer: result.answer,
    availableAgents: agents.map((a) => ({ name: a.name, description: a.description })),
  };

  return NextResponse.json(response);
}
