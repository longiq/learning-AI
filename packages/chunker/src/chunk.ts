import type { Chunk, ChunkOptions } from "./types.js";
import { ChunkerError } from "./errors.js";

function chunkByCharacter(text: string, size: number, overlap: number): Chunk[] {
  if (size <= 0) throw new ChunkerError("size must be greater than 0");
  if (overlap < 0) throw new ChunkerError("overlap must be >= 0");
  if (overlap >= size) throw new ChunkerError("overlap must be less than size");

  const chunks: Chunk[] = [];
  const step = size - overlap;
  let index = 0;

  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + size, text.length);
    chunks.push({ text: text.slice(start, end), index, start, end });
    index++;
    if (end === text.length) break;
  }

  return chunks;
}

function splitSentences(text: string): Array<{ text: string; start: number }> {
  const result: Array<{ text: string; start: number }> = [];
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const re = /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const s = match[0];
    if (s.trim().length > 0) {
      result.push({ text: s, start: match.index });
    }
  }
  return result;
}

function chunkBySentence(text: string, size: number, overlap: number): Chunk[] {
  if (size <= 0) throw new ChunkerError("size must be greater than 0");
  if (overlap < 0) throw new ChunkerError("overlap must be >= 0");
  if (overlap >= size) throw new ChunkerError("overlap must be less than size");

  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const chunks: Chunk[] = [];
  let chunkIndex = 0;
  let sentStart = 0;

  while (sentStart < sentences.length) {
    let charCount = 0;
    let sentEnd = sentStart;

    // Accumulate sentences until we hit the size limit
    while (sentEnd < sentences.length) {
      const s = sentences[sentEnd];
      if (s === undefined) break;
      if (charCount + s.text.length > size && sentEnd > sentStart) break;
      charCount += s.text.length;
      sentEnd++;
    }

    // sentStart..sentEnd is our window (exclusive end)
    if (sentEnd === sentStart) sentEnd = sentStart + 1; // always include at least one

    const firstSent = sentences[sentStart];
    const lastSent = sentences[sentEnd - 1];
    if (firstSent === undefined || lastSent === undefined) break;

    const chunkText = text.slice(firstSent.start, lastSent.start + lastSent.text.length);
    chunks.push({
      text: chunkText,
      index: chunkIndex,
      start: firstSent.start,
      end: lastSent.start + lastSent.text.length,
    });
    chunkIndex++;

    if (overlap === 0) {
      sentStart = sentEnd;
    } else {
      // Walk backward from sentEnd to find where ~overlap chars of overlap begins
      let overlapChars = 0;
      let nextStart = sentEnd;
      for (let i = sentEnd - 1; i > sentStart; i--) {
        const s = sentences[i];
        if (s === undefined) break;
        overlapChars += s.text.length;
        nextStart = i;
        if (overlapChars >= overlap) break;
      }
      sentStart = nextStart <= sentStart ? sentEnd : nextStart;
    }
  }

  return chunks;
}

export function chunk(text: string, options: ChunkOptions): Chunk[] {
  if (text.length === 0) return [];
  const strategy = options.strategy ?? "character";
  const overlap = options.overlap ?? 0;

  if (strategy === "sentence") {
    return chunkBySentence(text, options.size, overlap);
  }
  return chunkByCharacter(text, options.size, overlap);
}
