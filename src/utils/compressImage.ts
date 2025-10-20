import imageCompression from "browser-image-compression";

export async function compressImage(file: File, options = {}) {
  const defaultOptions = {
    maxSizeMB: 0.7, // target under 700 KB
    maxWidthOrHeight: 1200, // resize large images
    useWebWorker: true,
    initialQuality: 0.8,
    ...options,
  };
  return await imageCompression(file, defaultOptions);
}