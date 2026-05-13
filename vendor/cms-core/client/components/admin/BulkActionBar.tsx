import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Check,
  X,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export type BulkAction = "publish" | "unpublish" | "noindex" | "index" | "delete";

interface BulkActionBarProps {
  selectedCount: number;
  onAction: (action: BulkAction) => Promise<void>;
  onClearSelection: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onAction,
  onClearSelection,
}: BulkActionBarProps) {
  const [loading, setLoading] = useState<BulkAction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (action: BulkAction) => {
    if (action === "delete") {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(action);
    try {
      await onAction(action);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setLoading("delete");
    try {
      await onAction("delete");
    } finally {
      setLoading(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-gray-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
            <span className="text-sm font-medium">
              {selectedCount} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("publish")}
              disabled={loading !== null}
              className="text-green-400 hover:text-green-300 hover:bg-gray-800"
            >
              {loading === "publish" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Publish
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("unpublish")}
              disabled={loading !== null}
              className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-800"
            >
              {loading === "unpublish" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1" />
              )}
              Unpublish
            </Button>

            <div className="w-px h-6 bg-gray-700" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("noindex")}
              disabled={loading !== null}
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              {loading === "noindex" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <EyeOff className="h-4 w-4 mr-1" />
              )}
              Set Noindex
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("index")}
              disabled={loading !== null}
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              {loading === "index" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-1" />
              )}
              Allow Index
            </Button>

            <div className="w-px h-6 bg-gray-700" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction("delete")}
              disabled={loading !== null}
              className="text-red-400 hover:text-red-300 hover:bg-gray-800"
            >
              {loading === "delete" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} Pages?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected page
              {selectedCount !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedCount} Page{selectedCount !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
