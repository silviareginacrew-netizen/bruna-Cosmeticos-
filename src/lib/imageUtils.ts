/**
 * Compresses an image string (base64) using a canvas.
 * @param base64 The original image in base64 format.
 * @param maxWidth The maximum width of the resized image.
 * @param maxHeight The maximum height of the resized image.
 * @param quality Quality of the output image (0 to 1).
 * @returns A promise that resolves with the compressed base64 string.
 */
export async function compressImage(
  base64: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Output as JPEG to keep size small
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = (err) => reject(err);
  });
}
