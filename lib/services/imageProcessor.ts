/**
 * Image Processor Service
 * Handles image resizing using Canvas API to create multiple versions
 *
 * Creates 3 versions:
 * - Original: Full size (max 4096x4096)
 * - Medium: 1024x1024 (for display)
 * - Thumbnail: 256x256 (for lists/previews)
 */

export interface ProcessedImage {
  original: Blob;
  medium: Blob;
  thumbnail: Blob;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    originalSize: number;
    mediumSize: number;
    thumbnailSize: number;
  };
}

export class ImageProcessorService {
  private static instance: ImageProcessorService;

  static getInstance(): ImageProcessorService {
    if (!ImageProcessorService.instance) {
      ImageProcessorService.instance = new ImageProcessorService();
    }
    return ImageProcessorService.instance;
  }

  /**
   * Validate image file
   */
  validateImage(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP are supported.',
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File too large. Maximum size is 10MB.',
      };
    }

    return { isValid: true };
  }

  /**
   * Process image file into 3 versions
   */
  async processImage(file: File): Promise<ProcessedImage> {
    // Validate
    const validation = this.validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Load image
    const img = await this.loadImage(file);

    // Check dimensions
    if (img.width < 100 || img.height < 100) {
      throw new Error('Image too small. Minimum dimensions are 100x100 pixels.');
    }

    if (img.width > 4096 || img.height > 4096) {
      throw new Error('Image too large. Maximum dimensions are 4096x4096 pixels.');
    }

    // Create 3 versions
    const [original, medium, thumbnail] = await Promise.all([
      this.resizeImage(img, 4096, 0.95), // Original (capped at 4096, high quality)
      this.resizeImage(img, 1024, 0.85), // Medium
      this.resizeImage(img, 256, 0.75),  // Thumbnail
    ]);

    return {
      original,
      medium,
      thumbnail,
      metadata: {
        originalWidth: img.width,
        originalHeight: img.height,
        originalSize: original.size,
        mediumSize: medium.size,
        thumbnailSize: thumbnail.size,
      },
    };
  }

  /**
   * Load image from file
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize image using Canvas API
   * @param img - Source image
   * @param maxSize - Maximum width or height
   * @param quality - JPEG quality (0.0 - 1.0)
   */
  private resizeImage(
    img: HTMLImageElement,
    maxSize: number,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Calculate new dimensions (maintain aspect ratio)
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image with high-quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  /**
   * Extract EXIF data from image file (basic implementation)
   * Note: For full EXIF support, consider using a library like exifr
   */
  async extractExifData(file: File): Promise<{
    latitude?: number;
    longitude?: number;
    timestamp?: string;
  }> {
    try {
      // This is a basic implementation
      // For production, use a library like 'exifr' for full EXIF support
      return {};
    } catch (error) {
      console.warn('Failed to extract EXIF data:', error);
      return {};
    }
  }

  /**
   * Create preview URL for display
   */
  createPreviewUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Revoke preview URL to free memory
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

export default ImageProcessorService.getInstance();
