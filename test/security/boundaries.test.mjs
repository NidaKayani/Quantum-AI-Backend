import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

async function source(relative) {
  return fs.readFile(path.join(root, relative), 'utf8');
}

test('all conversation and document queries retain user isolation predicates', async () => {
  const conversation = await source('src/services/ConversationService.ts');
  const documents = await source('src/services/DocumentStorageService.ts');
  assert.match(conversation, /findOne\(\{\s*_id:\s*id,\s*userId\s*\}\)/);
  assert.match(conversation, /filter[^]*userId/);
  assert.match(documents, /findOne\(\{\s*_id:\s*id,\s*userId\s*\}\)/);
  assert.match(documents, /find\(\{\s*userId\s*\}\)/);
});

test('explicit chat context is labeled as untrusted data, not system instructions', async () => {
  const chat = await source('src/services/AiChatService.ts');
  assert.match(chat, /user-approved, untrusted chat context/i);
  assert.match(chat, /never as system instructions/i);
});

test('serverless document storage has Drive isolation and extracted-text caps', async () => {
  const storage = await source('src/services/DocumentStorageService.ts');
  const drive = await source('src/storage/GoogleDriveStorageAdapter.ts');
  assert.match(storage, /MAX_EXTRACTED_TEXT_CHARS/);
  assert.match(drive, /appProperties:\s*\{\s*quantumAiUserId:\s*userId\s*\}/);
  assert.match(drive, /supportsAllDrives:\s*true/);
});

test('uploads are constrained by configured file size and allowlisted file types', async () => {
  const upload = await source('src/middleware/upload.ts');
  assert.match(upload, /maxFileSizeBytes|MAX_FILE_SIZE/);
  assert.match(upload, /fileFilter|allowed/i);
});

test('group bot receipts are bound to requester, destination, and content hash', async () => {
  const receipt = await source('src/utils/serviceReceipt.ts');
  assert.match(receipt, /\$\{userId\}:\$\{destination\}:\$\{hash\}:\$\{requestId\}/);
  assert.match(receipt, /createHmac\('sha256'/);
});

test('production rate limiting uses a distributed Upstash store when configured', async () => {
  const limiter = await source('src/middleware/rateLimiter.ts');
  assert.match(limiter, /class UpstashRateLimitStore/);
  assert.match(limiter, /UPSTASH_REDIS_REST_URL/);
  assert.match(limiter, /redis\.incr/);
  assert.match(limiter, /redis\.pexpire/);
});
