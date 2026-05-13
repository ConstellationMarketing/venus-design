export interface SelectedImageAsset {
  url: string;
  fileName?: string | null;
  altText?: string | null;
  suggestedAltText: string;
}

export function formatImageTitle(fileName: string): string {
  const baseName = fileName
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";

  return baseName;
}

export function getSuggestedImageAltText(fileName?: string | null, altText?: string | null): string {
  const normalizedAltText = altText?.trim();
  if (normalizedAltText) {
    return normalizedAltText;
  }

  return fileName ? formatImageTitle(fileName) : "";
}

export function createSelectedImageAsset({
  url,
  fileName,
  altText,
}: {
  url: string;
  fileName?: string | null;
  altText?: string | null;
}): SelectedImageAsset {
  return {
    url,
    fileName: fileName ?? null,
    altText: altText ?? null,
    suggestedAltText: getSuggestedImageAltText(fileName, altText),
  };
}
