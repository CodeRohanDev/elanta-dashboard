import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads an image to Firebase Storage and returns the download URL
 * @param file The file to upload
 * @param folder The folder to upload to (e.g., 'products', 'categories', 'users')
 * @param onProgress Optional callback for upload progress
 */
export async function uploadImage(
  file: File,
  folder: string = 'products',
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a unique filename to prevent collisions
      const filename = `${folder}/${uuidv4()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, filename);
      
      // Start the upload
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Listen for state changes, errors, and completion of the upload
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Get upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          // Handle unsuccessful uploads
          console.error('Error uploading image:', error);
          reject(error);
        },
        async () => {
          // Handle successful uploads
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Uploads multiple images to Firebase Storage
 * @param files Array of files to upload
 * @param folderType The folder type to upload to ('products', 'categories', 'users', etc.)
 * @param onProgress Optional callback for overall progress
 */
export async function uploadMultipleImages(
  files: File[],
  folderType: string = 'products',
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const uploadPromises = Array.from(files).map((file, index) => {
    return uploadImage(file, folderType, (progress) => {
      if (onProgress) {
        // Calculate overall progress
        const overallProgress = (index / files.length) + (progress / 100 / files.length);
        onProgress(overallProgress * 100);
      }
    });
  });

  return Promise.all(uploadPromises);
} 