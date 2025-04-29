import { useState, useRef } from 'react';
import { RiUpload2Line, RiCloseLine } from 'react-icons/ri';
import { uploadMultipleImages } from '@/lib/uploadImage';

interface ImageUploaderProps {
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
  folderType?: string; // Folder path for storage - products, categories, users, etc.
  error?: string;
}

export default function ImageUploader({ 
  images, 
  setImages, 
  maxImages = 10,
  folderType = 'products',
  error
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      // Filter to only allow image files
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );

      if (imageFiles.length === 0) {
        setUploading(false);
        return; // No valid image files
      }

      // Check if adding these would exceed maxImages
      if (images.length + imageFiles.length > maxImages) {
        // Only take what we can fit
        const remainingSlots = maxImages - images.length;
        if (remainingSlots <= 0) {
          setUploading(false);
          return; // No slots left
        }
        
        // Slice to only use available slots
        imageFiles.splice(remainingSlots);
      }

      // Use the real upload function with progress tracking
      const newImageUrls = await uploadMultipleImages(
        imageFiles, 
        folderType,
        (progress) => {
          setUploadProgress(Math.round(progress));
        }
      );

      // Add new images to the existing ones
      setImages([...images, ...newImageUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFiles(files);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set isDragging to false if we're leaving the drop area (not a child element)
    if (dropAreaRef.current && !dropAreaRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    await processFiles(files);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Upload Images {maxImages > 1 ? `(${images.length}/${maxImages})` : ''}</label>
      <div 
        ref={dropAreaRef}
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'} border-dashed rounded-md transition-colors duration-200`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-1 text-center">
          <RiUpload2Line className={`mx-auto h-12 w-12 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`} />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="images" className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span>{uploading ? 'Uploading...' : 'Upload files'}</span>
              <input
                id="images"
                name="images"
                type="file"
                className="sr-only"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading || images.length >= maxImages}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 10MB
          </p>
          
          {uploading && (
            <div className="w-full mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </div>
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`Product image ${index + 1}`}
                className="h-32 w-full object-cover rounded-md"
              />
              <button
                type="button"
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                onClick={() => removeImage(index)}
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 