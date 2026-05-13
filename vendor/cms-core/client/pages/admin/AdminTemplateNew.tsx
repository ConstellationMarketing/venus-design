import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { PageType } from '@/lib/database.types';
import { defaultPracticeAreaPageContent } from '@site/lib/cms/practiceAreaPageTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from "sonner";

function getDefaultContent(pageType: PageType): unknown {
  if (pageType === 'practice') {
    return defaultPracticeAreaPageContent;
  }
  // standard / landing use empty block arrays
  return [];
}

export default function AdminTemplateNew() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [pageType, setPageType] = useState<PageType>('practice');
  const [metaTitle, setMetaTitle] = useState('[Page Title] | Your Firm Name');
  const [metaDescription, setMetaDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);

    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: name.trim(),
        page_type: pageType,
        default_content: getDefaultContent(pageType),
        default_meta_title: metaTitle || null,
        default_meta_description: metaDescription || null,
      } as Record<string, unknown>)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template: ' + (error?.message || 'Unknown error'));
      setCreating(false);
      return;
    }

    navigate(`/admin/templates/${(data as { id: string }).id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Template</CardTitle>
          <CardDescription>
            Templates provide pre-built content structures when creating new pages.
            After creating, you'll be taken to the editor to customize the default content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Practice Area Template"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pageType">Page Type</Label>
              <Select value={pageType} onValueChange={(v) => setPageType(v as PageType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice Area Page</SelectItem>
                  <SelectItem value="standard">Standard Page</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {pageType === 'practice'
                  ? 'Uses the structured editor (Hero, Social Proof, Content Sections, FAQ).'
                  : 'Uses the block-based editor with drag-and-drop content blocks.'}
              </p>
              <p className="text-xs text-amber-600">
                Page type cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaTitle">Default Meta Title Pattern (Optional)</Label>
              <Input
                id="metaTitle"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="[Page Title] | Your Firm Name"
              />
              <p className="text-sm text-gray-500">
                Use [Page Title] as a placeholder — it will be replaced with the actual page title when creating a page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Default Meta Description (Optional)</Label>
              <Textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="A default description for pages using this template..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Template'
                )}
              </Button>
              <Link to="/admin/templates">
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
