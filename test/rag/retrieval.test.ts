import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkText } from '../../src/services/rag/chunkText.ts';
import { rankByBm25 } from '../../src/services/rag/bm25.ts';

test('short text stays one passage', () => {
  const chunks = chunkText('Photosynthesis turns light into sugar.');
  assert.equal(chunks.length, 1);
  assert.match(chunks[0], /Photosynthesis/);
});

test('long text is split into overlapping passages', () => {
  const paragraph = 'Cell biology '.repeat(200);
  const chunks = chunkText(`${paragraph}\n\n${'Genetics notes '.repeat(200)}`);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length > 0));
});

test('BM25 ranks the passage that contains the question terms first', () => {
  const passages = [
    'The water cycle describes evaporation and rain.',
    'Mitochondria produce ATP inside eukaryotic cells.',
    'A triangle has three sides and three angles.',
  ];
  const ranked = rankByBm25('What do mitochondria produce?', passages, (item) => item, 2);
  assert.equal(ranked[0].item, passages[1]);
  assert.ok(ranked[0].score > ranked[1].score);
});

test('a vague question still returns the opening passages', () => {
  const passages = ['Opening chapter about rivers.', 'Later chapter about dams.'];
  const ranked = rankByBm25('???', passages, (item) => item, 1);
  assert.equal(ranked[0].item, passages[0]);
});
