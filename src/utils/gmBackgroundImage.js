// Shared browser-only image compressor for the GM battlemap and scene generator.
// Keeping the limit in one place prevents oversized session payloads.
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_BACKGROUND_LENGTH = 790000;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function renderImage(image, maxDimension, quality) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("canvas");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

export async function compressGmBackground(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("image");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-large");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    for (const [dimension, quality] of [
      [1500, 0.72],
      [1250, 0.68],
      [1050, 0.62],
      [900, 0.58],
      [760, 0.54],
    ]) {
      const result = renderImage(image, dimension, quality);
      if (result.length <= MAX_BACKGROUND_LENGTH) return result;
    }
    throw new Error("too-large");
  } finally {
    URL.revokeObjectURL(url);
  }
}
