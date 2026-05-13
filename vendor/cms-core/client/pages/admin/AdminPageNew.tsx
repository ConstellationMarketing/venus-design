import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Template, PageType } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { toast } from "sonner";
import { generatePageUrlPath } from './pageUrlPath';

export default function AdminPageNew() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [urlPath, setUrlPath] = useState('');
  const [pageType, setPageType] = useState<PageType>('standard');
  const [templateId, setTemplateId] = useState<string>('');
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const generateUrlPath = (title: string, type: PageType = pageType) => {
    return generatePageUrlPath(title, type);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!urlPath || urlPath === generateUrlPath(title, pageType)) {
      setUrlPath(generateUrlPath(value, pageType));
    }
  };

  const handlePageTypeChange = (newType: PageType) => {
    const oldUrl = generateUrlPath(title, pageType);
    setPageType(newType);
    // Re-generate URL if user hasn't manually edited it
    if (!urlPath || urlPath === oldUrl) {
      setUrlPath(generateUrlPath(title, newType));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    const selectedTemplate = templates.find(t => t.id === templateId);

    // Normalize URL path to always include trailing slash
    const normalizedUrlPath = urlPath === '/' ? '/' : urlPath.replace(/\/+$/, '') + '/';

    const newPage = {
      title,
      url_path: normalizedUrlPath,
      page_type: pageType,
      content: selectedTemplate?.default_content || [],
      meta_title: selectedTemplate?.default_meta_title?.replace('[Page Title]', title) || (siteSettings.siteName ? `${title} | ${siteSettings.siteName}` : title),
      meta_description: selectedTemplate?.default_meta_description || '',
      status: 'draft' as const,
      noindex: false,
      canonical_url: null,
      og_title: null,
      og_description: null,
      og_image: null,
      published_at: null,
    };

    const { data, error } = await supabase
      .from('pages')
      .insert(newPage as Record<string, unknown>)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating page:', error);
      toast.error('Failed to create page: ' + (error?.message || 'Unknown error'));
      setCreating(false);
      return;
    }

    navigate(`/admin/pages/${(data as { id: string }).id}`);
  };

  const filteredTemplates = templates.filter(t => t.page_type === pageType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/pages">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pages
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Page</CardTitle>
          <CardDescription>
            Set up the basic information for your new page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Car Accident Lawyers"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlPath">URL Path</Label>
              <Input
                id="urlPath"
                value={urlPath}
                onChange={(e) => setUrlPath(e.target.value)}
                placeholder="/car-accident-lawyers"
                required
              />
              <p className="text-sm text-gray-500">
                The URL where this page will be accessible
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageType">Page Type</Label>
              <Select value={pageType} onValueChange={(v) => handlePageTypeChange(v as PageType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Page</SelectItem>
                  <SelectItem value="practice">Practice Area Page</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
              {pageType === 'practice' && (
                <p className="text-sm text-blue-600">
                  Practice area pages can use any path you choose.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Start from Template (Optional)</Label>
              <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (blank page)</SelectItem>
                  {filteredTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Templates provide pre-built content blocks to get you started
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Page'
                )}
              </Button>
              <Link to="/admin/pages">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
