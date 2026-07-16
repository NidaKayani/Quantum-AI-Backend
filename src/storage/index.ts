import { config } from '../config/index.js';
import { GoogleDriveStorageAdapter } from './GoogleDriveStorageAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import type { StorageAdapter } from './StorageAdapter.js';

export function createStorageAdapter(): StorageAdapter {
  if (config.STORAGE_PROVIDER === 'google-drive') {
    if (!config.GOOGLE_DRIVE_FOLDER_ID || !config.GOOGLE_SERVICE_ACCOUNT_EMAIL || !config.GOOGLE_PRIVATE_KEY) {
      throw new Error('Google Drive storage requires folder id, service account email, and private key');
    }
    return new GoogleDriveStorageAdapter(
      config.GOOGLE_DRIVE_FOLDER_ID,
      config.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      config.GOOGLE_PRIVATE_KEY
    );
  }
  return new LocalStorageAdapter(config.UPLOAD_DIR);
}

export type { StorageAdapter, StoredObject } from './StorageAdapter.js';
