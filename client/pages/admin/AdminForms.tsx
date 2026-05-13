import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Copy,
  ChevronDown,
  FileInput,
} from "lucide-react";
import { toast } from "sonner";
import {
  discoverCmsFormLookups,
  routeUsesCmsForm,
} from "@site/lib/cms/formPreload";
import { getTrackedFieldSummary } from "@site/lib/cms/formTracking";
import { normalizeCmsForm, type CmsForm } from "@site/lib/cms/formTypes";

interface PageReference {
  id: string;
  title: string;
  url_path: string;
}

export default function AdminForms() {
  const [forms, setForms] = useState<CmsForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageRefs, setPageRefs] = useState<Record<string, PageReference[]>>({});

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cms_forms")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching forms:", error);
      toast.error("Failed to load forms");
    } else {
      const rows = ((data ?? []) as CmsForm[]).map(normalizeCmsForm);
      setForms(rows);
      findPageReferences(rows);
    }
    setLoading(false);
  };

  const findPageReferences = async (formList: CmsForm[]) => {
    // Fetch all pages with their content to scan for form references
    const { data: pages } = await supabase
      .from("pages")
      .select("id, title, url_path, content");

    if (!pages) return;

    const refs: Record<string, PageReference[]> = {};

    for (const form of formList) {
      const matches: PageReference[] = [];

      for (const page of pages) {
        const lookups = discoverCmsFormLookups(page.content);

        if (routeUsesCmsForm(form, lookups)) {
          matches.push({
            id: page.id,
            title: page.title,
            url_path: page.url_path,
          });
        }
      }

      // Also check well-known hardcoded usages
      if (form.name === "contact") {
        const homePage = pages.find((p) => p.url_path === "/");
        const contactPage = pages.find((p) => p.url_path === "/contact/");
        if (homePage && !matches.find((m) => m.id === homePage.id)) {
          matches.push({
            id: homePage.id,
            title: homePage.title,
            url_path: homePage.url_path,
          });
        }
        if (contactPage && !matches.find((m) => m.id === contactPage.id)) {
          matches.push({
            id: contactPage.id,
            title: contactPage.title,
            url_path: contactPage.url_path,
          });
        }
      }

      refs[form.id] = matches;
    }

    setPageRefs(refs);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    const { error } = await supabase
      .from("cms_forms")
      .delete()
      .eq("id", deleteId);

    if (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    } else {
      toast.success("Form deleted");
      setForms((prev) => prev.filter((f) => f.id !== deleteId));
    }

    setDeleteId(null);
    setDeleting(false);
  };

  const copyShortcode = (formId: string) => {
    navigator.clipboard.writeText(`{{form:${formId}}}`);
    toast.success("Shortcode copied to clipboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileInput className="h-6 w-6" />
            Forms
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage forms on your site. Embed new forms using the shortcode{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
              {"{{form:id}}"}
            </code>{" "}
            in any rich text field.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            All forms automatically capture attribution fields: {getTrackedFieldSummary()}.
          </p>
        </div>
        <Link to="/admin/forms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </Link>
      </div>

      {/* Table */}
      {forms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileInput className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No forms yet</p>
          <p className="text-sm">Create your first form to get started.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Form Name (Netlify)</TableHead>
                <TableHead className="text-center">Fields</TableHead>
                <TableHead>After Submit</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Shortcode</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <FormRow
                  key={form.id}
                  form={form}
                  pages={pageRefs[form.id] ?? []}
                  onDelete={() => setDeleteId(form.id)}
                  onCopyShortcode={() => copyShortcode(form.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be
              undone. Any pages using this form&apos;s shortcode will no longer
              render it.
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

function FormRow({
  form,
  pages,
  onDelete,
  onCopyShortcode,
}: {
  form: CmsForm;
  pages: PageReference[];
  onDelete: () => void;
  onCopyShortcode: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          to={`/admin/forms/${form.id}`}
          className="text-blue-600 hover:underline"
        >
          {form.display_name}
        </Link>
      </TableCell>
      <TableCell>
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
          {form.name}
        </code>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="secondary">{form.fields.length}</Badge>
      </TableCell>
      <TableCell>
        {form.redirect_url ? (
          <div className="space-y-1">
            <Badge variant="outline">Redirect</Badge>
            <p className="text-xs text-gray-500 break-all">{form.redirect_url}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Inline success message</span>
        )}
      </TableCell>
      <TableCell>
        <PagesDropdown pages={pages} />
      </TableCell>
      <TableCell>
        <button
          onClick={onCopyShortcode}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          title="Copy shortcode"
        >
          <Copy className="h-3.5 w-3.5" />
          <code className="bg-gray-100 px-1 py-0.5 rounded">
            {"{{form:...}}"}
          </code>
        </button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Link to={`/admin/forms/${form.id}`}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PagesDropdown({ pages }: { pages: PageReference[] }) {
  if (pages.length === 0) {
    return <span className="text-xs text-gray-400">No pages</span>;
  }

  if (pages.length === 1) {
    return (
      <Link
        to={`/admin/pages/${pages[0].id}`}
        className="text-xs text-blue-600 hover:underline"
      >
        {pages[0].title}
      </Link>
    );
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
        {pages.length} pages
        <ChevronDown className="h-3 w-3" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-0.5">
        {pages.map((p) => (
          <Link
            key={p.id}
            to={`/admin/pages/${p.id}`}
            className="block text-xs text-blue-600 hover:underline pl-2"
          >
            {p.title} ({p.url_path})
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
