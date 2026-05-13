// ---------------------------------------------------------------------------
// QA Scan type definitions shared across the CMS admin UI
// ---------------------------------------------------------------------------

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface QAIssue {
  type: string;
  message: string;
  severity?: IssueSeverity;
}

export interface URLQAResult {
  url: string;
  status: 'pass' | 'warning' | 'fail';
  issues: QAIssue[];
  issueCount: number;
}

export interface QAReportSummary {
  totalUrls: number;
  passedUrls: number;
  failedUrls: number;
  warningUrls: number;
  totalIssues: number;
  issuesByType: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  passRate: number;
  generatedAt: string;
  targetUrl?: string;
}

export interface QAReport {
  summary: QAReportSummary;
  results: URLQAResult[];
  generatedAt: string;
  version: string;
}

export interface QAScanStatus {
  workflowRunId: number | string | null;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | string;
  htmlUrl?: string | null;
  lastChecked?: string;
  isLoading: boolean;
}

// Shape returned by qa-get-latest-run / qa-run-status Netlify functions
export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

// Convenience alias for the array returned by qa-list-runs
export type WorkflowRunList = WorkflowRun[];
