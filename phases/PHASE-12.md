Below are **10 tickets for Phase 12: Analytics, Reporting & Owner Tools**.

Assumptions for Codex:

* Phases 1–11 are complete.
* Backend: Node.js/TypeScript (Lambda + API Gateway), DynamoDB, S3, EventBridge, SES.
* Frontend: React Native / Expo targeting iOS, Android, and Web.
* Previous phases already implemented: recap endpoint, basic export, scoreboard, favorites, etc. Phase 12 will extend these, not replace them.

Each ticket contains **Title, Features, Description, Infrastructure, Testing, Acceptance Criteria** and is self-contained so Codex can implement and verify it.

---

### Ticket 12.1: Backend – Hunt Summary Reporting Endpoint (`GET /hunts/{id}/report`)

**Title**
Backend – Hunt Summary Reporting Endpoint (`GET /hunts/{id}/report`)

**Features**

* New endpoint: `GET /hunts/{id}/report`.
* Owner-only access.
* Aggregated analytics for a hunt:

  * Participation metrics.
  * Task difficulty metrics.
  * Submission/acceptance stats over time.

**Description**
This ticket implements a detailed owner-facing report endpoint at the hunt level. It returns richer analytics than the recap endpoint, oriented toward organizers who need deeper insights: participation, task difficulty and engagement, and time-based submission patterns.

**Infrastructure**

* Uses existing tables:

  * `Hunts`, `Tasks`, `Teams`, `Submissions`, `TeamScores`.
* No new AWS resources.

**Steps (for Codex)**

1. Add route handler `GET /hunts/{huntId}/report` in the backend REST API.
2. Authorization:

   * Require JWT.
   * Fetch hunt; if `requestUserId !== hunt.ownerUserId`, return 403.
3. Aggregations (server-side):

   * Participation:

     * Total teams, total players.
     * Percentage of players who submitted at least one task.
   * Task difficulty & engagement:

     * For each task:

       * `attemptCount` (number of submissions).
       * `acceptedCount`.
       * `rejectedCount`.
       * `acceptanceRate = acceptedCount / max(attemptCount, 1)`.
     * Identify:

       * Top N most attempted tasks.
       * Easiest tasks (highest acceptance rate).
       * Hardest tasks (lowest acceptance rate, with minimum attempt threshold).
   * Submission timeline:

     * Bucket submissions into time intervals (e.g., 10–15 minute buckets between `startTime` and `endTime` or hunt’s actual submission time range).
     * For each bucket: count submissions, accepted, rejected.
   * Team performance metrics:

     * Total points per team and rank (may reuse scoreboard logic).
     * Submissions per team and acceptance rates per team.
4. Response shape (example):

   ```json
   {
     "hunt": { "huntId": "...", "name": "...", "status": "closed" },
     "participation": {
       "totalTeams": 8,
       "totalPlayers": 32,
       "playersWithSubmissions": 29,
       "playerParticipationRate": 0.91
     },
     "taskMetrics": {
       "perTask": [
         { "taskId": "...", "title": "...", "attempts": 10, "accepted": 7, "rejected": 3, "acceptanceRate": 0.7 },
         ...
       ],
       "mostAttempted": [ ... ],
       "easiestTasks": [ ... ],
       "hardestTasks": [ ... ]
     },
     "timeline": {
       "bucketSizeMinutes": 15,
       "buckets": [
         { "start": "...", "end": "...", "attempts": 12, "accepted": 8, "rejected": 4 },
         ...
       ]
     },
     "teamSummary": [
       { "teamId": "...", "teamName": "...", "totalPoints": 120, "rank": 1, "attempts": 20, "accepted": 15, "rejected": 5 },
       ...
     ]
   }
   ```
5. Implement repository/helper functions to compute aggregates efficiently (prefer query + filtered scan by `huntId` over full-table scan).
6. Add unit tests for the handler and aggregation logic with mocked repositories.

**Testing**

* `npm run build:backend`
* `npm test` (including new tests).
* Manual:

  * Seed a test hunt with tasks/teams/submissions in a local or dev environment.
  * Call `GET /hunts/{id}/report` as owner and inspect JSON for expected metrics.

**Acceptance Criteria**

* `GET /hunts/{id}/report` returns a structured, detailed analytics payload for the hunt.
* Only the hunt owner can access this endpoint.
* Participation, task metrics, timeline, and team summary values are correct for representative data.
* Backend builds/tests pass; changes are committed.

---

### Ticket 12.2: Backend – Per-Team Detailed Report Endpoint (`GET /hunts/{id}/teams/{teamId}/report`)

**Title**
Backend – Per-Team Detailed Report Endpoint (`GET /hunts/{id}/teams/{teamId}/report`)

**Features**

* New endpoint: `GET /hunts/{huntId}/teams/{teamId}/report`.
* Owner-only, with optional team self-view (team members).
* Detailed per-team analytics:

  * Points breakdown by task.
  * Submission history.
  * Acceptance/rejection reasons summary (via comments).

**Description**
This ticket introduces a team-level report view. It allows owners (and optionally the team itself) to see how a specific team performed, with detailed breakdowns across tasks and over time.

**Infrastructure**

* Uses existing tables: `Teams`, `Submissions`, `Tasks`, `TeamScores`.
* No new AWS resources.

**Steps (for Codex)**

1. Add route `GET /hunts/{huntId}/teams/{teamId}/report`.
2. Authorization rules:

   * If `requestUserId === hunt.ownerUserId`, allow.
   * Optionally, if `requestUserId` is a member of the team (`Teams`), allow read-only view; otherwise 403.
   * Document and implement the chosen rule (recommended: owner or team member).
3. Aggregations for the team:

   * Load all submissions for the combination `(huntId, teamId)`.
   * For each submission:

     * Task ID, submission time, status, awarded points, judge comments, whether favorited.
   * Compute:

     * Total submissions, accepted, rejected.
     * Total points (should match scoreboard).
     * Breakdown by task:

       * Attempts, accepted, rejected, total points from that task.
     * Time-series performance:

       * Cumulative points over time (sorted by submission time), with an array of `{ timestamp, cumulativePoints }`.
     * Comment summary:

       * For rejected submissions, aggregate common phrases or at least list comments per submission.
4. Response shape (example):

   ```json
   {
     "hunt": { "huntId": "...", "name": "..." },
     "team": { "teamId": "...", "teamName": "...", "members": [ ... ] },
     "summary": {
       "totalPoints": 120,
       "totalSubmissions": 20,
       "accepted": 15,
       "rejected": 5
     },
     "perTask": [
       {
         "taskId": "...",
         "taskTitle": "...",
         "attempts": 3,
         "accepted": 2,
         "rejected": 1,
         "pointsEarned": 30
       },
       ...
     ],
     "timeline": [
       { "timestamp": "...", "cumulativePoints": 10 },
       { "timestamp": "...", "cumulativePoints": 25 },
       ...
     ],
     "submissions": [
       {
         "submissionId": "...",
         "taskId": "...",
         "submittedAt": "...",
         "status": "accepted",
         "awardedPoints": 10,
         "judgeComment": "Great creativity!",
         "favorited": true
       },
       ...
     ]
   }
   ```
5. Add unit tests covering:

   * Owner access.
   * Team member access (if allowed).
   * Correct aggregation logic.

**Testing**

* `npm run build:backend`
* `npm test`.
* Manual:

  * Call endpoint for several teams with different submission patterns and verify the returned analytics.

**Acceptance Criteria**

* Owners can view detailed per-team reports for any hunt.
* Optional: team members can see their own team’s report.
* Per-task and timeline breakdowns are accurate.
* Backend tests/build pass; changes are committed.

---

### Ticket 12.3: Backend – Enhanced Export (CSV/JSON) with Analytics Fields

**Title**
Backend – Enhanced Export (CSV/JSON) with Analytics Fields

**Features**

* Extend existing export functionality for hunts to include analytics-related fields.
* Provide export in both CSV and JSON with consistent schema.
* Owner-only access with optional filters (e.g., include/exclude media URLs).

**Description**
This ticket enhances the data export capability so owners can perform external analysis. It ensures that exports include the same data used in reporting endpoints, with a clear schema, and remain restricted to hunt owners.

**Infrastructure**

* Uses existing S3 bucket and `Exports` table (if created in a previous phase).
* No new AWS resources beyond what is already present for exporting.

**Steps (for Codex)**

1. Reuse or extend existing backend export logic (from Phase 8, if present):

   * Ensure `POST /hunts/{huntId}/export` and `GET /hunts/{huntId}/export` exist (or implement them if missing).
2. Extend export content to include:

   * Hunt metadata.
   * Teams (names, members).
   * Tasks (title, description, points, tags/facets).
   * Submissions (status, timestamps, awarded points, judge comments, favorites, media URLs or keys).
   * Precomputed analytics per team and per task if feasible (e.g., acceptance rates, total points).
3. Export formats:

   * JSON: one top-level object with arrays for each entity and computed analytics sections.
   * CSV: at least:

     * `submissions.csv` with columns including team, task, status, timestamps, points, comments, favorited.
     * Optionally `teams.csv` and `tasks.csv` for easier analysis.
4. Authorization:

   * Ensure that only the hunt owner can trigger and read exports.
5. Update the `Exports` record schema to track:

   * Included formats (`csv`, `json`).
   * Optional filters (e.g., `includeMediaUrls`).

**Testing**

* `npm run build:backend`
* `npm test` (unit tests for export builder functions).
* Manual:

  * Trigger export for a populated hunt.
  * Download CSV and JSON; verify data completeness and alignment with analytics endpoints.

**Acceptance Criteria**

* Owners can export hunt data that includes analytics-relevant fields.
* CSV/JSON exports have a clear, consistent schema.
* Access to export is restricted to owners.
* Backend builds/tests pass; changes are committed.

---

### Ticket 12.4: Backend – Owner Score Adjustment Endpoint with Audit Logging

**Title**
Backend – Owner Score Adjustment Endpoint with Audit Logging

**Features**

* New endpoint to adjust scores at the submission level:

  * `POST /hunts/{huntId}/submissions/{submissionId}/adjustScore`.
* Owner-only.
* Writes to an audit log with before/after values, reason, and timestamp.
* Recomputes team total points accordingly.

**Description**
This ticket provides a controlled mechanism for owners to correct scoring errors after the fact. Adjustments are applied to specific submissions and tracked in an audit log so that the system retains an immutable history of changes.

**Infrastructure**

* New DynamoDB table `ScoreAdjustments` in `DataStack`:

  * PK: `adjustmentId` (UUID).
  * Attributes: `huntId`, `submissionId`, `teamId`, `previousPoints`, `newPoints`, `reason`, `adjustedByUserId`, `adjustedAt`.

**Steps (for Codex)**

1. Infra:

   * Add `ScoreAdjustments` table in `DataStack`.
   * Expose `SCORE_ADJUSTMENTS_TABLE_NAME` to relevant lambdas via environment variable.
   * Grant lambdas read/write access.
2. Endpoint `POST /hunts/{huntId}/submissions/{submissionId}/adjustScore`:

   * Auth required.
   * Validate `requestUserId === hunt.ownerUserId`; otherwise 403.
   * Request body: `{ newPoints: number, reason: string }`.
3. Logic:

   * Load submission and associated team.
   * Verify that submission belongs to the given `huntId`.
   * Determine `previousPoints` (based on previous decision/score).
   * If `newPoints === previousPoints`, return 400 (no-op).
   * Update submission’s `awardedPoints` and, if needed, store a flag indicating the score has been manually adjusted (e.g., `manualAdjustment: true`).
   * Update team’s total in `TeamScores` (increment or decrement by `delta = newPoints - previousPoints`).
   * Insert record into `ScoreAdjustments` with full audit details.
   * Return updated submission and team score snapshot.
4. Add unit tests:

   * Owner adjusting score.
   * Non-owner rejected.
   * Audit entry saved correctly.

**Testing**

* `npm run build:infra` and `cdk synth`/`cdk deploy DataStack`.
* `npm run build:backend` and `npm test`.
* Manual:

  * Adjust score for a submission and verify team total updates and an audit record appears.

**Acceptance Criteria**

* Owners can adjust submission scores in a controlled manner.
* All adjustments create audit entries with before/after state and reason.
* Team totals are updated correctly and consistently.
* Backend builds/tests and CDK deploy pass; changes are committed.

---

### Ticket 12.5: Backend – Submission Flagging & Owner Review Endpoint

**Title**
Backend – Submission Flagging & Owner Review Endpoint

**Features**

* Endpoint for owners/judges to flag submissions:

  * `POST /hunts/{huntId}/submissions/{submissionId}/flag`.
* Endpoint for owners to list flags:

  * `GET /hunts/{huntId}/flags`.
* Optional flag severity and notes.

**Description**
This ticket allows owners and judges to flag problematic submissions (e.g., inappropriate content, suspected cheating). Owners can then review all flagged submissions from a single endpoint.

**Infrastructure**

* New DynamoDB table `SubmissionFlags` in `DataStack`:

  * PK: `flagId` (UUID).
  * Attributes: `huntId`, `submissionId`, `flaggedByUserId`, `severity`, `reason`, `flaggedAt`, optional `resolved` status and `resolvedAt`.

**Steps (for Codex)**

1. Infra:

   * Define `SubmissionFlags` table.
   * Provide `SUBMISSION_FLAGS_TABLE_NAME` to relevant lambdas via env var.
   * Grant read/write permissions.
2. Endpoint `POST /hunts/{huntId}/submissions/{submissionId}/flag`:

   * Auth required.
   * Allowed callers:

     * Owner.
     * Judge (for this hunt).
   * Body: `{ severity?: 'low' | 'medium' | 'high', reason: string }`.
   * Logic:

     * Validate submission belongs to hunt.
     * Create `SubmissionFlags` record.
3. Endpoint `GET /hunts/{huntId}/flags`:

   * Owner-only.
   * Returns list of:

     * Submission basic info (submissionId, team, task).
     * Flag metadata (severity, reason, flaggedBy, flaggedAt).
   * Optionally allow filtering by severity or unresolved only.
4. Optional: `POST /hunts/{huntId}/flags/{flagId}/resolve` to mark flags as resolved.

**Testing**

* `npm run build:infra` and deploy DataStack.
* `npm run build:backend` and `npm test`.
* Manual:

  * Flag submissions as judge or owner.
  * List flags as owner and verify content.

**Acceptance Criteria**

* Judges/owners can flag submissions with reasons and severity.
* Owners can list and review all flagged submissions for a hunt.
* Flags are persisted and queryable.
* Backend builds/tests and CDK deploy pass; changes are committed.

---

### Ticket 12.6: Frontend – Owner Analytics Dashboard Screen (Hunt-Level Report)

**Title**
Frontend – Owner Analytics Dashboard Screen (Hunt-Level Report)

**Features**

* New “Analytics” or “Reports” tab/section in owner’s Hunt Detail.
* Visualizations based on `GET /hunts/{id}/report`.
* Highlights participation metrics, task difficulty, and submission timeline.

**Description**
This ticket introduces a dedicated analytics view for owners on the frontend. It consumes the hunt-level report endpoint and presents the data with charts and rich summaries that are readable on mobile and web.

**Infrastructure**

* Frontend-only.
* Uses existing charting library (e.g., Recharts / Victory / React Native SVG) if previously integrated; otherwise, simple bar/line charts using minimal dependencies.

**Steps (for Codex)**

1. Add `OwnerAnalyticsScreen` (or similar) under Hunt Detail navigation (Owner-only, role-guarded):

   * On mount, call `GET /hunts/{id}/report`.
   * Show loading and error states.
2. Render sections:

   * Participation:

     * Show total teams, total players, participation rate (text + small visual).
   * Task metrics:

     * Top N most attempted tasks as a bar chart (task vs attempts).
     * Hardest tasks list with acceptance rates.
   * Timeline:

     * Line or bar chart of attempts per time bucket.
3. Use responsive layout from earlier phases:

   * On large web screens, show multiple charts side by side; on mobile, stack them.
4. Ensure accessibility:

   * Provide text summaries alongside charts for screen readers.

**Testing**

* Component tests:

  * Mock `GET /hunts/{id}/report` and verify sections render correctly.
* Snapshot tests:

  * Capture the screen for a representative report.
* Manual:

  * View analytics screen as owner on mobile and web and verify layout and correctness.

**Acceptance Criteria**

* Owners have an Analytics/Reports screen per hunt.
* The screen correctly visualizes participation, task difficulty, and timeline metrics from the report endpoint.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 12.7: Frontend – Per-Team Reporting Screen

**Title**
Frontend – Per-Team Reporting Screen

**Features**

* New screen to display team-level report from `GET /hunts/{id}/teams/{teamId}/report`.
* Accessible from owner analytics and team listings.
* Optional self-view for team members.

**Description**
This ticket surfaces detailed per-team analytics in the UI. Owners can inspect a team’s performance and history, and optionally team members can view their own detailed report.

**Infrastructure**

* Frontend-only.
* Uses per-team report endpoint from Ticket 12.2.

**Steps (for Codex)**

1. Add `TeamReportScreen` that:

   * Accepts `huntId` and `teamId` via navigation params.
   * Calls `GET /hunts/{id}/teams/{teamId}/report`.
   * Handles loading and errors.
2. Layout:

   * Summary header with team name, total points, total submissions, acceptance rate.
   * Chart of cumulative points over time (timeline).
   * Table or list for per-task breakdown.
   * List of submissions (or at least a compact representation) with status and points.
3. Navigation sources:

   * From Owner Analytics screen: clicking a team in a team summary table should navigate to `TeamReportScreen`.
   * Optionally, from Player team screen: “View Team Report” if the user is a member and backend allows access.
4. Responsive design:

   * Charts and tables should adjust using responsive layout primitives.

**Testing**

* Component tests:

  * Mock team report API and ensure summary, charts, and breakdowns render.
* Manual:

  * Open team report from multiple teams; verify content matches backend data.

**Acceptance Criteria**

* Owners can drill into a per-team reporting view from analytics.
* Per-team report presents summary, timeline, and per-task breakdown.
* Optional: team members can view their own team’s report if allowed.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 12.8: Frontend – Owner Export Tools UI

**Title**
Frontend – Owner Export Tools UI

**Features**

* UI for owners to trigger and monitor hunt data exports.
* Download links for CSV/JSON exports.
* Clear indication of export status (pending, completed, failed).

**Description**
This ticket provides a user interface for owners to use the enhanced export functionality. They can trigger export jobs, see status, and download the resulting files.

**Infrastructure**

* Frontend-only.
* Uses backend export endpoints (`POST /hunts/{huntId}/export`, `GET /hunts/{huntId}/export`).

**Steps (for Codex)**

1. In Owner’s Hunt Detail (e.g., Admin or Analytics section), add an “Export Data” pane:

   * Button “Generate Export”:

     * Calls `POST /hunts/{huntId}/export`.
   * After triggering:

     * Periodically poll `GET /hunts/{huntId}/export` until `status = 'completed'` or `'failed'`.
   * Display current status and last export timestamp.
2. When export is `completed`:

   * Show links or buttons for each format (CSV and JSON) using the pre-signed URLs from backend.
   * On web: clicking downloads.
   * On native: open in browser or share sheet.
3. Handle error states:

   * Show error message if export fails.
   * Allow retry.

**Testing**

* Component tests:

  * Mock export endpoints to exercise pending/completed/failed states.
* Manual:

  * Trigger export on a representative hunt and download outputs.

**Acceptance Criteria**

* Owners can initiate exports from the UI and observe progress.
* Owners can download CSV/JSON exports.
* Errors in export are surfaced with clear messaging.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 12.9: Frontend – Owner Tools Panel for Score Adjustments & Flags

**Title**
Frontend – Owner Tools Panel for Score Adjustments & Flags

**Features**

* Owner-only tools panel in Hunt Detail (e.g., “Owner Tools”).
* UI for:

  * Adjusting submission scores via `POST /hunts/{id}/submissions/{submissionId}/adjustScore`.
  * Viewing and reviewing flagged submissions via `GET /hunts/{id}/flags`.
* Clear indicators and confirmations for potentially destructive actions.

**Description**
This ticket exposes the new owner administrative tools to the UI. Owners can identify problematic submissions, adjust scores, and see audit-driven actions clearly.

**Infrastructure**

* Frontend-only.
* Uses backend endpoints from Tickets 12.4 and 12.5.

**Steps (for Codex)**

1. Add `OwnerToolsScreen` under the Owner navigation for a hunt:

   * Role-guarded (owner-only).
2. Panels:

   * **Flagged Submissions**:

     * Call `GET /hunts/{id}/flags`.
     * List flagged submissions with severity, reason, flaggedBy, and quick link to view media/details.
   * **Score Adjustment Tool**:

     * Provide a way to search/lookup submissions (e.g., via team + task filters or by submission list).
     * When a submission is selected:

       * Show current points and a numeric input for new points.
       * Require a “Reason” text field for the adjustment.
       * On submit, call `POST /hunts/{huntId}/submissions/{submissionId}/adjustScore`.
       * Show confirmation modal before finalizing.
   * Show inline indication if a submission has already been manually adjusted (if backend exposes that flag).
3. Feedback and validation:

   * Show loading indicators during API calls.
   * On success, refresh relevant data (e.g., team totals, submission list).
   * On error, show descriptive messages.

**Testing**

* Component tests:

  * Mock flags and adjustment endpoints.
  * Verify that:

    * Flags list renders.
    * Adjust score form calls correct endpoint with expected payload.
* Manual:

  * Use Owner Tools screen to adjust a score and verify scoreboard changes.
  * View flagged submissions and navigate to the underlying submission.

**Acceptance Criteria**

* Owners have a dedicated panel for managing flags and score adjustments.
* Score adjustments require a reason and a confirmation step.
* Flagged submissions are visible and actionable.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 12.10: Phase 12 End-to-End Verification and Documentation

**Title**
Phase 12 End-to-End Verification and Documentation

**Features**

* End-to-end verification of analytics, reporting, export, and owner tools.
* Full build/test cycle and deployment.
* Documentation of reporting features and owner tools for future users and developers.

**Description**
This ticket confirms that Phase 12 delivers a coherent set of analytics and owner tools, and that all components function together as expected. It also updates documentation to describe how to use and extend these capabilities.

**Infrastructure**

* Uses existing stacks: `AuthStack`, `DataStack`, `CoreStack`, `MediaStack`.
* No new resources beyond those added in Phase 12.

**Steps (for Codex)**

1. Run full project checks:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy updated stacks as needed:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack`
   * Deploy other stacks only if modified.
3. End-to-end manual scenario:

   * Create and run a full hunt with multiple teams, tasks, and submissions (including flags and a manual score adjustment).
   * As owner:

     * Open Analytics dashboard and verify metrics match expectations.
     * Drill into multiple team reports and check consistency with scoreboard.
     * Use Owner Tools to:

       * Flag a submission and see it appear in flags list.
       * Adjust a submission score and verify:

         * Team totals and leaderboard update.
         * Adjustment appears in audit table (via direct DB check or test harness).
     * Trigger export, wait for completion, and download CSV/JSON.
     * Confirm exported data matches analytics and actual game data.
4. Documentation updates:

   * Add or update `docs/analytics-and-reporting.md`:

     * Describe `GET /hunts/{id}/report` and team report endpoints.
     * Document data fields and intended use.
   * Add `docs/owner-tools.md`:

     * Explain score adjustments, flags, and exports.
     * Explain who can access these tools and audit behavior.
   * Update `README.md` with a brief section highlighting analytics/reporting features and linking to the above documents.

**Testing**

* All build/test commands must succeed.
* Manual scenario must complete without errors or inconsistencies between UI, reports, and exports.

**Acceptance Criteria**

* Analytics and reporting features work end-to-end for real hunts.
* Owner tools (score adjustments, flags, exports) operate correctly and safely.
* Documentation clearly describes reporting APIs, UI features, and owner tools.
* Repository is clean with all changes committed, and Phase 12 is complete.

