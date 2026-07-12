export const baseRequest = {
  home_team_id: 'HH',
  away_team_id: 'SS',
  request_mode: 'manual_detail' as const,
};

export const buildStreamResponse = (
  chunks: string[],
  headers: Record<string, string> = {},
) => {
  let chunkIndex = 0;

  return new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      if (chunkIndex >= chunks.length) {
        controller.close();
        return;
      }

      controller.enqueue(new TextEncoder().encode(chunks[chunkIndex]));
      chunkIndex += 1;
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', ...headers },
  });
};
