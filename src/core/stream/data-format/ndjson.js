export class NdJsonParserStream extends TransformStream {
  constructor() {
    let controller;
    let buffer = '';
    
    super({
      start: (_controller) => {
        controller = _controller;
      },
      transform: (chunk) => {
        const jsonChunks = chunk.split('\n').filter(Boolean);
        for (const jsonChunk of jsonChunks) {
          try {
            buffer += jsonChunk;
            controller.enqueue(JSON.parse(buffer));
            buffer = '';
          } catch {
            // Invalid JSON, wait for next chunk
          }
        }
      },
    });
  }
}