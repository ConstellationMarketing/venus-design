import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { PageRevision, Page } from "../../lib/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, RotateCcw, Eye, Clock } from "lucide-react";
import { toast } from "sonner";

interface RevisionPanelProps {
  pageId: string;
  currentPage: Page;
  onRestore: (revision: PageRevision) => void;
}

const MAX_REVISIONS = 30;

export default function RevisionPanel({
  pageId,
  currentPage,
  onRestore,
}: RevisionPanelProps) {
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevision, setSelectedRevision] = useState<PageRevision | null>(
    null
  );
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [savingRevision, setSavingRevision] = useState(false);

  useEffect(() => {
    fetchRevisions();
  }, [pageId]);

  const fetchRevisions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("page_revisions")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching revisions:", error);
    } else {
      setRevisions(data || []);
    }
    setLoading(false);
  };

  const createRevision = async () => {
    setSavingRevision(true);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Create the revision
    const revisionData = {
      page_id: currentPage.id,
      page_id_snapshot: currentPage.page_id,
      title: currentPage.title,
      url_path: currentPage.url_path,
      page_type: currentPage.page_type,
      content: currentPage.content,
      meta_title: currentPage.meta_title,
      meta_description: currentPage.meta_description,
      canonical_url: currentPage.canonical_url,
      og_title: currentPage.og_title,
      og_description: currentPage.og_description,
      og_image: currentPage.og_image,
      noindex: currentPage.noindex,
      status: currentPage.status,
      created_by: user?.id || null,
    };

    const { error } = await supabase.from("page_revisions").insert(revisionData);

    if (error) {
      console.error("Error creating revision:", error);
      toast.error("Failed to create revision: " + error.message);
    } else {
      // Clean up old revisions if we exceed the limit
      await cleanupOldRevisions();
      await fetchRevisions();
      toast.success("Revision saved successfully!");
    }
    setSavingRevision(false);
  };

  const cleanupOldRevisions = async () => {
    // Get count of revisions for this page
    const { count } = await supabase
      .from("page_revisions")
      .select("*", { count: "exact", head: true })
      .eq("page_id", pageId);

    if (count && count > MAX_REVISIONS) {
      // Get oldest revisions to delete
      const deleteCount = count - MAX_REVISIONS;
      const { data: oldRevisions } = await supabase
        .from("page_revisions")
        .select("id")
        .eq("page_id", pageId)
        .order("created_at", { ascending: true })
        .limit(deleteCount);

      if (oldRevisions && oldRevisions.length > 0) {
        const idsToDelete = oldRevisions.map((r) => r.id);
        await supabase.from("page_revisions").delete().in("id", idsToDelete);
      }
    }
  };

  const handleRestore = () => {
    if (selectedRevision) {
      onRestore(selectedRevision);
      setRestoreDialogOpen(false);
      setSelectedRevision(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Page Revisions
            </CardTitle>
            <CardDescription>
              View and restore previous versions of this page. Revisions are
              automatically created when publishing. Maximum {MAX_REVISIONS}{" "}
              revisions are kept.
            </CardDescription>
          </div>
          <Button
            onClick={createRevision}
            disabled={savingRevision}
            variant="outline"
          >
            {savingRevision ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <History className="h-4 w-4 mr-2" />
                Save Revision Now
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {revisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No revisions yet</p>
            <p className="text-sm mt-1">
              Revisions are created automatically when you publish a page, or
              you can save one manually.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {revisions.map((revision, index) => (
                <div
                  key={revision.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {formatDate(revision.created_at)}
                      </span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Latest
                        </Badge>
                      )}
                      <Badge
                        variant={
                          revision.status === "published"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {revision.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">{revision.title}</span>
                      <span className="mx-2">·</span>
                      <span>{revision.url_path}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRevision(revision);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRevision(revision);
                        setRestoreDialogOpen(true);
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* View Revision Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Revision from{" "}
              {selectedRevision && formatDate(selectedRevision.created_at)}
            </DialogTitle>
            <DialogDescription>
              View the content of this revision (read-only)
            </DialogDescription>
          </DialogHeader>
          {selectedRevision && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Title
                  </label>
                  <p className="font-medium">{selectedRevision.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    URL Path
                  </label>
                  <p className="font-medium">{selectedRevision.url_path}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <p>
                    <Badge
                      variant={
                        selectedRevision.status === "published"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedRevision.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Page Type
                  </label>
                  <p className="font-medium">{selectedRevision.page_type}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Meta Title
                </label>
                <p>{selectedRevision.meta_title || "(not set)"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Meta Description
                </label>
                <p>{selectedRevision.meta_description || "(not set)"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Content Blocks
                </label>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedRevision.content, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setViewDialogOpen(false);
                setRestoreDialogOpen(true);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore This Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Revision?</DialogTitle>
            <DialogDescription>
              This will replace the current page content with the content from
              this revision. The current content will NOT be saved
              automatically. Make sure to save a revision first if you want to
              keep the current state.
            </DialogDescription>
          </DialogHeader>
          {selectedRevision && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Restoring revision from:</strong>{" "}
                {formatDate(selectedRevision.created_at)}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                <strong>Title:</strong> {selectedRevision.title}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Utility function to create a revision (can be called from outside)
export async function createPageRevision(page: Page): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const revisionData = {
    page_id: page.id,
    page_id_snapshot: page.page_id,
    title: page.title,
    url_path: page.url_path,
    page_type: page.page_type,
    content: page.content,
    meta_title: page.meta_title,
    meta_description: page.meta_description,
    canonical_url: page.canonical_url,
    og_title: page.og_title,
    og_description: page.og_description,
    og_image: page.og_image,
    noindex: page.noindex,
    status: page.status,
    created_by: user?.id || null,
  };

  const { error } = await supabase.from("page_revisions").insert(revisionData);

  if (error) {
    console.error("Error creating revision:", error);
    return false;
  }

  // Clean up old revisions
  const { count } = await supabase
    .from("page_revisions")
    .select("*", { count: "exact", head: true })
    .eq("page_id", page.id);

  if (count && count > MAX_REVISIONS) {
    const deleteCount = count - MAX_REVISIONS;
    const { data: oldRevisions } = await supabase
      .from("page_revisions")
      .select("id")
      .eq("page_id", page.id)
      .order("created_at", { ascending: true })
      .limit(deleteCount);

    if (oldRevisions && oldRevisions.length > 0) {
      const idsToDelete = oldRevisions.map((r) => r.id);
      await supabase.from("page_revisions").delete().in("id", idsToDelete);
    }
  }

  return true;
}
