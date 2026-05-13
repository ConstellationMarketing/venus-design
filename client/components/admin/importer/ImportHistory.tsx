import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import type { ImportJob, ImportJobItem } from "@site/lib/importer/types";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

export default function ImportHistory() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobItems, setJobItems] = useState<ImportJobItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("import_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setJobs((data as ImportJob[]) ?? []);
    setLoading(false);
  };

  const loadJobItems = async (jobId: string) => {
    setItemsLoading(true);
    const { data } = await supabase
      .from("import_job_items")
      .select("*")
      .eq("import_job_id", jobId)
      .order("row_index", { ascending: true });
    setJobItems((data as ImportJobItem[]) ?? []);
    setItemsLoading(false);
  };

  const toggleExpand = (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      setJobItems([]);
    } else {
      setExpandedJob(jobId);
      loadJobItems(jobId);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("import_jobs").delete().eq("id", deleteId);
    setDeleteId(null);
    setJobs((prev) => prev.filter((j) => j.id !== deleteId));
    if (expandedJob === deleteId) {
      setExpandedJob(null);
      setJobItems([]);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const itemStatusColor = (status: string) => {
    switch (status) {
      case "created":
        return "default";
      case "updated":
        return "secondary";
      case "skipped":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No import jobs yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start a new import to see history here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Imports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Created</TableHead>
                <TableHead className="text-center">Updated</TableHead>
                <TableHead className="text-center">Skipped</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <>
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(job.id)}
                  >
                    <TableCell>
                      {expandedJob === job.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(job.created_at).toLocaleDateString()}{" "}
                      {new Date(job.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {job.template_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{job.source_type}</TableCell>
                    <TableCell className="text-sm">{job.mode}</TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {job.total_records}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-green-600">
                      {job.created_count}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-blue-600">
                      {job.updated_count}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-yellow-600">
                      {job.skipped_count}
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm text-red-600">
                      {job.failed_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColor(job.status) as any}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(job.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded row details */}
                  {expandedJob === job.id && (
                    <TableRow key={`${job.id}-details`}>
                      <TableCell colSpan={12} className="bg-muted/30 p-4">
                        {itemsLoading ? (
                          <div className="flex items-center gap-2 py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Loading items...
                            </span>
                          </div>
                        ) : jobItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4">
                            No item details available
                          </p>
                        ) : (
                          <div className="max-h-60 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Row</TableHead>
                                  <TableHead>Slug</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Error</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {jobItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs">
                                      {item.row_index + 1}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                      {item.target_slug ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          itemStatusColor(item.status) as any
                                        }
                                        className="text-xs"
                                      >
                                        {item.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-red-600">
                                      {item.error_message ?? "—"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import Job</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this import job record and all its
              item details. The imported content (pages/posts) will NOT be
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
