export interface Chunk {
  index: number;
  text: string;
  source: "content" | "compiled_truth";
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Chunk text into overlapping segments at sentence boundaries.
 * Uses a simple sentence-boundary heuristic: split on ". " or newlines,
 * then group sentences until chunk size is reached.
 */
export function chunkText(
  text: string,
  opts: {
    chunkSize?: number;
    overlap?: number;
    source?: "content" | "compiled_truth";
  } = {}
): Chunk[] {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = opts.overlap ?? DEFAULT_CHUNK_OVERLAP;
  const source = opts.source ?? "content";

  if (text.length <= chunkSize) {
    return [{ index: 0, text, source }];
  }

  // Split into sentences (rough heuristic)
  const sentences = text.split(/(?<=[.!?])\s+|\n{2,}/);
  const chunks: Chunk[] = [];
  let current = "";
  let index = 0;

  for (const sentence of sentences) {
    if (current.length + sentence.length > chunkSize && current.length > 0) {
      chunks.push({ index, text: current.trim(), source });
      index++;

      // Keep overlap by retaining the tail of the current chunk
      const words = current.split(/\s+/);
      const overlapWords = [];
      let overlapLen = 0;
      for (let i = words.length - 1; i >= 0 && overlapLen < overlap; i--) {
        overlapWords.unshift(words[i]);
        overlapLen += words[i].length + 1;
      }
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push({ index, text: current.trim(), source });
  }

  return chunks;
}
