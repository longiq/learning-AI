import { z } from "zod";
import { parseStructured } from "@llm-series/structured-output";
import type { RouterAgent, RouterOptions, RouterResult, Message } from "./types.js";
import { AgentRunError, NoAgentsError, RouterError, UnknownAgentError } from "./errors.js";

const routingSchema = z.object({ agent: z.string().min(1) });

export class AgentRouter {
  readonly #client: RouterOptions["client"];
  readonly #model: string;
  readonly #maxTokens: number | undefined;
  readonly #agents = new Map<string, RouterAgent>();

  constructor(options: RouterOptions) {
    this.#client = options.client;
    this.#model = options.model;
    this.#maxTokens = options.maxTokens;

    for (const agent of options.agents ?? []) {
      this.register(agent);
    }
  }

  register(agent: RouterAgent): this {
    if (this.#agents.has(agent.name)) {
      throw new RouterError(`Agent already registered: "${agent.name}"`);
    }
    this.#agents.set(agent.name, agent);
    return this;
  }

  async route(messages: Message[]): Promise<RouterResult> {
    if (this.#agents.size === 0) {
      throw new NoAgentsError();
    }

    const routingMessages = this.#buildRoutingMessages(messages);

    const result = await this.#client.complete({
      model: this.#model,
      messages: routingMessages,
      ...(this.#maxTokens !== undefined ? { maxTokens: this.#maxTokens } : {}),
    });

    const { agent: agentName } = parseStructured(result.content, routingSchema);

    const agent = this.#agents.get(agentName);
    if (agent === undefined) {
      throw new UnknownAgentError(agentName, Array.from(this.#agents.keys()));
    }

    let answer: string;
    try {
      answer = await agent.run(messages);
    } catch (err) {
      throw new AgentRunError(agent.name, { cause: err });
    }

    return { answer, agentName };
  }

  #buildRoutingMessages(messages: Message[]): Message[] {
    const agentList = Array.from(this.#agents.values())
      .map((a) => `- name: "${a.name}"\n  description: "${a.description}"`)
      .join("\n");

    const userQuery =
      messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .at(-1) ?? "";

    return [
      {
        role: "system",
        content:
          `You are a router. Select the most appropriate agent for the user's query.\n\n` +
          `Available agents:\n${agentList}\n\n` +
          `Respond with ONLY a JSON object: {"agent": "<name>"}`,
      },
      {
        role: "user",
        content: userQuery,
      },
    ];
  }
}
