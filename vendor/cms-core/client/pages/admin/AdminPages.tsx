import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Page } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, ExternalLink, Loader2, Square, CheckSquare, MinusSquare, Copy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import BulkActionBar, { BulkAction } from '../../components/admin/BulkActionBar';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buildDuplicatePageInsertPayload } from './pageUrlPath';

export default function AdminPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicatingPageId, setDuplicatingPageId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching pages:', error);
    } else {
      setPages(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    const { error } = await supabase.from('pages').delete().eq('id', deleteId);

    if (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    } else {
      setPages(pages.filter(p => p.id !== deleteId));
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleDuplicate = async (pageId: string) => {
    setDuplicatingPageId(pageId);

    const { data: sourcePageData, error: sourceError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    const sourcePage = sourcePageData as Page | null;

    if (sourceError || !sourcePage) {
      console.error('Error fetching page for duplication:', sourceError);
      toast.error('Failed to load the page to duplicate');
      setDuplicatingPageId(null);
      return;
    }

    const { data: pathRows, error: pathError } = await supabase
      .from('pages')
      .select('url_path');

    if (pathError) {
      console.error('Error loading existing page paths:', pathError);
      toast.error('Failed to prepare a unique URL for the duplicate');
      setDuplicatingPageId(null);
      return;
    }

    const duplicatePayload = buildDuplicatePageInsertPayload(
      sourcePage,
      (pathRows || []).map(({ url_path }) => url_path),
    );

    const { data: duplicatedPage, error: duplicateError } = await supabase
      .from('pages')
      .insert(duplicatePayload)
      .select('id, title, url_path')
      .single();

    if (duplicateError || !duplicatedPage) {
      console.error('Error duplicating page:', duplicateError);
      toast.error('Failed to duplicate page');
      setDuplicatingPageId(null);
      return;
    }

    toast.success(`Created draft duplicate: ${duplicatedPage.title}`);
    setDuplicatingPageId(null);
    navigate(`/admin/pages/${duplicatedPage.id}`);
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch =
      page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.url_path.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPages.map(p => p.id)));
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

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkAction = async (action: BulkAction) => {
    const ids = Array.from(selectedIds);

    if (ids.length === 0) return;

    let error = null;

    switch (action) {
      case 'publish': {
        const now = new Date().toISOString();
        const { data: publishRows, error: publishFetchError } = await supabase
          .from('pages')
          .select('id, published_at')
          .in('id', ids);

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
            .from('pages')
            .update({ status: 'published' })
            .in('id', idsWithPublishDate);

          if (publishExistingResult.error) {
            error = publishExistingResult.error;
            break;
          }
        }

        if (idsWithoutPublishDate.length > 0) {
          const publishMissingResult = await supabase
            .from('pages')
            .update({ status: 'published', published_at: now })
            .in('id', idsWithoutPublishDate);

          error = publishMissingResult.error;
        }
        break;
      }

      case 'unpublish': {
        const unpublishResult = await supabase
          .from('pages')
          .update({ status: 'draft' })
          .in('id', ids);
        error = unpublishResult.error;
        break;
      }

      case 'noindex': {
        const noindexResult = await supabase
          .from('pages')
          .update({ noindex: true })
          .in('id', ids);
        error = noindexResult.error;
        break;
      }

      case 'index': {
        const indexResult = await supabase
          .from('pages')
          .update({ noindex: false })
          .in('id', ids);
        error = indexResult.error;
        break;
      }

      case 'delete': {
        const deleteResult = await supabase
          .from('pages')
          .delete()
          .in('id', ids);
        error = deleteResult.error;
        break;
      }
    }

    if (error) {
      console.error(`Error performing ${action}:`, error);
      toast.error(`Failed to ${action} pages: ${error.message}`);
    } else {
      setSelectedIds(new Set());
      await fetchPages();

      const actionLabels: Record<BulkAction, string> = {
        publish: 'published',
        unpublish: 'unpublished',
        noindex: 'set to noindex',
        index: 'set to allow indexing',
        delete: 'deleted',
      };
      toast.success(`${ids.length} page(s) ${actionLabels[action]} successfully!`);
    }
  };

  const allSelected = filteredPages.length > 0 && selectedIds.size === filteredPages.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredPages.length;

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
          <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-500 mt-1">Manage your website pages</p>
        </div>
        <Link to="/admin/pages/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search pages..."
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
              <TableHead>URL Path</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No pages found
                </TableCell>
              </TableRow>
            ) : (
              filteredPages.map((page) => (
                <TableRow
                  key={page.id}
                  className={selectedIds.has(page.id) ? 'bg-blue-50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(page.id)}
                      onCheckedChange={() => toggleSelect(page.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-gray-500">{page.url_path}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {page.page_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={page.status === 'published' ? 'default' : 'secondary'}
                      className={page.status === 'published' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(page.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {page.status === 'published' && (
                        <a
                          href={page.url_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-md"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(page.id)}
                        disabled={duplicatingPageId === page.id}
                        aria-label={`Duplicate ${page.title}`}
                      >
                        {duplicatingPageId === page.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Link to={`/admin/pages/${page.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(page.id)}
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
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onAction={handleBulkAction}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
