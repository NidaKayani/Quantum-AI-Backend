const STOP_WORDS = new Set(
  `a an the and or of to in on for with from by at as is are was were be been being it this that these those what which who whom whose why how when where into about your you we they i me my our their not do does did can could should would will just than then so if`.split(
    ' '
  )
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? []).filter((token) => !STOP_WORDS.has(token));
}

export interface RankedHit<T> {
  item: T;
  score: number;
  index: number;
}

/**
 * Rank passages with Okapi BM25.
 * A question with no useful words returns the earliest passages, which still
 * gives the model something to work from for requests like "summarize this".
 */
export function rankByBm25<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  limit: number
): RankedHit<T>[] {
  const queryTerms = [...new Set(tokenize(query))];
  const docs = items.map((item, index) => {
    const tokens = tokenize(getText(item));
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    return { item, index, tf, length: tokens.length };
  });

  if (!docs.length || limit <= 0) return [];
  if (!queryTerms.length) {
    return docs.slice(0, limit).map((doc) => ({ item: doc.item, score: 0, index: doc.index }));
  }

  const total = docs.length;
  const avgdl = docs.reduce((sum, doc) => sum + doc.length, 0) / total || 1;
  const df = new Map<string, number>();
  for (const term of queryTerms) {
    df.set(term, docs.reduce((sum, doc) => sum + (doc.tf.has(term) ? 1 : 0), 0));
  }

  const k1 = 1.2;
  const b = 0.75;
  const ranked = docs.map((doc) => {
    let score = 0;
    for (const term of queryTerms) {
      const freq = doc.tf.get(term) ?? 0;
      if (!freq) continue;
      const docsWithTerm = df.get(term) ?? 0;
      const idf = Math.log(1 + (total - docsWithTerm + 0.5) / (docsWithTerm + 0.5));
      const denom = freq + k1 * (1 - b + (b * doc.length) / avgdl);
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return { item: doc.item, score, index: doc.index };
  });

  ranked.sort((left, right) => right.score - left.score || left.index - right.index);
  return ranked.slice(0, limit);
}
