Below are **10 tickets for Phase 14: Final Integration, Performance & Release Readiness**.

Each ticket includes **Title, Features, Description, Infrastructure, Testing, Acceptance Criteria** and is self-contained so Codex can execute it independently.

---

### Ticket 14.1: End-to-End Test Harness & Seed Data Utilities

**Title**
End-to-End Test Harness & Seed Data Utilities

**Features**

* E2E test harness for web flows using Playwright or Cypress.
* Scripted setup/teardown of test data via backend APIs or dedicated “test seed” utilities.
* Common helpers for logging in as Owner, Judge, Player, and creating baseline hunts.

**Description**
This ticket establishes a repeatable, automated E2E test framework focused on the web client. It includes utilities for seeding data and performing login and navigation steps used by later E2E scenarios.

**Infrastructure**

* Frontend/backend test code only; no new AWS resources.
* Add `packages/e2e` (or similar) with test runner (Playwright or Cypress) and config.

**Steps (for Codex)**

1. Create `packages/e2e` with:

   * E2E framework (choose one consistent with repo usage, e.g., Playwright).
   * Config to run against:

     * Local dev (`http://localhost:...`) and/or staging URL (controlled via env).
2. Implement test helpers:

   * `loginAsOwner()`, `loginAsJudge()`, `loginAsPlayer()`.
   * Use test credentials or a test-auth shortcut mechanism already supported by backend (if exists).
3. Implement seed utilities:

   * Either:

     * Use direct backend APIs to create hunts, tasks, teams, and assignments for test purposes; or
     * Expose a test-only “seed” endpoint gated by environment (e.g., only in non-production).
   * Create functions:

     * `createTestHuntWithTasksAndTeams()`.
     * `assignJudgeToHunt()`.
4. Integrate with root scripts:

   * Add `e2e` script in root `package.json`:

     * `"e2e": "cd packages/e2e && npm test"` (or framework-specific command).

**Testing**

* Run `npm run e2e` against a local/staging environment with a simple smoke test:

  * Open app, log in as owner, verify main dashboard loads.
* Ensure E2E tests can be run repeatedly with clean setup/teardown.

**Acceptance Criteria**

* E2E harness exists under `packages/e2e` with basic smoke test.
* Helpers exist for logging in and seeding baseline hunts/teams/tasks.
* Root `npm run e2e` works and can be integrated into CI later.
* No changes required to AWS infrastructure; code builds and tests pass.

---

### Ticket 14.2: E2E Scenario – Owner-Created Hunt Through Analytics (Web)

**Title**
E2E Scenario – Owner-Created Hunt Through Analytics (Web)

**Features**

* Automated E2E test covering the full Owner flow on web:

  * Sign in.
  * Create hunt and tasks.
  * Configure rules, judge, and timing.
  * Activate and close hunt.
  * View analytics and exports.

**Description**
This ticket adds a comprehensive end-to-end test scenario for the Owner role in the web client. It validates that the Owner can fully configure and run a hunt through closure and inspect final analytics and export tools.

**Infrastructure**

* E2E tests only; no new AWS resources.
* Uses harness and seed utilities from Ticket 14.1.

**Steps (for Codex)**

1. In `packages/e2e`, add a test file `owner-flow.e2e.test.ts` (or equivalent):
2. Scenario steps:

   * Log in as a test Owner.
   * Create a new hunt:

     * Provide name, description, start/end time, rules.
   * Add several tasks with points, tags, and facets.
   * Designate a Judge (can be the Owner or another user).
   * Activate the hunt.
   * Simulate at least minimal participation:

     * Either via UI (if feasible) or via backend helpers to create sample submissions and scores.
   * Close the hunt manually.
   * Navigate to Analytics/Reports:

     * Verify summary metrics appear (teams, submissions, points).
   * Open Owner export tools:

     * Trigger an export and confirm UI shows “export pending” then “export complete”.
3. Ensure assertions check for:

   * Correct UI transitions (draft → active → closed).
   * Presence of analytics UI elements.
   * Presence of export UI elements (download links or status).

**Testing**

* `npm run e2e` (running at least this scenario).
* Verify tests pass on local/staging environment.

**Acceptance Criteria**

* Automated E2E test validates the complete Owner flow from hunt creation through analytics.
* Failures in Owner path cause the test to fail with clear assertions.
* E2E suite runs successfully and can be added to CI.
* No manual setup is required beyond configured test environment.

---

### Ticket 14.3: E2E Scenario – Multi-Team Player & Judge Flow (Web)

**Title**
E2E Scenario – Multi-Team Player & Judge Flow (Web)

**Features**

* Automated E2E test covering interactions among:

  * Owner (to set up).
  * Multiple Players (forming teams and submitting tasks).
  * Judge (reviewing, accepting/rejecting, favoriting).
* Validates leaderboard and favorites album behavior.

**Description**
This ticket adds an integrated test scenario that verifies cross-role interactions: Players submit tasks, Judges review them, and the system updates scores and favorites correctly.

**Infrastructure**

* E2E test only, using existing backend and frontend.
* No new AWS resources.

**Steps (for Codex)**

1. In `packages/e2e`, add `multi-team-judge-flow.e2e.test.ts` (or similar).
2. Scenario outline:

   * Use seed helpers or UI flows to:

     * Create a hunt with tasks, teams, and Judge assigned.
   * Log in as Player A:

     * Join or create Team A.
     * Submit a task with media (can simulate via placeholder upload if file upload UI is already tested).
   * Log in as Player B:

     * Join or create Team B.
     * Submit at least one overlapping task and one unique task.
   * Log in as Judge:

     * Open Judge view (swipable interface).
     * Accept some submissions and reject others; add comments.
     * Heart a subset of accepted submissions.
   * Verify as Players:

     * Players see accepted/rejected status and comments for their submissions.
   * Verify scoreboard and album:

     * Scoreboard reflects points per team.
     * Favorites album shows hearted submissions.
3. Implement assertions verifying:

   * Team totals are correct given the decisions.
   * Album contains exactly the favorited submissions.
   * Status badges on submissions match judge decisions.

**Testing**

* Run `npm run e2e` including this scenario.
* Verify deterministic behavior on repeated runs (isolated test data).

**Acceptance Criteria**

* E2E verifies full Owner–Player–Judge interaction loop on web.
* Leaderboard and album reflect judged outcomes correctly.
* Submissions and statuses are consistent across UI elements.
* E2E suite runs without flaky failures.

---

### Ticket 14.4: Backend Performance Test Harness for Critical Endpoints

**Title**
Backend Performance Test Harness for Critical Endpoints

**Features**

* A repeatable load-test harness (e.g., k6 or Artillery) targeting key endpoints:

  * Submission creation.
  * Judge decision.
  * Scoreboard/leaderboard retrieval.
* Configurable load profile (concurrent users, duration).

**Description**
This ticket introduces a performance test harness so we can evaluate backend behavior under realistic load. It focuses on endpoints most likely to be stressed during live events.

**Infrastructure**

* Local or staging environment only.
* No new AWS resources.
* Add load test scripts under `tools/perf` or similar.

**Steps (for Codex)**

1. Choose tool (e.g., k6). Add configuration under `tools/perf`:

   * A script `perf-submissions.js`:

     * Simulates multiple users submitting tasks concurrently.
   * A script `perf-judge.js`:

     * Simulates a judge processing submissions.
   * A script `perf-leaderboard.js`:

     * Simulates frequent scoreboard requests.
2. Use environment variables for the base URL and test tokens.
3. Each script:

   * Loads seeds (e.g., pre-created hunt with tasks/teams).
   * Authenticates using test accounts.
   * Runs load patterns (e.g., ramp-up from 1 → N virtual users over M minutes).
4. Add root script:

   * `"perf:test": "k6 run tools/perf/perf-submissions.js && k6 run tools/perf/perf-judge.js && k6 run tools/perf/perf-leaderboard.js"` (or similar).

**Testing**

* Execute `npm run perf:test` against staging:

  * Verify scripts run successfully and collect metrics (latency, error rate).
* Confirm load test does not overwhelm staging limits (keep modest).

**Acceptance Criteria**

* A performance harness exists and can be run on demand.
* It targets at least submissions, judge decisions, and leaderboard endpoints.
* Harness is configurable and documented for staging use.
* No code regressions; build/test still pass.

---

### Ticket 14.5: Performance Optimization & Regression Tests

**Title**
Performance Optimization & Regression Tests

**Features**

* Analyze results from the performance harness.
* Apply targeted optimizations to backend hot paths (e.g., query patterns, pagination).
* Add regression tests/guards for optimized code paths.

**Description**
This ticket uses outputs from Ticket 14.4 to find and fix performance bottlenecks. Typical changes may include improving DynamoDB queries, adding indexes, reducing N+1 queries, and tightening payloads. It also adds tests to prevent performance regressions.

**Infrastructure**

* Possible CDK updates to DynamoDB indexes or API timeouts.
* Backend code changes only.

**Steps (for Codex)**

1. Analyze performance test results:

   * Identify endpoints with high latency or error rates.
   * Inspect backend handlers and repositories for inefficient patterns.
2. Apply optimizations, for example:

   * Replace full table scans with queries on GSI/LSI.
   * Add suitable GSIs (if needed) to `Submissions`, `TeamScores`, or others.
   * Limit response sizes with pagination or trimmed payloads.
   * Cache static data in-process (within a single Lambda invocation) if beneficial.
3. Update CDK infra if adding indexes:

   * Modify DynamoDB tables and deploy to dev/staging.
4. Add tests:

   * Unit tests to ensure logic is preserved.
   * Optional micro-benchmarks (if appropriate) to ensure complexity remains acceptable.
5. Re-run `npm run perf:test` and compare metrics.

**Testing**

* `npm run build:infra`, `cdk synth`, `cdk deploy` to dev/staging (as needed).
* `npm run build:backend` and `npm test`.
* `npm run perf:test`:

  * Confirm latency improves or at least does not degrade.
  * Confirm error rates remain low.

**Acceptance Criteria**

* Identified bottlenecks are addressed with code or schema changes.
* Performance metrics for critical endpoints are acceptable for expected initial load.
* New tests protect optimized code paths from regressions.
* All builds/tests/deploys pass.

---

### Ticket 14.6: Cross-Platform UX Bug Sweep & Polishing

**Title**
Cross-Platform UX Bug Sweep & Polishing

**Features**

* Bug triage from E2E and manual tests across iOS, Android, Web.
* Fix visual and interaction issues:

  * Misaligned layouts, clipping, navigation glitches.
  * Inconsistent labels or button states.
* Ensure no critical UX defects remain for release.

**Description**
This ticket focuses on closing outstanding UX gaps discovered during integration and performance testing. It ensures consistent behavior and polish across all platforms and roles.

**Infrastructure**

* Frontend-only changes (React Native / Web).
* No new AWS resources.

**Steps (for Codex)**

1. Collect UX issues:

   * From E2E failures and manual testing notes.
   * From any existing issue tracker.
2. Prioritize:

   * Critical: Blocking flows or causing major confusion.
   * High: Frequent annoyances or visual bugs.
   * Medium/Low: Minor cosmetic issues (fix as time permits).
3. Implement fixes, examples:

   * Ensure consistent padding and typography on key screens (dashboard, album, judge view, team selection).
   * Fix any broken back-button behaviors or tab routing.
   * Align role-based visibility for actions (no hidden-but-interactive components).
4. Ensure changes preserve responsive behavior and accessibility attributes from prior phases.

**Testing**

* `npm run build:frontend` and `npm test` (component/snapshot tests).
* Manual passes on:

  * iOS simulator, Android emulator, and Web:

    * Owner, Judge, Player flows.
    * Key screens: Hunt creation, Task Browser, Submissions, Judge view, Dashboard, Album, Analytics.

**Acceptance Criteria**

* No known critical UX defects remain for the release.
* Navigation and layouts are consistent across platforms and roles.
* All existing automated frontend tests pass.
* Changes are committed with clear notes.

---

### Ticket 14.7: Production Environment CDK Stacks & Deployment Validation

**Title**
Production Environment CDK Stacks & Deployment Validation

**Features**

* Separate production CDK stacks or environment configuration.
* Verified `cdk deploy` to production account/region.
* Clear separation of staging vs production resources (tables, buckets, APIs).

**Description**
This ticket prepares and validates the production infrastructure. It ensures that production stacks are configured correctly, deploy cleanly, and remain clearly separate from staging/dev environments.

**Infrastructure**

* CDK changes:

  * Production-specific stack names or `env` configuration.
* AWS account/region configuration for production.

**Steps (for Codex)**

1. In `packages/infra`, add or adjust stacks to support production:

   * Ensure `env` configuration for production account/region (e.g., account ID, region).
   * Use environment-specific naming for resources (e.g., `HuntsTable-Prod`, `MediaBucket-Prod`).
2. Confirm environment separation:

   * Production uses different DynamoDB tables, S3 buckets, API Gateway stages than staging.
3. Deploy to production:

   * Use `cdk deploy` with production profile or OIDC role (as per CI/deploy design).
   * Deploy required stacks (e.g., `DataStackProd`, `CoreStackProd`, `MediaStackProd`).
4. Post-deploy validation:

   * Confirm API endpoint is reachable.
   * Verify that environment variables and secrets for production are configured (auth providers, domain, etc.).

**Testing**

* `npm run build:infra`, `cdk synth` for production env.
* `cdk deploy` to production environment.
* Manual:

  * Confirm CloudFormation stacks are in `CREATE_COMPLETE` state.
  * Hit the production API health endpoint or simple route to verify basic operation.

**Acceptance Criteria**

* Production environment stacks are defined, synthesized, and deployed successfully.
* Production resources are isolated from staging/dev.
* Production endpoint is reachable and returns expected responses for basic calls.
* Infra builds/tests pass; configuration is committed.

---

### Ticket 14.8: Production Configuration & Secrets Verification

**Title**
Production Configuration & Secrets Verification

**Features**

* Verify all required environment variables and secrets are set in production (and CI if applicable).
* Confirm OAuth providers (Apple, Google, others) are correctly configured for the production domain.
* Sanity-check logging, metrics, and alarms in production.

**Description**
This ticket ensures that the production environment is fully configured for real users: auth providers, environment variables, and secret management are all validated, and observability works.

**Infrastructure**

* No new resources; configuration and secret management only.
* Uses AWS SSM/Secrets Manager or equivalent for secrets.

**Steps (for Codex)**

1. Enumerate required configuration and secrets:

   * API keys and secrets for:

     * Apple Sign-In.
     * Google Sign-In.
     * Any other OAuth providers.
   * Application configuration:

     * Base URLs, allowed origins, environment flags.
     * Any third-party integrations.
2. For production environment:

   * Confirm secrets are stored in Secrets Manager or SSM Parameters, not in code.
   * Confirm Lambda and other services read from the correct keys/paths.
3. Validate OAuth:

   * Confirm redirect URIs and bundle IDs/Android package names match production hosts and app IDs.
   * Test login flows against production for Apple/Google sign-in with test accounts.
4. Observability sanity check:

   * Confirm production CloudWatch logs show structured logs with correlation IDs.
   * Confirm production metrics and alarms appear and are in `OK` state under normal operation.

**Testing**

* Manual tests in production:

  * Sign in flows with Apple, Google, and other configured providers.
  * Basic Owner/Player actions (create hunt, join, submit test tasks, judge).
* Confirm no configuration-related errors appear in logs.

**Acceptance Criteria**

* All required production secrets are present and correctly referenced.
* OAuth sign-in works reliably in production.
* Logging and alarms confirm that production environment behaves as expected.
* No secrets are exposed in code or logged.

---

### Ticket 14.9: Documentation Completion – User Guides & Developer Docs

**Title**
Documentation Completion – User Guides & Developer Docs

**Features**

* Completed user-facing documentation:

  * Owner guide.
  * Judge guide.
  * Player guide.
* Completed technical documentation:

  * `docs/architecture.md`.
  * `docs/domain-model.md`.
  * `docs/api-contracts.md`.
  * Updated `README.md` for quickstart and deployment.

**Description**
This ticket finalizes documentation for both end users and developers. It ensures that organizers, judges, and players know how to use the app, and that developers can understand the architecture, domain model, and APIs.

**Infrastructure**

* Documentation files only; no code changes required for functionality.

**Steps (for Codex)**

1. User guides:

   * `docs/user-guide-owner.md`:

     * How to sign in, create hunts, configure tasks and rules, assign judges, monitor gameplay, use analytics, use exports and owner tools.
   * `docs/user-guide-judge.md`:

     * How to sign in, access judge mode, review submissions, accept/reject with comments, heart favorites, understand dashboards.
   * `docs/user-guide-player.md`:

     * How to join hunts, form or join teams, browse tasks, submit media, see results, view album and recap.
2. Developer docs:

   * `docs/architecture.md`:

     * High-level system overview: frontend, backend, infra stacks, data flows.
   * `docs/domain-model.md`:

     * Entities: Hunt, Task, Team, Player, Judge, Submission, Score, Flags, Adjustments, etc., and relationships.
   * `docs/api-contracts.md`:

     * Summary of main REST endpoints, request/response formats, auth requirements.
3. Update `README.md`:

   * Clear quickstart (local dev), test, and deploy instructions.
   * Links to the more detailed docs above.

**Testing**

* Run `npm run lint` and `npm run test` to ensure no code regressions.
* Manual review of documentation for clarity and correctness.

**Acceptance Criteria**

* User guides comprehensively explain how each role uses the system.
* Developer docs clearly describe architecture, domain model, and key API contracts.
* README gives a concise entry point for new contributors.
* Documentation lives in the repo and is up-to-date with the current implementation.

---

### Ticket 14.10: Final Release Verification, Tagging & Production Smoke Test

**Title**
Final Release Verification, Tagging & Production Smoke Test

**Features**

* Execute full automated test suite (unit, integration, E2E) as release-gate.
* Manual smoke tests across iOS, Android, and Web in production environment.
* Create a version tag and release notes.

**Description**
This ticket performs the final verification to declare the application ready for release. It runs all automated tests, conducts smoke tests on all platforms against production, and tags the repository with a version and release notes.

**Infrastructure**

* Uses existing CI/CD and production environment.
* No new AWS resources.

**Steps (for Codex)**

1. Automated test gate:

   * Run from root:

     * `npm run lint`
     * `npm run test`
     * `npm run build`
     * `npm run e2e` (against staging or controlled environment).
   * Confirm CI pipeline also runs successfully for the release branch or commit.
2. Production smoke test:

   * Web:

     * Access production URL.
     * Sign in as Owner, run a small test hunt end-to-end (Owner, Player, Judge).
   * iOS:

     * Run production build or TestFlight build.
     * Execute basic Owner/Player flows.
   * Android:

     * Run production build or Play test track.
     * Execute basic Owner/Player flows.
3. Tagging & release notes:

   * Create a semantic version tag (e.g., `v1.0.0`).
   * Add `CHANGELOG.md` entry or GitHub Release:

     * Summarize major features by phase.
     * Note any known limitations.

**Testing**

* All automated tests must pass.
* Manual smoke tests must complete without critical issues.
* CI must show green for tagged commit.

**Acceptance Criteria**

* All tests (unit, integration, E2E) pass on the release commit.
* Production smoke tests on iOS, Android, and Web succeed for core flows.
* Release tag and notes exist in the repository (and/or GitHub Releases).
* System is considered production-ready for real-world use.

