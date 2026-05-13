import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import type { Template } from '@/lib/database.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Loader2, FileCode, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from "sonner";

/** Renders a human-readable summary of default_content for any shape */
function DefaultContentSummary({ content }: { content: unknown }) {
  // Handle object-based structured content (practice pages)
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const obj = content as Record<string, unknown>;
    const sections = Object.keys(obj).filter((k) => k !== 'headingTags');

    if (sections.length === 0) {
      return <p className="text-sm text-gray-400 italic">No content sections defined</p>;
    }

    const labelMap: Record<string, string> = {
      hero: 'Hero',
      socialProof: 'Social Proof',
      contentSections: 'Content Sections',
      faq: 'FAQ',
    };

    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">Content Sections:</p>
        <ul className="text-sm text-gray-500 space-y-1">
          {sections.map((key) => {
            let label = labelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
            const val = obj[key];
            if (Array.isArray(val)) {
              label += ` (${val.length})`;
            }
            return (
              <li key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Handle array-based block content (standard / landing)
  let blocks: Array<{ type: string }> = [];

  if (Array.isArray(content)) {
    blocks = content;
  } else if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) blocks = parsed;
    } catch {
      // invalid JSON — ignore
    }
  }

  if (blocks.length === 0) {
    return <p className="text-sm text-gray-400 italic">No content blocks defined</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">Content Blocks ({blocks.length}):</p>
      <ul className="text-sm text-gray-500 space-y-1">
        {blocks.map((block, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="w-2 h-2 bg-slate-300 rounded-full" />
            <span className="capitalize">{String(block.type || 'unknown').replace('-', ' ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminTemplates() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('page_type', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template: ' + error.message);
    } else {
      await fetchTemplates();
    }

    setDeleting(false);
    setDeleteTarget(null);
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to manage templates. Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            Manage page templates. Templates provide pre-built content structures when creating new pages.
          </p>
        </div>
        <Link to="/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <FileCode className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {template.page_type}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {template.default_meta_description || 'No description provided'}
              </CardDescription>

              <DefaultContentSummary content={template.default_content} />

              {template.default_meta_title && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Meta Title Pattern:</span><br />
                    {template.default_meta_title}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex items-center gap-2">
                <Link to={`/admin/templates/${template.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteTarget(template)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <p className="mb-4">No templates found. Create one to get started.</p>
            <Link to="/admin/templates/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template "{deleteTarget?.name}"?
              This action cannot be undone. Existing pages created from this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
