/**
 * SellSync Mobile Image Compression & Safe Storage Utilities
 * Automatically downsizes high-resolution mobile camera photos (12-48MP, 10-25MB)
 * to web-optimized lightweight images (~80KB) so localStorage quotas are never exceeded
 * and preview rendering is instant on mobile Safari, Chrome, and desktop.
 */

export async function compressImageForMobile(
  file: File,
  maxDim: number = 1200,
  quality: number = 0.82
): Promise<string> {
  // If not an image, read standard data URL
  if (!file.type || !file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      // Return empty if unreadable
      resolve("");
    };

    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (!rawDataUrl) {
        resolve("");
        return;
      }

      // Check if window / Image / canvas is available (client-side)
      if (typeof window === "undefined" || typeof Image === "undefined") {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to original data URL if decode fails
        resolve(rawDataUrl);
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute scaled dimensions preserving aspect ratio
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          // Fill white background in case of transparent PNG/WebP when converting to JPEG
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

          // If compression succeeded and yielded a valid string, return it
          if (compressedDataUrl && compressedDataUrl.startsWith("data:image/")) {
            resolve(compressedDataUrl);
          } else {
            resolve(rawDataUrl);
          }
        } catch (err) {
          console.warn("Canvas compression fallback:", err);
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Resilient file text reader that handles older mobile browsers where file.text()
 * might be undefined or throws in certain WebKit WebViews.
 */
export async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    try {
      const t = await file.text();
      if (t) return t;
    } catch {
      // Fall through to FileReader
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file from mobile device."));
    reader.readAsText(file, "utf-8");
  });
}

/**
 * Safe localStorage write that guards against QuotaExceededError.
 * If quota is exceeded, trims non-essential caches and retries.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`localStorage quota error on ${key}:`, err);
    try {
      // Clear legacy temporary keys if quota is tight
      const volatileKeys = ["sellsync_temp_preview", "sellsync_debug_log"];
      for (const vk of volatileKeys) {
        localStorage.removeItem(vk);
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      console.error(`Unable to persist to localStorage for ${key}.`);
      return false;
    }
  }
}

