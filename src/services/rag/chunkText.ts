const DEFAULT_SIZE = 1100;
const DEFAULT_OVERLAP = 180;
const MAX_CHUNKS = 400;

/** Split extracted document text into overlapping passages for retrieval. */
export function chunkText(
  text: string,
  size = DEFAULT_SIZE,
  overlap = DEFAULT_OVERLAP
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (!normalized) return [];
  if (normalized.length <= size) return [normalized];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) pieces.push(trimmed);
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (pieces.length >= MAX_CHUNKS) break;
    if (paragraph.length > size) {
      pushCurrent();
      for (const slice of splitLong(paragraph, size, overlap)) {
        pieces.push(slice);
        if (pieces.length >= MAX_CHUNKS) break;
      }
      continue;
    }
    if (current && current.length + paragraph.length + 2 > size) {
      pushCurrent();
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();

  if (pieces.length <= 1 || overlap <= 0) return pieces.slice(0, MAX_CHUNKS);

  const overlapped: string[] = [];
  for (let i = 0; i < pieces.length && overlapped.length < MAX_CHUNKS; i += 1) {
    if (i === 0) {
      overlapped.push(pieces[i]);
      continue;
    }
    const prev = pieces[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - overlap)).trim();
    const next = pieces[i];
    overlapped.push(tail && !next.startsWith(tail) ? `${tail}\n${next}` : next);
  }
  return overlapped;
}

function splitLong(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  let start = 0;
  while (start < text.length && out.length < MAX_CHUNKS) {
    let end = Math.min(text.length, start + size);
    if (end < text.length) {
      const breakAt = text.lastIndexOf(' ', end);
      if (breakAt > start + size * 0.5) end = breakAt;
    }
    const slice = text.slice(start, end).trim();
    if (slice) out.push(slice);
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}
