export type OptimizedImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const DEFAULT_OPTIONS: Required<OptimizedImageOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.72,
};

/**
 * Optimizes a newly selected browser image for marketplace delivery.
 *
 * The source file is never modified. A WebP derivative is generated when
 * possible, but the original is kept whenever the WebP would be larger.
 * This prevents the optimizer from increasing storage/bandwidth usage.
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

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Could not convert the image to WebP."));
        },
        "image/webp",
        config.quality,
      );
    });

    // Keep the original when conversion would make the file larger.
    if (blob.size >= file.size) {
      return file;
    }

    const baseName =
      file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-") || "image";

    return new File([blob], `${baseName}-web.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
