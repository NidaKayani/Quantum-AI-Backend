import { Readable } from 'stream';
import { google, type drive_v3 } from 'googleapis';
import type { StorageAdapter, StoredObject } from './StorageAdapter.js';

export class GoogleDriveStorageAdapter implements StorageAdapter {
  private readonly drive: drive_v3.Drive;
  private ready?: Promise<void>;

  constructor(
    private readonly folderId: string,
    serviceAccountEmail: string,
    privateKey: string
  ) {
    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async ensureReady(): Promise<void> {
    this.ready ??= this.drive.files
      .get({
        fileId: this.folderId,
        fields: 'id',
        supportsAllDrives: true,
      })
      .then(() => undefined)
      .catch((error) => {
        this.ready = undefined;
        throw error;
      });
    await this.ready;
  }

  async put(buffer: Buffer, name: string, mimeType: string, userId: string): Promise<StoredObject> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        parents: [this.folderId],
        appProperties: { quantumAiUserId: userId },
      },
      media: { mimeType, body: Readable.from(buffer) },
      fields: 'id',
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new Error('Google Drive did not return a file id');
    return { key: response.data.id, provider: 'google-drive' };
  }

  async read(key: string): Promise<Buffer> {
    const response = await this.drive.files.get(
      { fileId: key, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(response.data as ArrayBuffer);
  }

  async delete(key: string): Promise<void> {
    await this.drive.files.delete({ fileId: key, supportsAllDrives: true });
  }
}
