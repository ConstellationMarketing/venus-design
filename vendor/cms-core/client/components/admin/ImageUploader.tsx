import { useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { compressToWebP } from "../../lib/imageCompression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Upload, X, Loader2, Image as ImageIcon, RefreshCw, Trash2, FolderOpen } from "lucide-react";
import MediaPickerDialog from "./MediaPickerDialog";
import {
  createSelectedImageAsset,
  type SelectedImageAsset,
} from "./imageMetadata";

const isPdfUrl = (url?: string) => !!url && url.toLowerCase().includes(".pdf");

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onSelectAsset?: (asset: SelectedImageAsset) => void;
  onRemove?: () => void;
  bucket?: string;
  folder?: string;
  className?: string;
  placeholder?: string;
  accept?: string;
  preserveOriginal?: boolean;
  helperText?: string;
}

export default function ImageUploader({
  value,
  onChange,
  onSelectAsset,
  onRemove,
  bucket = "media",
  folder = "uploads",
  className,
  placeholder = "Drop an image here or click to upload",
  accept = "image/*,application/pdf",
  preserveOriginal = false,
  helperText = "PNG, JPG, GIF, WebP, PDF up to 10MB — auto-converted to WebP",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        setError("Please upload an image or PDF file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setError(null);
      setUploading(true);

      try {
        // Compress image to WebP unless the caller needs the original format preserved.
        const extFromName = file.name.split(".").pop()?.toLowerCase() || "bin";
        const { blob, ext, contentType } = isPdf || preserveOriginal
          ? {
              blob: file as Blob,
              ext: extFromName,
              contentType: file.type || undefined,
            }
          : {
              ...(await compressToWebP(file)),
              contentType: undefined,
            };

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${folder}/${timestamp}-${randomStr}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: contentType || (ext === "webp" ? "image/webp" : file.type),
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        const publicUrl = urlData.publicUrl;

        const selectedAsset = createSelectedImageAsset({
          url: publicUrl,
          fileName: file.name,
        });

        // Set the field value immediately
        onChange(publicUrl);
        onSelectAsset?.(selectedAsset);

        // Best-effort: also register in media table so it appears in /admin/media
        try {
          const { data: userData, error: userErr } =
            await supabase.auth.getUser();
          if (userErr) throw userErr;

          const uploadedBy = userData?.user?.id ?? null;

          const { error: mediaErr } = await supabase.from("media").insert({
            file_name: file.name,
            file_path: fileName,
            public_url: publicUrl,
            file_size: blob.size ?? null,
            mime_type: contentType || (ext === "webp" ? "image/webp" : file.type),
            uploaded_by: uploadedBy,
          });

          if (mediaErr) {
            console.warn(
              "[ImageUploader] Failed to insert media row:",
              mediaErr,
            );
          }
        } catch (e) {
          console.warn("[ImageUploader] Failed to register media row:", e);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, onChange, onSelectAsset, preserveOriginal],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUpload(e.dataTransfer.files[0]);
      }
    },
    [handleUpload],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";

      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload],
  );

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleRemove = () => {
    onChange("");
    onRemove?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div
            className="relative rounded-lg overflow-hidden border bg-gray-50 cursor-pointer"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleClick();
            }}
          >
            {isPdfUrl(value) ? (
              <div className="w-full h-48 flex flex-col items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-600 font-medium">
                  PDF Uploaded
                </p>
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 underline mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open PDF
                </a>
              </div>
            ) : (
              <img
                src={value}
                alt="Uploaded"
                className="w-full h-48 object-cover"
              />
            )}

            {/* Overlay with Replace / Remove buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                  <span className="text-white text-sm font-medium">
                    Uploading...
                  </span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    className="flex items-center gap-1.5 bg-white text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickerOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Library
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{value}</p>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
            uploading && "pointer-events-none opacity-50",
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-100 rounded-full">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{placeholder}</p>
              <p className="text-xs text-gray-400">{helperText}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Browse Library + Manual URL input */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 h-8 text-xs"
          onClick={() => setPickerOpen(true)}
        >
          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
          Browse Library
        </Button>
        <span className="text-xs text-gray-400">or paste URL:</span>
        <Input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="text-xs h-8"
        />
      </div>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(asset) => {
          onChange(asset.url);
          onSelectAsset?.(asset);
        }}
        currentValue={value}
      />
    </div>
  );
}
