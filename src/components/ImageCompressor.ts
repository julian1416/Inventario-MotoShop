/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to compress images client-side before uploading them.
 * Resizes images to a maximum width/height and compresses quality to JPG/WebP
 * to ensure extremely fast network transfer and rendering.
 * Also generates a small micro-thumbnail for high-performance search listings.
 */
export async function compressAndResizeImage(
  fileOrBase64: File | string,
  maxDimension: number = 500,
  quality: number = 0.75
): Promise<{ medium: string; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // 1. Generate Medium/Detail Image
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get 2D context for compression"));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      const mediumBase64 = canvas.toDataURL('image/jpeg', quality);
      
      // 2. Generate small high-performance thumbnail (max 90px)
      const thumbMaxDim = 90;
      let tWidth = img.width;
      let tHeight = img.height;
      
      if (tWidth > tHeight) {
        if (tWidth > thumbMaxDim) {
          tHeight = Math.round((tHeight * thumbMaxDim) / tWidth);
          tWidth = thumbMaxDim;
        }
      } else {
        if (tHeight > thumbMaxDim) {
          tWidth = Math.round((tWidth * thumbMaxDim) / tHeight);
          tHeight = thumbMaxDim;
        }
      }
      
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = tWidth;
      thumbCanvas.height = tHeight;
      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(img, 0, 0, tWidth, tHeight);
      }
      const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.65);
      
      resolve({
        medium: mediumBase64,
        thumbnail: thumbnailBase64
      });
    };
    
    img.onerror = (err) => {
      reject(err);
    };

    if (fileOrBase64 instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error("File reading yielded empty result"));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileOrBase64);
    } else {
      img.src = fileOrBase64;
    }
  });
}
