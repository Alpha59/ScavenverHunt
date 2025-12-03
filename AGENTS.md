# AGENTS.md

Guidelines for the autonomous OpenAI Codex agent that will design, implement, test, and deploy the **Scavenger Hunt** application.

This document describes:

- The product requirements that must be implemented
- The technical stack and architecture
- The repository structure and coding standards
- How to run tests, builds, and deployments to AWS using CDK
- How to structure work on a per-ticket basis

Codex must treat this document as authoritative.

---

## 1. Product Overview

Build a **Scavenger Hunt** platform with:

- A **React / React Native** front end that runs on:
  - iOS (via React Native)
  - Android (via React Native)
  - Web (via React Native Web / Expo)
- A **Node.js + TypeScript** backend deployed on AWS (serverless)
- **Infrastructure as Code** using **AWS CDK** (TypeScript)
- Automated tests and repeatable deployment commands

High-level feature set:

1. **User roles**

   - **Owner**
     - Creates and configures hunts.
     - Can act as Judge or Player, but not both at the same time within the same hunt.
   - **Judge**
     - Selected by the Owner from the list of signed-in users in a hunt.
     - Cannot be a Player in the same hunt (must be detached from any team).
   - **Player**
     - Joins a team or plays solo, participates by submitting media for tasks.

2. **Auth and account management**

   - Support sign-in via:
     - **Apple** on iOS.
     - **Google** on Android and Web.
     - Additional OAuth providers (e.g., Instagram) as optional buttons.
   - Use a single AWS-backed identity solution (Cognito user pools with OAuth federation).
   - After authentication, all users can create or join hunts.

3. **Hunts, tasks, and teams**

   - A **Hunt**:
     - Has name, description, owner, game code, start/end time, and configuration for allowed team sizes and rules.
   - A **Task**:
     - Belongs to a Hunt.
     - Has title, description, point value.
     - Can have tags and facets (e.g., “Number of people required: 1, 2, 3”).
     - Can define repeatability:
       - Only once per team
       - Only one team total
       - Unlimited or configured max per team
   - A **Team**:
     - Belongs to a Hunt.
     - Has members (players).
     - Owner may configure minimum and maximum team size and whether solo play is allowed.

4. **Submissions and judging**

   - Players can:
     - Browse, search, filter, and sort tasks.
     - Submit **photo or video media** plus optional notes to prove completion of a task.
     - Submit on behalf of their team; all team members can submit for their team.
   - Judge(s):
     - Cannot submit tasks.
     - Review submissions via:
       - A swipeable interface similar to Tinder:
         - Swipe right or approve button to **Accept**.
         - Swipe left or reject button to **Reject**.
         - Optional comment on accept or reject.
       - A list / filter view for browsing past decisions and pending items.
     - Can **favorite / heart** submissions.
       - Favorited submissions appear in an in-app **Album** visible to all participants.
   - Once a submission is accepted:
     - Award points to the associated team according to task rules.
     - Enforce task constraints:
       - Some tasks only once per team.
       - Some tasks only one team can ever complete.
       - Some tasks can be repeatedly completed for points.

5. **Dashboard, statistics, and game lifecycle**

   - All roles (Owner, Judge, Player) can see:
     - Leaderboard of teams and their current point totals.
     - Basic statistics:
       - Number of submissions per task.
       - Number and rate of accepted submissions.
   - The game **closes** for submission when:
     - The Judge or Owner explicitly closes the hunt, or
     - The configured end time passes, if the owner has set auto-close.
   - Closed hunts:
     - No new submissions accepted.
     - All views (leaderboard, album, task statistics) remain visible.

Codex must implement these requirements end-to-end.

---

## 2. Technical Architecture

### 2.1 High-level stack

- **Frontend**
  - React Native with Expo (TypeScript).
  - React Native Web for browser support.
  - React Navigation or Expo Router for navigation.
  - Target platforms:
    - iOS
    - Android
    - Web

- **Backend**
  - Node.js + TypeScript.
  - Serverless architecture on AWS:
    - API Gateway (REST) in front of Lambda functions.
    - DynamoDB for application data.
    - S3 for media storage.
    - Cognito for authentication and OAuth federation.
  - Shared type definitions between frontend and backend where appropriate.

- **Infrastructure**
  - AWS CDK (TypeScript).
  - Stacks:
    - `AuthStack` (Cognito and identity providers).
    - `ApiStack` (API Gateway, Lambdas).
    - `DataStack` (DynamoDB tables, S3 buckets).
    - `FrontendStack` (S3 + CloudFront or an equivalent Expo hosting solution for web artifacts).
    - Optional `PipelineStack` if CI/CD is introduced later.

- **Testing and tooling**
  - Jest + Testing Library (frontend and backend).
  - ESLint + Prettier.
  - TypeScript strict mode enabled in all packages.
  - Git for version control.

---

## 3. Repository Layout

Codex must structure the repository as a monorepo with separate packages for frontend, backend, and infrastructure.

Example layout:

```text
/
├─ package.json              # Workspace / root scripts
├─ tsconfig.base.json
├─ yarn.lock or package-lock.json
├─ AGENTS.md                 # This file
├─ README.md                 # Overview and dev instructions for humans
├─ docs/
│  ├─ architecture.md        # High-level architecture
│  ├─ domain-model.md        # Entities and relations
│  └─ api-contracts.md       # REST API schema
├─ src/
│  ├─ frontend/              # React Native / Expo app
│  ├─ backend/               # Lambda handlers and domain logic
│  └─ infra/                 # CDK stacks
└─ .github/workflows/        # (Optional) CI workflows
```

Codex must create and maintain:

* Independent `package.json` files in `packages/frontend`, `packages/backend`, and `packages/infra`.
* A root `package.json` that configures workspaces and common scripts.

---

## 4. Domain Model

Codex must implement at least the following entities and relationships in the backend. Adjust details if needed, but preserve semantics.

### 4.1 Core entities

* **User**

  * `userId` (string, Cognito user sub)
  * `displayName`
  * `avatarUrl` (optional)
  * `createdAt`

* **Hunt**

  * `huntId` (string, UUID)
  * `ownerId` (User.userId)
  * `name`
  * `description`
  * `gameCode` (short human-readable code, unique)
  * `status` (`draft | active | closed`)
  * `startTime` (ISO string, optional)
  * `endTime` (ISO string, optional)
  * `autoCloseAtEndTime` (boolean)
  * `minTeamSize` (integer)
  * `maxTeamSize` (integer)
  * `allowSolo` (boolean)
  * `createdAt`
  * `updatedAt`

* **Facet**

  * `facetId`
  * `huntId`
  * `name` (for example: “Number of people required”)
  * `allowedValues` (string[])

* **Task**

  * `taskId`
  * `huntId`
  * `title`
  * `description`
  * `points` (integer)
  * `tags` (string[])
  * `facetValues` (map from facetId to value)
  * `maxCompletionsPerTeam` (integer or null)
  * `maxTeamsCanComplete` (integer or null)
  * `createdAt`
  * `updatedAt`

* **Team**

  * `teamId`
  * `huntId`
  * `name`
  * `createdAt`

* **TeamMembership**

  * `teamId`
  * `userId`
  * `roleWithinTeam` (`member | captain`)
  * `createdAt`

* **JudgeAssignment**

  * `huntId`
  * `userId`
  * (Constraint: user cannot have any TeamMembership in this hunt.)

* **Submission**

  * `submissionId`
  * `huntId`
  * `taskId`
  * `teamId`
  * `submittedByUserId`
  * `mediaUrl`
  * `thumbnailUrl` (optional)
  * `notes` (optional)
  * `status` (`pending | accepted | rejected`)
  * `judgedByUserId` (optional)
  * `judgedAt` (optional)
  * `judgeComment` (optional)
  * `awardedPoints` (integer, typically equals task points)
  * `isFavorite` (boolean)
  * `submittedAt`

* **TeamScore** (optional materialized view or table)

  * `huntId`
  * `teamId`
  * `totalPoints`

Codex must implement backend logic to enforce role and scoring constraints and expose them via a REST API.

---

## 5. Frontend Requirements

Codex must build a single Expo app that runs on iOS, Android, and web.

### 5.1 Navigation

Implement a navigation structure that includes:

* Auth stack:

  * Sign-in / sign-up screen with Apple / Google and optional other providers.
* Main tabs:

  * **Hunts**: list hunts the user owns or participates in, with create / edit.
  * **Play**: task browsing and submission for active hunts.
  * **Judge**: swipe interface and submission list for assigned judges.
  * **Dashboard**: stats, leaderboards, and album.

Codex may use Expo Router or React Navigation, but must be consistent and create reusable layout components.

### 5.2 Key UI flows

Codex must implement at minimum:

1. **Authentication flow**

   * Sign in with Apple (iOS).
   * Sign in with Google (Android and Web).
   * Token exchange with the backend / Cognito.
   * Persist and refresh tokens locally where appropriate.

2. **Hunt management (Owner)**

   * Create hunt (name, description, start/end time, team constraints).
   * Generate or view game code and join link.
   * Create and edit tasks, tags, and facets.
   * Assign judge(s) and manage judge / team membership constraints.
   * Open and close hunts.

3. **Team and player flow**

   * Join hunt using game code or link.
   * Create or join team.
   * View hunt rules and list of tasks.
   * Search / filter tasks by tags, facets, and completion status.
   * Submit media (photo / video) with notes.

4. **Judge flow**

   * View pending submissions in a swipeable interface (Tinder-like).
   * Approve / reject submissions with optional comments.
   * Favorite submissions.
   * Browse accepted and rejected history with filters.

5. **Dashboard and album**

   * Leaderboard showing team scores.
   * Basic stats per task (submissions, accepted count).
   * Album view for favorited submissions.

---

## 6. Backend Requirements

Codex must use a Node.js + TypeScript backend deployed as AWS Lambda functions.

### 6.1 API design

* Use API Gateway with a RESTful interface.
* Implement typed request and response DTOs using a validation library (such as `zod` or `io-ts`) on the backend.
* Expose endpoints for:

  * User profile retrieval.
  * Hunt CRUD (create, update, list, get, close).
  * Task CRUD and facet management.
  * Team and membership management.
  * Submission creation (with pre-signed URL generation for media).
  * Judging operations (accept, reject, favorite).
  * Score and dashboard endpoints.

Codex must ensure that all endpoints:

* Authenticate the user via Cognito JWTs.
* Authorize actions based on per-hunt roles:

  * Only Owners can configure hunts and assign judges.
  * Only Judges can judge submissions.
  * Only Players on a team can submit for that team.

### 6.2 Storage

Codex must define:

* DynamoDB tables for the entities above. Use composite keys where appropriate and secondary indexes to support efficient access patterns.
* S3 buckets for:

  * Raw media (photos, videos).
  * Thumbnails or lower-resolution derived media if needed.
* IAM policies that provide the Lambda functions least privilege access to DynamoDB and S3.

Codex must design data access patterns with attention to scalability and cost.

---

## 7. Infrastructure (CDK) Requirements

Codex must define CDK stacks in `packages/infra`:

* **AuthStack**

  * Cognito User Pool, App Clients for each platform.
  * Cognito Identity Providers:

    * Apple
    * Google
    * Optional additional OAuth providers
  * Appropriate callback URLs for web and native clients.

* **DataStack**

  * DynamoDB tables for users, hunts, tasks, teams, memberships, submissions, team scores.
  * S3 bucket(s) for media.
  * Output parameter values (e.g., table names, bucket names) for other stacks to consume.

* **ApiStack**

  * API Gateway with routes for all backend functionalities.
  * Lambda functions that implement each route.
  * IAM permissions to access DynamoDB and S3.
  * CORS configuration to allow the web client.

* **FrontendStack**

  * S3 bucket and CloudFront distribution to serve static web build artifacts of the frontend.
  * Outputs for relevant URLs.

Codex must:

* Use **TypeScript CDK**.
* Keep stacks modular and small enough for maintenance.
* Use environment variables or CDK outputs to connect frontend, backend, and auth.

---

## 8. Coding, Testing, and Quality Standards

Codex must adhere to these rules for all code:

1. **Languages**

   * All code in TypeScript.
   * No JavaScript files in production code.

2. **TypeScript**

   * Enable `strict` mode in `tsconfig`.
   * Prefer explicit return types and avoid `any` where possible.

3. **Linting and formatting**

   * Use ESLint with standard TypeScript + React rules.
   * Use Prettier for formatting.
   * Add `npm run lint` and `npm run format` scripts in each package.
   * Ensure CI or root scripts run lint and tests.

4. **Testing**

   * Use Jest.
   * For frontend, use Testing Library where possible.
   * For backend, test domain logic and API handlers with unit tests; integration tests where practical.
   * Each ticket must add or update tests to cover new functionality.

5. **Error handling**

   * Handle expected errors with typed error responses.
   * Do not silently swallow errors.
   * Log structured errors in Lambda handlers.

6. **Security**

   * Validate all input on the backend.
   * Enforce role and ownership rules on every relevant operation.
   * Do not expose sensitive IDs or data unnecessarily in API responses.

---

## 9. Operations: Commands, Deployment, and Git

Codex must ensure that humans and automation can run the following commands from the repository root.

### 9.1 Common scripts

In the root `package.json`, define:

* `"dev:frontend"`: start Expo dev server for frontend.
* `"dev:backend"`: run backend locally (for example, with `ts-node-dev` or `nodemon`).
* `"dev:infra"`: use CDK with a local environment if necessary.
* `"build"`: build all packages.
* `"test"`: run tests in all packages.
* `"lint"`: run lint in all packages.

### 9.2 AWS and CDK

Assume:

* `AWS_PROFILE=codex-sandbox`
* `AWS_REGION=us-east-1`

Codex must:

1. Bootstrap CDK (once per account and region):

   ```bash
   AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk bootstrap
   ```

2. Deploy the infrastructure:

   ```bash
   AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy --all
   ```

3. Ensure that deployments are idempotent and can be repeated.

### 9.3 Ticket workflow and commits

For every ticket or unit of work:

1. Read any relevant documentation in `docs/` and this `AGENTS.md`.
2. Update or extend design documents if the ticket changes architecture or domain behavior.
3. Implement changes in the appropriate package(s).
4. Run:

   * `npm run lint`
   * `npm test`
   * `npm run build` (or at least build the modified packages)
5. Deploy to the sandbox environment when required by the ticket.
6. After successful deploy and verification, make a single Git commit with a descriptive message, for example:

   ```text
   feat: implement judge swipe interface
   fix: enforce team size constraints on join
   ```

Codex must not leave the repository in a broken state after any ticket.

---

## 10. Initial Tasks for Codex

When Codex first receives control of this repository, it must:

1. **Initialize the monorepo**

   * Create root `package.json` with workspaces.
   * Create `packages/frontend`, `packages/backend`, `packages/infra` with minimal TypeScript setups.
   * Add configuration files:

     * `tsconfig.base.json`
     * `.eslintrc.*`
     * `.prettierrc`
     * `.gitignore`

2. **Create documentation**

   * `docs/architecture.md` describing the client, backend, and infra at a high level.
   * `docs/domain-model.md` capturing the entities defined in Section 4.
   * `docs/api-contracts.md` listing all planned API endpoints and their request/response structures.

3. **Bootstrap infrastructure**

   * Implement minimal CDK stacks to create:

     * Cognito User Pool.
     * DynamoDB tables (initial minimal set).
     * S3 bucket(s).
     * A placeholder API Gateway and Lambda that returns a simple health check.

4. **Bootstrap backend**

   * Implement a simple health check route.
   * Implement basic authorization middleware to validate Cognito JWTs.

5. **Bootstrap frontend**

   * Create Expo app with TypeScript and navigation.
   * Add basic screens for:
     * Authentication
     * Hunt list
   * Wire a simple call to the backend health endpoint.

Subsequent tickets must build up the full functionality described earlier.

## Project Structure & Module Organization
- Keep product code in `src/`; feature folders own UI + logic; shared utilities live in `src/shared` or `src/lib`.
- Tests sit near code (`src/**/__tests__`) or in `tests/`. Fixtures/snapshots belong in `tests/fixtures`.
- Assets (images, seed data, schema files) live in `assets/` with a short README when formats are non-obvious.
- Generated docs (diagrams, ADRs) land in `docs/`; include editable sources next to exports.

## Build, Test, and Development Commands
- Prefer one entrypoint via `Makefile` or `package.json` scripts: `make install`, `make dev`, `make test`, `make lint`.
- Node: `npm run dev` (serve/watch), `npm test` (unit), `npm run lint` (ESLint), `npm run format` (Prettier).
- Python: `make venv`, `make test` (pytest), `make format` (black/ruff), `make check` (lint + type check).

## Coding Style & Naming Conventions
- Indent: 2 spaces for JS/TS/JSON/YAML, 4 for Python. Target lines <100 chars.
- Directories use kebab-case. Files follow language norms: `PascalCase` React components, `snake_case.py`, `kebab-case.ts`.
- Run formatters before commits: `prettier` + `eslint` (JS/TS); `black` + `ruff` (Python). Keep configs checked in.

## Testing Guidelines
- Co-locate tests and mirror names: `widget.test.ts`, `service_test.py`. Integration tests use suffix `.int.test.ts` or `@slow`.
- Aim for 80%+ line coverage once stable; enforce via CI when available.
- Keep fast unit tests as default; separate smoke/integration so CI can shard.

## Commit & Pull Request Guidelines
- Use Conventional Commits (e.g., `feat: add mixer pipeline skeleton`, `fix: handle empty payloads`, `chore: bump tooling`). Keep scopes small.
- PRs: state intent, key changes, tests run, and linked issues. Add screenshots/logs for UI or behavior shifts.
- Keep diffs focused; split refactors from features. Update docs when behavior or APIs change.

## Security & Configuration Tips
- Never commit secrets; use `.env.example` plus `direnv`/`dotenv`. Document new env vars with purpose and type.
- Pin dependencies and keep lockfiles (`package-lock.json`, `poetry.lock`) in VCS. Review licenses when adding packages.

All agents must treat this file as the primary reference for **what the app does** and **how it should be tested** across platforms.
---

Codex must follow this AGENTS.md file for all work on this repository.

```
::contentReference[oaicite:0]{index=0}
```

