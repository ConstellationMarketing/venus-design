import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PostCategory } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Plus, Trash2, Loader2, X, Save } from "lucide-react";
import { toast } from "sonner";

interface PostCategoriesPanelProps {
  onClose: () => void;
}

export default function PostCategoriesPanel({
  onClose,
}: PostCategoriesPanelProps) {
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New category form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("post_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);

    const slug = generateSlug(newName);
    const { error } = await supabase.from("post_categories").insert({
      name: newName.trim(),
      slug,
      description: newDescription.trim() || null,
    });

    if (error) {
      toast.error("Failed to create category: " + error.message);
    } else {
      setNewName("");
      setNewDescription("");
      setShowForm(false);
      await fetchCategories();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("post_categories")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast.error("Failed to delete category: " + error.message);
    } else {
      await fetchCategories();
    }
    setDeleteId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Post Categories</CardTitle>
            <CardDescription>Manage categories for blog posts</CardDescription>
          </div>
          <div className="flex gap-2">
            {!showForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="catName">Name</Label>
              <Input
                id="catName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Personal Injury"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catSlug">Slug</Label>
              <Input
                id="catSlug"
                value={generateSlug(newName)}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="catDesc">Description (optional)</Label>
              <Textarea
                id="catDesc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short description..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                  setNewDescription("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No categories yet. Create one to get started.
          </p>
        ) : (
          <div className="divide-y">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  <p className="text-sm text-gray-500">/{cat.slug}</p>
                  {cat.description && (
                    <p className="text-sm text-gray-400 mt-0.5">
                      {cat.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(cat.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Posts in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
