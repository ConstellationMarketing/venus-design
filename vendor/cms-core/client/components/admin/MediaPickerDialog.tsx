import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Media } from "../../lib/database.types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSelectedImageAsset,
  type SelectedImageAsset,
} from "./imageMetadata";

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: SelectedImageAsset) => void;
  currentValue?: string;
}

export default function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentValue,
}: MediaPickerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedUrl(currentValue || null);
      setSearchQuery("");
      fetchMedia();
    }
  }, [open, currentValue]);

  const fetchMedia = async () => {
    setLoading(true);
    setFetchError(null);

    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching media:", error);
      setMediaItems([]);
      setSelectedUrl(null);
      setFetchError("Media library could not be loaded. You can still upload a new image or paste a URL in the image field.");
    } else {
      setMediaItems(data || []);
    }

    setLoading(false);
  };

  const isImageMedia = (m: Media) => {
    if (m.mime_type?.startsWith("image/")) {
      return true;
    }

    return /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(m.public_url);
  };

  const filteredMedia = mediaItems.filter((m) => {
    const normalizedSearchQuery = searchQuery.toLowerCase();
    const matchesSearch =
      m.file_name.toLowerCase().includes(normalizedSearchQuery) ||
      m.alt_text?.toLowerCase().includes(normalizedSearchQuery);

    return matchesSearch && isImageMedia(m);
  });

  const selectedMedia = filteredMedia.find((item) => item.public_url === selectedUrl) ?? null;

  const handleConfirm = () => {
    if (!selectedMedia) {
      return;
    }

    onSelect(
      createSelectedImageAsset({
        url: selectedMedia.public_url,
        fileName: selectedMedia.file_name,
        altText: selectedMedia.alt_text,
      }),
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Media Library</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by filename or alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Media grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-amber-600 px-6">
              <AlertCircle className="h-12 w-12 mb-3" />
              <p className="text-sm">{fetchError}</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400 px-6">
              <ImageIcon className="h-12 w-12 mb-3" />
              <p className="text-sm">
                {searchQuery
                  ? "No images found matching your search"
                  : "No images in the library yet"}
              </p>
              <p className="mt-1 text-xs">
                Upload a new image from the field behind this dialog, or paste an image URL there instead.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
              {filteredMedia.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => setSelectedUrl(media.public_url)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all focus:outline-none",
                    selectedUrl === media.public_url
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300",
                  )}
                >
                  <img
                    src={media.public_url}
                    alt={media.alt_text || media.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                    <p className="text-white text-[10px] truncate">
                      {media.file_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedMedia}>
            Select
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
