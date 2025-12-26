/**
 * Firebase Storage Service
 * Handles file uploads with progress tracking
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './config';

export class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload a file to Firebase Storage with progress tracking
   * @param path Storage path (e.g., 'users/{userId}/voice-notes/{noteId}.webm')
   * @param file File or Blob to upload
   * @param onProgress Callback for upload progress (0-100)
   * @returns Download URL of uploaded file
   */
  async uploadFile(
    path: string,
    file: Blob | File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Upload multiple files in parallel
   * @param uploads Array of {path, file} objects
   * @param onProgress Callback for overall progress (0-100)
   * @returns Array of download URLs in same order as uploads
   */
  async uploadFiles(
    uploads: Array<{ path: string; file: Blob | File }>,
    onProgress?: (progress: number) => void
  ): Promise<string[]> {
    const progressMap = new Map<number, number>();
    const urls: string[] = [];

    const uploadPromises = uploads.map((upload, index) =>
      this.uploadFile(upload.path, upload.file, (progress) => {
        progressMap.set(index, progress);

        // Calculate overall progress
        const totalProgress =
          Array.from(progressMap.values()).reduce((sum, val) => sum + val, 0) /
          uploads.length;
        onProgress?.(Math.round(totalProgress));
      }).then((url) => {
        urls[index] = url;
      })
    );

    await Promise.all(uploadPromises);
    return urls;
  }

  /**
   * Delete a file from Firebase Storage
   * @param path Storage path to delete
   */
  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  /**
   * Get download URL for an existing file
   * @param path Storage path
   * @returns Download URL
   */
  async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }
}

// Export singleton instance
export default StorageService.getInstance();
