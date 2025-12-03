Below are 10 tickets for **Phase 2: Core Infrastructure Bootstrap (AWS & CDK)**.
They assume Phase 1 is complete (monorepo, infra package with empty CDK app, backend health endpoint for local use).

Each ticket is self-contained and describes the work Codex should do, how to test it, and what constitutes acceptance.

---

### Ticket 2.1: Install and Configure AWS CDK Toolkit in Infra Package

**Title**
Install and Configure AWS CDK Toolkit in Infra Package

**Features**

* Ensure `aws-cdk` CLI and libraries are available in the `infra` package.
* Configure `cdk.json` and CDK app entrypoint correctly.
* Confirm CDK app synthesizes successfully.

**Description**
This ticket ensures the infrastructure package is correctly configured for AWS CDK. Codex must install the AWS CDK toolkit and libraries (if not already present), define `cdk.json` in `packages/infra`, and verify that the CDK app can synthesize a CloudFormation template using the existing placeholder `CoreStack`. No AWS resources will be deployed yet.

**Infrastructure**

* No AWS resources deployed.
* CDK configuration only.

**Steps (guidance for Codex)**

1. In `packages/infra/package.json`, confirm or add dependencies:

   * `"aws-cdk-lib"`
   * `"constructs"`
2. Add a devDependency or rely on a global `cdk` install; prefer local devDependency:

   * `"aws-cdk"` (CLI library)
3. Create or update `packages/infra/cdk.json` with content similar to:

   ```json
   {
     "app": "npx ts-node ./bin/app.ts",
     "context": {}
   }
   ```
4. Ensure `bin/app.ts` creates a CDK `App` and instantiates `CoreStack` (or equivalent), for example:

   ```ts
   const app = new cdk.App();
   new CoreStack(app, 'ScavengerHuntCoreStack', {});
   ```
5. Update `packages/infra/tsconfig.json` to include `"bin"` and `"lib"` in `include` and use module settings compatible with CDK (e.g., `"module": "commonjs"`).
6. Ensure `packages/infra/package.json` scripts include:

   * `"cdk:synth": "cdk synth"`
   * `"cdk:list": "cdk list"`
7. From the repo root, ensure there are root scripts (or add them if missing):

   * `"cdk:synth": "npm run cdk:synth --workspace infra"`
   * `"cdk:list": "npm run cdk:list --workspace infra"`
8. Run `npm run build:infra` to compile TypeScript.
9. Run `npm run cdk:synth` from the root to synthesize a template.

**Testing**

* `npm run build:infra` must succeed.
* `npm run cdk:synth` must succeed and output a CloudFormation template.
* `npm run cdk:list` must list `ScavengerHuntCoreStack` (or the stack name used).

**Acceptance Criteria**

* `packages/infra` has a working `cdk.json` pointing to `bin/app.ts`.
* `npm run build:infra`, `npm run cdk:synth`, and `npm run cdk:list` all succeed without errors.
* `ScavengerHuntCoreStack` (or equivalent) appears in `cdk list`.
* All changes are committed.

---

### Ticket 2.2: Define Environment Configuration and CDK Context Handling

**Title**
Define Environment Configuration and CDK Context Handling

**Features**

* Define a simple mechanism for environment configuration (account, region, stage).
* Configure CDK to use `AWS_PROFILE=codex-sandbox` and `AWS_REGION=us-east-1` by default.
* Allow future extension to multiple environments (e.g., `dev`, `prod`).

**Description**
This ticket introduces a lightweight configuration pattern so that CDK stacks can be instantiated with consistent account and region settings. Codex must implement a helper that reads environment variables and provides defaults suited to the Codex sandbox environment.

**Infrastructure**

* No resources deployed yet.
* CDK configuration utilities only.

**Steps (guidance for Codex)**

1. In `packages/infra/src` or `lib`, create a small helper module, e.g., `env-config.ts`, that:

   * Reads `process.env.CDK_DEFAULT_ACCOUNT` and `process.env.CDK_DEFAULT_REGION` if present, falling back to `AWS_ACCOUNT`/`AWS_REGION` or hard-coded defaults.
   * For this project, default region is `us-east-1`.
2. In `bin/app.ts`, use the helper to set `env` when instantiating stacks:

   ```ts
   const app = new cdk.App();
   const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
   new CoreStack(app, 'ScavengerHuntCoreStack', { env });
   ```
3. Document in a comment that Codex should run CDK commands with:

   * `AWS_PROFILE=codex-sandbox`
   * `AWS_REGION=us-east-1`
4. Optionally add CDK context or tags for `stage` (e.g., `"dev"` hard-coded for now).
5. Update docs (e.g., `docs/architecture.md` or `README.md`) to mention environment variables and how to run CDK.

**Testing**

* Run `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` and ensure synthesis succeeds.
* Confirm the generated template sets `Region` to `us-east-1`.

**Acceptance Criteria**

* `CoreStack` (and future stacks) use an `env` object for account/region configuration.
* CDK synth works when executed with `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1`.
* Documentation explains which environment variables to set before running CDK commands.
* Changes are committed.

---

### Ticket 2.3: Create Core S3 Bucket for Future Static Assets

**Title**
Create Core S3 Bucket for Future Static Assets

**Features**

* Add an S3 bucket to `CoreStack` for general static assets (e.g., temporary frontend hosting or configuration files).
* Configure sensible defaults (versioning on, block public access by default).
* Output the bucket name as a CloudFormation stack output.

**Description**
This ticket adds an S3 bucket to the existing `CoreStack`. The bucket will not yet be used for media uploads or hosting, but it provides a first deployed resource and validates that CDK deployment works. Public access should be blocked; future stacks can opt-in to public access if needed.

**Infrastructure**

* Resources to be created in `ScavengerHuntCoreStack` (or equivalent):

  * One S3 bucket with:

    * Versioning enabled.
    * Block public access enabled.
* One CloudFormation output exposing the bucket name.

**Steps (guidance for Codex)**

1. In `packages/infra/lib/core-stack.ts`, import S3 constructs from `aws-cdk-lib/aws-s3`.
2. Create a new bucket, e.g.:

   ```ts
   const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
     versioned: true,
     blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
     removalPolicy: cdk.RemovalPolicy.RETAIN,
   });
   ```
3. Add a `CfnOutput` that exposes the bucket name:

   ```ts
   new cdk.CfnOutput(this, 'AssetsBucketName', {
     value: assetsBucket.bucketName,
   });
   ```
4. Run `npm run build:infra`.
5. Run `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` and verify that the template includes the S3 bucket and output.

**Testing**

* CDK synth must succeed and show the S3 bucket resource in the synthesized template.
* No changes to other stacks or errors introduced.

**Acceptance Criteria**

* `CoreStack` defines a versioned, private S3 bucket for assets.
* `CoreStack` produces a CloudFormation output with the bucket name.
* `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` succeed.
* Changes are committed.

---

### Ticket 2.4: Implement AWS Lambda Health Handler in Backend

**Title**
Implement AWS Lambda Health Handler in Backend

**Features**

* Add a Lambda-compatible health handler in `packages/backend`.
* Ensure the handler reuses or mirrors the existing local `/health` behavior.
* Export the handler for use by CDK.

**Description**
This ticket adds an AWS Lambda handler to the backend that returns a health payload. This will later be wired into API Gateway by CDK. The Lambda handler should be a separate entrypoint from the local Express server so that it can be used independently in the serverless environment.

**Infrastructure**

* No AWS resources created yet.
* Backend Lambda code only.

**Steps (guidance for Codex)**

1. In `packages/backend/src`, create a file `lambda/healthHandler.ts`.
2. Implement a handler compatible with `APIGatewayProxyHandler` (from `aws-lambda` type definitions):

   * Ensure the `backend` package has `@types/aws-lambda` as a devDependency.
   * Return a 200 response with a JSON body similar to:

     ```json
     { "status": "ok", "service": "backend-lambda", "timestamp": "<ISO string>" }
     ```
3. Ensure `tsconfig.json` includes the `lambda` directory in `include`.
4. Update backend `package.json` build script to include the Lambda code in the compiled output (`dist/lambda/healthHandler.js`).
5. Add a simple unit test (e.g., `src/lambda/__tests__/healthHandler.test.ts`) that invokes the handler with a dummy event and asserts a 200 status code and valid JSON body.

**Testing**

* Run `npm run build:backend` from the root; ensure the health handler compiles.
* Run `npm test` and verify the new health handler test passes.

**Acceptance Criteria**

* `packages/backend/src/lambda/healthHandler.ts` exports a valid Lambda handler.
* The handler returns a 200 response with the expected JSON payload.
* Backend build includes the compiled handler file.
* All tests (including new handler test) pass.
* Changes are committed.

---

### Ticket 2.5: Add Lambda Function Resource to CoreStack for Health Endpoint

**Title**
Add Lambda Function Resource to CoreStack for Health Endpoint

**Features**

* Create an AWS Lambda function in `CoreStack` referencing the backend health handler.
* Grant minimal execution role permissions (CloudWatch Logs).
* Output the Lambda function name as a CloudFormation output.

**Description**
This ticket wires the backend Lambda health handler into infrastructure by defining a Lambda function in `CoreStack`. It verifies that backend build artifacts can be used by CDK and that the function has a basic execution role.

**Infrastructure**

* New resources in `ScavengerHuntCoreStack` (or equivalent):

  * A Lambda function for the health endpoint.
  * IAM role and policy allowing CloudWatch Logs writes.

**Steps (guidance for Codex)**

1. Decide on a packaging approach for Lambda code, e.g., using CDK `NodejsFunction` from `aws-cdk-lib/aws-lambda-nodejs` or a standard `lambda.Function` pointing at compiled TypeScript in `packages/backend/dist`. Prefer `NodejsFunction` for simplicity if allowed.
2. In `packages/infra/package.json`, add dependencies for Lambda constructs:

   * `aws-cdk-lib/aws-lambda`
   * `aws-cdk-lib/aws-lambda-nodejs` (if using NodejsFunction)
   * `aws-cdk-lib/aws-iam` (may already be present via `aws-cdk-lib`)
3. Ensure path resolution for Lambda code from `infra` to `backend` is correct. A common pattern is:

   * Use `NodejsFunction` with `entry` set to `../../backend/src/lambda/healthHandler.ts` relative to `infra` source.
4. In `core-stack.ts`, add a Lambda function, e.g.:

   ```ts
   const healthFunction = new lambdaNodejs.NodejsFunction(this, 'HealthLambda', {
     entry: path.join(__dirname, '..', '..', '..', 'backend', 'src', 'lambda', 'healthHandler.ts'),
     runtime: lambda.Runtime.NODEJS_18_X,
     handler: 'handler',
   });
   ```

   * Import `path`, `lambda`, `lambda-nodejs` as needed.
5. Add a CloudFormation output:

   ```ts
   new cdk.CfnOutput(this, 'HealthLambdaName', {
     value: healthFunction.functionName,
   });
   ```
6. Run `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth`.

**Testing**

* CDK synth must succeed and show the Lambda function resource and output in the template.
* No TypeScript errors in the infra package.

**Acceptance Criteria**

* `CoreStack` defines a Lambda function that uses the backend Lambda health handler as entrypoint.
* CloudFormation output exposes the Lambda function name.
* `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` succeed.
* Changes are committed.

---

### Ticket 2.6: Add API Gateway and Integrate with Health Lambda

**Title**
Add API Gateway and Integrate with Health Lambda

**Features**

* Create a REST API Gateway in `CoreStack`.
* Integrate the `/health` GET resource with the health Lambda function.
* Output the API Gateway base URL.

**Description**
This ticket exposes the Lambda health function via a publicly accessible HTTP endpoint using API Gateway. It configures a simple REST API with a `/health` path and GET method, then outputs the API URL so clients can use it.

**Infrastructure**

* New resources in `ScavengerHuntCoreStack` (or equivalent):

  * API Gateway REST API.
  * Resource/method configuration for `/health` → GET → Lambda integration.

**Steps (guidance for Codex)**

1. In `packages/infra/lib/core-stack.ts`, import API Gateway constructs:

   * `aws-cdk-lib/aws-apigateway`
2. Create a REST API, e.g.:

   ```ts
   const api = new apigateway.RestApi(this, 'ScavengerHuntApi', {
     restApiName: 'ScavengerHuntApi',
   });
   ```
3. Add a `/health` resource:

   ```ts
   const healthResource = api.root.addResource('health');
   healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));
   ```

   * Use the `healthFunction` reference created in Ticket 2.5.
4. Add a CloudFormation output for the API URL:

   ```ts
   new cdk.CfnOutput(this, 'ApiBaseUrl', {
     value: api.url,
   });
   ```
5. Run `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` to confirm.

**Testing**

* CDK synth must show the API Gateway resources and integration.
* No TypeScript or CDK errors.

**Acceptance Criteria**

* API Gateway REST API with `/health` GET is defined in `CoreStack`.
* A stack output `ApiBaseUrl` (or similar) is present in the synthesized template.
* `npm run build:infra` and `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` succeed.
* Changes are committed.

---

### Ticket 2.7: Implement CDK Bootstrap and First Deploy of CoreStack

**Title**
Implement CDK Bootstrap and First Deploy of CoreStack

**Features**

* Bootstrap the AWS account for CDK usage.
* Deploy `ScavengerHuntCoreStack` to the `codex-sandbox` account in `us-east-1`.
* Verify that S3 bucket, Lambda, and API Gateway are created.

**Description**
This ticket performs the first actual deployment of infrastructure. Codex must run CDK bootstrap for the target account and region, then deploy `CoreStack`. After deployment, Codex validates that the key resources exist in AWS.

**Infrastructure**

* Resources created in AWS:

  * CDK bootstrap resources (e.g., CDK toolkit bucket).
  * S3 assets bucket (from Ticket 2.3).
  * Health Lambda function (from Ticket 2.5).
  * API Gateway REST API (from Ticket 2.6).

**Steps (guidance for Codex)**

1. From the root, run:

   ```bash
   AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk bootstrap
   ```

   * This will create CDK bootstrap resources in the account.
2. After bootstrap succeeds, deploy `CoreStack` (or all stacks if only one):

   ```bash
   AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy ScavengerHuntCoreStack
   ```

   * Use the stack name actually defined in `bin/app.ts`.
3. Capture the stack outputs from the deploy command (bucket name, Lambda name, API URL).
4. Optionally, verify via AWS console or CLI that:

   * The S3 bucket exists.
   * The Lambda function exists.
   * The API Gateway is created.

**Testing**

* Successful execution of `cdk bootstrap` with no errors.
* Successful execution of `cdk deploy` with no errors.
* Confirm stack outputs are present (printed in the terminal).

**Acceptance Criteria**

* CDK bootstrap completed successfully for `codex-sandbox` in `us-east-1`.
* `ScavengerHuntCoreStack` deployed successfully with S3 bucket, Lambda, and API Gateway.
* Stack outputs for `AssetsBucketName`, `HealthLambdaName`, and `ApiBaseUrl` (or equivalent) are visible after deploy.
* Changes (if any) are committed.

---

### Ticket 2.8: Add Backend Integration Test for Deployed Health API

**Title**
Add Backend Integration Test for Deployed Health API

**Features**

* Add a Jest integration test that calls the deployed `/health` API Gateway endpoint.
* Use the stack output (API URL) for the test configuration.
* Validate HTTP 200 and expected JSON structure.

**Description**
This ticket verifies that the deployed health endpoint is actually reachable over the network and returns the correct payload. Codex must introduce a simple integration test that uses the API Gateway base URL (provided via environment variable or configuration file) to call `/health` and assert the response.

**Infrastructure**

* Uses previously deployed resources; no new infrastructure.

**Steps (guidance for Codex)**

1. Decide how to pass the deployed API URL into tests. Options:

   * Environment variable `SCAVENGER_API_BASE_URL`.
   * A small local config file not checked into source control.
2. Update `README.md` to instruct that, after deployment, the user (or Codex) should set:

   * `SCAVENGER_API_BASE_URL=<ApiBaseUrl from CDK output>`
3. In `packages/backend/src/__tests__/integration/healthApi.test.ts`, add a test that:

   * Reads `process.env.SCAVENGER_API_BASE_URL`.
   * If undefined, skips the test with a clear message.
   * Otherwise, sends an HTTP GET to `${baseUrl}health`.
   * Asserts:

     * HTTP status code is 200.
     * Response body JSON has `status: "ok"` (or expected value) and a `timestamp` field.
4. Ensure Jest config includes the integration tests folder.
5. Run:

   * `SCAVENGER_API_BASE_URL=<ApiBaseUrl> npm test`
   * Confirm the integration test passes.

**Testing**

* Run tests without `SCAVENGER_API_BASE_URL` set; verify integration test is skipped with a clear message.
* Run tests with `SCAVENGER_API_BASE_URL` set; verify integration test runs and passes.

**Acceptance Criteria**

* An integration test exists that validates the deployed `/health` API.
* When `SCAVENGER_API_BASE_URL` is configured, `npm test` runs and passes the integration test.
* Test is skipped gracefully when the environment variable is not set.
* Documentation describes how to set `SCAVENGER_API_BASE_URL`.
* Changes are committed.

---

### Ticket 2.9: Wire Frontend to Use Deployed Health API (Optional Check Screen)

**Title**
Wire Frontend to Use Deployed Health API (Optional Check Screen)

**Features**

* Add a simple “API Health Check” UI element or screen in the frontend.
* Allow configuration of the backend API URL via environment or config.
* Call the `/health` endpoint and display status.

**Description**
This ticket adds a minimal integration between the frontend and the deployed backend health API. It should not be production UX, but a simple screen or button that, when triggered, calls the API and shows whether the backend is reachable.

**Infrastructure**

* Uses already deployed API Gateway.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Decide on frontend configuration mechanism for the API base URL (e.g., `.env` + `expo-constants` or `app.config.*`):

   * For simplicity, use an environment variable like `EXPO_PUBLIC_API_BASE_URL`.
2. Update `packages/frontend` configuration to read `EXPO_PUBLIC_API_BASE_URL` and expose it as a constant.
3. Add a simple screen or component, e.g., `HealthCheckScreen` that:

   * On mount or on button press, fetches `<API_BASE_URL>health`.
   * Displays the result (e.g., “Backend OK” or error message).
4. Add a navigation route or button from the main screen to access `HealthCheckScreen`.
5. Run `EXPO_PUBLIC_API_BASE_URL=<ApiBaseUrl> npm run dev:frontend` from the root.
6. Manually verify via browser (web) that triggering the health check shows successful status.

**Testing**

* Optionally add a simple unit test that mocks `fetch` and verifies `HealthCheckScreen` behavior.
* Manual test:

  * Start frontend with `EXPO_PUBLIC_API_BASE_URL` set.
  * Use UI to trigger health check.
  * Confirm status is displayed based on API response.

**Acceptance Criteria**

* Frontend reads the backend API base URL from configuration.
* `HealthCheckScreen` (or equivalent) can call `/health` and show status.
* With a valid `EXPO_PUBLIC_API_BASE_URL`, the screen successfully shows that the backend is “OK.”
* Changes are committed.

---

### Ticket 2.10: Phase 2 Core Infrastructure Validation and Documentation

**Title**
Phase 2 Core Infrastructure Validation and Documentation

**Features**

* Validate the full Phase 2 infrastructure setup end-to-end.
* Run all relevant builds, tests, and basic manual checks.
* Update documentation to reflect Phase 2 capabilities and commands.

**Description**
This ticket confirms that Phase 2 is complete and documents the outcome. Codex must validate that CDK bootstrap and deploy work, the backend health Lambda and API are reachable, and the frontend can communicate with the deployed health endpoint. Documentation must describe how to perform these actions.

**Infrastructure**

* Uses the already deployed `ScavengerHuntCoreStack`, Lambda, API Gateway, and S3 bucket.
* No new resources.

**Steps (guidance for Codex)**

1. From the root, with environment configured:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy ScavengerHuntCoreStack`
   * Capture the `ApiBaseUrl` output.
2. Set environment variables:

   * `SCAVENGER_API_BASE_URL=<ApiBaseUrl>`
   * `EXPO_PUBLIC_API_BASE_URL=<ApiBaseUrl>`
3. Run tests:

   * `npm run lint`
   * `npm test` (ensuring integration test runs and passes when `SCAVENGER_API_BASE_URL` is set).
4. Run backend (if needed locally) and frontend dev servers to ensure no regressions:

   * `npm run dev:backend` (optional, local health endpoint).
   * `npm run dev:frontend` and verify `HealthCheckScreen` calls the deployed API successfully.
5. Update `README.md` and `docs/architecture.md` (or create the latter if not present) to document:

   * How to bootstrap CDK.
   * How to deploy `CoreStack`.
   * How to obtain `ApiBaseUrl` and configure environment variables.
   * How the health Lambda and API are structured.

**Testing**

* All root-level commands must succeed:

  * `npm run lint`
  * `npm test`
  * `npm run build:backend`
  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy ScavengerHuntCoreStack`
* Manual checks:

  * Calling `<ApiBaseUrl>health` with curl or browser returns the expected JSON.
  * Frontend health check screen shows success.

**Acceptance Criteria**

* Infrastructure is successfully deployed and verified in `codex-sandbox` account, `us-east-1`.
* Tests (including integration call to `/health`) and linting all pass.
* Frontend can call the deployed `/health` endpoint when configured with the correct API base URL.
* Documentation clearly explains Phase 2 infrastructure and usage.
* `git status` shows a clean working tree with all changes committed.

