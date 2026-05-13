import { useEffect, useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import type { Redirect } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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
import { toast } from "sonner";

type RedirectFormData = {
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  enabled: boolean;
};

const defaultFormData: RedirectFormData = {
  from_path: '',
  to_path: '',
  status_code: 301,
  enabled: true,
};

export default function AdminRedirects() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RedirectFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRedirects();
  }, []);

  const fetchRedirects = async () => {
    const { data, error } = await supabase
      .from('redirects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching redirects:', error);
    } else {
      setRedirects(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (redirect?: Redirect) => {
    if (redirect) {
      setEditingId(redirect.id);
      setFormData({
        from_path: redirect.from_path,
        to_path: redirect.to_path,
        status_code: redirect.status_code,
        enabled: redirect.enabled,
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('redirects')
        .update(formData as Record<string, unknown>)
        .eq('id', editingId);

      if (error) {
        console.error('Error updating redirect:', error);
        toast.error('Failed to update redirect: ' + error.message);
      } else {
        await fetchRedirects();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('redirects')
        .insert(formData as Record<string, unknown>);

      if (error) {
        console.error('Error creating redirect:', error);
        toast.error('Failed to create redirect: ' + error.message);
      } else {
        await fetchRedirects();
        setDialogOpen(false);
      }
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    const { error } = await supabase.from('redirects').delete().eq('id', deleteId);

    if (error) {
      console.error('Error deleting redirect:', error);
      toast.error('Failed to delete redirect');
    } else {
      setRedirects(redirects.filter(r => r.id !== deleteId));
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const handleToggleEnabled = async (redirect: Redirect) => {
    const { error } = await supabase
      .from('redirects')
      .update({ enabled: !redirect.enabled } as Record<string, unknown>)
      .eq('id', redirect.id);

    if (error) {
      console.error('Error toggling redirect:', error);
    } else {
      setRedirects(redirects.map(r => 
        r.id === redirect.id ? { ...r, enabled: !r.enabled } : r
      ));
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Admin-only page - show access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You don't have permission to manage redirects. Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Redirects</h1>
          <p className="text-gray-500 mt-1">Manage URL redirects for your site</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Redirect
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enabled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redirects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No redirects configured
                </TableCell>
              </TableRow>
            ) : (
              redirects.map((redirect) => (
                <TableRow key={redirect.id}>
                  <TableCell className="font-mono text-sm">{redirect.from_path}</TableCell>
                  <TableCell className="font-mono text-sm">{redirect.to_path}</TableCell>
                  <TableCell>{redirect.status_code}</TableCell>
                  <TableCell>
                    <Switch
                      checked={redirect.enabled}
                      onCheckedChange={() => handleToggleEnabled(redirect)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(redirect)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(redirect.id)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Redirect' : 'Add Redirect'}</DialogTitle>
            <DialogDescription>
              Configure a URL redirect rule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="from">From Path</Label>
              <Input
                id="from"
                value={formData.from_path}
                onChange={(e) => setFormData({ ...formData, from_path: e.target.value })}
                placeholder="/old-page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To Path</Label>
              <Input
                id="to"
                value={formData.to_path}
                onChange={(e) => setFormData({ ...formData, to_path: e.target.value })}
                placeholder="/new-page"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Code</Label>
              <Select
                value={String(formData.status_code)}
                onValueChange={(v) => setFormData({ ...formData, status_code: Number(v) as 301 | 302 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Redirect</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this redirect? This action cannot be undone.
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
    </div>
  );
}
