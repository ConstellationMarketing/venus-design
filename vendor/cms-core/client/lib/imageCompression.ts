/**
 * Shared image compression utility.
 *
 * Converts raster images to WebP via an off-screen <canvas>.
 * - Skips non-image files, SVGs, and files under 50 KB.
 * - Down-scales images that exceed MAX_DIMENSION on either axis.
 * - Only uses the WebP result when it is actually smaller than the original.
 */

export const MAX_DIMENSION = 2048;
export const WEBP_QUALITY = 0.85;

/**
 * Compress an image file to WebP using canvas.
 * Skips PDFs, SVGs, and already-small images (< 50 KB).
 * Returns the original file unchanged when conversion is not applicable.
 */
export async function compressToWebP(
  file: File,
): Promise<{ blob: Blob; ext: string }> {
  // Skip non-image files, SVGs, and tiny images
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return { blob: file, ext: file.name.split(".").pop() || "bin" };
  }

  // Skip very small images where compression won't help
  if (file.size < 50 * 1024) {
    return { blob: file, ext: file.name.split(".").pop() || "bin" };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Downscale if exceeding max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback: return original
        resolve({ blob: file, ext: file.name.split(".").pop() || "bin" });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            // WebP is smaller — use it
            resolve({ blob, ext: "webp" });
          } else {
            // Original is smaller or conversion failed — keep original
            resolve({ blob: file, ext: file.name.split(".").pop() || "bin" });
          }
        },
        "image/webp",
        WEBP_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: file, ext: file.name.split(".").pop() || "bin" });
    };

    img.src = url;
  });
}
