interface MockCompletionResponse {
  content: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  statusCode?: number;
  errorMessage?: string;
}

function buildSSEStream(content: string, finishReason = "stop"): ReadableStream {
  const encoder = new TextEncoder();
  const chunks = content.split("");

  return new ReadableStream({
    start(controller) {
      for (const char of chunks) {
        const data = JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion.chunk",
          choices: [{ delta: { content: char }, finish_reason: null, index: 0 }],
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      // Final chunk with finish_reason
      const finalChunk = JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        choices: [{ delta: {}, finish_reason: finishReason, index: 0 }],
        usage: { prompt_tokens: 10, completion_tokens: content.length, total_tokens: 10 + content.length },
      });
      controller.enqueue(encoder.encode(`data: ${finalChunk}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export function createMockOpenAIFetch(response: MockCompletionResponse) {
  return async (_url: string, init?: RequestInit): Promise<Response> => {
    if (response.statusCode && response.statusCode >= 400) {
      return new Response(
        JSON.stringify({ error: { message: response.errorMessage ?? "Error", type: "error" } }),
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
      return new Response(buildSSEStream(response.content, response.finishReason ?? "stop"), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    return new Response(
      JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion",
        choices: [
          {
            message: { role: "assistant", content: response.content },
            finish_reason: response.finishReason ?? "stop",
            index: 0,
          },
        ],
        usage: {
          prompt_tokens: response.promptTokens ?? 10,
          completion_tokens: response.completionTokens ?? 5,
          total_tokens: (response.promptTokens ?? 10) + (response.completionTokens ?? 5),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
}
