interface MockAnthropicResponse {
  content: string;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  statusCode?: number;
  errorMessage?: string;
}

function buildAnthropicSSEStream(content: string, stopReason = "end_turn"): ReadableStream {
  const encoder = new TextEncoder();
  const chars = content.split("");

  return new ReadableStream({
    start(controller) {
      const encode = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      encode("message_start", {
        type: "message_start",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [],
          model: "claude-haiku-4-5",
          stop_reason: null,
          usage: { input_tokens: 10, output_tokens: 0 },
        },
      });

      encode("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      });

      for (const char of chars) {
        encode("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: char },
        });
      }

      encode("content_block_stop", { type: "content_block_stop", index: 0 });

      encode("message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: chars.length },
      });

      encode("message_stop", { type: "message_stop" });

      controller.close();
    },
  });
}

export function createMockAnthropicFetch(response: MockAnthropicResponse) {
  return async (_url: string, init?: RequestInit): Promise<Response> => {
    if (response.statusCode && response.statusCode >= 400) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: response.errorMessage ?? "Error" },
        }),
        {
          status: response.statusCode,
          headers: {
            "Content-Type": "application/json",
            ...(response.statusCode === 429 ? { "retry-after": "30" } : {}),
          },
        },
      );
    }

    const body = JSON.parse(init?.body as string ?? "{}") as { stream?: boolean };
    const isStream = body.stream === true;

    if (isStream) {
      return new Response(buildAnthropicSSEStream(response.content, response.stopReason ?? "end_turn"), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    return new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: response.content }],
        model: "claude-haiku-4-5",
        stop_reason: response.stopReason ?? "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: response.inputTokens ?? 10,
          output_tokens: response.outputTokens ?? 5,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
}
