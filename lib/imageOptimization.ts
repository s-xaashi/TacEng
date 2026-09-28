export type OptimizedImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

const DEFAULT_OPTIONS: Required<OptimizedImageOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
};

/**
 * Converts an uploaded browser image to a reasonably sized WebP.
 * The original file is never modified; a new Blob is returned for upload.
 */
export async function optimizeImageForWeb(file: File, options: OptimizedImageOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be optimized.");
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

    const baseName = file.name.replace(/.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "-") || "image";
    return new File([blob], `${baseName}-web.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
