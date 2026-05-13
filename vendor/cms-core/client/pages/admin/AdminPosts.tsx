import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Post, PostCategory } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  Square,
  CheckSquare,
  MinusSquare,
  Tag,
  LayoutDashboard,
} from "lucide-react";
import PostCategoriesPanel from "./PostCategoriesPanel";
import BlogSidebarSettingsPanel from "./BlogSidebarSettingsPanel";
import { toast } from "sonner";

interface PostWithCategory extends Post {
  post_categories: { name: string } | null;
}

export default function AdminPosts() {
  const [posts, setPosts] = useState<PostWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategories, setShowCategories] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, post_categories(name)")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts((data as PostWithCategory[]) || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", deleteId);
    if (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } else {
      setPosts(posts.filter((p) => p.id !== deleteId));
    }
    setDeleteId(null);
    setDeleting(false);
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    let error = null;

    switch (action) {
      case "publish": {
        const now = new Date().toISOString();
        const { data: publishRows, error: publishFetchError } = await supabase
          .from("posts")
          .select("id, published_at")
          .in("id", ids);

        if (publishFetchError) {
          error = publishFetchError;
          break;
        }

        const rows = publishRows || [];
        const idsWithPublishDate = rows
          .filter((row) => row.published_at)
          .map((row) => row.id);
        const idsWithoutPublishDate = rows
          .filter((row) => !row.published_at)
          .map((row) => row.id);

        if (idsWithPublishDate.length > 0) {
          const publishExistingResult = await supabase
            .from("posts")
            .update({ status: "published" })
            .in("id", idsWithPublishDate);

          if (publishExistingResult.error) {
            error = publishExistingResult.error;
            break;
          }
        }

        if (idsWithoutPublishDate.length > 0) {
          const publishMissingResult = await supabase
            .from("posts")
            .update({
              status: "published",
              published_at: now,
            })
            .in("id", idsWithoutPublishDate);
          error = publishMissingResult.error;
        }
        break;
      }
      case "unpublish": {
        const res = await supabase
          .from("posts")
          .update({ status: "draft" })
          .in("id", ids);
        error = res.error;
        break;
      }
      case "delete": {
        const res = await supabase.from("posts").delete().in("id", ids);
        error = res.error;
        break;
      }
    }

    if (error) {
      toast.error(`Failed to ${action} posts: ${error.message}`);
    } else {
      setSelectedIds(new Set());
      await fetchPosts();
    }
  };

  const allSelected =
    filteredPosts.length > 0 && selectedIds.size === filteredPosts.length;
  const someSelected =
    selectedIds.size > 0 && selectedIds.size < filteredPosts.length;

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
          <h1 className="text-3xl font-bold text-gray-900">Posts</h1>
          <p className="text-gray-500 mt-1">Manage your blog posts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setShowCategories(!showCategories);
              if (!showCategories) setShowSidebar(false);
            }}
          >
            <Tag className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowSidebar(!showSidebar);
              if (!showSidebar) setShowCategories(false);
            }}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Sidebar
          </Button>
          <Link to="/admin/posts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {showCategories && (
        <PostCategoriesPanel onClose={() => setShowCategories(false)} />
      )}

      {showSidebar && (
        <BlogSidebarSettingsPanel onClose={() => setShowSidebar(false)} />
      )}

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction("publish")}
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction("unpublish")}
          >
            Unpublish
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => handleBulkAction("delete")}
          >
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center w-full"
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : someSelected ? (
                    <MinusSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No posts found
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => (
                <TableRow
                  key={post.id}
                  className={selectedIds.has(post.id) ? "bg-blue-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(post.id)}
                      onCheckedChange={() => toggleSelect(post.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="text-gray-500">
                    /blog/{post.slug}
                  </TableCell>
                  <TableCell>
                    {post.post_categories?.name ? (
                      <Badge variant="outline">
                        {post.post_categories.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        post.status === "published" ? "default" : "secondary"
                      }
                      className={
                        post.status === "published"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(post.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {post.status === "published" && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-md"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                        </a>
                      )}
                      <Link to={`/admin/posts/${post.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(post.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
