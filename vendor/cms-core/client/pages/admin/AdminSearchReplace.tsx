import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RotateCcw, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Match {
  rowId: string;
  tableName: string;
  itemTitle: string;
  itemUrl: string;
  fieldPath: string;
  oldValue: string;
  newValue: string;
}

interface PreviewResult {
  matches: Match[];
  totalMatches: number;
  affectedItems: number;
  confirmToken: string;
}

interface AuditOperation {
  operation_id: string;
  created_at: string;
  search_term: string;
  replace_term: string;
  affected_count: number;
  rolled_back: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TABLE_LABELS: Record<string, string> = {
  pages: "Page",
  posts: "Post",
  site_settings: "Settings",
  templates: "Template",
};

const TABLE_BADGE_COLORS: Record<string, string> = {
  pages: "bg-blue-100 text-blue-800",
  posts: "bg-purple-100 text-purple-800",
  site_settings: "bg-amber-100 text-amber-800",
  templates: "bg-teal-100 text-teal-800",
};

function getTableLabel(tableName: string): string {
  return TABLE_LABELS[tableName] || tableName;
}

function getTableBadgeColor(tableName: string): string {
  return TABLE_BADGE_COLORS[tableName] || "bg-gray-100 text-gray-800";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateValue(value: string, maxLength = 100): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + "...";
}

function formatFieldPath(path: string): string {
  // Make JSONB paths more readable
  const jsonbRoots = [
    "content",
    "navigation_items",
    "footer_about_links",
    "footer_practice_links",
    "social_links",
    "default_content",
  ];
  for (const root of jsonbRoots) {
    if (path.startsWith(root)) {
      return path
        .replace(/\[(\d+)\]/g, " › Item $1")
        .replace(/\./g, " › ")
        .replace(root, root.charAt(0).toUpperCase() + root.slice(1).replace(/_/g, " "));
    }
  }
  // Capitalize simple field names
  return path.charAt(0).toUpperCase() + path.slice(1).replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminSearchReplace() {
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [operations, setOperations] = useState<AuditOperation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rollbackOperationId, setRollbackOperationId] = useState<string | null>(
    null,
  );
  const [rollingBack, setRollingBack] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("search_replace_audit")
        .select("operation_id, created_at, old_value, new_value, rolled_back")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by operation_id
      const operationMap = new Map<string, AuditOperation>();
      for (const record of data || []) {
        if (!operationMap.has(record.operation_id)) {
          operationMap.set(record.operation_id, {
            operation_id: record.operation_id,
            created_at: record.created_at,
            search_term: "",
            replace_term: "",
            affected_count: 0,
            rolled_back: record.rolled_back,
          });
        }
        const op = operationMap.get(record.operation_id)!;
        op.affected_count++;
      }

      setOperations(Array.from(operationMap.values()));
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handlePreview = async () => {
    if (!searchText.trim()) {
      setError("Search text is required");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setPreviewResult(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/.netlify/functions/search-replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchText,
          replaceText,
          caseSensitive,
          statusFilter,
          dryRun: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Preview failed");
      }

      setPreviewResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!previewResult?.confirmToken) return;

    setExecuting(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/.netlify/functions/search-replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchText,
          replaceText,
          caseSensitive,
          statusFilter,
          dryRun: false,
          confirmToken: previewResult.confirmToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Execute failed");
      }

      setSuccessMessage(
        `Successfully replaced ${data.totalChanges} occurrences across ${data.affectedItems} items. Operation ID: ${data.operationId.slice(0, 8)}...`,
      );
      setPreviewResult(null);
      setSearchText("");
      setReplaceText("");
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execute failed");
    } finally {
      setExecuting(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackOperationId) return;

    setRollingBack(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/.netlify/functions/search-replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rollback: true,
          operationId: rollbackOperationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rollback failed");
      }

      setSuccessMessage(
        `Successfully rolled back ${data.restoredChanges} changes.`,
      );
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setRollingBack(false);
      setRollbackOperationId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Rendering helpers
  // -------------------------------------------------------------------------

  const highlightMatch = (
    text: string,
    search: string,
    isCaseSensitive: boolean,
  ) => {
    if (!search) return text;

    const regex = new RegExp(
      `(${escapeRegex(search)})`,
      isCaseSensitive ? "g" : "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isMatch = isCaseSensitive
        ? part === search
        : part.toLowerCase() === search.toLowerCase();

      if (isMatch) {
        return (
          <mark key={i} className="bg-yellow-200 px-0.5 rounded">
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  /** Count unique table names in current preview */
  const getSourceSummary = (): string => {
    if (!previewResult) return "";
    const tables = new Set(previewResult.matches.map((m) => m.tableName));
    const labels = Array.from(tables).map(getTableLabel);
    return labels.join(", ");
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Search & Replace</h1>
        <p className="text-gray-500 mt-1">
          Find and replace text across all CMS content — pages, posts, settings,
          and templates
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <Tabs defaultValue="search">
        <TabsList>
          <TabsTrigger value="search">Search & Replace</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Find and Replace</CardTitle>
              <CardDescription>
                Search for text in titles, meta fields, content blocks, site
                settings, and templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Text</Label>
                  <Input
                    id="search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Text to find..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replace">Replace With</Label>
                  <Input
                    id="replace"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replacement text..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="caseSensitive"
                    checked={caseSensitive}
                    onCheckedChange={setCaseSensitive}
                  />
                  <Label htmlFor="caseSensitive">Case sensitive</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Label>Page / Post status:</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) =>
                      setStatusFilter(v as typeof statusFilter)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-400">
                    (applies to pages &amp; posts only)
                  </span>
                </div>

                <Button
                  onClick={handlePreview}
                  disabled={loading || !searchText.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Preview Matches
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview results */}
          {previewResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Preview Results</CardTitle>
                    <CardDescription>
                      Found {previewResult.totalMatches} match
                      {previewResult.totalMatches !== 1 ? "es" : ""} across{" "}
                      {previewResult.affectedItems} item
                      {previewResult.affectedItems !== 1 ? "s" : ""}
                      {getSourceSummary() && (
                        <span className="ml-1">
                          ({getSourceSummary()})
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {previewResult.totalMatches > 0 && (
                    <Button onClick={() => setConfirmDialogOpen(true)}>
                      Apply Changes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {previewResult.matches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No matches found
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Source</TableHead>
                          <TableHead className="w-48">Item</TableHead>
                          <TableHead className="w-40">Field</TableHead>
                          <TableHead>Current Value</TableHead>
                          <TableHead>New Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.matches.map((match, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={getTableBadgeColor(match.tableName)}
                              >
                                {getTableLabel(match.tableName)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {match.itemTitle}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {match.itemUrl}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {formatFieldPath(match.fieldPath)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p
                                className="text-sm truncate"
                                title={match.oldValue}
                              >
                                {highlightMatch(
                                  truncateValue(match.oldValue),
                                  searchText,
                                  caseSensitive,
                                )}
                              </p>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p
                                className="text-sm truncate text-green-700"
                                title={match.newValue}
                              >
                                {truncateValue(match.newValue)}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Operation History</CardTitle>
              <CardDescription>
                Recent search and replace operations with rollback capability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
              ) : operations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No operations yet
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Operation ID</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.map((op) => (
                        <TableRow key={op.operation_id}>
                          <TableCell>
                            {new Date(op.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {op.operation_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {op.affected_count} changes
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {op.rolled_back ? (
                              <Badge
                                variant="outline"
                                className="text-gray-500"
                              >
                                Rolled back
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                Applied
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!op.rolled_back && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setRollbackOperationId(op.operation_id)
                                }
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Rollback
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Execute Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Search & Replace</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to replace{" "}
                  <strong>{previewResult?.totalMatches}</strong> occurrence
                  {previewResult?.totalMatches !== 1 ? "s" : ""} across{" "}
                  <strong>{previewResult?.affectedItems}</strong> item
                  {previewResult?.affectedItems !== 1 ? "s" : ""}.
                </p>
                <p className="text-sm">
                  This action will be logged and can be rolled back from the
                  History tab.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={executing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} disabled={executing}>
              {executing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Rollback Dialog */}
      <AlertDialog
        open={!!rollbackOperationId}
        onOpenChange={() => setRollbackOperationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this operation? All changes made
              by this search & replace will be reverted to their original
              values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={rollingBack}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {rollingBack ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rolling back...
                </>
              ) : (
                "Rollback"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
