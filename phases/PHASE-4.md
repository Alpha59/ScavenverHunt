Below are 10 tickets for **Phase 4: Domain Model & Data Layer (DynamoDB)**.
They assume Phases 1–3 are complete (monorepo, infra, auth, `/me`, `Users` table).

Each ticket is self-contained and gives Codex enough information to implement, test, and verify the work.

---

### Ticket 4.1: Define Shared Domain Models and Update Documentation

**Title**
Define Shared Domain Models and Update Documentation

**Features**

* Introduce TypeScript domain model definitions for all core entities.
* Centralize types in a shared backend module.
* Update `docs/domain-model.md` to align with implemented models.

**Description**
This ticket formalizes the domain model in code and documentation. Codex will define TypeScript interfaces/types for `Hunt`, `Facet`, `Task`, `Team`, `TeamMembership`, `JudgeAssignment`, `Submission`, and `TeamScore`, centralize them in a module under the backend package, and synchronize these definitions with the design in `docs/domain-model.md`. These models will be used by repositories and APIs in later tickets.

**Infrastructure**

* No AWS resources are created or modified.
* Only local backend TypeScript and documentation changes.

**Steps (guidance for Codex)**

1. In `packages/backend/src/domain/`, create a file `models.ts` (or similar) defining interfaces for at least:

   * `User` (reference existing structure from Phase 3 if already defined; ensure consistency).

   * `Hunt`:

     * `huntId: string`
     * `ownerId: string`
     * `name: string`
     * `description?: string`
     * `gameCode: string`
     * `status: 'draft' | 'active' | 'closed'`
     * `startTime?: string`
     * `endTime?: string`
     * `autoCloseAtEndTime?: boolean`
     * `minTeamSize: number`
     * `maxTeamSize: number`
     * `allowSolo: boolean`
     * `createdAt: string`
     * `updatedAt: string`

   * `Facet`:

     * `facetId: string`
     * `huntId: string`
     * `name: string`
     * `allowedValues: string[]`

   * `Task`:

     * `taskId: string`
     * `huntId: string`
     * `title: string`
     * `description?: string`
     * `points: number`
     * `tags: string[]`
     * `facetValues?: Record<string, string>`
     * `maxCompletionsPerTeam?: number | null`
     * `maxTeamsCanComplete?: number | null`
     * `createdAt: string`
     * `updatedAt: string`

   * `Team`:

     * `teamId: string`
     * `huntId: string`
     * `name: string`
     * `createdAt: string`

   * `TeamMembership`:

     * `teamId: string`
     * `userId: string`
     * `roleWithinTeam: 'member' | 'captain'`
     * `createdAt: string`

   * `JudgeAssignment`:

     * `huntId: string`
     * `userId: string`
     * `createdAt: string`

   * `Submission`:

     * `submissionId: string`
     * `huntId: string`
     * `taskId: string`
     * `teamId: string`
     * `submittedByUserId: string`
     * `mediaUrl: string`
     * `thumbnailUrl?: string`
     * `notes?: string`
     * `status: 'pending' | 'accepted' | 'rejected'`
     * `judgedByUserId?: string`
     * `judgedAt?: string`
     * `judgeComment?: string`
     * `awardedPoints?: number`
     * `isFavorite?: boolean`
     * `submittedAt: string`

   * `TeamScore`:

     * `huntId: string`
     * `teamId: string`
     * `totalPoints: number`
     * `updatedAt: string`

2. Export these interfaces from a central index (e.g., `domain/index.ts`) for use by repositories and handlers.

3. Update `docs/domain-model.md` to match the fields defined above, or create the file if it does not exist.

4. Ensure no circular dependencies are introduced.

**Testing**

* Run `npm run lint` at the root.
* Run `npm run build:backend` to ensure all TypeScript models compile.
* Run `npm test` to ensure no existing tests are broken.

**Acceptance Criteria**

* `packages/backend/src/domain/models.ts` (or equivalent) defines all core entity interfaces.
* Domain models compile without TypeScript errors.
* `docs/domain-model.md` exists and describes the domain model consistent with code.
* `npm run lint`, `npm run build:backend`, and `npm test` all succeed.
* Changes are committed.

---

### Ticket 4.2: Create DataStack with DynamoDB Tables for Core Entities

**Title**
Create DataStack with DynamoDB Tables for Core Entities

**Features**

* Define a dedicated `DataStack` in CDK for domain data.
* Create DynamoDB tables:

  * `Hunts`, `Tasks`, `Teams`, `TeamMemberships`, `JudgeAssignments`, `Submissions`, `TeamScores`.
* Configure primary keys and basic GSIs.

**Description**
This ticket provisions the primary data layer in DynamoDB. Codex will create a new CDK `DataStack` responsible for all domain tables and connect it to the existing app. It will define primary keys and minimal indexes for common access patterns, such as listing hunts by owner and tasks by hunt.

**Infrastructure**

* New `DataStack` (if not already present) in `packages/infra/lib/data-stack.ts` with:

  * `Hunts` table:

    * PK: `huntId` (string).
    * GSI: `ownerId` to list hunts by owner.
  * `Tasks` table:

    * PK: `taskId` (string).
    * GSI: `huntId` to list tasks by hunt.
  * `Teams` table:

    * PK: `teamId` (string).
    * GSI: `huntId` to list teams by hunt.
  * `TeamMemberships` table:

    * PK: `teamId` (string).
    * SK: `userId` (string).
    * Optional GSI on `userId` to list teams by user.
  * `JudgeAssignments` table:

    * PK: `huntId`
    * SK: `userId`
  * `Submissions` table:

    * PK: `submissionId`
    * GSI(s) on `huntId`, `(huntId, taskId)`, and possibly `(huntId, teamId)` for later queries.
  * `TeamScores` table:

    * PK: `huntId`
    * SK: `teamId`

* Outputs: table names for all tables.

**Steps (guidance for Codex)**

1. In `packages/infra/lib/data-stack.ts`, define `DataStack` extending `cdk.Stack`.
2. Instantiate all tables with on-demand capacity (pay-per-request) and sensible removal policies (e.g., `RETAIN` for production or `DESTROY` for dev).
3. Add `CfnOutput`s for all table names: `HuntsTableName`, `TasksTableName`, etc.
4. In `bin/app.ts`, instantiate `DataStack` with the same `env` as other stacks.
5. Run `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`.
6. Deploy:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack` (or `--all` if appropriate).

**Testing**

* Verify `cdk synth` includes all DynamoDB tables and outputs.
* Ensure `cdk deploy DataStack` completes successfully.
* In the AWS console, confirm that tables are created with expected keys and GSIs.

**Acceptance Criteria**

* `DataStack` exists and defines all domain tables.
* Tables are deployed in `codex-sandbox` in `us-east-1` with expected keys and GSIs.
* `CfnOutput`s expose each table name.
* `npm run build:infra`, `cdk synth`, and `cdk deploy DataStack` all succeed.
* Changes are committed.

---

### Ticket 4.3: Wire Table Name Environment Variables into Backend Lambdas

**Title**
Wire Table Name Environment Variables into Backend Lambdas

**Features**

* Pass DynamoDB table names as environment variables to backend Lambda(s).
* Extend backend configuration module to read those names.
* Ensure repository layer can access correct tables.

**Description**
This ticket connects infrastructure to the backend logic by wiring the table names from `DataStack` into the backend Lambda environment. Codex will ensure each Lambda function that accesses data gets the correct table names via environment variables and that the backend can read them from a central config module.

**Infrastructure**

* Update `CoreStack` (or whichever stack defines the backend Lambdas) to:

  * Accept table names from `DataStack` (via stack outputs or cross-stack references).
  * Set environment variables like `HUNTS_TABLE_NAME`, `TASKS_TABLE_NAME`, etc. on the backend Lambdas.

**Steps (guidance for Codex)**

1. In `DataStack`, export table constructs (e.g., `public readonly huntsTable`) as class properties.
2. In `bin/app.ts`, pass `DataStack` reference into `CoreStack` or otherwise wire stacks so `CoreStack` can access `DataStack` resources. For example:

   * Create `DataStack` first, then pass references into `CoreStack`’s constructor.
3. In `CoreStack` (or stack that creates backend Lambdas), set Lambda environment variables:

   * `HUNTS_TABLE_NAME` = `dataStack.huntsTable.tableName`
   * `TASKS_TABLE_NAME` = `dataStack.tasksTable.tableName`
   * etc., for all tables that the backend will use in Phase 4.
4. Grant IAM permissions:

   * For each Lambda, call `.grantReadWriteData(lambdaFn)` on relevant tables.
5. In `packages/backend`, create or extend a `config.ts` that reads required environment variables and throws a clear error if they are missing.

**Testing**

* Infra:

  * `npm run build:infra` and `cdk synth` must succeed.
  * `cdk deploy` for relevant stacks (e.g., `CoreStack`, `DataStack`) must succeed.
* Backend:

  * `npm run build:backend` and `npm test` must pass.
  * Optionally, add a simple unit test for `config.ts` that checks behavior when env vars are missing (mock process.env).

**Acceptance Criteria**

* All backend Lambdas that need data access have table names in their environment variables.
* IAM permissions allow Lambdas to read/write the relevant tables.
* Backend config module exposes those table names.
* Infra deployments and backend build/tests succeed.
* Changes are committed.

---

### Ticket 4.4: Implement HuntsRepository with CRUD Operations

**Title**
Implement HuntsRepository with CRUD Operations

**Features**

* Implement `HuntsRepository` using DynamoDB.
* Support create, get by id, list by owner, update, and soft delete (optional).
* Validate and normalize data before writing.

**Description**
This ticket implements the core repository for `Hunt` entities. Codex will use AWS SDK (v3 preferred) to talk to the `Hunts` table and provide a clean API for higher layers. The repository will handle ID generation, timestamps, and basic validation.

**Infrastructure**

* No new AWS resources (uses `Hunts` table from `DataStack`).

**Steps (guidance for Codex)**

1. In `packages/backend/src/repositories/`, create `HuntsRepository.ts`.
2. Use AWS SDK v3 for DynamoDB (ensure it is installed as a dependency if not already).
3. Implement methods:

   * `createHunt(input: Partial<Hunt> & { ownerId: string; name: string; ... }): Promise<Hunt>`:

     * Generate `huntId` (UUID).
     * Generate `gameCode` (short, unique code; for now a random alphanumeric string).
     * Set default `status = 'draft'`.
     * Set timestamps.
     * Validate required fields and throw on invalid input.
   * `getHuntById(huntId: string): Promise<Hunt | null>`
   * `listHuntsByOwner(ownerId: string): Promise<Hunt[]>` (use owner GSI).
   * `updateHunt(huntId: string, updates: Partial<Hunt>): Promise<Hunt>`
   * Optional: `deleteHunt(huntId: string): Promise<void>` or soft delete (e.g., set a `deleted` flag if you choose to add it to the model).
4. Use the environment variable `HUNTS_TABLE_NAME` from the config module.
5. Add unit tests in `src/repositories/__tests__/HuntsRepository.test.ts`:

   * Use DynamoDB local or mocked SDK calls to cover:

     * Creation, retrieval, listing, updating.
     * Behavior when hunt is not found.

**Testing**

* `npm run build:backend` must pass.
* `npm test` must include `HuntsRepository` tests and pass.

**Acceptance Criteria**

* `HuntsRepository` exists and provides create, read, list-by-owner, and update functionality.
* Repository uses `HUNTS_TABLE_NAME` and AWS SDK correctly.
* Unit tests cover main methods and error paths.
* All backend builds and tests succeed.
* Changes are committed.

---

### Ticket 4.5: Implement TasksRepository with Hunt-Scoped Queries

**Title**
Implement TasksRepository with Hunt-Scoped Queries

**Features**

* Implement `TasksRepository` using `Tasks` table and huntId GSI.
* Support create, get by id, list by hunt, update, and delete.
* Use domain `Task` model and validate inputs.

**Description**
This ticket creates a repository for `Task` entities. Codex will use the `Tasks` table and GSI on `huntId` to query tasks per hunt. The repository will create tasks with unique IDs, enforce required fields, and handle updates.

**Infrastructure**

* Uses `Tasks` table and its GSI from `DataStack`.
* No new resources.

**Steps (guidance for Codex)**

1. In `packages/backend/src/repositories/`, create `TasksRepository.ts`.
2. Implement methods:

   * `createTask(huntId: string, input: { title: string; points: number; ... }): Promise<Task>`
   * `getTaskById(taskId: string): Promise<Task | null>`
   * `listTasksByHunt(huntId: string): Promise<Task[]>` (via `huntId` GSI).
   * `updateTask(taskId: string, updates: Partial<Task>): Promise<Task>`
   * `deleteTask(taskId: string): Promise<void>`
3. Use `TASKS_TABLE_NAME` from config and AWS SDK v3.
4. Validate required fields (e.g., `title`, `points >= 0`).
5. Add unit tests in `src/repositories/__tests__/TasksRepository.test.ts` covering main operations and error scenarios.

**Testing**

* Run `npm run build:backend`.
* Run `npm test` and ensure `TasksRepository` tests pass.

**Acceptance Criteria**

* `TasksRepository` supports CRUD operations and hunt-scoped queries.
* Queries use the `huntId` GSI configured in `DataStack`.
* Unit tests cover creation, retrieval, listing by hunt, updates, and deletion.
* Backend builds and tests succeed.
* Changes are committed.

---

### Ticket 4.6: Implement TeamsRepository and TeamMembershipsRepository

**Title**
Implement TeamsRepository and TeamMembershipsRepository

**Features**

* Implement `TeamsRepository` to manage team entities.
* Implement `TeamMembershipsRepository` to manage user-team relationships.
* Support listing teams by hunt and memberships by team and by user.

**Description**
This ticket adds repositories for teams and their memberships. These repositories will support future features such as team creation, joining, and enforcement of team size rules.

**Infrastructure**

* Uses `Teams` and `TeamMemberships` tables and associated GSIs from `DataStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/backend/src/repositories/`, create:

   * `TeamsRepository.ts`
   * `TeamMembershipsRepository.ts`
2. `TeamsRepository` methods:

   * `createTeam(huntId: string, name: string): Promise<Team>` (generates `teamId`, sets timestamps).
   * `getTeamById(teamId: string): Promise<Team | null>`
   * `listTeamsByHunt(huntId: string): Promise<Team[]>` (via `huntId` GSI).
   * `updateTeam(teamId: string, updates: Partial<Team>): Promise<Team>`
3. `TeamMembershipsRepository` methods:

   * `addMember(teamId: string, userId: string, role: 'member' | 'captain'): Promise<TeamMembership>`
   * `removeMember(teamId: string, userId: string): Promise<void>`
   * `listMembersByTeam(teamId: string): Promise<TeamMembership[]>`
   * `listTeamsByUser(userId: string): Promise<TeamMembership[]>` (via GSI on `userId` if configured).
4. Use `TEAMS_TABLE_NAME` and `TEAM_MEMBERSHIPS_TABLE_NAME` env vars.
5. Add unit tests for both repositories under `src/repositories/__tests__/`.

**Testing**

* `npm run build:backend` must succeed.
* `npm test` must include new tests and pass.

**Acceptance Criteria**

* `TeamsRepository` and `TeamMembershipsRepository` are implemented and use DynamoDB correctly.
* They support basic CRUD and list operations for teams and memberships.
* Unit tests cover the primary methods and edge cases.
* Backend builds and tests succeed.
* Changes are committed.

---

### Ticket 4.7: Implement JudgeAssignmentsRepository, SubmissionsRepository, and TeamScoresRepository

**Title**
Implement JudgeAssignmentsRepository, SubmissionsRepository, and TeamScoresRepository

**Features**

* Implement repositories for `JudgeAssignment`, `Submission`, and `TeamScore`.
* Provide methods needed for later judging and scoring flows.
* Ensure data is properly keyed and queryable by hunt, task, and team.

**Description**
This ticket adds repositories for judging and scoring entities. While full judge and scoring logic will be built in later phases, the repositories must exist now so that higher-level services can rely on them.

**Infrastructure**

* Uses `JudgeAssignments`, `Submissions`, and `TeamScores` tables (and GSIs) from `DataStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/backend/src/repositories/`, create:

   * `JudgeAssignmentsRepository.ts`
   * `SubmissionsRepository.ts`
   * `TeamScoresRepository.ts`
2. `JudgeAssignmentsRepository` methods:

   * `assignJudge(huntId: string, userId: string): Promise<JudgeAssignment>`
   * `removeJudge(huntId: string, userId: string): Promise<void>`
   * `listJudgesByHunt(huntId: string): Promise<JudgeAssignment[]>`
3. `SubmissionsRepository` methods (basic for now):

   * `createSubmission(input: Omit<Submission, 'status' | 'submissionId' | 'submittedAt'>): Promise<Submission>`

     * Generate `submissionId`, set `status = 'pending'`, set `submittedAt`.
   * `getSubmissionById(submissionId: string): Promise<Submission | null>`
   * `listSubmissionsByHunt(huntId: string): Promise<Submission[]>` (via GSI).
   * Optionally `listSubmissionsByTask` and `listSubmissionsByTeam` for later use.
   * `updateSubmission(submissionId: string, updates: Partial<Submission>): Promise<Submission>`
4. `TeamScoresRepository` methods (minimal initial version):

   * `getTeamScore(huntId: string, teamId: string): Promise<TeamScore | null>`
   * `upsertTeamScore(huntId: string, teamId: string, deltaPoints: number): Promise<TeamScore>`

     * For now, just read, adjust, and write total points; more complex concurrency logic can come later.
5. Use appropriate table env var names and AWS SDK v3.
6. Add unit tests covering core operations.

**Testing**

* `npm run build:backend` and `npm test` must pass.

**Acceptance Criteria**

* Repositories for `JudgeAssignment`, `Submission`, and `TeamScore` are implemented.
* Methods support expected operations for future judge/scoring logic.
* Unit tests cover creation, retrieval, listing, and updates.
* Backend builds and tests succeed.
* Changes are committed.

---

### Ticket 4.8: Implement Hunt CRUD REST API Endpoints in Backend

**Title**
Implement Hunt CRUD REST API Endpoints in Backend

**Features**

* Add REST endpoints for:

  * `POST /hunts`
  * `GET /hunts` (list for current owner)
  * `GET /hunts/{id}`
  * `PATCH /hunts/{id}`
* Secure endpoints with JWT auth and owner-based authorization.

**Description**
This ticket surfaces the `Hunt` domain through the backend API. Authenticated users can create hunts, list their hunts, fetch a single hunt by ID, and update hunts they own. This API will be used later by the frontend hunt management UI.

**Infrastructure**

* Uses existing API Gateway from `CoreStack`.
* No new AWS resources, but may require:

  * Additional Lambda routes or a new API handler Lambda to handle these endpoints.

**Steps (guidance for Codex)**

1. Decide how the backend Lambda(s) are structured:

   * If there is a single “API Lambda” (e.g., using a router), add routes for `/hunts`.
   * Otherwise, add a new Lambda function for hunts and configure API Gateway routes in `CoreStack`.
2. In the backend Lambda handler:

   * For `POST /hunts`:

     * Require authenticated user (use JWT middleware).
     * Validate request body (e.g., using a schema validator like `zod` if present).
     * Call `HuntsRepository.createHunt` with `ownerId` from JWT claim and body fields.
     * Return created hunt.
   * For `GET /hunts`:

     * List hunts by `ownerId` for the current user.
   * For `GET /hunts/{id}`:

     * Fetch hunt by `huntId`.
     * Ensure the requesting user is the owner (or later allow participants; for now restrict to owner).
   * For `PATCH /hunts/{id}`:

     * Validate that requester is the owner.
     * Validate input fields; call `HuntsRepository.updateHunt`.
3. Update API Gateway configuration in `CoreStack`:

   * Add resources and methods for `/hunts` and `/hunts/{id}`.
   * Integrate them with the appropriate Lambda.
4. Add integration tests in backend (can be lambda-local or through API Gateway if you prefer):

   * At least test the handler logic for each route with mocked repositories and auth.

**Testing**

* `npm run build:backend` and `npm test` must pass.
* `npm run build:infra` and `cdk synth` must succeed.
* `cdk deploy` for the API stack (e.g., `CoreStack`) must succeed.
* Manual test:

  * Obtain a valid Cognito token.
  * Use `curl` or a REST client to call:

    * `POST <ApiBaseUrl>hunts` with JSON body.
    * `GET <ApiBaseUrl>hunts` to list hunts.
    * `GET <ApiBaseUrl>hunts/{id}` to retrieve created hunt.
    * `PATCH <ApiBaseUrl>hunts/{id}` to update fields.
  * Confirm behavior matches expectations and authorization is enforced.

**Acceptance Criteria**

* Backend exposes secured REST endpoints for hunt CRUD.
* Only authenticated users can access these endpoints.
* Only the owner can read/update a specific hunt (given current scope).
* Integration tests and manual tests confirm correctness.
* All builds, tests, and relevant `cdk deploy` commands succeed.
* Changes are committed.

---

### Ticket 4.9: Add Backend Integration Tests for Hunt API with DynamoDB

**Title**
Add Backend Integration Tests for Hunt API with DynamoDB

**Features**

* Add integration tests that exercise Hunt API against a real or local DynamoDB instance.
* Validate end-to-end behavior of `POST /hunts`, `GET /hunts`, `GET /hunts/{id}`, and `PATCH /hunts/{id}`.
* Use a test Cognito-like JWT or mock for auth.

**Description**
This ticket strengthens confidence in the data layer and Hunt API by adding integration tests that simulate real interactions with the repository and database. Codex will set up integration tests that spin up local DynamoDB (or a test environment) and hit the Lambda handler directly.

**Infrastructure**

* No additional AWS resources.
* Uses local DynamoDB (if configured) or test environment stack.

**Steps (guidance for Codex)**

1. If not already present, add a local DynamoDB test setup:

   * Either use `dynamodb-local` or a container-based approach.
   * Provide Jest setup/teardown hooks to start/stop or reset tables.
2. Write integration tests, e.g., in `packages/backend/src/__tests__/integration/huntsApi.integration.test.ts`:

   * Mock JWT auth to inject a known `userId`.
   * Call the hunts handler functions with simulated API Gateway events for:

     * Create hunt.
     * List hunts.
     * Get hunt by ID.
     * Update hunt.
   * Assert the corresponding records exist/are updated in DynamoDB.
3. Ensure integration tests are separated or tagged so they do not require a deployed AWS stack (local only).
4. Update documentation (optional) to describe how to run integration tests.

**Testing**

* `npm test` should run unit and integration tests, or create a separate script (e.g., `npm run test:integration`) if needed.
* All tests must pass on a clean environment.

**Acceptance Criteria**

* Integration tests exist that cover main Hunt API flows against DynamoDB.
* Tests verify correct persistence and retrieval of hunts.
* Tests validate authorization logic (owner-only access).
* All tests pass reliably.
* Changes are committed.

---

### Ticket 4.10: Phase 4 Verification and Documentation Update

**Title**
Phase 4 Verification and Documentation Update

**Features**

* Verify the full data layer and basic Hunt API are functioning end-to-end.
* Run all builds, tests, and minimal manual checks through deployed API.
* Update documentation to reflect Phase 4 data layer and API.

**Description**
This final ticket confirms that Phase 4 is complete and that the domain model, DynamoDB tables, repositories, and Hunt API work coherently. Codex will run verification steps and document the resulting behavior for future phases.

**Infrastructure**

* Uses deployed `DataStack` and API stack (e.g., `CoreStack`).
* No new resources.

**Steps (guidance for Codex)**

1. Ensure all environment variables and stack references are correctly configured.
2. From root, run:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:infra`
3. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (or API stack name).
4. Obtain `ApiBaseUrl` from stack outputs.
5. Manual smoke tests:

   * Using a valid Cognito token, call:

     * `POST <ApiBaseUrl>hunts` to create a hunt.
     * `GET <ApiBaseUrl>hunts` to ensure it appears.
     * `GET <ApiBaseUrl>hunts/{id}` to read details.
     * `PATCH <ApiBaseUrl>hunts/{id}` to change the name/description.
   * Verify records in DynamoDB console if possible.
6. Update `docs/api-contracts.md` (or create it) to document Hunt endpoints and their request/response schemas.
7. Ensure `README.md` or `docs/architecture.md` mentions the new data layer and Hunt API capabilities.

**Testing**

* Commands in step 2 must all succeed.
* Smoke tests in step 5 must behave as expected.

**Acceptance Criteria**

* All tables and APIs introduced in Phase 4 are deployed and functioning.
* `npm run lint`, `npm test`, `npm run build:backend`, `npm run build:infra`, and relevant `cdk deploy` commands succeed.
* Manual API calls to Hunt endpoints work end-to-end with DynamoDB persistence.
* Documentation describes the data model and Hunt API in sufficient detail for future development.
* Repository is clean (`git status` shows no uncommitted changes) and all changes are committed.

