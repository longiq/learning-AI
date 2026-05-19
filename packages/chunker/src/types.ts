export interface Chunk {
  text: string;
  index: number;
  start: number;
  end: number;
}

export type ChunkStrategy = "character" | "sentence";

export interface ChunkOptions {
  strategy?: ChunkStrategy;
  size: number;
  overlap?: number;
}
