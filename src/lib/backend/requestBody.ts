import "server-only";

/** The browser's request body, or "too large" once it passes the limit. */
export type LimitedBody =
  { kind: "body"; bytes: Uint8Array<ArrayBuffer> | null } | { kind: "tooLarge" };

const TOO_LARGE: LimitedBody = { kind: "tooLarge" };

/**
 * Read a request body, stopping as soon as it is over `maxBytes`, whatever `Content-Length`
 * claimed. A missing or empty body is `null`.
 */
export async function readLimitedBody(request: Request, maxBytes: number): Promise<LimitedBody> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return TOO_LARGE;
  if (request.body === null) return { kind: "body", bytes: null };
  const chunks = await readChunks(request.body.getReader(), maxBytes);
  return chunks === null ? TOO_LARGE : { kind: "body", bytes: joinChunks(chunks) };
}

async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array[] | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    total += next.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(next.value);
  }
  return chunks;
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> | null {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  if (total === 0) return null;
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
