export interface UploadAsset {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export const SUPPORTED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const SUPPORTED_UPLOAD_ACCEPT = SUPPORTED_UPLOAD_MIME_TYPES.join(",");

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function inferMimeTypeFromFileName(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPE_BY_EXTENSION[extension] ?? null;
}

export function normalizeUploadMimeType(mimeType: string, fileName: string): string {
  return mimeType || inferMimeTypeFromFileName(fileName) || "";
}

export function isSupportedUploadMimeType(mimeType: string): boolean {
  return SUPPORTED_UPLOAD_MIME_TYPES.includes(
    mimeType as (typeof SUPPORTED_UPLOAD_MIME_TYPES)[number],
  );
}

export function getUploadAssetKind(mimeType: string): "pdf" | "image" | null {
  if (mimeType === "application/pdf") {
    return "pdf";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  return null;
}

export function buildUploadAssetDataUri(asset: UploadAsset): string {
  return asset.base64Data.startsWith("data:")
    ? asset.base64Data
    : `data:${asset.mimeType};base64,${asset.base64Data}`;
}

export function formatUploadMimeTypeLabel(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WEBP";
    case "image/gif":
      return "GIF";
    default:
      return mimeType || "UNKNOWN";
  }
}
