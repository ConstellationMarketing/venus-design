import { supabase } from "@/lib/supabase";
import {
  inferMimeTypeFromUrl,
  SUPPORTED_FAVICON_MIME_TYPES,
  type FaviconAssets,
} from "./favicon";

const FAVICON_BUCKET = "media";
const FAVICON_FOLDER = "favicons";
const REQUIRED_MIN_SIZE = 32;
const GENERATED_SIZES = [32, 180, 192, 512] as const;

interface ProcessFaviconSourceInput {
  sourceUrl: string;
  siteName?: string | null;
}

export async function processFaviconSource({
  sourceUrl,
  siteName,
}: ProcessFaviconSourceInput): Promise<FaviconAssets> {
  const normalizedSourceUrl = sourceUrl.trim();
  if (!normalizedSourceUrl) {
    throw new Error("Choose or paste an image before generating favicon assets.");
  }

  let sourceBlob: Blob;
  try {
    const response = await fetch(normalizedSourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Image download failed with ${response.status}`);
    }

    sourceBlob = await response.blob();
  } catch (error) {
    console.error("[faviconProcessing] Unable to fetch favicon source:", error);
    throw new Error(
      "The selected image could not be processed. Use the media library or a direct image URL that allows downloads.",
    );
  }

  const mimeType = normalizeMimeType(sourceBlob.type, normalizedSourceUrl);
  if (!SUPPORTED_FAVICON_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_FAVICON_MIME_TYPES)[number])) {
    throw new Error("Favicons support PNG, SVG, JPG, or WebP source files.");
  }

  const image = await loadImageFromBlob(sourceBlob);
  if (image.naturalWidth !== image.naturalHeight) {
    throw new Error("Favicon source images must be square.");
  }

  if (image.naturalWidth < REQUIRED_MIN_SIZE || image.naturalHeight < REQUIRED_MIN_SIZE) {
    throw new Error("Favicon source images must be at least 32×32 pixels.");
  }

  const uploadBaseName = buildUploadBaseName(siteName);
  const [icon32Url, appleTouchIconUrl, manifest192Url, manifest512Url] = await Promise.all(
    GENERATED_SIZES.map((size) => uploadResizedFavicon({ image, size, uploadBaseName })),
  );

  return {
    sourceUrl: normalizedSourceUrl,
    mimeType,
    icon32Url,
    appleTouchIconUrl,
    manifest192Url,
    manifest512Url,
    ...(mimeType === "image/svg+xml" ? { svgUrl: normalizedSourceUrl } : {}),
  };
}

async function uploadResizedFavicon({
  image,
  size,
  uploadBaseName,
}: {
  image: HTMLImageElement;
  size: (typeof GENERATED_SIZES)[number];
  uploadBaseName: string;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("This browser could not generate favicon images.");
  }

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);

  const blob = await canvasToBlob(canvas);
  const filePath = `${FAVICON_FOLDER}/${uploadBaseName}-${size}.png`;
  const { error } = await supabase.storage.from(FAVICON_BUCKET).upload(filePath, blob, {
    cacheControl: "31536000",
    upsert: true,
    contentType: "image/png",
  });

  if (error) {
    throw new Error(`Unable to upload favicon asset (${size}×${size}).`);
  }

  return supabase.storage.from(FAVICON_BUCKET).getPublicUrl(filePath).data.publicUrl;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to convert favicon canvas to PNG."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function loadImageFromBlob(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected favicon image."));
    };

    image.src = objectUrl;
  });
}

function normalizeMimeType(blobMimeType: string, sourceUrl: string) {
  return blobMimeType || inferMimeTypeFromUrl(sourceUrl) || "application/octet-stream";
}

function buildUploadBaseName(siteName?: string | null) {
  const slug = (siteName || "site")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${Date.now()}-${randomSuffix}`;
}
