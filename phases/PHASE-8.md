Below are 10 tickets for **Phase 8: Timers, Auto-Closure, Post-Game Recap & Exports**.

Assumptions:

* Phases 1–7 are complete (auth, hunts, tasks, facets, teams, judges, submissions, scoring, scoreboard, favorites album).
* Hunts already have `startTime`, `endTime`, `autoCloseAtEndTime`, and `status: 'draft' | 'active' | 'closed'` fields.

Each ticket includes **Title, Features, Description, Infrastructure, Testing, Acceptance Criteria**, and is self-contained so Codex can execute it in isolation.

---

### Ticket 8.1: Backend – Scheduled Auto-Close for Hunts via EventBridge

**Title**
Backend – Scheduled Auto-Close for Hunts via EventBridge

**Features**

* EventBridge rule(s) to trigger a Lambda at scheduled hunt end times.
* Lambda handler that closes eligible hunts (`status = 'active'`, `autoCloseAtEndTime = true`) when end time passes.
* Idempotent close operation (safe to run multiple times).

**Description**
This ticket implements automatic hunt closure based on configured `endTime` when `autoCloseAtEndTime` is enabled. It uses EventBridge scheduled triggers to invoke a Lambda periodically, which scans for hunts that should be auto-closed and updates their status to `closed`.

**Infrastructure**

* In `DataStack` or `CoreStack` (choose one and be consistent with architecture), define:

  * New Lambda function `AutoCloseHuntsFunction` in `packages/backend` (e.g., `autoCloseHunts.handler`).
  * EventBridge rule that runs on a fixed schedule (for example, every 5 minutes) and targets `AutoCloseHuntsFunction`.
* Lambda environment:

  * `HUNTS_TABLE_NAME`.
* IAM:

  * `AutoCloseHuntsFunction` has read/write access to `Hunts` table.

**Steps (guidance for Codex)**

1. Backend:

   * Implement `autoCloseHunts.ts` with handler:

     * Scan `Hunts` table for hunts where:

       * `status = 'active'`.
       * `autoCloseAtEndTime = true`.
       * `endTime` is not null and is <= current time (UTC).
     * For each such hunt:

       * Set `status = 'closed'`.
       * Set `updatedAt` to current time.
       * Ensure idempotence: if already `closed`, skip.
2. Infra:

   * In CDK, add the Lambda definition and EventBridge rule.
   * Ensure schedule expression (e.g., `rate(5 minutes)`) is configured.
3. Make sure time comparisons use UTC consistently.

**Testing**

* Backend unit tests:

  * Mock DynamoDB client; ensure that:

    * Only eligible hunts are updated.
    * Handler is idempotent for already closed hunts.
* Infra:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (or stack containing the rule).
* Manual:

  * Create an active hunt with `autoCloseAtEndTime = true` and `endTime` in the near past.
  * Invoke `AutoCloseHuntsFunction` manually via console or `aws lambda invoke` and confirm hunt status changes to `closed`.

**Acceptance Criteria**

* EventBridge rule and `AutoCloseHuntsFunction` Lambda are deployed.
* Eligible hunts are automatically transitioned to `closed`.
* Running the Lambda multiple times does not corrupt hunt states.
* Infra synth/deploy and backend tests pass; changes are committed.

---

### Ticket 8.2: Backend – Enforce Closed Hunts on Submissions and Judge Actions

**Title**
Backend – Enforce Closed Hunts on Submissions and Judge Actions

**Features**

* Enforce that `status = 'closed'` prevents:

  * New submissions.
  * Judge decisions on previously pending submissions.
* Preserve read-only access (scoreboard, stats, album) for closed hunts.

**Description**
This ticket ensures that once a hunt is closed (either manually or auto-closed), no further gameplay actions can occur. Players cannot submit new media, and judges cannot accept/reject additional submissions. Read operations remain available for post-game viewing.

**Infrastructure**

* No new AWS resources.
* Backend logic only.

**Steps (guidance for Codex)**

1. In submission creation endpoint (`POST /hunts/{huntId}/tasks/{taskId}/submissions`):

   * After fetching the hunt, if `status !== 'active'`, return 400 with a clear error: e.g., “Hunt is not active; submissions are closed.”
2. In judge decision endpoint (`POST /hunts/{huntId}/submissions/{submissionId}/decision`):

   * Check hunt `status` before evaluating decision.
   * If `status !== 'active'`, return 400 or 409 (document choice) indicating hunt is closed to new decisions.
   * Still allow judges to view submissions via GET endpoints.
3. Ensure scoreboard, stats, and favorites endpoints:

   * Continue to work when hunt is closed (no extra restrictions).
4. Add unit tests:

   * For submission creation: closed hunt returns error.
   * For judge decision: closed hunt returns error.
   * For stats/scoreboard: closed hunts still respond successfully.

**Testing**

* `npm run build:backend` and `npm test`.
* Manual:

  * Close a hunt (via API or auto-close), then attempt:

    * New submission → expect failure.
    * Judge decision on pending submission → expect failure.
    * Scoreboard/stats/album calls → expect success.

**Acceptance Criteria**

* Closed hunts cannot receive new submissions or judge decisions.
* Read-only endpoints continue functioning for closed hunts.
* All relevant tests pass; changes are committed.

---

### Ticket 8.3: Backend – Post-Game Recap Summary Endpoint

**Title**
Backend – Post-Game Recap Summary Endpoint

**Features**

* `GET /hunts/{huntId}/recap` endpoint returning a comprehensive post-game summary.
* Includes winner(s), top tasks, key statistics, and favorites overview.
* Accessible to all participants once hunt is closed.

**Description**
This ticket provides a single backend endpoint to power the post-game recap screen. It aggregates data from `Hunts`, `Teams`, `TeamScores`, `Tasks`, `Submissions`, and favorites to give a rich overview of the game outcome.

**Infrastructure**

* Uses existing tables (`Hunts`, `Teams`, `TeamScores`, `Tasks`, `Submissions`).
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add endpoint `GET /hunts/{huntId}/recap`:

   * Auth required; user must be owner, judge, or player in the hunt.
   * Fetch hunt; if `status !== 'closed'`, either:

     * Return 400 (recap only available for closed hunts), or
     * Allow access but mark `isFinal = false`.
     * Choose and document behavior; recommended: recap restricted to closed hunts.
2. Data aggregation:

   * Scoreboard:

     * Use `TeamScores` + `Teams` to compute ranking.
   * Identify winner(s):

     * Team(s) with maximum `totalPoints`.
   * Task highlights:

     * Most attempted task(s).
     * Task(s) with highest acceptance rate.
     * Hardest task(s) (lowest acceptance rate with at least N submissions).
   * Submission stats:

     * Total submissions, accepted, rejected, pending.
   * Favorites overview:

     * Count of favorites.
     * Optionally list a small subset of “highlighted favorites” (e.g., top N by time or random).
3. Response shape example:

   ```json
   {
     "hunt": { "huntId": "...", "name": "...", "status": "closed", "startTime": "...", "endTime": "..." },
     "winners": [{ "teamId": "...", "teamName": "...", "totalPoints": 123 }],
     "scoreboard": [{ "rank": 1, "teamId": "...", "teamName": "...", "totalPoints": 123 }, ...],
     "taskHighlights": {
       "mostAttempted": [...],
       "highestAcceptanceRate": [...],
       "hardest": [...]
     },
     "submissionSummary": {
       "totalSubmissions": 50,
       "accepted": 35,
       "rejected": 10,
       "pending": 5
     },
     "favoritesSummary": {
       "totalFavorites": 12,
       "sampleFavorites": [{ "submissionId": "...", "taskId": "...", "teamId": "..." }]
     }
   }
   ```
4. Add unit tests for handler using mocked repositories.

**Testing**

* `npm run build:backend` and `npm test`.
* Manual:

  * On a closed hunt with some data, call `/hunts/{huntId}/recap` and verify aggregation is correct.

**Acceptance Criteria**

* `/hunts/{huntId}/recap` returns a structured, comprehensive summary of the game.
* Access is limited to participants; closed hunts supported.
* Aggregations (winners, stats) are correct for representative data.
* Tests pass; changes are committed.

---

### Ticket 8.4: Backend – Game Data Export to S3 (CSV/JSON) with Download Link

**Title**
Backend – Game Data Export to S3 (CSV/JSON) with Download Link

**Features**

* Owner-initiated export endpoint:

  * `POST /hunts/{huntId}/export` to trigger export job.
* Asynchronous export Lambda writing CSV and/or JSON to S3.
* `GET /hunts/{huntId}/export` to check status and get pre-signed download URLs.

**Description**
This ticket enables owners to export their game data (teams, scores, tasks, submissions, favorites) as CSV/JSON for archival or external analysis. Exports run asynchronously in a Lambda and are stored in S3; owners receive a pre-signed URL for download.

**Infrastructure**

* New S3 prefix in existing media bucket or a dedicated “exports” bucket:

  * Simplest: reuse existing `MediaStack` bucket and use prefix `exports/hunts/{huntId}/...`.
* New Lambda for export processing and an SQS queue or EventBridge for triggering, or a simple direct invocation from the API Lambda (if execution time is expected to be small).
* DynamoDB (optional) `Exports` table or reusing hunt item attributes to track export status. To keep scope manageable, use an `Exports` table:

  * `Exports` table:

    * PK: `huntId` (string).
    * SK: `exportId` (string) or just `exportId` as PK with `huntId` attribute.
    * Attributes: `status`, `createdAt`, `completedAt`, `downloadKeyCsv?`, `downloadKeyJson?`, `errorMessage?`.

**Steps (guidance for Codex)**

1. Infra:

   * In `DataStack`, add `Exports` DynamoDB table.
   * In `MediaStack`, no structural change required; exports reuse existing bucket.
   * In `CoreStack`, define `ExportHuntDataFunction` Lambda with:

     * Env vars: `EXPORTS_TABLE_NAME`, `MEDIA_BUCKET_NAME`, `HUNTS_TABLE_NAME`, `TASKS_TABLE_NAME`, `TEAMS_TABLE_NAME`, `SUBMISSIONS_TABLE_NAME`, etc.
     * IAM: read from all relevant tables, write to `Exports` and S3.
2. Backend endpoints:

   * `POST /hunts/{huntId}/export`:

     * Auth: owner only.
     * Create an `Exports` item with `status = 'pending'`.
     * Invoke `ExportHuntDataFunction` asynchronously (e.g., `lambda.invoke({ InvocationType: 'Event' })`).
     * Return current export metadata.
   * `GET /hunts/{huntId}/export`:

     * Auth: owner only.
     * Read latest `Exports` item for this hunt; if `status = 'completed'`, generate pre-signed URLs for S3 keys and return them.
3. `ExportHuntDataFunction` logic:

   * Read hunt, teams, scores, tasks, submissions, favorites (as needed).
   * Build CSV and JSON in memory (chunking if needed for size).
   * Write to S3 under keys like:

     * `exports/hunts/{huntId}/{exportId}.json`
     * `exports/hunts/{huntId}/{exportId}.csv`
   * Update `Exports` item with `status = 'completed'` and keys; set `completedAt`.
   * On failure, set `status = 'failed'` and `errorMessage`.

**Testing**

* Infra:

  * `npm run build:infra`, `cdk synth`, `cdk deploy DataStack MediaStack CoreStack`.
* Backend unit tests:

  * Export Lambda logic with mocked DynamoDB/S3.
  * Export endpoints with mocked Lambda invoke and exports repository.
* Manual:

  * As owner of a closed hunt with data, call `POST /hunts/{huntId}/export`.
  * Poll `GET /hunts/{huntId}/export` until `status = 'completed'`.
  * Use returned URL to download CSV/JSON; confirm contents.

**Acceptance Criteria**

* Owners can trigger exports and later download CSV/JSON of hunt data.
* Exports are stored in S3 with appropriate keys; status is tracked in DynamoDB.
* Error states (failed export) are visible via status.
* Tests and deploy succeed; changes are committed.

---

### Ticket 8.5: Frontend – Countdown Timers and Status Banners for Hunts

**Title**
Frontend – Countdown Timers and Status Banners for Hunts

**Features**

* Display hunt status and time remaining (for active hunts with `endTime`).
* Countdown timers in owner, player, and judge views.
* Clear banner when hunt is closed or not yet active.

**Description**
This ticket enhances the UX around game timing by displaying countdowns and status banners. Participants can see how much time remains in a hunt and receive visual feedback when the hunt is closed.

**Infrastructure**

* Uses existing hunt data (`startTime`, `endTime`, `status`, `autoCloseAtEndTime`).
* No new backend endpoints or AWS resources.

**Steps (guidance for Codex)**

1. Create a shared UI component `HuntStatusBanner`:

   * Props:

     * `status`, `startTime`, `endTime`, `autoCloseAtEndTime`.
   * Behavior:

     * If `status = 'draft'`: “Hunt not started yet.”
     * If `status = 'active'` and `endTime` is set:

       * Show countdown: “Time remaining: HH:MM:SS”.
       * Use a timer (e.g., `setInterval`/`useEffect`) to update once per second.
     * If `status = 'closed'`: “Hunt closed.”
   * Ensure timer is cleaned up on unmount.
2. Integrate `HuntStatusBanner` into:

   * Owner `HuntDetailScreen` (Overview and Dashboard).
   * Player `PlayerHuntLobbyScreen` and Task Browser.
   * Judge `JudgeHuntScreen`.
3. Ensure correct handling of timezone:

   * Use UTC timestamps from backend and convert to local time on client for display.
4. Handle edge cases:

   * If `endTime` is in the past but status still `active`, show “Overdue – closing soon” (or similar) based purely on time; actual closure still handled server-side.

**Testing**

* Unit tests:

  * For `HuntStatusBanner`, mock timers via Jest and validate countdown text for known times.
* Manual:

  * Open hunts with various statuses and endTimes; verify banners and timers behave correctly on web and mobile.

**Acceptance Criteria**

* All relevant hunt screens show status banners and countdowns when appropriate.
* Countdown timers update in real time and stop correctly when component unmounts or when time ends.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 8.6: Frontend – Post-Game Recap Screen for Participants

**Title**
Frontend – Post-Game Recap Screen for Participants

**Features**

* Dedicated recap screen leveraging `/hunts/{huntId}/recap`.
* Shows winners, scoreboard, key stats, task highlights, and link to favorites album.
* Accessible to all participants after hunt closure.

**Description**
This ticket delivers a user-facing post-game recap experience. Participants can view the final results, see which team won, review task highlights, and quickly navigate to favorites and exports (for owners).

**Infrastructure**

* Uses `GET /hunts/{huntId}/recap` (Ticket 8.3) and existing favorites/scoreboard endpoints as needed.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add `HuntRecapScreen`:

   * On mount, call `/hunts/{huntId}/recap`.
   * If backend restricts recap to closed hunts, show error message for non-closed hunts.
2. UI sections:

   * Header:

     * Hunt name, dates, and “Game Over” label.
   * Winners:

     * Display winning team(s) prominently (name + points).
   * Scoreboard:

     * Compact view of ranked teams, using data from recap (or scoreboard endpoint if needed).
   * Task highlights:

     * Most attempted tasks.
     * Hardest tasks.
   * Submission summary:

     * Total submissions and breakdown.
   * Favorites:

     * If `totalFavorites > 0`, show link/button “View Favorites Album” navigating to existing album screen.
3. Navigation:

   * Expose Recap from:

     * Owner `HuntDetailScreen` (for closed hunts).
     * Player `PlayerHuntLobbyScreen` once hunt is closed (or from dashboard).
     * Judge `JudgeHuntScreen`.
4. Handle loading/error states gracefully.

**Testing**

* Unit tests:

  * Mock recap endpoint and assert correct rendering of winners and sections.
* Manual:

  * On a closed hunt with data, open recap from various role flows and verify consistency with backend data.

**Acceptance Criteria**

* Participants can access a rich recap screen for closed hunts.
* Recap content matches `/hunts/{huntId}/recap` response (winners, stats, highlights).
* Navigation to favorites album works.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 8.7: Frontend – Owner Post-Game Admin Panel (Close, Re-open, Exports)

**Title**
Frontend – Owner Post-Game Admin Panel (Close, Re-open, Exports)

**Features**

* Owner-only panel for managing hunt lifecycle and exports.
* Manual close button; optional re-open capability if allowed by backend.
* Initiate and monitor data export, with download link.

**Description**
This ticket adds an owner-focused admin panel for post-game operations. Owners can manually close a hunt, see whether it auto-closed, trigger data exports, and download exported files.

**Infrastructure**

* Uses:

  * `/hunts/{id}` PATCH for manual close (already exists).
  * `/hunts/{huntId}/export` (POST + GET) from Ticket 8.4.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Decide on re-open semantics:

   * If backend currently disallows `closed → active` transitions, do not expose re-open in UI.
   * If supported later, UI can be adapted. For now, implement **manual close only**.
2. In `HuntDetailScreen` (Owner view), add “Admin” section or new `OwnerAdminScreen`:

   * Show current hunt status and timing information.
   * Button “Manually Close Hunt”:

     * If `status = 'active'`, call `PATCH /hunts/{id}` to set `status = 'closed'`.
     * Confirm action with modal before executing.
   * Export controls:

     * Button “Generate Export” calls `POST /hunts/{huntId}/export`.
     * Show export `status` (pending/completed/failed) and a refresh control (polling `GET /hunts/{huntId}/export`).
     * When completed, show download link(s) using the returned pre-signed URLs; on web, clicking downloads; on mobile, open in browser.
3. Handle error states (failed export, patch errors) with clear messaging.

**Testing**

* Unit tests:

  * Admin panel calls correct endpoints and reacts to different export statuses.
* Manual:

  * As owner of a hunt:

    * Manually close an active hunt; verify status updates and enforcement of closed rules.
    * Trigger export, then download files and confirm content shape.

**Acceptance Criteria**

* Owners can manually close hunts from the UI.
* Owners can initiate and monitor exports and download results.
* UI reflects backend export statuses accurately.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 8.8: Backend – Owner Notification on Hunt Auto-Closure (Email via SES)

**Title**
Backend – Owner Notification on Hunt Auto-Closure (Email via SES)

**Features**

* Email notification to hunt owner when a hunt is auto-closed by the scheduler.
* Configurable sender address; basic, informative email content.
* Opt-in/opt-out flag at hunt or owner level (simple global opt-in for now).

**Description**
This ticket adds a small notification mechanism to keep owners informed when the system auto-closes their hunt (as opposed to manual closure). It sends a simple email containing the hunt name, end time, and link to the recap/dashboard.

**Infrastructure**

* AWS SES configuration in the AWS account:

  * Verified sender email address (e.g., `no-reply@your-domain`).
* `AutoCloseHuntsFunction` needs permission to call SES:

  * `ses:SendEmail` (or `ses:SendRawEmail`) on appropriate identities.

**Steps (guidance for Codex)**

1. Infra:

   * In `CoreStack` or `MediaStack` (wherever SES makes sense), add IAM permission for `AutoCloseHuntsFunction`:

     * Allow `ses:SendEmail` with resource `*` or specific identities, depending on policy guidelines.
   * Add environment variables to `AutoCloseHuntsFunction`:

     * `SES_SENDER_EMAIL`.
     * `APP_BASE_URL` for constructing links to recap or dashboard (if available).
2. Backend:

   * Extend `autoCloseHunts` logic:

     * When a hunt transitions from `active` to `closed` via auto-close:

       * Load owner user record to get email address (from `Users` table or Cognito claim if mirrored).
       * If owner has an email, send SES email:

         * Subject: “Your hunt '<name>' has ended” (or similar).
         * Body includes:

           * Hunt name and endTime.
           * Message that the game has auto-closed.
           * Link to recap/dashboard using `APP_BASE_URL` and `huntId` path.
3. Make email sending robust:

   * On SES failure, log error but do not fail auto-close operation.
4. Optional: Add a configuration flag (for now, a simple global “always send” is acceptable).

**Testing**

* Backend unit tests:

  * Mock SES client; verify that email is sent only when status transitions from active to closed.
  * Verify that SES errors do not prevent closure.
* Manual:

  * Configure SES sender in the AWS account.
  * Create an active auto-closing hunt with owner email available.
  * Force `AutoCloseHuntsFunction` to run and verify owner receives an email.

**Acceptance Criteria**

* Owners receive emails when hunts auto-close (but not on manual close, unless explicitly implemented).
* SES errors do not break closure logic.
* Tests pass and infra deploys; changes are committed.

---

### Ticket 8.9: Integration Tests – Auto-Close, Enforcement, and Recap

**Title**
Integration Tests – Auto-Close, Enforcement, and Recap

**Features**

* Integration tests covering:

  * Auto-closure of hunts.
  * Enforcement of closed status on submissions and judge actions.
  * Correct behavior of recap endpoint.
* Uses local DynamoDB and mocked SES.

**Description**
This ticket adds integration coverage for Phase 8 backend behavior. It ensures that hunts close as expected, gameplay actions are blocked after closure, and recap data remains consistent.

**Infrastructure**

* Uses existing integration test infrastructure (local DynamoDB, etc.).
* No new AWS resources.

**Steps (guidance for Codex)**

1. Extend or create integration test suite, e.g., `packages/backend/src/__tests__/integration/phase8.integration.test.ts`.
2. Scenario:

   * Create a hunt record in local DynamoDB with:

     * `status = 'active'`, `autoCloseAtEndTime = true`, `endTime` in the past.
   * Create teams, submissions, and scores for the hunt.
   * Run `autoCloseHunts` handler directly:

     * Assert hunt transitions to `closed`.
   * Attempt to create a new submission for the closed hunt:

     * Expect 400 or 409.
   * Attempt to issue a judge decision:

     * Expect 400 or 409.
   * Call `/hunts/{huntId}/recap` handler:

     * Assert it returns the expected aggregated data (e.g., winners, counts).
3. Mock SES so that email sending is invoked but no real email is sent.

**Testing**

* `npm test` should run integration tests (or dedicated `npm run test:integration`).
* All tests must pass in a clean environment.

**Acceptance Criteria**

* Integration tests verify auto-close, enforcement, and recap behavior.
* Tests are stable and deterministic.
* No regressions in prior integration suites; changes are committed.

---

### Ticket 8.10: Phase 8 End-to-End Verification and Documentation

**Title**
Phase 8 End-to-End Verification and Documentation

**Features**

* Validate timers, auto-closure, enforcement, recap, and exports end-to-end.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for timing, closure, recap, and exports.

**Description**
This ticket confirms that all Phase 8 features work together from the user’s perspective. It also updates the documentation so that future maintainers and users understand how hunts start, end, and produce recaps/exports.

**Infrastructure**

* Uses deployed `AuthStack`, `DataStack`, `MediaStack`, `CoreStack`.
* No new AWS resources beyond those added in earlier tickets.

**Steps (guidance for Codex)**

1. From the root, run:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy MediaStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack`
   * Deploy `AuthStack` only if it changed.
3. Manual end-to-end scenario:

   * Owner:

     * Creates a hunt with `endTime` 10–15 minutes in the future and `autoCloseAtEndTime = true`.
     * Configures tasks, teams, and assigns judge.
   * Players:

     * Join by game code, submit multiple tasks with media.
   * Judge:

     * Reviews and accepts/rejects submissions, hearts some favorites.
   * Let `endTime` pass and wait for auto-close (or trigger `AutoCloseHuntsFunction` manually for test).
   * Verify:

     * Hunt `status` becomes `closed`.
     * Submissions and judge decisions are blocked.
     * Scoreboard and stats remain readable.
     * Recap screen shows correct winners and stats.
     * Favorites album still works.
     * Owner can trigger export and download CSV/JSON.
     * Owner receives auto-close email (for auto-closed hunts).
4. Documentation updates:

   * Add or update:

     * `docs/hunt-lifecycle.md` explaining:

       * Draft → Active → Closed transitions.
       * Auto-closure rules and manual closure.
     * `docs/recap-and-exports.md` describing:

       * Recap endpoint and UI.
       * Export feature and how to access/download files.
   * Update `README.md` with short section summarizing timing, closure, and recap features.

**Testing**

* All build/test commands in step 1 must succeed.
* Manual scenario in step 3 should complete without errors or inconsistent behavior.

**Acceptance Criteria**

* Timers, auto-closure, enforcement, recap, favorites album, and export workflows function together correctly.
* All builds, tests, and CDK deploys pass.
* Documentation clearly describes hunt lifecycle, recap, and export features.
* Repository is clean (`git status` shows no uncommitted changes) and Phase 8 is complete.

