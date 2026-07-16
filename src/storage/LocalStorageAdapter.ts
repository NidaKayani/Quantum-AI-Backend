import fs from 'fs/promises';
import path from 'path';
import type { StorageAdapter, StoredObject } from './StorageAdapter.js';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly uploadDir: string) {}

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async put(buffer: Buffer, name: string, _mimeType: string, _userId: string): Promise<StoredObject> {
    await this.ensureReady();
    const key = path.join(this.uploadDir, name);
    await fs.writeFile(key, buffer);
    return { key, provider: 'local' };
  }

  read(key: string): Promise<Buffer> {
    return fs.readFile(key);
  }

  async delete(key: string): Promise<void> {
    await fs.rm(key, { force: true });
  }
}
