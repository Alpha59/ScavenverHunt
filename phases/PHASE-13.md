Below are **10 tickets for Phase 13: CI/CD, Observability & Security Hardening**.

Assumptions for Codex:

* Monorepo with `packages/frontend`, `packages/backend`, `packages/infra`.
* AWS deployment already working via CDK (`CoreStack`, `DataStack`, `MediaStack`, `NotificationStack`, etc.).
* Repository hosted on GitHub (adjust slightly if different).

---

### Ticket 13.1: Monorepo Build, Lint & Test Scripts Standardization

**Title**
Monorepo Build, Lint & Test Scripts Standardization

**Features**

* Unified root-level `npm` scripts for:

  * `lint`
  * `test`
  * `build`
* Each package exposes consistent scripts:

  * `lint`, `test`, `build`
* Clear exit codes for CI integration.

**Description**
This ticket ensures the repository has a consistent set of scripts that CI can invoke. It standardizes build, lint, and test commands across backend, frontend, and infra so GitHub Actions can run the entire pipeline with a small set of root scripts.

**Infrastructure**

* No AWS changes.
* Only `package.json` and script wiring in the monorepo.

**Steps (for Codex)**

1. In root `package.json`, define:

   * `"lint": "npm run lint:frontend && npm run lint:backend"` (and infra if applicable).
   * `"lint:frontend": "cd packages/frontend && npm run lint"`
   * `"lint:backend": "cd packages/backend && npm run lint"`
   * `"test": "npm run test:frontend && npm run test:backend"`
   * `"build": "npm run build:frontend && npm run build:backend && npm run build:infra"`
2. In each package:

   * `packages/frontend/package.json`:

     * Ensure `lint` runs ESLint (and TypeScript checks if used).
     * Ensure `test` runs Jest or equivalent.
     * Ensure `build` builds the app (e.g., `expo export` / `react-native` bundle as appropriate).
   * `packages/backend/package.json`:

     * Ensure `lint` runs ESLint/TS checks.
     * Ensure `test` runs Jest/unit tests.
     * Ensure `build` compiles TypeScript to `dist/`.
   * `packages/infra/package.json`:

     * Ensure `build` runs `tsc` or `cdk synth` check as appropriate.
3. Make sure all scripts fail with non-zero status on error.

**Testing**

* From the repo root:

  * `npm run lint`
  * `npm run test`
  * `npm run build`
* Verify each completes successfully on a clean checkout.

**Acceptance Criteria**

* Root scripts (`lint`, `test`, `build`) invoke the correct subpackage tasks.
* All packages provide consistent `lint`, `test`, and `build` scripts.
* Scripts fail properly on lint/test/build errors.
* Repository builds and tests successfully; changes are committed.

---

### Ticket 13.2: GitHub Actions CI Workflow (`ci.yml`)

**Title**
GitHub Actions CI Workflow (`ci.yml`)

**Features**

* GitHub Actions workflow triggered on:

  * Push to `main` (or default branch).
  * Pull requests targeting `main`.
* Steps:

  * Checkout code.
  * Setup Node environment and cache dependencies.
  * Install dependencies.
  * Run `lint`, `test`, `build`.

**Description**
This ticket adds a basic CI workflow to ensure that every push and pull request is validated by build, lint, and test steps. It integrates the standardized scripts from Ticket 13.1 with GitHub Actions.

**Infrastructure**

* GitHub Actions configuration only:

  * `.github/workflows/ci.yml`
* No AWS changes.

**Steps (for Codex)**

1. Create `.github/workflows/ci.yml` with:

   * `on`:

     * `push` to `main`.
     * `pull_request` targeting `main`.
   * `jobs.ci`:

     * `runs-on: ubuntu-latest`.
2. Steps in job:

   * `actions/checkout@v4`
   * `actions/setup-node@v4`:

     * Configure Node version (e.g., `18.x` or version used locally).
     * Enable Yarn/npm cache if used.
   * Install dependencies:

     * `npm ci` at repo root.
   * Run:

     * `npm run lint`
     * `npm run test`
     * `npm run build`
3. Configure minimal concurrency if desired (e.g., `concurrency` group per branch to avoid overlapping runs).

**Testing**

* Push a branch or open a PR to trigger the workflow.
* Verify in GitHub:

  * Workflow runs.
  * All steps succeed.

**Acceptance Criteria**

* CI workflow runs automatically on pushes and PRs to `main`.
* CI executes lint, test, and build for the entire monorepo.
* Failing lint/test/build steps cause the workflow to fail.
* `.github/workflows/ci.yml` is present and committed.

---

### Ticket 13.3: Optional Staging Deploy Workflow (`deploy-staging.yml`)

**Title**
Optional Staging Deploy Workflow (`deploy-staging.yml`)

**Features**

* GitHub Actions workflow to deploy to a staging environment on:

  * Manual trigger (`workflow_dispatch`) or
  * Pushes to a `staging` branch.
* Executes CDK deployment for staging stacks.

**Description**
This ticket adds an optional deploy workflow that can be used to deploy the application to a staging AWS environment from CI. It should be safe, explicit, and separated from the regular CI pipeline.

**Infrastructure**

* GitHub Actions workflow `.github/workflows/deploy-staging.yml`.
* AWS credentials for CI (e.g., GitHub OIDC + IAM role) must be configured externally in AWS and repository secrets.

**Steps (for Codex)**

1. Create `.github/workflows/deploy-staging.yml`:

   * `on`:

     * `workflow_dispatch`.
     * Optionally: `push` to `staging`.
   * `jobs.deploy-staging`:

     * `runs-on: ubuntu-latest`.
2. Steps:

   * Checkout and set up Node as in CI.
   * Install dependencies: `npm ci`.
   * Assume AWS role via OIDC or use `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` stored as secrets:

     * Use `aws-actions/configure-aws-credentials@v4` with `role-to-assume`, `aws-region`.
   * Run:

     * `npm run build:infra`
     * `AWS_PROFILE` is not used in CI; rely on configured credentials.
     * `npx cdk synth` for sanity.
     * `npx cdk deploy --require-approval never <StagingStacks>` (e.g., `CoreStackStaging`, `DataStackStaging`, etc., consistent with infra naming).
3. Note: Codex must match stack names to existing staging configuration in CDK.

**Testing**

* Manually trigger the workflow from the GitHub Actions UI with staging parameters.
* Confirm:

  * Synthesis completes.
  * Deployment succeeds in AWS.

**Acceptance Criteria**

* A deploy workflow for staging exists and is callable via `workflow_dispatch` (and optionally on `staging` branch pushes).
* The workflow builds infra and deploys CDK stacks to staging.
* Workflow fails if CDK deploy fails.
* Workflow file is committed and documented.

---

### Ticket 13.4: Backend Structured Logging & Correlation IDs

**Title**
Backend Structured Logging & Correlation IDs

**Features**

* Consistent structured logging format for all Lambdas.
* Request-level correlation IDs:

  * Extract from incoming header (e.g., `x-request-id`) or generate if missing.
* Logging of key fields:

  * `requestId`, `userId`, `huntId`, `path`, `statusCode`, latency.

**Description**
This ticket introduces structured logging to make troubleshooting production issues easier. All Lambdas log using a consistent JSON format with correlation IDs and key contextual fields.

**Infrastructure**

* Uses existing CloudWatch Logs groups for Lambda.
* No new AWS resources.

**Steps (for Codex)**

1. Create a logging utility in `packages/backend/src/utils/logger.ts`:

   * Expose functions such as:

     * `logInfo(context, message, extraFields?)`
     * `logError(context, message, extraFields?)`
     * All output as JSON:

       ```ts
       {
         level: 'info' | 'error',
         timestamp: string,
         message: string,
         requestId?: string,
         userId?: string,
         huntId?: string,
         path?: string,
         ...extraFields
       }
       ```
2. Request correlation:

   * In a common API handler wrapper or middleware:

     * Extract `x-request-id` from headers or generate a UUID.
     * Attach `requestId` and `userId` (if available) to a `RequestContext` object that is passed into handlers.
3. Update key Lambda handlers to use the logger:

   * For each REST handler:

     * Log at entry:

       * Path, method, userId, requestId.
     * Log at successful completion:

       * Status code, key IDs (huntId, teamId, submissionId).
     * Log errors with stack traces and context.
4. Ensure logs avoid sensitive data (no tokens, secrets, or large payloads in logs).

**Testing**

* Unit tests:

  * For logger utility: ensure correct JSON shape and inclusion of context fields.
  * For at least one handler: confirm logs are written with `requestId` and `userId`.
* Manual:

  * Deploy to a dev environment.
  * Trigger several endpoints and examine CloudWatch Logs to confirm structured entries with correlation IDs.

**Acceptance Criteria**

* All main backend handlers use a shared structured logger.
* Each request has a correlation ID that can be traced through logs.
* Logs avoid sensitive data and provide enough context (userId, huntId, path) to debug.
* Backend builds/tests pass; changes are committed.

---

### Ticket 13.5: Backend Metrics & CloudWatch Alarms for API Errors and Latency

**Title**
Backend Metrics & CloudWatch Alarms for API Errors and Latency

**Features**

* Custom CloudWatch metrics for:

  * API 4xx/5xx counts per service.
  * Average request latency per handler group.
* CloudWatch alarms for:

  * Elevated 5xx error rates.
  * High average latency.

**Description**
This ticket configures CloudWatch metrics and alarms that notify maintainers if the API encounters frequent errors or slow responses. It uses either Lambda’s built-in metrics or custom metrics emitted from code.

**Infrastructure**

* CDK changes in `CoreStack` (and any other backend stacks):

  * CloudWatch alarms using:

    * Lambda `Errors`, `Duration` metrics, or
    * API Gateway `5xx`, `Latency` metrics.
* Optionally, SNS topic for alerts (if not already present).

**Steps (for Codex)**

1. Decide metric source:

   * Prefer API Gateway metrics for 4xx/5xx and Latency per API stage, and/or Lambda metrics for Errors/Duration.
2. In `CoreStack`:

   * Create CloudWatch alarms, e.g.:

     * `APIGateway5xxAlarm`:

       * Metric: API 5xx count or rate over 5 minutes.
       * Threshold: e.g., 1 or more 5xx in 5 minutes (tune as appropriate).
     * `LambdaErrorAlarm` for critical Lambdas.
     * `APILatencyAlarm`:

       * Metric: p95 latency above threshold (e.g., > 2s) over 5 minutes.
   * If an `AlarmsTopic` SNS topic already exists, use it; otherwise:

     * Optionally create SNS topic and output ARN so subscriptions can be added manually.
3. Optionally, add custom metrics from backend:

   * Use a small metric helper (or existing CloudWatch logger from earlier phases) to emit per-handler latency and error counts.
4. Parameterize alarm thresholds via CDK props if needed.

**Testing**

* `npm run build:infra`, `cdk synth`.
* `cdk deploy CoreStack` to a dev environment.
* Manual:

  * Intentionally invoke an endpoint that returns 500 (e.g., test stub or misconfigured route in dev) and verify alarm transitions to `ALARM` state.
  * Generate some load or use CloudWatch console to validate latency metric.

**Acceptance Criteria**

* CloudWatch alarms exist for critical error rate and latency.
* Alarms are visible in the CloudWatch console and connected to an SNS topic or equivalent for future notification.
* Metrics reflect actual traffic.
* Infra builds/tests pass; changes are committed.

---

### Ticket 13.6: IAM Policy Review & Least-Privilege Refinement

**Title**
IAM Policy Review & Least-Privilege Refinement

**Features**

* Audit IAM roles used by:

  * Backend Lambdas.
  * CDK deployment roles.
  * CI deploy role (if applicable).
* Reduce overly broad permissions (e.g., `*` actions or resources) where possible.
* Document remaining justified broad permissions.

**Description**
This ticket tightens IAM to follow least-privilege principles. It reviews existing IAM statements for Lambda roles and CDK roles, reduces wide `*` patterns, and documents any unavoidable broad permissions.

**Infrastructure**

* CDK changes to IAM Role and Policy definitions.
* No new AWS services.

**Steps (for Codex)**

1. Identify IAM roles defined in `packages/infra`:

   * Lambda execution roles.
   * Any custom roles (e.g., `CodexSandboxDeveloperRole`, if present).
   * CI/CD-related roles (if defined).
2. For each role:

   * Replace broad actions with scoped ones:

     * Example: `dynamodb:*` → `dynamodb:GetItem`, `PutItem`, `Query`, `UpdateItem`, `Scan` on specific tables.
     * Example: `s3:*` → `s3:GetObject`, `PutObject`, `DeleteObject` on specific bucket or prefix.
   * Replace `Resource: '*'` with ARNs of specific resources where feasible.
3. Keep necessary broad permissions only where required:

   * CloudFormation/CDK deployment roles might need wide permissions; document these in a `docs/security-iam.md` file.
4. Re-run `cdk synth` to ensure no issues with policy size or structure.

**Testing**

* `npm run build:infra`, `cdk synth`.
* `cdk deploy` stacks to dev environment.
* Manual:

  * Exercise API flows (hunt creation, submissions, media upload, etc.) to verify no access-denied errors.
  * Inspect CloudWatch Logs for `AccessDenied` exceptions.

**Acceptance Criteria**

* Lambda roles and other runtime roles no longer use unnecessary wildcard actions or resources.
* Application remains fully functional without new authorization errors.
* Any remaining broad permissions are documented and justified.
* Infra builds/tests pass; changes are committed.

---

### Ticket 13.7: S3 Media Bucket Security & Pre-Signed URL Enforcement

**Title**
S3 Media Bucket Security & Pre-Signed URL Enforcement

**Features**

* Ensure media bucket:

  * Has block-public-access enabled.
  * No public ACLs or bucket policies granting world-readable access.
* All client access uses pre-signed URLs or authenticated proxy endpoints.
* Optional: server-side encryption enabled on bucket.

**Description**
This ticket hardens the storage for uploaded photos/videos. It ensures media objects are not directly publicly exposed, except via short-lived pre-signed URLs or API gateway proxies, and that the bucket is configured with standard security best practices.

**Infrastructure**

* CDK changes in `MediaStack` (or equivalent):

  * S3 bucket settings:

    * `blockPublicAccess`.
    * `publicReadAccess = false`.
    * Server-side encryption (`S3_MANAGED`) enabled if not already.

**Steps (for Codex)**

1. In `MediaStack`:

   * Explicitly set:

     * `publicReadAccess: false`.
     * `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL`.
     * Optional: `encryption: s3.BucketEncryption.S3_MANAGED`.
   * Ensure no bucket policy grants `Principal: '*'` read access.
2. Confirm media access pattern:

   * For uploads: continue to use pre-signed PUT URLs or secure API endpoints.
   * For viewing:

     * Use pre-signed GET URLs or a secure media proxy endpoint.
3. Review any existing code that assumes public S3 URLs; replace with pre-signed URL retrieval:

   * Backend endpoint to fetch pre-signed URL for a given media key if caller is authorized.
4. Add unit tests for any helper functions that generate pre-signed URLs to ensure expiration and permissions are correct.

**Testing**

* `npm run build:infra`, `cdk synth`, `cdk deploy MediaStack`.
* Manual:

  * Confirm S3 bucket’s public access is blocked in the AWS console.
  * Attempt to access object via a raw `https://bucket.s3.amazonaws.com/key` URL without pre-signed params:

    * Expect access denied.
  * Confirm app still loads media via pre-signed URLs.

**Acceptance Criteria**

* Media bucket is not publicly readable or writable.
* All media retrieval uses pre-signed URLs or secure API.
* Server-side encryption is enabled (if adopted).
* Application functionality remains intact.
* Infra builds/tests pass; changes are committed.

---

### Ticket 13.8: API Authentication & Authorization Regression Tests

**Title**
API Authentication & Authorization Regression Tests

**Features**

* Automated tests verifying that:

  * Protected endpoints reject unauthenticated requests.
  * Role-based access (Owner/Judge/Player) is enforced for key endpoints.
* Tests integrated into standard `npm test` pipeline.

**Description**
This ticket adds backend tests that specifically verify authentication and authorization boundaries. It guards against regressions where endpoints become inadvertently public or role checks are bypassed.

**Infrastructure**

* Backend test code only.
* No AWS changes.

**Steps (for Codex)**

1. Identify critical endpoints to cover (non-exhaustive but representative), for example:

   * Hunt creation (`POST /hunts`).
   * Hunt reports (`GET /hunts/{id}/report`).
   * Score adjustment (`POST /hunts/{id}/submissions/{submissionId}/adjustScore`).
   * Judge decisions (`POST /hunts/{id}/submissions/{submissionId}/decision`).
   * Player submissions (`POST /hunts/{id}/tasks/{taskId}/submissions`).
2. Add integration-ish tests (with local mocks) in `packages/backend/src/__tests__/authz.integration.test.ts`:

   * For each endpoint:

     * Call handler with no auth context → expect 401/403.
     * Call with valid auth but wrong role (e.g., non-owner for owner-only endpoint) → expect 403.
     * Call with valid auth and correct role → expect success.
3. Use test utilities to mock JWT or identity context injection, consistent with existing auth middleware.

**Testing**

* `npm run test` from root, ensuring new tests run.
* Confirm tests pass in CI (Ticket 13.2).

**Acceptance Criteria**

* Critical paths have coverage for unauthenticated and unauthorized access.
* Automated tests fail if endpoints become accessible without required roles/identity.
* Backend builds/tests pass; changes are committed.

---

### Ticket 13.9: Dependency & Secret Management Hardening

**Title**
Dependency & Secret Management Hardening

**Features**

* Add dependency vulnerability scan to CI.
* Ensure secrets (API keys, AWS credentials) are not stored in code or plain-text config.
* Document environment variable usage and secret management approach.

**Description**
This ticket improves security by adding automated checks for vulnerable dependencies and ensuring secrets are handled correctly. It also documents how environment variables and secrets must be configured for local and CI environments.

**Infrastructure**

* CI changes to run dependency scanning (e.g., `npm audit` or `pnpm audit`, or `npx snyk` if configured).
* No AWS changes.

**Steps (for Codex)**

1. Add a new CI step in `.github/workflows/ci.yml`:

   * After `npm ci`, run `npm audit --audit-level=high` or another appropriate command:

     * If using a more advanced scanner, integrate its CLI based on what is already in the project.
   * Ensure that only significant vulnerabilities (configurable threshold) fail CI.
2. Secret management check:

   * Scan repository for hardcoded AWS keys or tokens:

     * Use `git secrets` or simple grep to ensure obvious secrets are not checked in.
   * Verify environment variables used for:

     * Auth providers, AWS configuration, third-party APIs.
   * Ensure `.env`-style files are:

     * Ignored in `.gitignore`.
3. Add `docs/configuration-and-secrets.md`:

   * Document:

     * Which environment variables are needed for local development.
     * How secrets should be provided in CI (GitHub secrets / OIDC).
     * How AWS credentials are configured for deploy workflows.

**Testing**

* Run CI pipeline, including the new dependency scan step.
* Confirm:

  * No secrets are present in the repository.
  * `.env` files (if any) are ignored.

**Acceptance Criteria**

* CI includes a basic dependency vulnerability scan step.
* No secrets are committed into the repo; environment-based configuration is documented.
* Dependency scans run and can fail the pipeline on serious issues.
* CI and repo remain fully functional; changes are committed.

---

### Ticket 13.10: Phase 13 End-to-End CI/CD, Observability & Security Verification

**Title**
Phase 13 End-to-End CI/CD, Observability & Security Verification

**Features**

* Validate CI/CD workflows, logging, metrics, IAM, and bucket security end-to-end.
* Confirm alarms and metrics work in a dev/staging environment.
* Document CI/CD, observability, and security posture.

**Description**
This ticket confirms that all Phase 13 features are working coherently. It verifies the CI workflow, optional staging deployment, structured logging, metrics/alarms, IAM refinements, and S3 hardening. It also adds documentation so future maintainers understand the operational setup.

**Infrastructure**

* Uses all changes from Tickets 13.1–13.9.
* No new resources.

**Steps (for Codex)**

1. CI/CD validation:

   * On GitHub:

     * Confirm `ci.yml` runs on PR and `main` pushes.
     * Confirm `deploy-staging.yml` can be triggered and deploys successfully to staging.
2. Observability validation:

   * In dev/staging AWS account:

     * Trigger a normal request and confirm CloudWatch logs show structured entries with correlation IDs.
     * Trigger a controlled error (e.g., test endpoint) and confirm error logs and CloudWatch alarms react (5xx or Lambda Errors).
3. Security validation:

   * Confirm:

     * S3 media bucket is private and uses pre-signed URLs.
     * Restricted IAM policies still permit normal operation.
     * Authz regression tests pass, verifying access control.
4. Documentation:

   * Create or update:

     * `docs/ci-cd.md`:

       * Describe CI workflow, staging deploy, branch strategy.
     * `docs/observability.md`:

       * Explain structured logging, correlation IDs, metrics, and alarms.
     * `docs/security-overview.md`:

       * Summarize IAM hardening, S3 security model, and authentication/authorization boundaries.
   * Update `README.md` with brief sections linking to these docs.

**Testing**

* Run full root commands:

  * `npm run lint`
  * `npm run test`
  * `npm run build`
* Ensure CI passes on a test PR.
* Confirm CloudWatch alarms and IAM changes behave as expected in a manual test.

**Acceptance Criteria**

* CI builds, tests, and (optionally) deploys the application as designed.
* Logs, metrics, and alarms function correctly for normal and error scenarios.
* IAM and S3 security posture matches least-privilege and private-media requirements.
* Documentation for CI/CD, observability, and security is complete and accurate.
* Phase 13 is complete and repository state is clean, with all changes committed.

