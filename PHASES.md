Below is a 14-phase plan that Codex can follow. Each phase has the requested sections and assumes future tickets will break the work down further.

---

## Phase 1: Basic Application Creation & Monorepo Setup

**Title**
Basic Application Creation & Monorepo Setup

**Features**

* Initialize Git repository and Node.js/TypeScript monorepo.
* Create `frontend`, `backend`, and `infra` packages.
* Configure shared TypeScript base configuration, linting, and formatting.
* Scaffold an Expo React Native app (iOS, Android, Web).
* Scaffold a minimal Node.js/TypeScript backend.
* Add basic documentation skeleton (`README.md`, `docs/`).

**Description**
This phase establishes the foundational structure of the project. Codex will create a monorepo with separate packages for the frontend (Expo React Native), backend (Node.js/TypeScript), and infrastructure (AWS CDK in TypeScript). This includes shared tooling such as TypeScript configuration, ESLint, and Prettier. The goal is to have a single command to run the frontend in Expo and a simple backend entrypoint that returns a health response. No AWS integration occurs yet; everything runs locally.

**Infrastructure**

* No AWS resources yet.
* Basic `infra` package created with CDK app entrypoint and placeholder stack definitions (no deploy).
* NPM/Yarn workspaces configured at the root to manage all packages.

**Testing**

* Configure Jest in all packages (even if only trivial tests exist).
* Add one trivial unit test per package (e.g., “health” test) to verify testing setup.
* Ensure `npm test` or equivalent root script runs tests across packages.

**Acceptance Criteria**

* Monorepo exists with `packages/frontend`, `packages/backend`, `packages/infra`.
* TypeScript, ESLint, and Prettier configured and runnable from the root.
* Expo app runs locally on web and at least one native target (simulator/emulator).
* Backend can run locally and respond to a simple `/health` endpoint.
* Jest tests run and pass in all packages with a single root command.

---

## Phase 2: Core Infrastructure Bootstrap (AWS & CDK)

**Title**
Core Infrastructure Bootstrap (AWS & CDK)

**Features**

* CDK bootstrap for target AWS account and region.
* Base CDK stacks: `CoreStack` or equivalent minimal stack.
* Create shared parameters/outputs and environment configuration.
* Deploy a minimal API Gateway + Lambda “health” endpoint.
* Configure a basic S3 bucket for static assets or future frontend hosting.

**Description**
This phase connects the repository to AWS using CDK. It introduces a minimal deployed system so later phases can extend the infrastructure incrementally. Codex will define a CDK app and a minimal set of stacks, deploy a Lambda-based health endpoint behind API Gateway, and create an S3 bucket for future use (e.g., static hosting or media). This proves that CDK deployment works and that basic networking and permissions are configured correctly.

**Infrastructure**

* `infra` package defines:

  * CDK app entrypoint.
  * `CoreStack` (or similarly named) that creates:

    * One S3 bucket.
    * One Lambda function with a simple health handler (Node.js/TypeScript).
    * API Gateway with `/health` route pointing to the Lambda.
* CDK bootstrap executed for `AWS_PROFILE=codex-sandbox`, `AWS_REGION=us-east-1`.
* Environment configuration mechanism (e.g., `.env` or `config/` files) created for referencing API base URL in frontend and backend.

**Testing**

* Unit tests for the Lambda health handler.
* CDK snapshot tests or minimal assertion tests to validate key resources exist.
* Manual verification:

  * Deploy CDK.
  * Hit the `/health` endpoint via API Gateway URL and confirm expected response.

**Acceptance Criteria**

* `npx cdk deploy --all` successfully deploys minimal infrastructure.
* `/health` endpoint responds from AWS with the expected JSON payload.
* S3 bucket visible in AWS console.
* Infrastructure code covered by basic tests and passing in CI/Test script.

---

## Phase 3: Authentication & User Management (Cognito, Apple, Google)

**Title**
Authentication & User Management

**Features**

* Cognito User Pool creation.
* Federation with Apple and Google for sign-in.
* Backend JWT verification middleware.
* Frontend authentication flow with platform-appropriate buttons.
* Minimal user profile storage in backend.

**Description**
This phase introduces real authentication for the application. Codex will configure Cognito User Pool and integrate Apple Sign-in (for iOS), Google Sign-in (for Android and Web), and optionally additional OAuth providers. The frontend will obtain tokens and pass them to the backend. The backend will verify Cognito JWTs, identify the caller, and persist a basic `User` record.

**Infrastructure**

* `AuthStack`:

  * Cognito User Pool and User Pool Clients (web and native).
  * Identity providers for Apple and Google.
  * Callback/redirect URLs configured for web and native flows.
* IAM roles for Lambda functions to read Cognito configuration if needed.
* Output of Cognito IDs and endpoints for use by frontend and backend.

**Testing**

* Backend unit tests for JWT verification middleware.
* Automated tests for “unauthorized” vs “authorized” responses on a secured test endpoint.
* Manual sign-in verification:

  * iOS: Apple Sign-in.
  * Android/Web: Google Sign-in.
* Tests for creating or updating a `User` record on first login.

**Acceptance Criteria**

* Users can sign in with Apple on iOS and Google on Android/Web.
* Backend can verify tokens and extract `userId` for authenticated requests.
* Basic `/me` endpoint returns authenticated user profile (created on first login).
* Unauthorized requests to protected endpoints are rejected with proper error response.

---

## Phase 4: Domain Model & Data Layer (DynamoDB)

**Title**
Domain Model & Data Layer Implementation

**Features**

* Define and implement DynamoDB tables for core entities.
* Create TypeScript domain models and repository layer.
* Implement basic CRUD for Hunts in backend (without full UI yet).
* Establish indexing strategies (GSI/LSI) for key access patterns.

**Description**
This phase implements the core data layer. Codex will create DynamoDB tables for users, hunts, tasks, teams, team memberships, judges, submissions, and scores (or the subset needed initially). A repository layer will abstract DynamoDB access and enforce type safety. Minimal API endpoints will expose basic Hunt CRUD operations to validate the data layer. This sets the foundation for all future business logic.

**Infrastructure**

* `DataStack`:

  * DynamoDB tables:

    * `Users`
    * `Hunts`
    * `Tasks`
    * `Teams`
    * `TeamMemberships`
    * `JudgeAssignments`
    * `Submissions`
    * `TeamScores` (optional initial table or computed later)
  * Define primary keys and secondary indexes as needed (e.g., by `huntId`, `teamId`).
* Expose table names as environment variables to backend Lambdas.

**Testing**

* Unit tests for repository functions (using local DynamoDB or mocks).
* Tests for Hunt CRUD endpoints:

  * Create, read, list, update, delete (or soft-delete).
* Validation tests to ensure required attributes are enforced.

**Acceptance Criteria**

* DynamoDB tables deployed via CDK and visible in AWS console.
* Repository layer functions correctly in unit tests.
* Simple API endpoints for Hunt CRUD work against real DynamoDB in the sandbox environment.
* Domain models documented in `docs/domain-model.md` and kept in sync with implementation.

---

## Phase 5: Hunt & Task Management (Owner Flows)

**Title**
Hunt & Task Management (Owner Flows)

**Features**

* Owner can create and manage Hunts via UI.
* Owner can create, edit, delete Tasks within a Hunt.
* Support tags and facets on tasks.
* Hunt list and detail screens on frontend.

**Description**
This phase surfaces the Hunt and Task data model through the frontend for Owners. Owners can create hunts, define their basic configuration, and create tasks with points, tags, and facets. The UI will allow viewing and editing hunts and their associated tasks. This is the first substantive business functionality visible in the app.

**Infrastructure**

* Extend `ApiStack` with endpoints:

  * `POST /hunts`, `GET /hunts`, `GET /hunts/{id}`, `PATCH /hunts/{id}`, `DELETE /hunts/{id}`.
  * `POST /hunts/{id}/tasks`, `GET /hunts/{id}/tasks`, `PATCH /tasks/{id}`, `DELETE /tasks/{id}`.
* No new AWS resources beyond those added in earlier phases; reuse DynamoDB tables.

**Testing**

* Backend tests:

  * Authorization: only hunt owners can modify their hunts and tasks.
  * Validation of hunt configuration (team size limits, required fields).
* Frontend tests:

  * Component tests for hunt list and edit forms.
  * Integration tests for creating a hunt and seeing it appear in the list.

**Acceptance Criteria**

* Authenticated user can create hunts via UI and see them listed.
* Owner can add tasks with points, tags, and facet values.
* Owner can update and delete tasks and hunts.
* Other authenticated users can see hunts they own or participate in, but cannot edit hunts owned by others.

---

## Phase 6: Team Management & Role Enforcement

**Title**
Team Management & Role Enforcement (Owner & Player)

**Features**

* Create and manage teams within a Hunt.
* Join team or play solo within allowed configuration.
* Assign and manage Judges for a Hunt.
* Enforce: Judge cannot be a Player; Owner can be Judge or Player but not both.

**Description**
This phase adds teams and judge assignments. Players can join a Hunt using a game code, then create or join a team within configured team size limits. Owners can assign judges from the pool of users in a Hunt (including themselves), and when assigned, that user is removed from any team in that Hunt. The backend enforces all role constraints and prevents invalid transitions.

**Infrastructure**

* Extend API endpoints:

  * `POST /hunts/{id}/join` (using game code).
  * `POST /hunts/{id}/teams`, `GET /hunts/{id}/teams`.
  * `POST /teams/{id}/join`, `POST /teams/{id}/leave`.
  * `POST /hunts/{id}/judges`, `DELETE /hunts/{id}/judges/{userId}`.
  * `GET /hunts/{id}/roles` (returns the user’s role(s) in that hunt).
* No additional AWS resources; use existing tables and indexes.

**Testing**

* Backend tests:

  * Enforce team size limits (min/max).
  * Prevent user from being both Judge and Player in the same hunt.
  * Correct behavior when owner becomes a Judge (auto-remove from team).
* Frontend tests:

  * UI flows for joining via game code and selecting/creating a team.
  * Judge assignment UI for owners.
* Manual tests verifying transitions:

  * Player → Judge, Judge → Player, Team member changes.

**Acceptance Criteria**

* Users can join a hunt via game code.
* Players can create and join teams within configured limits.
* Owners can assign judges from the list of users; assigned judges are removed from any team in that hunt.
* Backend rejects operations that violate role constraints.
* Frontend reflects current role correctly (Owner/Judge/Player) in the UI.

---

## Phase 7: Submission & Media Handling

**Title**
Submission & Media Handling (Player Media Uploads)

**Features**

* Players submit photo/video + notes for a task.
* Backend issues pre-signed S3 URLs for media upload.
* Submissions stored with `pending` status.
* Basic submission list for the submitting team.

**Description**
This phase introduces the core gameplay loop for Players: submitting media as proof of task completion. Players select a task, capture or upload a photo or video, optionally add notes, and send the submission. The backend stores submission metadata and uses S3 for media storage. All submissions start as `pending` until a judge reviews them.

**Infrastructure**

* Extend `DataStack`:

  * S3 media bucket (if not already created specifically for media).
  * Optional separation: one bucket for raw media, one for thumbnails.
* Extend `ApiStack`:

  * `POST /hunts/{huntId}/tasks/{taskId}/submissions` → returns pre-signed S3 upload URL and creates a `pending` submission record.
  * `GET /hunts/{huntId}/submissions` (filtered by team or user as needed).
* IAM policies:

  * Grant Lambdas permission to generate pre-signed URLs and read/write to S3 buckets.

**Testing**

* Backend tests:

  * Validate that only team members submit for their team.
  * Submission records created correctly and linked to user, team, hunt, task.
  * Pre-signed URL generation tested with stubbed S3 client.
* Frontend tests:

  * Components for capture/upload UI (mocking camera/gallery).
  * Integration tests for end-to-end submission creation (excluding actual upload to S3, which can be mocked).

**Acceptance Criteria**

* Players can choose a task and create a submission with media and notes.
* Media gets uploaded to S3 using pre-signed URL.
* Submission record in DynamoDB is `pending` and references media URL.
* Players can view a list of their team’s submissions and see their status (`pending` at this phase).

---

## Phase 8: Judging Workflow & Swipe Interface

**Title**
Judging Workflow & Swipe Interface

**Features**

* Judge can view queue of `pending` submissions.
* Swipe-based interface to accept/reject submissions.
* Accept/reject with optional comments.
* Judge history view for previous decisions.

**Description**
This phase implements the judge experience. Judges see a queue of pending submissions for their hunt, displayed in a swipeable (“Tinder-like”) card view that shows media, task details, team, and notes. Swiping right or tapping an accept button marks the submission as `accepted`; swiping left or tapping a reject button marks it as `rejected`. Judges can also add a comment to their decision, and can browse a history list of accepted and rejected submissions.

**Infrastructure**

* Extend API endpoints:

  * `GET /hunts/{id}/submissions/pending` (judge-only view, filterable).
  * `POST /submissions/{id}/accept` (with optional comment).
  * `POST /submissions/{id}/reject` (with optional comment).
  * `GET /hunts/{id}/submissions/judged` for history and filters.
* No new AWS resources required.

**Testing**

* Backend tests:

  * Only judges for a hunt can access judge endpoints.
  * Proper state transitions: `pending` → `accepted` or `rejected`.
  * Comments persisted correctly.
* Frontend tests:

  * Component tests for swipe card UI and fallback button-based controls.
  * Integration tests verifying that decisions update submission status and UI queues.

**Acceptance Criteria**

* Judges can see a queue of pending submissions for hunts they judge.
* Swipe gestures or buttons can accept or reject submissions.
* Accepted and rejected submissions include judge, timestamp, and optional comment.
* Judges can review a history list of their decisions.

---

## Phase 9: Scoring, Favorites & Album, Leaderboard

**Title**
Scoring, Favorites & Album, Leaderboard

**Features**

* Enforce scoring rules on acceptance (points awarded to team).
* Implement task constraints (per-team and per-hunt completion limits).
* Judge can “favorite” submissions.
* Album view for favorite submissions.
* Leaderboard and basic stats dashboard.

**Description**
This phase turns judging decisions into scores and visualizes game progress. When a submission is accepted, the backend awards points to the team while enforcing task constraints (e.g., tasks that only one team can complete, or limited completions per team). Judges can mark submissions as favorites, which appear in a shared album view. A dashboard shows team scores and basic summary statistics.

**Infrastructure**

* Backend logic:

  * Score computation:

    * Either maintain `TeamScores` table or compute from accepted submissions.
  * Constraint enforcement:

    * Check existing accepted submissions for the task/team before accepting.
* API endpoints:

  * `POST /submissions/{id}/favorite` and `DELETE /submissions/{id}/favorite`.
  * `GET /hunts/{id}/album` (list of favorite submissions).
  * `GET /hunts/{id}/leaderboard` (team scores).
  * `GET /hunts/{id}/stats` (task submission and acceptance metrics).
* No new AWS resources required.

**Testing**

* Backend tests:

  * Enforce `maxCompletionsPerTeam` and `maxTeamsCanComplete`.
  * Ensure repeated accept operations do not double-count points.
  * Validate favorites logic and queries.
* Frontend tests:

  * Leaderboard rendering and sorting.
  * Album grid rendering.

**Acceptance Criteria**

* Accepting a submission awards points according to task rules.
* Backend blocks acceptance when constraints are violated and returns appropriate errors.
* Leaderboard screen shows correct team scores and updates after new acceptances.
* Favorites (heart) toggle works, and album displays hearted submissions.

---

## Phase 10: Game Lifecycle & Rules Enforcement

**Title**
Game Lifecycle & Rules Enforcement

**Features**

* Hunt status progression: `draft → active → closed`.
* Time-based auto-close when `endTime` and `autoCloseAtEndTime` are set.
* Owner or Judge can manually close a hunt.
* Submissions disabled when hunt is closed.

**Description**
This phase adds a full game lifecycle. Hunts start as drafts while configured, then become active for gameplay, and finally close at a scheduled time or when manually closed by Owner/Judge. Once closed, the system rejects new submissions while leaving dashboards, leaderboards, and albums readable.

**Infrastructure**

* Extend backend:

  * `POST /hunts/{id}/activate`.
  * `POST /hunts/{id}/close`.
  * Logic that checks `Hunt.status` and `endTime` on relevant operations.
* Optionally:

  * Scheduled job or event (CloudWatch Events / EventBridge) to periodically check hunts and auto-close them.

**Testing**

* Backend tests:

  * Mutations rejected when hunt is `closed`.
  * Transition rules: `draft` → `active`, `active` → `closed` only.
  * Auto-close behavior for `endTime` with `autoCloseAtEndTime=true`.
* Frontend tests:

  * UI should block submission actions and show clear messaging when hunt is closed.

**Acceptance Criteria**

* Owners can activate and close hunts explicitly.
* Hunts auto-close near or at configured end time if auto-close is enabled.
* Players cannot create submissions for closed hunts.
* Dashboard, leaderboard, and album remain accessible after closure.

---

## Phase 11: Cross-Platform UX & Navigation Polish

**Title**
Cross-Platform UX & Navigation Polish

**Features**

* Navigation and layout work smoothly on iOS, Android, and Web.
* Consistent role-aware navigation (tabs/sections visible only when relevant).
* Responsive layout adjustments for web.
* Basic accessibility improvements.

**Description**
This phase focuses on user experience, ensuring the app feels coherent and usable on all platforms. Navigation flows will be refined, roles will drive which tabs and actions are visible, and the web layout will adapt to larger screens (e.g., multi-column layouts for leaderboard and album). Accessibility improvements such as proper labels, focus management, and basic contrast checks will also be introduced.

**Infrastructure**

* No new AWS resources.
* Frontend-only refinements:

  * Expo Router or React Navigation configuration adjustments.
  * Web-specific layout components where appropriate.

**Testing**

* Frontend tests:

  * Snapshot tests for key screens in different roles (Owner, Judge, Player).
  * Role-based rendering tests: verifying correct tabs and actions for each role.
* Manual verification:

  * iOS: verify navigation and layout.
  * Android: verify navigation and layout.
  * Web: verify responsive behavior and role-appropriate navigation.

**Acceptance Criteria**

* Navigation is intuitive and consistent across platforms.
* Users only see actions relevant to their role in a hunt.
* Web layout is responsive and usable on desktop and mobile browsers.
* Basic accessibility support (labels, focus behavior) is present on main flows.

---

## Phase 12: Analytics, Reporting & Owner Tools

**Title**
Analytics, Reporting & Owner Tools

**Features**

* Owner-facing hunt summary views.
* Per-team breakdown pages.
* Optional export (CSV/JSON) of hunt data.
* Light-weight admin-style tools for owners (e.g., correcting scores).

**Description**
This phase enhances the product for frequent organizers and serious events (corporate, educational, etc.). Owners will see more detailed analytics: participation metrics, task difficulty (acceptance rates), team performance over time, and highlight listings. Export capabilities allow owners to extract data for external reporting. Basic corrective tools allow owners to adjust scores or flag problematic submissions when necessary.

**Infrastructure**

* Extend API:

  * `GET /hunts/{id}/report` (summary report).
  * `GET /hunts/{id}/teams/{teamId}/report` (team-level details).
  * `GET /hunts/{id}/export` (CSV/JSON data export).
  * Optional endpoints for owner-admin adjustments (e.g., `POST /submissions/{id}/adjustScore`).
* No new AWS resources, unless a reporting-specific table or S3 export location is introduced.

**Testing**

* Backend tests:

  * Correct aggregation logic for reports and exports.
  * Authorization checks: only hunt owners can see full reports and exports.
* Frontend tests:

  * Rendering of summary views and per-team reports.

**Acceptance Criteria**

* Owners can view a detailed summary of each hunt, including participation and task metrics.
* Owners can see per-team breakdowns of points and submissions.
* Owners can export hunt data in CSV/JSON format.
* Any score or data correction tools (if implemented) are protected and audited.

---

## Phase 13: CI/CD, Observability & Security Hardening

**Title**
CI/CD, Observability & Security Hardening

**Features**

* Basic CI pipeline (build, lint, test, possibly deploy).
* Logging and tracing in backend Lambdas.
* Metrics and alarms for key resources (API errors, latency).
* Review and tighten IAM policies and security settings.

**Description**
This phase makes the system maintainable in real-world conditions. Codex will set up CI workflows (e.g., GitHub Actions) for building, linting, and testing the entire monorepo and optionally deploying the app to a staging environment. Logging and metrics will be configured for backend Lambdas and API Gateway. IAM policies and public access configurations will be reviewed and narrowed to least privilege where possible.

**Infrastructure**

* CI/CD:

  * `.github/workflows/ci.yml` (build, test, lint).
  * Optionally `.github/workflows/deploy.yml` for staging/prod deployments.
* Observability:

  * CloudWatch log configuration.
  * Metrics and alarms (e.g., 5xx error rate, high latency).
* Security:

  * Review and refine IAM roles and policies.
  * Ensure S3 media bucket uses correct public/private access model and pre-signed URLs.

**Testing**

* CI pipeline must pass for all branches.
* Manual injection tests to verify alarms trigger on simulated failures (if practical).
* Security checks:

  * Confirm unauthenticated users cannot access protected APIs.
  * Confirm buckets are not accidentally world-readable outside of expected paths.

**Acceptance Criteria**

* CI pipeline runs on pull requests and main branch, executing build/lint/test.
* Backend logs provide enough context to debug common issues.
* Basic CloudWatch alarms configured and visible.
* IAM policies and access controls reviewed and meet least-privilege expectations.

---

## Phase 14: Final Integration, Performance & Release Readiness

**Title**
Final Integration, Performance & Release Readiness

**Features**

* Full end-to-end integration testing of the entire game flow.
* Performance and load checks on critical endpoints.
* UX polish and bug fixing across all roles and platforms.
* Documentation completion (user guides and developer docs).
* Final production deploy.

**Description**
This final phase ensures that the application is ready for real-world use. Codex will perform comprehensive end-to-end tests that exercise all major flows for Owners, Judges, and Players, across iOS, Android, and Web. Performance and reliability checks will be done for key APIs such as submissions, judging, and leaderboard retrieval. UX issues, edge cases, and minor defects discovered during testing are addressed. User-facing documentation and developer onboarding docs are finalized.

**Infrastructure**

* Optionally define separate staging and production environments using CDK stacks or environments.
* Validate CDK deployments to production environment.
* Confirm all environment variables and secrets are correctly configured.

**Testing**

* End-to-end test scenarios:

  * Owner creates a hunt, tasks, and teams.
  * Players join, form teams, and submit tasks.
  * Judges review all submissions, award points, heart favorites.
  * Leaderboard and album behave as expected; hunt closes on schedule.
* Performance tests:

  * Load testing on submissions and leaderboard endpoints at modest scale.
* Manual cross-platform verification:

  * iOS, Android, Web flows tested.

**Acceptance Criteria**

* All major user flows work end-to-end without critical defects.
* Performance is acceptable for expected initial usage levels.
* All tests (unit, integration, end-to-end) pass in CI.
* Documentation:

  * Updated `README.md`.
  * Completed `docs/architecture.md`, `docs/domain-model.md`, `docs/api-contracts.md`, and high-level user guide.
* Application deployed and accessible in the designated production AWS environment.

