import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface URLChangeRedirectModalProps {
  open: boolean;
  onClose: () => void;
  oldPath: string;
  newPath: string;
  onConfirm: (createRedirect: boolean, statusCode?: 301 | 302) => void;
}

export default function URLChangeRedirectModal({
  open,
  onClose,
  oldPath,
  newPath,
  onConfirm,
}: URLChangeRedirectModalProps) {
  const [statusCode, setStatusCode] = useState<"301" | "302">("301");
  const [existingRedirect, setExistingRedirect] = useState<{
    id: string;
    to_path: string;
    status_code: number;
  } | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && oldPath) {
      checkExistingRedirect();
    }
  }, [open, oldPath]);

  const checkExistingRedirect = async () => {
    setChecking(true);
    const { data, error } = await supabase
      .from("redirects")
      .select("id, to_path, status_code")
      .eq("from_path", oldPath)
      .single();

    if (!error && data) {
      setExistingRedirect(data);
    } else {
      setExistingRedirect(null);
    }
    setChecking(false);
  };

  const handleCreateRedirect = async () => {
    setSaving(true);

    if (existingRedirect) {
      // Update existing redirect
      const { error } = await supabase
        .from("redirects")
        .update({
          to_path: newPath,
          status_code: parseInt(statusCode),
          enabled: true,
        })
        .eq("id", existingRedirect.id);

      if (error) {
        console.error("Error updating redirect:", error);
        toast.error("Failed to update redirect: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      // Create new redirect
      const { error } = await supabase.from("redirects").insert({
        from_path: oldPath,
        to_path: newPath,
        status_code: parseInt(statusCode),
        enabled: true,
      });

      if (error) {
        console.error("Error creating redirect:", error);
        toast.error("Failed to create redirect: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onConfirm(true, parseInt(statusCode) as 301 | 302);
  };

  const handleSkip = () => {
    onConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>URL Path Changed</DialogTitle>
          <DialogDescription>
            The URL path for this page has changed. Would you like to create a
            redirect from the old URL to the new one?
          </DialogDescription>
        </DialogHeader>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">Old URL</Label>
                  <p className="font-mono text-sm">{oldPath}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-xs text-gray-500">New URL</Label>
                  <p className="font-mono text-sm">{newPath}</p>
                </div>
              </div>
            </div>

            {existingRedirect && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> A redirect already exists from{" "}
                  <code className="bg-amber-100 px-1 rounded">{oldPath}</code>{" "}
                  to{" "}
                  <code className="bg-amber-100 px-1 rounded">
                    {existingRedirect.to_path}
                  </code>{" "}
                  ({existingRedirect.status_code}). This will be updated to
                  point to the new URL.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="statusCode">Redirect Type</Label>
              <Select
                value={statusCode}
                onValueChange={(v) => setStatusCode(v as "301" | "302")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">
                    301 - Permanent Redirect (recommended for SEO)
                  </SelectItem>
                  <SelectItem value="302">
                    302 - Temporary Redirect
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Use 301 for permanent URL changes. Use 302 if you might revert
                the change.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            Don't Create Redirect
          </Button>
          <Button onClick={handleCreateRedirect} disabled={checking || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : existingRedirect ? (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Update Redirect
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Create Redirect
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
