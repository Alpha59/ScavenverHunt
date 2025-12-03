Below are 10 tickets for **Phase 5: Hunt Configuration & Owner Console (Tasks, Facets, Rules)**.

They assume Phases 1–4 are complete (infra, auth, users, data layer, Hunt API).
Each ticket is self-contained and gives Codex enough information to implement, test, and run the application at the end of the phase.

---

### Ticket 5.1: Add Facets DynamoDB Table, Wiring, and Repository

**Title**
Add Facets DynamoDB Table, Wiring, and Repository

**Features**

* Add a `Facets` DynamoDB table to `DataStack`.
* Wire table name and IAM permissions into backend Lambdas.
* Implement `FacetsRepository` in the backend.

**Description**
This ticket introduces storage for hunt-specific facets (for example, “Number of people required: 1,2,3”). Each facet belongs to a single hunt and defines a name and a fixed set of allowed values. The new table is exposed to backend Lambdas via environment variables and a dedicated repository.

**Infrastructure**

* Update `DataStack` in `packages/infra/lib/data-stack.ts` to include `Facets` table:

  * Table name: `Facets`.
  * Partition key: `facetId` (string).
  * GSI on `huntId` to list facets per hunt.
  * Billing: on-demand (pay per request).
  * Removal policy `RETAIN` (or `DESTROY` for dev, but be consistent with prior tables).
* Add `CfnOutput` for `FacetsTableName`.
* In `bin/app.ts`, ensure `DataStack` is instantiated and its facets table is exposed to `CoreStack`.
* In `CoreStack`, set Lambda environment variable `FACETS_TABLE_NAME` and grant read/write permissions.

**Steps (guidance for Codex)**

1. Modify `DataStack` to create `facetsTable` as described.
2. Export `facetsTable` as a public property from `DataStack`.
3. In `bin/app.ts`, pass `dataStack.facetsTable` reference into `CoreStack` (or whichever stack creates backend Lambdas).
4. In `CoreStack`, set:

   * `lambdaFn.addEnvironment("FACETS_TABLE_NAME", dataStack.facetsTable.tableName);` for relevant Lambdas.
   * `dataStack.facetsTable.grantReadWriteData(lambdaFn);`
5. In `packages/backend/src/repositories/FacetsRepository.ts`, implement a repository using AWS SDK v3:

   * `createFacet(huntId, name, allowedValues[]): Promise<Facet>`
   * `getFacetById(facetId: string): Promise<Facet | null>`
   * `listFacetsByHunt(huntId: string): Promise<Facet[]>`
   * `updateFacet(facetId: string, updates: Partial<Facet>): Promise<Facet>`
   * `deleteFacet(facetId: string): Promise<void>`
   * Use `FACETS_TABLE_NAME` from config.
6. Add unit tests for `FacetsRepository` in `src/repositories/__tests__/FacetsRepository.test.ts`.

**Testing**

* Infra:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
  * Confirm `Facets` table appears in AWS console with correct keys and GSI.
* Backend:

  * `npm run build:backend`
  * `npm test` (including new repository tests).

**Acceptance Criteria**

* `Facets` DynamoDB table exists with `facetId` PK and `huntId` GSI.
* Backend Lambdas have `FACETS_TABLE_NAME` and read/write IAM permissions.
* `FacetsRepository` implements CRUD and list-by-hunt operations.
* All builds and tests pass; changes are committed.

---

### Ticket 5.2: Implement Tasks REST API Endpoints (Owner-Scoped)

**Title**
Implement Tasks REST API Endpoints (Owner-Scoped)

**Features**

* Add secured REST endpoints for managing tasks:

  * `POST /hunts/{huntId}/tasks`
  * `GET /hunts/{huntId}/tasks`
  * `GET /hunts/{huntId}/tasks/{taskId}`
  * `PATCH /hunts/{huntId}/tasks/{taskId}`
  * `DELETE /hunts/{huntId}/tasks/{taskId}`
* Enforce owner-based authorization on all endpoints.

**Description**
This ticket surfaces the `Task` domain model via the backend API for owners to configure hunts. Only the hunt owner may create, read, update, or delete tasks for that hunt. Tasks include title, description, points, tags, facet value assignments, and completion rules.

**Infrastructure**

* Uses existing API Gateway and backend Lambda(s) from `CoreStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Decide routing approach:

   * If using a single API Lambda with internal router, add routes for `/hunts/{huntId}/tasks`.
   * Otherwise, add a new Lambda for Task operations and wire it in `CoreStack` with API Gateway resources/methods.
2. Implement handlers:

   * **Authorization**:

     * Require JWT via existing auth middleware.
     * Determine `currentUserId` from token.
     * Use `HuntsRepository.getHuntById(huntId)` to verify the hunt exists and `hunt.ownerId === currentUserId`.
   * **POST**:

     * Validate input (title, points, tags, optional facetValues, etc.).
     * Use `TasksRepository.createTask(huntId, input)`; return created task.
   * **GET list**:

     * Use `TasksRepository.listTasksByHunt(huntId)`.
   * **GET single**:

     * Use `TasksRepository.getTaskById(taskId)`; verify `task.huntId === huntId`.
   * **PATCH**:

     * Validate allowed fields; call `TasksRepository.updateTask`.
   * **DELETE**:

     * `TasksRepository.deleteTask(taskId)`; handle missing task gracefully (404).
3. Return appropriate HTTP status codes (201 for create, 200 for success, 404 when hunt/task not found, 403 if user is not owner).
4. Add unit tests for the handler(s) mocking repositories and auth middleware.

**Testing**

* `npm run build:backend`
* `npm test` (ensure new route tests pass).
* Infra:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (or API stack).
* Manual test:

  * Obtain Cognito token for a user that owns a hunt.
  * Call `POST /hunts/{huntId}/tasks`, then `GET /hunts/{huntId}/tasks` and confirm the task appears.
  * Test 403 by trying with a different user.

**Acceptance Criteria**

* Tasks CRUD endpoints exist under `/hunts/{huntId}/tasks`.
* Only the hunt owner can access or modify tasks.
* Correct HTTP codes and JSON responses are returned.
* Tests and deployments succeed; changes are committed.

---

### Ticket 5.3: Implement Facets REST API and Task–Facet Validation

**Title**
Implement Facets REST API and Task–Facet Validation

**Features**

* Add REST endpoints for managing facets:

  * `POST /hunts/{huntId}/facets`
  * `GET /hunts/{huntId}/facets`
  * `GET /hunts/{huntId}/facets/{facetId}`
  * `PATCH /hunts/{huntId}/facets/{facetId}`
  * `DELETE /hunts/{huntId}/facets/{facetId}`
* Validate that task `facetValues` reference valid facets and allowed values.

**Description**
This ticket exposes facets over the API and enforces consistency between tasks and facets. Only the hunt owner can manage facets. When creating or updating tasks, the backend must ensure any `facetValues` refer to existing facets for that hunt and use allowed values.

**Infrastructure**

* Uses existing `Facets` and `Tasks` tables via repositories.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add facet routes to the backend handler(s) similarly to Tasks:

   * Authorized user must be the hunt owner (via `HuntsRepository`).
   * `POST` creates a facet; `name` and non-empty `allowedValues` are required.
   * `GET` lists facets for the hunt.
   * `GET /{facetId}` fetches a single facet with ownership validation.
   * `PATCH` allows renaming and updating allowed values (with caution; see below).
   * `DELETE` removes a facet (in future we may need to handle tasks referencing it; for now, restrict deletion if tasks still reference facet).
2. Implement validation logic for tasks:

   * In Tasks create/update handler (from Ticket 5.2), when `facetValues` is provided:

     * Load all facets for the hunt via `FacetsRepository.listFacetsByHunt`.
     * For each `facetId` key in `facetValues`, check that:

       * Facet exists for this hunt.
       * Value is in `facet.allowedValues`.
     * Reject the request with 400 if invalid facet or value is used.
3. For facet updates that change allowedValues:

   * Optionally, reject updates that remove values currently used by tasks, or allow them and leave tasks as-is.
   * Document chosen behavior in comments; default to a “safe” approach (reject disallowed narrowing) if it is simple to implement.
4. Add unit tests:

   * Facets handlers: creation, listing, updating, and deletion with authorization.
   * Task handler: invalid facet IDs/values should cause a 400; valid ones succeed.

**Testing**

* `npm run build:backend`
* `npm test` with new handler tests.
* `npm run build:infra`, `cdk synth`, and `cdk deploy` for the API stack.
* Manual:

  * Create a facet for a hunt.
  * Create a task referencing that facet with a valid value.
  * Attempt creating a task with an invalid facet or value and verify 400.

**Acceptance Criteria**

* Facet CRUD endpoints exist and are owner-secured.
* Task create/update operations enforce valid facet references.
* Error responses are clear for invalid facet/value usage.
* All tests and deployments succeed; changes are committed.

---

### Ticket 5.4: Frontend Owner Hunt List and Create/Edit Screen

**Title**
Frontend Owner Hunt List and Create/Edit Screen

**Features**

* “My Hunts” screen listing hunts owned by the current user.
* Ability to create a new hunt and edit existing hunts.
* Basic form fields for name, description, team size rules, start/end time, and auto-close.

**Description**
This ticket introduces the owner console UI for managing hunts. Authenticated users who act as owners can see the hunts they have created, create new hunts, and modify existing ones. This screen will be the entry point for detailed configuration of tasks and facets.

**Infrastructure**

* Uses existing `/hunts` REST API from Phase 4.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/frontend`, extend navigation to include an “Owner” or “Hunts” section accessible when authenticated.
2. Create `MyHuntsScreen`:

   * On mount, call `GET /hunts` with auth token.
   * Display a list of hunts (name, status, gameCode).
   * Include “Create Hunt” button.
   * Selecting a hunt navigates to `HuntDetailScreen`.
3. Create `HuntForm` component used for both create and edit modes:

   * Fields:

     * `name`
     * `description`
     * `minTeamSize`, `maxTeamSize`, `allowSolo`
     * `startTime`, `endTime` (optional; use ISO string or localized picker)
     * `autoCloseAtEndTime`
   * On create: send `POST /hunts`.
   * On edit: send `PATCH /hunts/{id}` with updated fields.
4. Implement optimistic or simple refetch-based updates:

   * After creation or update, refetch `GET /hunts` and navigate back to list or detail view.
5. Handle errors and loading states with basic UI.

**Testing**

* Unit tests:

  * For `MyHuntsScreen`, mock API client and assert hunts list rendering.
  * For `HuntForm`, verify correct payloads are built for create and edit.
* Manual:

  * Run `npm run dev:frontend` with correct env vars for API base URL and auth.
  * Sign in.
  * Create a new hunt; confirm it appears in the list.
  * Edit an existing hunt and confirm updates reflect in the backend via `GET /hunts`.

**Acceptance Criteria**

* Authenticated user can view their hunts in the frontend.
* User can create and edit hunts via UI and corresponding backend endpoints.
* Validation errors are surfaced in the UI.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 5.5: Frontend Hunt Detail Shell with Tabs (Overview, Tasks, Facets)

**Title**
Frontend Hunt Detail Shell with Tabs (Overview, Tasks, Facets)

**Features**

* `HuntDetailScreen` that shows a single hunt.
* Tabbed layout with at least: Overview, Tasks, Facets.
* Integrates with existing navigation and API.

**Description**
This ticket provides the structural shell for detailed hunt configuration. Once the user selects a hunt from the list, they are taken to a detail view with tabs for overview, tasks, and facets. The overview reuses hunt data; tasks and facets tabs will be fleshed out in later tickets.

**Infrastructure**

* Uses existing frontend navigation and `/hunts/{id}` API endpoint.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Add `HuntDetailScreen` to navigation:

   * Route params: `huntId`.
   * Use `GET /hunts/{id}` to load hunt details on mount.
2. Implement tabbed UI (e.g., React Navigation’s tab navigator nested inside a stack, or a simple segmented control):

   * Tab 1: Overview
   * Tab 2: Tasks
   * Tab 3: Facets
3. Overview tab:

   * Show main hunt fields and game code.
   * Include status indicator (`draft`, `active`, `closed`).
   * Provide an “Edit hunt” button that reuses the `HuntForm` component (from Ticket 5.4) in a modal or dedicated screen.
4. For now, Tasks and Facets tabs can display placeholder text such as “No tasks yet” or “No facets yet”. Subsequent tickets will populate them.
5. Handle loading/error states.

**Testing**

* Unit tests:

  * Ensure `HuntDetailScreen` calls `/hunts/{id}` with correct ID.
  * Verify that hunt data is rendered correctly in the Overview tab.
* Manual:

  * From `MyHuntsScreen`, select a hunt and verify you navigate to `HuntDetailScreen`.
  * Confirm tabs render and overview shows correct information.

**Acceptance Criteria**

* `HuntDetailScreen` is reachable and displays accurate hunt information.
* Tabs for Overview, Tasks, and Facets are present and switch correctly.
* Editing a hunt from the Overview tab works and updates data.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 5.6: Frontend Task Management UI for a Hunt

**Title**
Frontend Task Management UI for a Hunt

**Features**

* “Tasks” tab in `HuntDetailScreen` shows tasks for the hunt.
* Ability to create, edit, and delete tasks.
* Support setting tags, points, description, and basic completion rules.

**Description**
This ticket implements the tasks configuration UI for owners. From the Tasks tab, owners can manage all tasks in a hunt, defining descriptions, point values, tags, and rule fields such as per-team limits and repeated completion flags.

**Infrastructure**

* Uses `/hunts/{huntId}/tasks` API from Ticket 5.2.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In the Tasks tab of `HuntDetailScreen`:

   * On mount, call `GET /hunts/{huntId}/tasks`.
   * Display list of tasks with key fields (title, points, tags).
   * Include “Add Task” button.
2. Create `TaskForm` component:

   * Fields:

     * `title`
     * `description`
     * `points`
     * `tags` (comma-separated or chips UI)
     * `maxCompletionsPerTeam` (optional, numeric)
     * `maxTeamsCanComplete` (optional, numeric)
   * On submit:

     * For create: `POST /hunts/{huntId}/tasks`.
     * For edit: `PATCH /hunts/{huntId}/tasks/{taskId}`.
3. Integrate `TaskForm` as:

   * Modal or nested screen for “Add Task”.
   * Edit action on each task row.
4. Implement delete:

   * “Delete” action on each task row that calls `DELETE /hunts/{huntId}/tasks/{taskId}` and refetches list.
5. Handle loading/spinner and basic validation (e.g., points must be non-negative).

**Testing**

* Unit tests:

  * For Tasks tab, mock API calls and verify list rendering and error handling.
  * For `TaskForm`, verify correct payloads for create/edit.
* Manual:

  * Start frontend; sign in; go to a hunt’s Tasks tab.
  * Create tasks; verify they appear.
  * Edit and delete tasks; confirm backend data updates accordingly via API.

**Acceptance Criteria**

* Owners can list, create, edit, and delete tasks via UI.
* UI uses `/hunts/{huntId}/tasks` endpoints and handles errors.
* Tasks tab reflects current server state after operations.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 5.7: Frontend Facet Management UI and Task–Facet Assignment

**Title**
Frontend Facet Management UI and Task–Facet Assignment

**Features**

* “Facets” tab in `HuntDetailScreen` lists and manages facets.
* Ability to create, edit, and delete facets with allowed values.
* In `TaskForm`, allow assigning facet values to tasks based on defined facets.

**Description**
This ticket adds UI for managing facets and connecting them to tasks. Owners can define facets for a hunt and specify allowed values (e.g., 1, 2, 3 participants). Task forms then show controls to select a allowed value per facet.

**Infrastructure**

* Uses `/hunts/{huntId}/facets` API from Ticket 5.3 and the existing tasks API.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Facets tab in `HuntDetailScreen`:

   * On mount, call `GET /hunts/{huntId}/facets`.
   * List facets with name and allowed values.
   * Provide “Add Facet” button.
2. Create `FacetForm` component:

   * Fields:

     * `name`
     * `allowedValues` (user can add/remove string values)
   * For create: `POST /hunts/{huntId}/facets`.
   * For edit: `PATCH /hunts/{huntId}/facets/{facetId}`.
3. Implement delete:

   * “Delete” button per facet, calling `DELETE /hunts/{huntId}/facets/{facetId}`.
   * Handle potential 400s if backend disallows deleting facets used by tasks; show an informative error.
4. Integrate facets into `TaskForm`:

   * In `TaskForm`, fetch facets for the hunt (or receive them via props from Tasks tab).
   * For each facet, render a dropdown/select of `allowedValues`.
   * When user selects values, populate `facetValues` on the task payload as:

     * `{ [facetId]: chosenValue }`.
   * Ensure this matches backend contract and validation from Ticket 5.3.
5. Handle empty facets list (no facet controls visible).

**Testing**

* Unit tests:

  * Facets tab: listing, creating, editing, deleting facets with mocked API.
  * `TaskForm`: ensure `facetValues` payload matches user selection and shape expected by backend.
* Manual:

  * Create facets for a hunt.
  * Create tasks and assign facet values.
  * Verify that tasks with invalid facet input are rejected by backend and errors are shown.
  * Verify that editing facets affects the selection options in `TaskForm`.

**Acceptance Criteria**

* Owners can manage facets via UI and see them grouped by hunt.
* `TaskForm` displays facets as selectable fields and sends correct `facetValues`.
* Backend validations for facets are respected and surfaced.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 5.8: Hunt Status Transitions and Validation Rules (Draft / Active / Closed)

**Title**
Hunt Status Transitions and Validation Rules (Draft / Active / Closed)

**Features**

* Backend validation logic for changing hunt `status`.
* Enforce constraints before allowing `active` status (for example, at least one task defined).
* Block modification of certain configuration once a hunt is active or closed.

**Description**
This ticket formalizes how a hunt’s lifecycle is managed. Owners can move a hunt from `draft` to `active`, then to `closed`. The backend ensures that hunts cannot be activated without minimum configuration and restricts editing of dangerous fields once active.

**Infrastructure**

* No new AWS resources.
* Backend logic only.

**Steps (guidance for Codex)**

1. In `HuntsRepository` or a higher-level service, define rules for status changes:

   * Allowed transitions:

     * `draft → active`
     * `active → closed`
     * Staying in same state is allowed.
   * Disallow `closed → active` or `closed → draft`.
2. Before allowing `draft → active`:

   * Verify `TasksRepository.listTasksByHunt(huntId)` returns at least one task.
   * In future phases, additional checks may be added; implement current check cleanly.
3. Lock down certain fields when `status === 'active'` or `status === 'closed'`:

   * Once active:

     * Disallow updating `minTeamSize`, `maxTeamSize`, and `allowSolo`.
     * Disallow deleting all tasks (but allow adding new tasks for now).
   * Once closed:

     * Disallow any updates to hunt, tasks, or facets (enforced at handler level with 409 or 400 responses).
4. Update `/hunts/{id}` PATCH handler:

   * Implement status transition logic and validations.
   * Return appropriate error codes (e.g., 400 for invalid transition, 409 for forbidden change due to current status).
5. Update frontend:

   * On the Overview tab, allow owner to change status (e.g., buttons “Activate Hunt” and “Close Hunt”), or expose a status field in an edit form.
   * Show error messages from backend when invalid transitions are attempted.

**Testing**

* Backend unit tests:

  * Successful `draft → active` when at least one task exists.
  * Failure for `draft → active` with no tasks.
  * Failure for illegal transitions (e.g., `closed → active`).
  * Attempts to edit locked fields when active/closed should fail with correct error codes.
* Frontend manual tests:

  * Attempt to activate a hunt with and without tasks.
  * Activate, then try to change min/max team size (should fail and show error).
  * Close a hunt and verify that further edits are rejected.

**Acceptance Criteria**

* Hunt status transitions follow defined rules and validations.
* Hunts cannot be activated without at least one task.
* Editing constraints are enforced for active and closed hunts.
* Frontend reflects status and surfaces relevant errors.
* All builds/tests pass; changes are committed.

---

### Ticket 5.9: Backend Integration Tests for Tasks and Facets APIs

**Title**
Backend Integration Tests for Tasks and Facets APIs

**Features**

* Add integration tests for Task and Facet endpoints.
* Verify authorization, validation, and data persistence in DynamoDB.
* Confirm interaction between tasks and facets (facetValues validation).

**Description**
This ticket increases confidence in Phase 5 backend features by testing the Tasks and Facets APIs against a local or test DynamoDB instance, including cross-resource validation (facetValues).

**Infrastructure**

* Uses local DynamoDB (or DynamoDB Local container) for tests.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Extend the existing integration test setup (from Phase 4) or create a new one:

   * Ensure local tables for `Hunts`, `Tasks`, and `Facets` are provisioned for tests.
2. Write integration tests in `packages/backend/src/__tests__/integration/tasksFacetsApi.integration.test.ts`:

   * Mock or stub JWT auth to simulate a known `ownerId`.
   * Create a hunt record in DynamoDB for that owner.
   * Create a facet for the hunt via handler.
   * Create a task referencing the facet with a valid facet value; assert success.
   * Attempt to create a task with an invalid facet ID or value; assert 400.
   * Test list and get operations for both tasks and facets.
   * Test that a different userId (non-owner) cannot create/edit/delete tasks or facets.
3. Ensure integration tests are runnable via `npm test` or a dedicated script (e.g., `npm run test:integration`).

**Testing**

* Run integration tests and verify:

  * All test cases pass.
  * Local DynamoDB teardown is clean between tests.

**Acceptance Criteria**

* Integration tests exist covering major Tasks and Facets API behaviors, including owning user checks.
* Tests verify facetValues validation and auth constraints.
* All tests pass reliably; changes are committed.

---

### Ticket 5.10: Phase 5 End-to-End Verification and Documentation

**Title**
Phase 5 End-to-End Verification and Documentation

**Features**

* Validate full owner configuration flow end-to-end.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for owner console, tasks, and facets configuration.

**Description**
This ticket confirms that Phase 5 is complete and working coherently. Codex will verify that an authenticated owner can create a hunt, configure tasks and facets, and activate the hunt through the full stack (frontend → backend → DynamoDB). Documentation will describe how to use these features and outline the lifecycle of a hunt.

**Infrastructure**

* Uses deployed `DataStack`, `AuthStack`, and `CoreStack`.
* No new resources.

**Steps (guidance for Codex)**

1. From the root, run:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend` (or web build command)
   * `npm run build:infra`
2. Deploy updated infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (and `AuthStack` if changes occurred).
3. Retrieve `ApiBaseUrl` from stack outputs and ensure frontend env vars are configured:

   * `EXPO_PUBLIC_API_BASE_URL`
   * Cognito Hosted UI and client ID env vars from earlier phases.
4. Manual E2E test:

   * Start frontend: `npm run dev:frontend`.
   * Sign in as a user (owner).
   * Create a new hunt with team rules and a schedule.
   * From `HuntDetailScreen`:

     * Add facets and allowed values.
     * Add tasks and assign facet values.
   * Attempt to activate the hunt:

     * Confirm it fails when no tasks exist (if tested separately).
     * Confirm it succeeds when at least one valid task exists.
   * Verify data in AWS DynamoDB console for `Hunts`, `Tasks`, and `Facets` tables.
5. Documentation:

   * Update `docs/architecture.md` and/or create `docs/hunt-configuration.md` describing:

     * Hunt lifecycle (draft/active/closed).
     * Owner console screens and flows.
     * Tasks, facets, and validation rules.
   * Update `README.md` with a short section pointing to the owner configuration documentation.

**Testing**

* All commands in step 1 must succeed.
* Smoke tests in step 4 must behave correctly.

**Acceptance Criteria**

* Owner can configure a hunt end-to-end: create hunt, manage tasks and facets, and activate hunt.
* Backend stores and enforces rules for status transitions and facet/task consistency.
* All builds, unit tests, integration tests, and CDK deploys succeed.
* Documentation accurately explains Phase 5 behavior and how to use the owner console.
* Repository is in a clean state with all changes committed.

