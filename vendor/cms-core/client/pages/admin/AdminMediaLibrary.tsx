import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { compressToWebP } from "@/lib/imageCompression";
import type { Media } from "@/lib/database.types";

// Simplified page reference type for usage tracking
interface PageReference {
  id: string;
  title: string;
  url_path: string;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Loader2,
  Trash2,
  Copy,
  Check,
  Image as ImageIcon,
  FileWarning,
  Search,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminMediaLibrary() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleteMedia, setDeleteMedia] = useState<Media | null>(null);
  const [usedByPages, setUsedByPages] = useState<PageReference[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching media:", error);
    } else {
      setMediaItems(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Compress image to WebP (skips PDFs, SVGs, and tiny files)
        const isPdf = file.type === "application/pdf";
        const { blob, ext } = isPdf
          ? { blob: file as Blob, ext: "pdf" }
          : await compressToWebP(file);

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filePath = `library/${timestamp}-${randomStr}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, blob, {
            cacheControl: "3600",
            upsert: false,
            contentType: ext === "webp" ? "image/webp" : file.type,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Save to media table
        const { error: dbError } = await supabase.from("media").insert({
          file_name: file.name,
          file_path: filePath,
          public_url: urlData.publicUrl,
          file_size: blob.size,
          mime_type: ext === "webp" ? "image/webp" : file.type,
          uploaded_by: user?.id || null,
        });

        if (dbError) throw dbError;
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    // Refresh the list
    await fetchMedia();
    setUploading(false);

    // Reset file input
    e.target.value = "";
  };

  const checkMediaUsage = useCallback(async (media: Media) => {
    // Check pages table for references to this URL
    const { data: pages } = await supabase
      .from("pages")
      .select("id, title, url_path, og_image, content");

    if (!pages) {
      setUsedByPages([]);
      return;
    }

    const usedBy: PageReference[] = pages
      .filter((page) => {
        // Check og_image
        if (page.og_image === media.public_url) return true;

        // Check content blocks (convert to string and search)
        const contentStr = JSON.stringify(page.content || []);
        return contentStr.includes(media.public_url);
      })
      .map((page) => ({
        id: page.id,
        title: page.title,
        url_path: page.url_path,
      }));

    setUsedByPages(usedBy);
  }, []);

  const handleSelectMedia = async (media: Media) => {
    setSelectedMedia(media);
    await checkMediaUsage(media);
  };

  const handleDeleteClick = async (media: Media) => {
    await checkMediaUsage(media);
    setDeleteMedia(media);
  };

  const handleConfirmDelete = async () => {
    if (!deleteMedia) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("media")
        .remove([deleteMedia.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("media")
        .delete()
        .eq("id", deleteMedia.id);

      if (dbError) throw dbError;

      // Refresh list
      await fetchMedia();
      setDeleteMedia(null);
      setSelectedMedia(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete media");
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleUpdateAltText = async (media: Media, altText: string) => {
    const { error } = await supabase
      .from("media")
      .update({ alt_text: altText })
      .eq("id", media.id);

    if (error) {
      console.error("Update error:", error);
    } else {
      setMediaItems((prev) =>
        prev.map((m) => (m.id === media.id ? { ...m, alt_text: altText } : m))
      );
      if (selectedMedia?.id === media.id) {
        setSelectedMedia({ ...selectedMedia, alt_text: altText });
      }
    }
  };
  
  const isPdf = (m: Media) => m.mime_type === "application/pdf";
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredMedia = mediaItems.filter(
    (m) =>
      m.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-500 text-sm">
            Manage uploaded images and files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Search */}
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

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              {searchQuery
                ? "No media found matching your search"
                : "No media uploaded yet. Click 'Upload Files' to add some."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMedia.map((media) => (
            <div
              key={media.id}
              className="group relative bg-gray-100 rounded-lg overflow-hidden aspect-square cursor-pointer border hover:border-blue-500 transition-colors"
              onClick={() => handleSelectMedia(media)}
            >
              {isPdf(media) ? (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
    <FileText className="h-10 w-10 text-gray-400" />
    <p className="mt-2 text-xs text-gray-600 text-center px-2 truncate w-full">
      {media.file_name}
    </p>
  </div>
) : (
  <img
    src={media.public_url}
    alt={media.alt_text || media.file_name}
    className="w-full h-full object-cover"
  />
)}

              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyUrl(media.public_url, media.id);
                  }}
                >
                  {copiedId === media.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(media);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                <p className="text-white text-xs truncate">{media.file_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Details Dialog */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={() => setSelectedMedia(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
            <DialogDescription>
              View and edit media information
            </DialogDescription>
          </DialogHeader>
          {selectedMedia && (
            <div className="grid grid-cols-2 gap-6">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={selectedMedia.public_url}
                  alt={selectedMedia.alt_text || selectedMedia.file_name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-500 text-xs">Filename</Label>
                  <p className="font-medium">{selectedMedia.file_name}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Size</Label>
                  <p className="font-medium">
                    {formatFileSize(selectedMedia.file_size)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Type</Label>
                  <p className="font-medium">
                    {selectedMedia.mime_type || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Uploaded</Label>
                  <p className="font-medium">
                    {new Date(selectedMedia.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alt-text">Alt Text</Label>
                  <Input
                    id="alt-text"
                    value={selectedMedia.alt_text || ""}
                    onChange={(e) =>
                      handleUpdateAltText(selectedMedia, e.target.value)
                    }
                    placeholder="Describe this image..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedMedia.public_url}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopyUrl(selectedMedia.public_url, selectedMedia.id)
                      }
                    >
                      {copiedId === selectedMedia.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {usedByPages.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      Used by {usedByPages.length} page(s):
                    </p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {usedByPages.map((page) => (
                        <li key={page.id}>
                          {page.title} ({page.url_path})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMedia(null)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSelectedMedia(null);
                if (selectedMedia) handleDeleteClick(selectedMedia);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteMedia}
        onOpenChange={() => setDeleteMedia(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {usedByPages.length > 0 && (
                <FileWarning className="h-5 w-5 text-amber-500" />
              )}
              Delete Media?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {usedByPages.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-amber-600 font-medium">
                    Warning: This image is used by {usedByPages.length} page(s):
                  </p>
                  <ul className="list-disc list-inside text-sm">
                    {usedByPages.map((page) => (
                      <li key={page.id}>
                        {page.title} ({page.url_path})
                      </li>
                    ))}
                  </ul>
                  <p>
                    Deleting this image will break these pages. Are you sure you
                    want to continue?
                  </p>
                </div>
              ) : (
                <p>
                  This action cannot be undone. The file will be permanently
                  deleted.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
