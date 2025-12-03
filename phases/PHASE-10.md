Below are **10 tickets for Phase 10: Game Lifecycle & Rules Enforcement**.

Assumptions (for Codex):

* Existing stacks: `AuthStack`, `DataStack`, `CoreStack`, `MediaStack`, `NotificationStack`.
* Backend: Node.js/TypeScript (Lambda + API Gateway), DynamoDB, EventBridge.
* Frontend: React Native / Expo targeting iOS, Android, Web.
* Hunts already have `status`, `startTime`, `endTime`, `autoCloseAtEndTime`, but this phase will *finalize and strictly enforce* lifecycle semantics.

---

### Ticket 10.1: Normalize Hunt Status Model and Lifecycle Invariants

**Title**
Normalize Hunt Status Model and Lifecycle Invariants

**Features**

* Explicit hunt lifecycle states: `draft`, `active`, `closed`.
* Centralized helpers to check status and transitions.
* Invariants documented and enforced across backend code.

**Description**
This ticket normalizes hunt lifecycle handling and ensures the system uses a single, well-defined model for hunt status. It introduces explicit transition rules (`draft → active → closed`, no reverse transitions) and central helper functions so that subsequent tickets can rely on consistent behavior.

**Infrastructure**

* No new AWS resources.
* Backend TypeScript changes only.

**Steps (for Codex)**

1. In `packages/backend/src/domain/models.ts` (or equivalent domain model file), ensure `Hunt` defines:

   * `status: 'draft' | 'active' | 'closed';`
   * `startTime?: string;  // ISO`
   * `endTime?: string;    // ISO`
   * `autoCloseAtEndTime?: boolean;`
2. Create `packages/backend/src/domain/huntLifecycle.ts` with:

   * `canActivate(hunt: Hunt): boolean;`
   * `canClose(hunt: Hunt): boolean;`
   * `transitionToActive(hunt: Hunt, now: string): Hunt` (sets `status='active'`, `startTime` if not set).
   * `transitionToClosed(hunt: Hunt, now: string): Hunt` (sets `status='closed'`).
   * Enforce:

     * Only `draft` can transition to `active`.
     * Only `active` can transition to `closed`.
     * No backward transitions.
3. Use `now` consistently as an ISO UTC string (e.g., `new Date().toISOString()` in handlers).
4. Add unit tests for `huntLifecycle.ts` that:

   * Validate `canActivate`/`canClose` logic.
   * Validate transitions throw or reject invalid state changes.

**Testing**

* `npm run build:backend`
* `npm test` for new unit tests.

**Acceptance Criteria**

* Hunt lifecycle is explicitly modeled and documented in code.
* Valid and invalid transitions are clearly enforced by `huntLifecycle` helpers.
* All existing uses of `status` rely on these helpers going forward (later tickets will refactor usage).
* Backend builds and tests pass; changes are committed.

---

### Ticket 10.2: Backend – Activate Hunt Endpoint (`POST /hunts/{id}/activate`)

**Title**
Backend – Activate Hunt Endpoint (`POST /hunts/{id}/activate`)

**Features**

* New endpoint to activate a hunt: `POST /hunts/{id}/activate`.
* Only Owner can activate.
* Enforce `draft → active` transition using lifecycle helpers.
* Optionally validate basic configuration before activation (e.g., at least one task).

**Description**
This ticket adds the API endpoint that moves a hunt from configuration mode (`draft`) to playable mode (`active`). It ensures only the Owner can perform this operation, and that the current status and configuration allow activation.

**Infrastructure**

* No new AWS resources.
* Uses existing `Hunts` table and repositories.

**Steps (for Codex)**

1. Add route handler `POST /hunts/{id}/activate` in the backend API:

   * Require JWT auth.
   * Extract `huntId` from path.
2. Handler logic:

   * Load hunt by `huntId`.
   * Ensure `requestUserId === hunt.ownerUserId`. If not, return 403.
   * Use `huntLifecycle.canActivate(hunt)`; if false, return 409 with message indicating invalid state (e.g., already active or closed).
   * Optional configuration checks (recommended):

     * Ensure there is at least one `Task` for this hunt (`TasksRepository.listTasksByHunt(huntId)` non-empty).
     * Optional: ensure `endTime` is not in the past if set.
   * If validations pass:

     * Compute `now = new Date().toISOString()`.
     * Use `transitionToActive(hunt, now)` to produce updated hunt.
     * Persist update via `HuntsRepository.updateStatus(huntId, 'active', startTime, updatedAt)`.
   * Return updated hunt summary.
3. Optionally emit a `hunt.statusChanged` real-time event using existing notifier.
4. Add unit tests:

   * Owner can activate `draft` hunt with tasks.
   * Non-owner receives 403.
   * `active` or `closed` hunts cannot be activated (409).
   * Draft without tasks fails activation if configuration check is enabled.

**Testing**

* `npm run build:backend`
* `npm test` including new tests.

**Acceptance Criteria**

* `POST /hunts/{id}/activate` activates a `draft` hunt for the owner only.
* Invalid states or insufficient configuration are rejected with clear errors.
* Lifecycle helpers are used for transition.
* Backend tests/build pass; changes are committed.

---

### Ticket 10.3: Backend – Manual Close Endpoint (`POST /hunts/{id}/close`) for Owner and Judge

**Title**
Backend – Manual Close Endpoint (`POST /hunts/{id}/close`) for Owner and Judge

**Features**

* New endpoint `POST /hunts/{id}/close`.
* Permission: Owner or current Judge can close.
* Enforce `active → closed` using lifecycle helpers.
* Manual close does not depend on `endTime`.

**Description**
This ticket allows either the Owner or the assigned Judge to manually close an active hunt before (or after) the configured `endTime`. Once closed, the hunt is no longer playable, and the status becomes final.

**Infrastructure**

* No new AWS resources.
* Uses existing `Hunts` table, `JudgeAssignments`, and lifecycle helpers.

**Steps (for Codex)**

1. Add `POST /hunts/{id}/close` route handler:

   * Require JWT auth.
   * Extract `huntId` from path.
2. Handler logic:

   * Load hunt from `HuntsRepository`.
   * Determine caller role:

     * If `requestUserId === hunt.ownerUserId`, allow.
     * Else check `JudgeAssignmentsRepository.isJudge(huntId, requestUserId)`; if true, allow.
     * Otherwise 403.
   * Use `huntLifecycle.canClose(hunt)`; if false (e.g., `draft` or already `closed`), return 409.
   * Compute `now = new Date().toISOString()`.
   * Use `transitionToClosed(hunt, now)` to build updated hunt and persist via `HuntsRepository` update method.
   * Return updated hunt summary.
3. Optionally emit `hunt.statusChanged` event.
4. Add unit tests for:

   * Owner closes active hunt.
   * Judge closes active hunt.
   * Non-owner, non-judge receives 403.
   * Draft or closed hunts cannot be closed again.

**Testing**

* `npm run build:backend`
* `npm test` including new tests.

**Acceptance Criteria**

* Owner or Judge can close an active hunt via API.
* Invalid states are rejected with 409; unauthorized callers get 403.
* Closed state is persisted correctly and is terminal.
* Backend builds/tests pass; changes are committed.

---

### Ticket 10.4: Backend – Time-Based Auto-Close via EventBridge Scheduler

**Title**
Backend – Time-Based Auto-Close via EventBridge Scheduler

**Features**

* Scheduled EventBridge rule to trigger auto-close Lambda.
* Lambda scans hunts with `status='active'`, `autoCloseAtEndTime=true`, and `endTime <= now`.
* Uses lifecycle helpers to close eligible hunts.
* Idempotent behavior for repeated executions.

**Description**
This ticket implements automatic closure of hunts at or shortly after their configured `endTime` when auto-close is enabled. It uses EventBridge to invoke a Lambda on a regular schedule, which evaluates hunts and applies the `transitionToClosed` logic where appropriate.

**Infrastructure**

* In `CoreStack` or dedicated `LifecycleStack`:

  * Lambda: `AutoCloseHuntsFunction`.
  * EventBridge rule: `rate(5 minutes)` (or similar).
* IAM:

  * Lambda can read and update `Hunts` table.

**Steps (for Codex)**

1. Infra:

   * Define `AutoCloseHuntsFunction` in CDK with environment `HUNTS_TABLE_NAME`.
   * Define EventBridge rule that triggers the Lambda on a fixed schedule.
   * Grant the Lambda `dynamodb:Scan`, `dynamodb:UpdateItem` on Hunts table.
2. Backend:

   * Implement `autoCloseHunts.handler`:

     * Compute `now = new Date().toISOString()`.
     * Scan `Hunts` table for:

       * `status = 'active'`.
       * `autoCloseAtEndTime = true`.
       * `endTime` not null and `endTime <= now`.
     * For each candidate:

       * Use `huntLifecycle.canClose(hunt)`; if false, skip.
       * Build updated hunt via `transitionToClosed(hunt, now)` and persist.
       * Optionally emit `hunt.statusChanged` event and/or send owner notification if available.
     * Ensure function is idempotent: already closed hunts are ignored.
3. Add unit tests:

   * Eligible hunts are closed.
   * Ineligible hunts remain unchanged.
   * Multiple invocations do not cause errors.

**Testing**

* `npm run build:infra`
* `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
* `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (or stack where Lambda is defined).
* `npm run build:backend` and `npm test`.
* Manual:

  * Create an active hunt with `autoCloseAtEndTime=true` and `endTime` in the past.
  * Manually invoke `AutoCloseHuntsFunction` to verify status changes to `closed`.

**Acceptance Criteria**

* Auto-close Lambda and EventBridge rule are deployed and operational.
* Hunts with elapsed end time and auto-close enabled transition to `closed`.
* Handler is idempotent and robust to repeated invocations.
* Infra and backend builds/tests pass; changes are committed.

---

### Ticket 10.5: Backend – Rules Enforcement for Closed Hunts (Write Operations Blocked)

**Title**
Backend – Rules Enforcement for Closed Hunts (Write Operations Blocked)

**Features**

* Enforce closed state on all write operations that affect gameplay:

  * Submissions creation.
  * Judge decisions on submissions.
  * Team creation/join/leave.
  * Task modifications that impact scoring.
* Read-only operations remain allowed.

**Description**
This ticket ensures that once a hunt is closed (manually or auto), no further gameplay changes occur. Players cannot submit new entries, judges cannot alter pending submissions, and team compositions cannot be changed. Dashboards and other read views remain available.

**Infrastructure**

* No new AWS resources.
* Backend handler changes only.

**Steps (for Codex)**

1. Identify all write endpoints that depend on hunt state, including at a minimum:

   * `POST /hunts/{huntId}/tasks/{taskId}/submissions` (submission creation).
   * `POST /hunts/{huntId}/submissions/{submissionId}/decision` (judge decisions).
   * `POST /hunts/{huntId}/teams` (create team).
   * `POST /hunts/{huntId}/teams/{teamId}/join`.
   * `POST /hunts/{huntId}/teams/{teamId}/leave`.
   * If any “edit hunt tasks/rules” endpoints exist, consider enforcing them too once active or closed (at least closed).
2. For each handler:

   * Load hunt at the beginning.
   * If `hunt.status === 'closed'`:

     * Return 400 or 409 with a clear error message such as “Hunt is closed; this action is not allowed.”
3. Ensure read endpoints (scoreboard, stats, recap, album, favorites, etc.) remain accessible regardless of closed status.
4. Add unit tests per modified endpoint:

   * Closed hunt → write operation returns error.
   * Active hunt → write operation proceeds (assuming other conditions met).

**Testing**

* `npm run build:backend`
* `npm test` with new test cases.

**Acceptance Criteria**

* All gameplay-affecting write operations are blocked when hunts are closed.
* Read endpoints remain accessible.
* Error messages are clear and consistent across endpoints.
* Backend tests/build pass; changes are committed.

---

### Ticket 10.6: Backend – Activation Guardrails and Immutable Fields by Status

**Title**
Backend – Activation Guardrails and Immutable Fields by Status

**Features**

* Enforce configurable prerequisites before activation (e.g., at least one task).
* After activation:

  * Prevent destructive changes to key fields (e.g., removal of tasks that already have submissions, altering points heavily).
* After closure:

  * Prevent any changes to hunt configuration (tasks/rules).

**Description**
This ticket hardens the system by ensuring hunts are reasonably configured before activation and that configuration changes do not invalidate played data after activation or closure.

**Infrastructure**

* No new AWS resources.
* Backend logic and validations only.

**Steps (for Codex)**

1. Activation guardrails (extend Ticket 10.2 logic):

   * Confirm at least one task exists for the hunt.
   * Optionally: ensure `endTime` is not in the past if set.
2. Immutable fields after activation:

   * Identify endpoints that update hunt configuration or tasks, for example:

     * `PATCH /hunts/{id}` (updating name, description, timing).
     * `POST/PUT/PATCH /hunts/{huntId}/tasks` (create/update/delete task).
   * For hunts with `status === 'active'`:

     * Allow minor non-breaking changes (e.g., description), but prevent:

       * Deleting tasks that have at least one submission.
       * Changing task `points` if there are accepted submissions (or if any submission exists; choose and document rule).
   * For hunts with `status === 'closed'`:

     * Prevent all configuration and task changes (return 409).
3. Implement helper functions (e.g., `isConfigChangeAllowed(hunt, task, changeType)`) where useful.
4. Add unit tests for relevant update handlers:

   * Attempt to delete/update tasks for active hunts with/without submissions.
   * Attempt any configuration changes for closed hunts; ensure they are rejected.

**Testing**

* `npm run build:backend`
* `npm test`.

**Acceptance Criteria**

* Activation is allowed only when minimal configuration is present.
* After activation, dangerous changes (e.g., deleting tasks with submissions, changing points) are blocked.
* After closure, hunt configuration becomes fully read-only.
* All relevant tests pass; changes are committed.

---

### Ticket 10.7: Frontend – Lifecycle Controls for Owner and Judge (Activate & Close UI)

**Title**
Frontend – Lifecycle Controls for Owner and Judge (Activate & Close UI)

**Features**

* Controls in Owner and Judge UI to:

  * Activate a draft hunt.
  * Manually close an active hunt.
* Visual indicators of current status and next permitted action.
* Confirmation dialogs before destructive actions.

**Description**
This ticket adds explicit lifecycle controls within the React Native/Web client so Owners and Judges can manage hunt status. It integrates with the `activate` and `close` endpoints and ensures the UI reflects allowed actions per status.

**Infrastructure**

* Uses backend endpoints:

  * `POST /hunts/{id}/activate`
  * `POST /hunts/{id}/close`
* No new AWS resources.

**Steps (for Codex)**

1. In the Owner’s `HuntDetailScreen` (or equivalent):

   * Display current status (Draft / Active / Closed).
   * If status is `draft`:

     * Show “Activate Hunt” button.
     * On click:

       * Show confirmation modal summarizing what activation means.
       * Call `POST /hunts/{id}/activate`.
       * On success, refresh hunt data and status.
   * If status is `active`:

     * Show “Close Hunt” button.

       * On click, confirmation modal and then call `POST /hunts/{id}/close`.
   * If status is `closed`:

     * No lifecycle action buttons (read-only).
2. In Judge’s main hunt screen (`JudgeHuntScreen`):

   * If status is `active`:

     * Show “Close Hunt” button (only for judge, not for other roles).
     * Use same confirmation and `POST /hunts/{id}/close` call.
3. Ensure appropriate handling of errors:

   * Display error toasts if activation/closure fails (e.g., missing tasks, invalid state).
4. Ensure UI updates automatically after lifecycle changes (refetch hunt details).

**Testing**

* Unit/Component tests:

  * Mock `activate` and `close` endpoints.
  * Verify buttons appear/disappear per status and role.
  * Verify confirmation dialogs and API calls are made correctly.
* Manual:

  * As Owner, activate a draft hunt, then close it.
  * As Judge, close an active hunt.
  * Confirm UI reflects lifecycle transitions and blocked actions for closed hunts.

**Acceptance Criteria**

* Owners can activate drafts and close active hunts via UI.
* Judges can close active hunts via their UI.
* Closed hunts no longer show lifecycle action buttons.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 10.8: Frontend – Player Experience by Status (Draft, Active, Closed)

**Title**
Frontend – Player Experience by Status (Draft, Active, Closed)

**Features**

* Distinct player views depending on hunt status:

  * `draft`: cannot play yet; show “Not started” messaging.
  * `active`: full gameplay features enabled.
  * `closed`: no new submissions, but dashboards and recaps available.
* Clear messaging when actions are blocked due to status.

**Description**
This ticket ensures the player-facing UI responds correctly to the hunt lifecycle. Players must not be allowed to join or submit in closed hunts and should be informed when a hunt has not started or has ended, while still being able to view results.

**Infrastructure**

* Uses existing hunt data (`status`, `startTime`, `endTime`).
* No new endpoints or AWS resources.

**Steps (for Codex)**

1. In `PlayerHuntLobbyScreen` and related routes:

   * Use hunt status from backend (e.g., from `/hunts/{id}` or the join response).
2. For `status = 'draft'`:

   * Disable navigation to task browser and submission screens.
   * Show banner: “This hunt has not started yet. Please wait for the organizer to activate the game.”
3. For `status = 'active'`:

   * Allow normal game play:

     * Access to task browser and submission flow.
   * Ensure any previous client-side checks that assumed always-active now depend on status.
4. For `status = 'closed'`:

   * Disable access to submission creation:

     * Buttons to submit should be hidden or disabled with tooltip/message.
   * Provide access to:

     * Scoreboard / Hunt Dashboard.
     * Recap screen.
     * Favorites album.
   * Show banner: “This hunt is closed. You can still view results and highlights.”
5. Ensure behavior is consistent on web and native (no inconsistent states across platforms).

**Testing**

* UI tests (where present) or component tests:

  * For each status, verify which buttons are enabled/disabled and what messaging appears.
* Manual:

  * Simulate each status by using hunts in different lifecycle states and logging in as a player:

    * Draft → confirm cannot play.
    * Active → confirm full gameplay.
    * Closed → confirm read-only experience.

**Acceptance Criteria**

* Player UI accurately reflects lifecycle status and available actions.
* Attempting to start gameplay in draft or closed hunts is prevented at the UI level and surfaces clear messaging.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 10.9: Integration Tests – Lifecycle, Auto-Close, and Rules Enforcement

**Title**
Integration Tests – Lifecycle, Auto-Close, and Rules Enforcement

**Features**

* Integration tests covering:

  * `draft → active → closed` transitions via API.
  * EventBridge-driven auto-close behavior.
  * Submission and judge action rejection when status is closed.
* Uses local DynamoDB and invoked handlers.

**Description**
This ticket adds end-to-end backend integration coverage for the new lifecycle and rules. It verifies that hunts progress through valid transitions and that closed hunts strictly block write operations.

**Infrastructure**

* Uses existing integration test setup (local DynamoDB, etc.).
* No new AWS resources.

**Steps (for Codex)**

1. Create integration test file, e.g., `packages/backend/src/__tests__/integration/phase10.lifecycle.integration.test.ts`.
2. Scenario 1 – Manual lifecycle transitions:

   * Seed a `draft` hunt in DynamoDB (owner user).
   * Call `POST /hunts/{id}/activate` via handler.
   * Assert `status` becomes `active`.
   * Call `POST /hunts/{id}/close` as owner.
   * Assert `status` becomes `closed`.
3. Scenario 2 – Auto-close:

   * Seed an `active` hunt with `autoCloseAtEndTime = true` and `endTime` in the past.
   * Invoke `autoCloseHunts.handler`.
   * Assert `status` becomes `closed`.
4. Scenario 3 – Rules enforcement:

   * For a closed hunt:

     * Attempt to create a submission; expect error.
     * Attempt a judge decision; expect error.
     * Attempt team modifications; expect error.
   * Scoreboard and stats endpoints should still respond normally.
5. Use mocks for any external dependencies (e.g., SES, WebSocket management) to keep tests deterministic.

**Testing**

* Run `npm test` (or `npm run test:integration` if separated).
* Ensure integration tests pass consistently in a clean environment.

**Acceptance Criteria**

* Integration tests provide coverage for lifecycle transitions, auto-close, and closed-hunt enforcement.
* No regressions in existing integration suites.
* All tests pass; changes are committed.

---

### Ticket 10.10: Phase 10 End-to-End Verification and Documentation

**Title**
Phase 10 End-to-End Verification and Documentation

**Features**

* Validate lifecycle and rules enforcement end-to-end across backend and frontend.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for lifecycle and rules behavior.

**Description**
This ticket confirms that the game lifecycle and rules enforcement behave correctly from the perspective of Owners, Judges, and Players. It also updates system documentation to describe lifecycle behavior clearly for developers and administrators.

**Infrastructure**

* Uses deployed `AuthStack`, `DataStack`, `CoreStack`, `MediaStack`, `NotificationStack`.
* No new infrastructure beyond Phase 10 changes.

**Steps (for Codex)**

1. From the repository root, run:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack`
   * Deploy other stacks (`NotificationStack`, etc.) only if updated.
3. Manual end-to-end scenario:

   * Owner:

     * Creates a new hunt (draft) and configures tasks.
     * Attempts to start gameplay as a player (should see “not started” messaging).
     * Activates the hunt via UI.
   * Players:

     * Join the hunt and submit tasks while status is `active`.
   * Judge:

     * Judges submissions; scoreboard updates.
   * Closure:

     * Manually close as judge or owner using UI.
     * Verify:

       * Attempts to submit new tasks or change teams fail at UI and API.
       * Scoreboard, stats, album, recap remain accessible.
   * Auto-close:

     * Create a second hunt with `endTime` shortly in the future and `autoCloseAtEndTime=true`.
     * After end time, confirm `status` transitions to `closed` and rules are enforced.
4. Documentation:

   * Update or create `docs/hunt-lifecycle.md`:

     * Explain `draft → active → closed` states.
     * Detail who can activate and close (Owner, Judge).
     * Describe auto-close behavior and timing expectations.
   * Update `docs/rules-enforcement.md`:

     * Enumerate which operations are blocked when closed.
     * Describe immutability rules after activation and closure.
   * Update `README.md` with a short lifecycle summary and links to the above docs.

**Testing**

* All build and test commands must succeed.
* Manual E2E scenarios behave as specified without unexpected errors.

**Acceptance Criteria**

* Lifecycle and rules enforcement work coherently for all roles across backend and frontend.
* Auto-close, manual close, and status-based UI behavior are consistent.
* All builds, tests, and CDK deployments succeed.
* Documentation clearly describes lifecycle states and rules, and repository is clean with all changes committed.

