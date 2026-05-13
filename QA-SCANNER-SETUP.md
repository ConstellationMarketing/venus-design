# QA Scanner Implementation Guide

## Overview

A production-ready QA scanner system with **backend-only GitHub access**. All GitHub API operations are server-side only — the frontend has zero access to GitHub credentials.

### Architecture Highlights

- **Backend Netlify Functions** handle all GitHub API calls
- **Frontend calls backend endpoints only** (no direct GitHub access)
- **Tokens stored securely** in server environment (Netlify or dev .env)
- **Admin dashboard UI** for trigger and monitoring
- **Real-time polling** for workflow status updates

---

## Files Changed/Created

### New Backend Functions

1. **vendor/cms-core/netlify/functions/qa-get-latest-run.ts** (NEW)
   - GET endpoint: `/.netlify/functions/qa-get-latest-run`
   - Returns latest qa-scan workflow run metadata
   - Uses: `GITHUB_QA_TOKEN`, `GITHUB_REPOSITORY` (server-side)
   - No auth required (read-only public data)

2. **vendor/cms-core/netlify/functions/qa-run-status.ts** (NEW)
   - GET endpoint: `/.netlify/functions/qa-run-status?runId=123`
   - Returns specific workflow run status for polling
   - Uses: `GITHUB_QA_TOKEN`, `GITHUB_REPOSITORY` (server-side)
   - No auth required (read-only public data)

### Updated Backend Functions

3. **vendor/cms-core/netlify/functions/trigger-qa.ts** (MODIFIED)
   - **Changed**: `GITHUB_TOKEN` → `GITHUB_QA_TOKEN` (clearer intent)
   - **Fixed**: Race condition in fetching latest run
     - **Old**: Fetched generic `/actions/runs` (could return unrelated runs)
     - **New**: Queries workflow-specific `/actions/workflows/qa-scan.yml/runs`
   - POST endpoint: `/.netlify/functions/trigger-qa`
   - Requires admin auth via Supabase JWT

### Updated Frontend

4. **vendor/cms-core/client/pages/admin/AdminQA.tsx** (MODIFIED)
   - **Removed**: `VITE_GITHUB_TOKEN` (never used client-side)
   - **Removed**: `VITE_GITHUB_REPOSITORY` (never used client-side)
   - **Updated**: `fetchQAStatus()` → calls `GET /.netlify/functions/qa-get-latest-run`
   - **Updated**: Polling loop → calls `GET /.netlify/functions/qa-run-status?runId={id}`
   - **Removed**: Imports of `getLatestQAWorkflowRun`, `getWorkflowRunStatus` (no longer needed)

5. **vendor/cms-core/client/lib/github-api.ts** (SIMPLIFIED)
   - **Removed**: All API call functions
     - ~~`getLatestQAWorkflowRun()`~~ (now backend: qa-get-latest-run.ts)
     - ~~`getWorkflowRunStatus()`~~ (now backend: qa-run-status.ts)
     - ~~`getWorkflowRunArtifacts()`~~ (deferred, no current UI need)
     - ~~`downloadQAReportArtifact()`~~ (deferred)
   - **Kept**: Pure helper functions (no API calls)
     - `isWorkflowCompleted()` — Check if run is done
     - `isWorkflowSuccessful()` — Check if run succeeded
     - `getWorkflowStatusMessage()` — Human-readable status

### Server Integration

6. **server/index.ts** (MODIFIED)
   - **Added**: Dev proxy for `GET /.netlify/functions/qa-get-latest-run`
   - **Added**: Dev proxy for `GET /.netlify/functions/qa-run-status`
   - Handles query parameters correctly for local dev environment

### Documentation

7. **.env.example** (MODIFIED)
   - **Added**: Section for "GitHub QA Scanner Configuration (Server-Side Only)"
   - **Changed**: `GITHUB_TOKEN` → `GITHUB_QA_TOKEN`
   - **Removed**: `VITE_GITHUB_TOKEN` (never needed client-side)
   - **Removed**: `VITE_GITHUB_REPOSITORY` (never needed client-side)
   - **Kept**: `VITE_QA_BASE_URL` (target site for scanning)
   - Clear security notes about why frontend has no GitHub credentials

---

## Environment Variables

### Server-Side Only (Secure)

```bash
# GitHub API token for QA scanner (server-side only)
# Required scopes: repo (for workflow dispatch + read access)
# Create at: GitHub Settings > Developer settings > Personal access tokens
GITHUB_QA_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# GitHub repository for QA workflow
# Format: owner/repository
# Example: ConstellationMarketing/jupiter-design
GITHUB_REPOSITORY=ConstellationMarketing/jupiter-design
```

**Key**: These variables are NEVER exposed to the frontend. They live only in:
- Local dev: `.env` file (git-ignored)
- Production: Netlify Site Settings > Build & deploy > Environment

### Frontend (Safe)

```bash
# Optional: Target URL for QA scans
# Defaults to http://localhost:8080 if not set
VITE_QA_BASE_URL=http://localhost:8080
```

**Key**: Only safe, non-secret variables are prefixed with `VITE_`.

---

## Why No Frontend GitHub Token?

**Security Best Practice**: Never expose authentication credentials to the client-side JavaScript.

### What Changed
- **Before**: Frontend made direct GitHub API calls with `VITE_GITHUB_TOKEN`
- **After**: Frontend calls backend endpoints; backend uses `GITHUB_QA_TOKEN`

### Benefits
✅ Token cannot be stolen from browser cache  
✅ Token not exposed in network requests (frontend → GitHub)  
✅ Token not visible in browser DevTools  
✅ Token not visible in client-side error messages  
✅ Token cannot be extracted by malicious scripts  
✅ Better control over GitHub API usage (rate limits, logging)  

### How It Works Now

```
Admin clicks "Run Scan"
    ↓
Frontend: POST /.netlify/functions/trigger-qa
    ↓ (Supabase JWT, no GitHub token)
    ↓
Netlify Function (server)
    ↓ (uses GITHUB_QA_TOKEN securely)
    ↓
GitHub API
    ↓
GitHub Actions Workflow
    ↓ (runs QA tests)
    ↓
Workflow completes
    ↓
Frontend: GET /.netlify/functions/qa-run-status?runId=123
    ↓ (polls for status, no token)
    ↓
Netlify Function (uses GITHUB_QA_TOKEN)
    ↓
GitHub API
    ↓
Return status to frontend
```

---

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "QA Scanner Token"
4. Select scope: `repo` (full control of private repositories)
5. Copy token immediately (you won't see it again!)

### 2. Local Development Setup

Add to `.env` (already git-ignored):

```bash
# GitHub QA Scanner
GITHUB_QA_TOKEN=ghp_your-token-here
GITHUB_REPOSITORY=ConstellationMarketing/jupiter-design

# Optional
VITE_QA_BASE_URL=http://localhost:8080
```

Start dev server:
```bash
pnpm dev
```

### 3. Production Deployment (Netlify)

1. Go to Netlify Site Settings
2. Navigate to "Build & deploy" > "Environment"
3. Add environment variables:
   - `GITHUB_QA_TOKEN` = (your token)
   - `GITHUB_REPOSITORY` = `ConstellationMarketing/jupiter-design`
   - `VITE_QA_BASE_URL` = `https://your-production-url.com`

4. Redeploy your site:
```bash
pnpm build
git push origin main
# Netlify auto-deploys
```

---

## How It Works

### Triggering a QA Scan

1. Admin navigates to `/admin/qa`
2. Clicks "Run Scan" button (optional custom URL)
3. Frontend sends: `POST /.netlify/functions/trigger-qa`
   ```json
   {
     "targetUrl": "http://localhost:8080"
   }
   ```
4. Backend function:
   - ✅ Validates Supabase JWT auth
   - ✅ Checks user is admin
   - ✅ Calls GitHub API with `GITHUB_QA_TOKEN` (server-side)
   - ✅ Dispatches workflow via `workflow_dispatch`
   - ✅ Queries workflow-specific runs to get run ID (avoids race condition)
   - ✅ Returns `{ workflowRunId, status, htmlUrl }`

### Workflow Execution (GitHub Actions)

1. GitHub Actions picks up `workflow_dispatch` trigger
2. Checks out code
3. Runs: `pnpm install && pnpm qa`
4. Uploads artifacts:
   - `qa-report-{COMMIT_SHA}` (JSON report)
   - `qa-screenshots-{COMMIT_SHA}` (screenshots)
5. Workflow completes

### Polling for Results

1. Frontend starts polling every 3 seconds
2. Each poll: `GET /.netlify/functions/qa-run-status?runId=123`
3. Backend uses `GITHUB_QA_TOKEN` (server-side) to fetch from GitHub API
4. Returns: `{ status, conclusion, html_url, created_at }`
5. When status=`completed`, frontend stops polling and displays results
6. Mock results shown (full report integration deferred)

---

## Testing Locally

### 1. Verify Environment Setup

```bash
# Check .env file has these set:
GITHUB_QA_TOKEN=ghp_...
GITHUB_REPOSITORY=ConstellationMarketing/jupiter-design
```

### 2. Start Dev Server

```bash
pnpm dev
# Server runs on http://localhost:8080
```

### 3. Access Admin QA Dashboard

- Navigate to: `http://localhost:8080/admin/qa`
- Must be logged in as an admin user
- (If not admin, get 403 forbidden)

### 4. Trigger a Test Scan

- Click "Run Scan" button
- Leave URL blank (uses `VITE_QA_BASE_URL`)
- Or enter custom URL
- Watch status update in real-time

### 5. Monitor the Workflow

- Frontend polls every 3 seconds
- Check GitHub Actions tab to see actual workflow progress
- When workflow completes, frontend displays mock results

### 6. Verify Backend Endpoints

Open DevTools Network tab:
- Should see: `POST /.netlify/functions/trigger-qa` (auth required)
- Should see: `GET /.netlify/functions/qa-get-latest-run` (on mount)
- Should see: `GET /.netlify/functions/qa-run-status?runId=...` (polling)
- Should NOT see: Any direct calls to `api.github.com` from browser
- Should NOT see: `GITHUB_QA_TOKEN` in any request

---

## Troubleshooting

### "GitHub not configured" Error

**Old Code**: Checked for `VITE_GITHUB_REPOSITORY` on frontend
**New Code**: Backend handles GitHub config; frontend error removed

If this error appears, you may have old code. Verify:
- ✅ AdminQA.tsx no longer checks `githubRepo`
- ✅ AdminQA.tsx imports only `getWorkflowStatusMessage`, `isWorkflowCompleted`
- ✅ No imports of `getLatestQAWorkflowRun`, `getWorkflowRunStatus`

### Trigger Returns 401/403

**Likely cause**: Not logged in as admin
- Check you're logged in (`/admin` page visible)
- Verify `cms_users` table: Your user has `role = 'admin'`
- Check browser Console for auth errors

### Trigger Returns 500

**Likely cause**: Missing backend env vars
- Check `.env` has `GITHUB_QA_TOKEN` and `GITHUB_REPOSITORY`
- Check token is valid (not revoked)
- Check token has `repo` scope
- Check repository name is correct format: `owner/repo`

### Polling Never Stops

**Likely cause**: Workflow didn't complete
- Check GitHub Actions tab manually
- Workflow may have failed or be stuck
- Can manually cancel workflow on GitHub

### "No workflow runs found" After Trigger

**This is expected**: GitHub needs a moment to create the run
- If persists: Check workflow file exists at `.github/workflows/qa-scan.yml`
- Check branch name is `main` (workflow might target different branch)

---

## Architecture Decisions

### 1. Race Condition Fix

**Issue**: Generic `/actions/runs` returns all runs, not necessarily from qa-scan workflow

**Solution**: Query workflow-specific endpoint
```
OLD: GET /repos/{repo}/actions/runs?per_page=1
NEW: GET /repos/{repo}/actions/workflows/qa-scan.yml/runs?per_page=1
```

**Benefit**: Always gets the latest qa-scan run, eliminating race conditions

### 2. No Frontend GitHub Token

**Decision**: Backend-only GitHub access

**Why**:
- Security: Tokens never leave server
- Simplicity: One credential source (Netlify env)
- Rate limits: Server-side caching potential
- Control: Logging/auditing of API usage

**Trade-off**: Slightly higher latency (extra network hop)
**Mitigated**: Polling interval (3s) is sufficient for admin use case

### 3. Deferred Report Retrieval

**Decision**: Show mock results; skip artifact parsing for MVP

**Why**:
- Artifact downloads are complex (ZIP parsing required)
- More practical solution: Persist reports to Supabase (planned)
- Current UI shows status monitoring (main need)

**Future**: Workflow → uploads to Supabase → Frontend queries Supabase

---

## Integration Checklist

### ✅ Completed (Phase 2)

- [x] Fixed trigger-qa race condition (workflow-specific runs endpoint)
- [x] Created qa-get-latest-run.ts (new GET endpoint)
- [x] Created qa-run-status.ts (new GET endpoint)
- [x] Updated AdminQA.tsx to use backend endpoints
- [x] Simplified github-api.ts (pure helpers only)
- [x] Updated server/index.ts with dev proxies
- [x] Updated .env.example with server-side vars
- [x] Updated QA-SCANNER-SETUP.md

### ⏭️ Future Enhancements (Post-MVP)

- [ ] Persist QA reports to Supabase
- [ ] Webhook for auto-sync on workflow completion
- [ ] Screenshot gallery from artifacts
- [ ] QA result history and trending
- [ ] Custom test configuration UI
- [ ] Slack/Email notifications

---

## File Summary

| File | Status | Purpose |
|------|--------|---------|
| vendor/cms-core/netlify/functions/trigger-qa.ts | Modified | Fixed race condition, uses GITHUB_QA_TOKEN |
| vendor/cms-core/netlify/functions/qa-get-latest-run.ts | Created | Backend GET for latest workflow run |
| vendor/cms-core/netlify/functions/qa-run-status.ts | Created | Backend GET for specific run status |
| vendor/cms-core/client/pages/admin/AdminQA.tsx | Modified | Removed tokens, calls backend endpoints |
| vendor/cms-core/client/lib/github-api.ts | Simplified | Kept pure helpers, removed API calls |
| server/index.ts | Modified | Added dev proxies for new endpoints |
| .env.example | Modified | Documented server-side env vars |

---

**Status**: ✅ Backend-Only Architecture Complete

All GitHub API calls moved to server-side. Frontend has zero access to GitHub credentials.
