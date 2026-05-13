import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Play,
  RefreshCw,
  AlertCircle,
  BarChart3,
  XCircle,
  History,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type {
  QAScanStatus,
  QAReport,
  URLQAResult,
  WorkflowRun,
} from "@/lib/qa-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: URLQAResult["status"]) {
  if (status === "pass")
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Pass
      </Badge>
    );
  if (status === "warning")
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Warning
      </Badge>
    );
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" />
      Failed
    </Badge>
  );
}

function severityBadge(severity?: string) {
  if (severity === "error")
    return <Badge variant="destructive">error</Badge>;
  if (severity === "warning")
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">warning</Badge>;
  return <Badge variant="outline">info</Badge>;
}

function workflowStatusBadge(run: WorkflowRun) {
  if (run.status !== "completed") {
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {run.status === "queued" ? "Queued" : "Running"}
      </Badge>
    );
  }
  if (run.conclusion === "success") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Passed
      </Badge>
    );
  }
  if (run.conclusion === "cancelled") {
    return (
      <Badge variant="outline">
        <XCircle className="h-3 w-3 mr-1" />
        Cancelled
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {run.conclusion ?? "Failed"}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// RunHistoryCard sub-component
// ---------------------------------------------------------------------------

interface RunHistoryCardProps {
  runs: WorkflowRun[];
  isFetchingRuns: boolean;
  isFetchingReport: boolean;
  selectedRunId: number | string | null;
  onLoadReport: (runId: number) => void;
}

function RunHistoryCard({
  runs,
  isFetchingRuns,
  isFetchingReport,
  selectedRunId,
  onLoadReport,
}: RunHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Run History
        </CardTitle>
        <CardDescription>
          Last {runs.length > 0 ? runs.length : "10"} QA workflow runs from GitHub Actions
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isFetchingRuns ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 p-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading run history…
          </div>
        ) : runs.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8 px-6">
            No previous runs found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Run ID</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const isSelected = selectedRunId === run.id;
                const isCompleted = run.status === "completed";
                const isLoadingThis = isSelected && isFetchingReport;

                return (
                  <TableRow
                    key={run.id}
                    className={isSelected ? "bg-blue-50 border-l-2 border-l-blue-400" : ""}
                  >
                    <TableCell className="pl-6 text-sm">
                      {formatDistanceToNow(new Date(run.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      #{run.id}
                    </TableCell>
                    <TableCell>
                      {workflowStatusBadge(run)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={run.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs"
                        >
                          GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          className="gap-1 h-7 text-xs"
                          disabled={!isCompleted || isFetchingReport}
                          onClick={() => onLoadReport(run.id)}
                        >
                          {isLoadingThis ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading…
                            </>
                          ) : (
                            <>
                              <BarChart3 className="h-3 w-3" />
                              {isSelected ? "Loaded" : "Load Report"}
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminQA() {
  const [scanStatus, setScanStatus] = useState<QAScanStatus | null>(null);
  const [report, setReport] = useState<QAReport | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  // Run history state
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([]);
  const [isFetchingRuns, setIsFetchingRuns] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<number | string | null>(null);

  const qaBaseUrl =
    import.meta.env.VITE_QA_BASE_URL || "https://designs-jupiter.netlify.app";

  // ------------------------------------------------------------------
  // Auth helper
  // ------------------------------------------------------------------

  const getAuthHeader = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  };

  // ------------------------------------------------------------------
  // Fetch the QA report artifact for a completed run
  // ------------------------------------------------------------------

  const fetchReport = useCallback(async (runId: number | string | null) => {
    setIsFetchingReport(true);
    setSelectedRunId(runId);
    setError(null);
    try {
      const url = runId
        ? `/.netlify/functions/qa-report?runId=${runId}`
        : "/.netlify/functions/qa-report";

      const res = await fetch(url);

      // Guard against the SPA catch-all returning HTML instead of JSON
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const hint =
          res.status === 502 || res.status === 504
            ? "The function timed out — try again in a moment."
            : res.status === 404
            ? "The function is not available on this deployment."
            : `Unexpected HTTP ${res.status} — check Netlify function logs.`;
        throw new Error(`QA report returned a non-JSON response. ${hint}`);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        const msg = data.error || `Failed to fetch report (${res.status})`;
        const isNotFound = res.status === 404;
        throw new Error(
          isNotFound
            ? `${msg}. This may happen if the run failed before uploading its report, or if the artifact has expired (GitHub keeps artifacts for 30 days).`
            : msg
        );
      }
      const data: QAReport = await res.json();
      setReport(data);
    } catch (err) {
      // Non-fatal — show inline error rather than replacing page error
      console.error("Failed to fetch QA report:", err);
      setError(
        err instanceof Error
          ? `Report unavailable: ${err.message}`
          : "Failed to load QA report"
      );
    } finally {
      setIsFetchingReport(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Fetch latest run status on mount (and on manual refresh)
  // ------------------------------------------------------------------

  const fetchLatestStatus = useCallback(async () => {
    try {
      const res = await fetch("/.netlify/functions/qa-get-latest-run");
      if (!res.ok) return;

      // Guard against the SPA catch-all returning HTML instead of JSON
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        return; // Non-fatal: function not yet available on this deployment
      }

      let run: WorkflowRun | null;
      try {
        run = await res.json();
      } catch {
        return; // Non-fatal: malformed response
      }
      if (!run) return;

      const isCompleted = run.status === "completed";
      setScanStatus({
        workflowRunId: run.id,
        status: isCompleted ? "completed" : "in_progress",
        conclusion: run.conclusion ?? undefined,
        htmlUrl: run.html_url,
        lastChecked: new Date().toISOString(),
        isLoading: !isCompleted,
      });

      // Do NOT auto-fetch the report — let the user click "Load Report"
    } catch (err) {
      console.error("Error fetching latest QA status:", err);
    }
  }, []);

  // ------------------------------------------------------------------
  // Fetch recent run history on mount
  // ------------------------------------------------------------------

  const fetchRecentRuns = useCallback(async () => {
    setIsFetchingRuns(true);
    try {
      const res = await fetch("/.netlify/functions/qa-list-runs?limit=10");

      // Guard against the SPA catch-all returning HTML instead of JSON
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        return; // Non-fatal: function not yet available on this deployment
      }

      if (!res.ok) return;

      let runs: WorkflowRun[];
      try {
        runs = await res.json();
      } catch {
        return; // Non-fatal: malformed response
      }
      if (Array.isArray(runs)) {
        setRecentRuns(runs);
      }
    } catch (err) {
      console.error("Error fetching QA run history:", err);
    } finally {
      setIsFetchingRuns(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestStatus();
    fetchRecentRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Trigger QA scan
  // ------------------------------------------------------------------

  const handleTriggerScan = async () => {
    setIsTriggering(true);
    setError(null);
    setReport(null);
    setSelectedRunId(null);

    try {
      const authToken = await getAuthHeader();
      const targetUrl = customUrl.trim() || qaBaseUrl;

      const res = await fetch("/.netlify/functions/trigger-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error || `Failed to trigger QA scan (${res.status})`
        );
      }

      const data = await res.json();
      setScanStatus({
        workflowRunId: data.workflowRunId,
        status: "queued",
        htmlUrl: data.htmlUrl,
        isLoading: true,
      });
      setIsPolling(true);
      setPollCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to trigger QA scan"
      );
    } finally {
      setIsTriggering(false);
    }
  };

  // ------------------------------------------------------------------
  // Polling — stops when run completes, then fetches report
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      setPollCount((c) => c + 1);

      if (!scanStatus?.workflowRunId) return;

      try {
        const authToken = await getAuthHeader();
        const res = await fetch(
          `/.netlify/functions/qa-run-status?runId=${scanStatus.workflowRunId}`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        if (!res.ok) return;

        const run = await res.json();
        if (!run) return;

        const isCompleted = run.status === "completed";
        setScanStatus({
          workflowRunId: run.id,
          status: isCompleted ? "completed" : "in_progress",
          conclusion: run.conclusion ?? undefined,
          htmlUrl: run.html_url,
          lastChecked: new Date().toISOString(),
          isLoading: !isCompleted,
        });

        if (isCompleted) {
          setIsPolling(false);
          await fetchReport(run.id);
          // Refresh run history to include the newly completed run
          await fetchRecentRuns();
        }
      } catch (err) {
        console.error("Error polling workflow status:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPolling, scanStatus?.workflowRunId, fetchReport, fetchRecentRuns]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const allIssues = report?.results.flatMap((r) =>
    r.issues.map((i) => ({ url: r.url, ...i }))
  ) ?? [];

  const reportTitle = selectedRunId
    ? `Scan Summary — Run #${selectedRunId}`
    : "Scan Summary";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">QA Scans</h1>
          <p className="text-gray-600 mt-1">
            Automated quality assurance testing and reporting
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            fetchLatestStatus();
            fetchRecentRuns();
          }}
          disabled={isPolling || isFetchingReport || isFetchingRuns}
        >
          <RefreshCw className={`h-4 w-4 ${isFetchingReport || isFetchingRuns ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trigger card */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger QA Scan</CardTitle>
          <CardDescription>
            Run automated quality assurance tests on your live site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="target-url" className="block mb-2">
                Target URL
              </Label>
              <Input
                id="target-url"
                type="text"
                placeholder={qaBaseUrl}
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                disabled={isTriggering}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use: {qaBaseUrl}
              </p>
            </div>
            <Button
              onClick={handleTriggerScan}
              disabled={isTriggering || isPolling}
              className="gap-2"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering…
                </>
              ) : isPolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scan running…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Scan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest run status */}
      {scanStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Latest Run
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {scanStatus.status === "queued" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Queued</span>
                    </>
                  )}
                  {scanStatus.status === "in_progress" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="font-medium">In Progress</span>
                    </>
                  )}
                  {scanStatus.status === "completed" &&
                    scanStatus.conclusion === "success" && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700">
                          Passed
                        </span>
                      </>
                    )}
                  {scanStatus.status === "completed" &&
                    scanStatus.conclusion !== "success" && (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-700">
                          Completed with issues
                        </span>
                      </>
                    )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Run ID</p>
                <p className="font-mono text-sm mt-1">
                  {scanStatus.workflowRunId}
                </p>
              </div>

              {scanStatus.lastChecked && (
                <div>
                  <p className="text-sm text-gray-600">Last checked</p>
                  <p className="text-sm mt-1">
                    {formatDistanceToNow(new Date(scanStatus.lastChecked), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              )}

              {scanStatus.htmlUrl && (
                <div className="flex items-end">
                  <a
                    href={scanStatus.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                  >
                    View on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {isPolling && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Polling for results…</span>
                  <span className="text-xs text-gray-400">
                    {pollCount * 5}s elapsed
                  </span>
                </div>
                <Progress value={((pollCount % 24) / 24) * 100} className="h-1.5" />
              </div>
            )}

            {isFetchingReport && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading report from GitHub artifacts…
              </div>
            )}

            {scanStatus.status === "completed" && !report && !isFetchingReport && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fetchReport(scanStatus.workflowRunId)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Load Report
                </Button>
                <span className="text-xs text-gray-500">
                  Click to download the QA report from GitHub artifacts.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run History */}
      <RunHistoryCard
        runs={recentRuns}
        isFetchingRuns={isFetchingRuns}
        isFetchingReport={isFetchingReport}
        selectedRunId={selectedRunId}
        onLoadReport={(id) => {
          setReport(null);
          fetchReport(id);
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Report */}
      {/* ------------------------------------------------------------------ */}

      {report && (
        <>
          {/* Summary stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {reportTitle}
              </CardTitle>
              <CardDescription>
                Generated{" "}
                {formatDistanceToNow(new Date(report.generatedAt), {
                  addSuffix: true,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Pages scanned
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {report.summary.totalUrls}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Passed
                  </p>
                  <p className="text-3xl font-bold mt-1 text-green-700">
                    {report.summary.passedUrls}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Issues found
                  </p>
                  <p className="text-3xl font-bold mt-1 text-red-700">
                    {report.summary.totalIssues}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Warnings
                  </p>
                  <p className="text-3xl font-bold mt-1 text-amber-700">
                    {report.summary.issuesBySeverity?.warning ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Pass rate</span>
                  <span className="font-medium">
                    {report.summary.passRate}%
                  </span>
                </div>
                <Progress value={report.summary.passRate} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Issue breakdown by type */}
          {Object.keys(report.summary.issuesByType).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Issues by Check Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Object.entries(report.summary.issuesByType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                      >
                        <span className="capitalize text-sm font-medium">
                          {type}
                        </span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-URL results table */}
          <Card>
            <CardHeader>
              <CardTitle>URL Results</CardTitle>
              <CardDescription>
                Click a row with issues to see details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.results.map((result) => (
                    <React.Fragment key={result.url}>
                      <TableRow
                        className={
                          result.issueCount > 0
                            ? "cursor-pointer hover:bg-gray-50"
                            : ""
                        }
                        onClick={() => {
                          if (result.issueCount === 0) return;
                          setExpandedUrl(
                            expandedUrl === result.url ? null : result.url
                          );
                        }}
                      >
                        <TableCell className="font-mono text-sm pl-6">
                          {result.url}
                        </TableCell>
                        <TableCell>{statusBadge(result.status)}</TableCell>
                        <TableCell className="text-right pr-6 font-medium">
                          {result.issueCount > 0 ? result.issueCount : "—"}
                        </TableCell>
                      </TableRow>

                      {/* Inline issue detail rows */}
                      {expandedUrl === result.url &&
                        result.issues.map((issue, idx) => (
                          <TableRow
                            key={`${result.url}-issue-${idx}`}
                            className="bg-gray-50 border-t-0"
                          >
                            <TableCell
                              colSpan={3}
                              className="pl-10 py-2"
                            >
                              <div className="flex items-start gap-3 text-sm">
                                <span className="capitalize font-medium text-gray-700 min-w-[90px]">
                                  {issue.type}
                                </span>
                                <span className="text-gray-600 flex-1">
                                  {issue.message}
                                </span>
                                {severityBadge(issue.severity)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* All issues flat table */}
          {allIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>All Issues</CardTitle>
                <CardDescription>
                  {allIssues.length} issue{allIssues.length !== 1 ? "s" : ""}{" "}
                  across {report.summary.totalUrls} page
                  {report.summary.totalUrls !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">URL</TableHead>
                      <TableHead>Issue type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="pr-6">Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allIssues.map((issue, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs pl-6">
                          {issue.url}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {issue.type}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {issue.message}
                        </TableCell>
                        <TableCell className="pr-6">
                          {severityBadge(issue.severity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!scanStatus && !report && !isFetchingRuns && recentRuns.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-8 text-center">
            <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No QA scans have been run yet. Click <strong>Run Scan</strong> to
              start.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
