export type OptimizedImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxOutputBytes?: number;
};

const DEFAULT_OPTIONS: Required<OptimizedImageOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.72,
  maxOutputBytes: 350 * 1024,
};

/**
 * Optimizes a newly selected browser image for marketplace delivery.
 *
 * The source file is never modified. WebP is used only when it produces a
 * meaningful size reduction. Several quality levels are tried so large
 * images do not remain unnecessarily large, while small already-compressed
 * images are kept in their original format.
 */
export async function optimizeImageForWeb(
  file: File,
  options: OptimizedImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be optimized.");
  }

  // Do not flatten animated GIFs or vector SVGs into a single raster frame.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read the selected image."));
      element.src = sourceUrl;
    });

    const scale = Math.min(
      1,
      config.maxWidth / image.naturalWidth,
      config.maxHeight / image.naturalHeight,
    );

    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the image.");

    context.drawImage(image, 0, 0, width, height);

    const requestedQuality = Math.min(1, Math.max(0.1, config.quality));
    const qualityLevels = Array.from(
      new Set([
        requestedQuality,
        Math.max(0.1, requestedQuality - 0.1),
        Math.max(0.1, requestedQuality - 0.2),
        Math.max(0.1, requestedQuality - 0.3),
      ]),
    );

    const webpBlobs: Blob[] = [];

    for (const quality of qualityLevels) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error("Could not convert the image to WebP."));
          },
          "image/webp",
          quality,
        );
      });

      webpBlobs.push(blob);

      // Stop at the highest quality that reaches the practical output target.
      if (blob.size <= config.maxOutputBytes) {
        break;
      }
    }

    const smallestWebp = webpBlobs.reduce((smallest, blob) =>
      blob.size < smallest.size ? blob : smallest,
    );

    // Never replace an already-efficient source with a larger file.
    // Require at least a 5% reduction so a negligible saving does not justify
    // changing the original format.
    if (smallestWebp.size >= file.size * 0.95) {
      return file;
    }

    const baseName =
      file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-") || "image";

    return new File([smallestWebp], `${baseName}-web.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
