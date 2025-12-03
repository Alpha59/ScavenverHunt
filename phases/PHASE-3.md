Below are 10 tickets for **Phase 3: Authentication & User Management**.

They assume Phases 1–2 are complete (monorepo, basic infra with `CoreStack`, API Gateway + health Lambda).
Each ticket is self-contained and includes enough detail for Codex to complete it and verify it.

---

### Ticket 3.1: Create AuthStack with Cognito User Pool and App Clients

**Title**
Create AuthStack with Cognito User Pool and App Clients

**Features**

* New CDK `AuthStack` in `packages/infra`.
* Cognito User Pool with basic configuration.
* Separate User Pool Clients for:

  * Web (SPA)
  * Native (iOS/Android)
* CloudFormation outputs for pool and client IDs.

**Description**
This ticket creates the dedicated authentication stack for the application. Codex will define a new CDK stack `AuthStack` that provisions a Cognito User Pool and two User Pool Clients (web and native). It will not yet configure identity providers (Apple/Google); those come in later tickets. Outputs will expose IDs necessary for backend token verification and frontend configuration.

**Infrastructure**

* New `AuthStack` with:

  * Cognito User Pool:

    * Email as primary username (or email+username if desired).
    * Standard security defaults (no custom password policies yet).
  * Cognito User Pool Client (Web):

    * No secret.
    * Enabled OAuth flows (authorization code, implicit if needed later).
    * Allowed callback/logout URLs to be parameterized (or temporarily set to localhost).
  * Cognito User Pool Client (Native):

    * No secret.
    * Enabled for authorization code flow for mobile redirect URIs (placeholder URIs for now).
* Stack Outputs:

  * `UserPoolId`
  * `UserPoolClientWebId`
  * `UserPoolClientNativeId`

**Steps (guidance for Codex)**

1. In `packages/infra/lib`, create `auth-stack.ts` defining `AuthStack extends cdk.Stack`.
2. In `bin/app.ts`, instantiate `AuthStack` alongside `CoreStack` with the same `env` configuration.
3. In `AuthStack`, use Cognito constructs from `aws-cdk-lib/aws-cognito` to define:

   * `UserPool` with email sign-in.
   * `UserPoolClient` for web.
   * `UserPoolClient` for native.
4. For now, use placeholder callback URLs (e.g., `http://localhost:19006` for Expo web, `myapp://callback` for native). These can be refined later.
5. Add `CfnOutput`s for user pool and client IDs.
6. Ensure `AuthStack` is included in `cdk synth` and `cdk deploy` commands.

**Testing**

* Run from root:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
* Confirm synthesized template includes `AuthStack` with:

  * User Pool resource.
  * Two User Pool Clients.
* Deploy:

  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy AuthStack`
* Verify:

  * Deployment succeeds.
  * Outputs for `UserPoolId`, `UserPoolClientWebId`, `UserPoolClientNativeId` are printed.

**Acceptance Criteria**

* `AuthStack` exists and is instantiated from `bin/app.ts`.
* Cognito User Pool and two User Pool Clients are deployed to `codex-sandbox` in `us-east-1`.
* Stack outputs expose user pool and client IDs.
* `cdk synth` and `cdk deploy AuthStack` run without errors.
* Changes are committed.

---

### Ticket 3.2: Configure Google as Cognito Identity Provider

**Title**
Configure Google as Cognito Identity Provider

**Features**

* Configure Google as an identity provider (IdP) for the Cognito User Pool.
* Link Google IdP to Web and Native User Pool Clients.
* Output configuration details required by frontend (e.g., domain, client IDs).

**Description**
This ticket enables Google sign-in via Cognito. Codex will configure a Cognito Identity Provider for Google and attach it to both the web and native User Pool Clients. Client IDs and secrets for Google are assumed to be provided via environment variables or SSM/Secrets (for now, environment variables are acceptable). This prepares the Hosted UI for Google-based sign-in, which will be used by the frontend.

**Infrastructure**

* Modify `AuthStack` to add:

  * Cognito User Pool Identity Provider (Google).
* Update User Pool Clients:

  * Add Google IdP to `supportedIdentityProviders`.
  * Configure OAuth scopes and flows if needed (openid, email, profile).

**Steps (guidance for Codex)**

1. Assume environment variables (or CDK context) provide Google OAuth credentials:

   * `GOOGLE_OAUTH_CLIENT_ID`
   * `GOOGLE_OAUTH_CLIENT_SECRET`
   * If unavailable, include comments indicating these must be provided before deploy.
2. In `AuthStack`, import `UserPoolIdentityProviderGoogle` from `aws-cdk-lib/aws-cognito`.
3. Create a Google IdP attached to the existing User Pool using the above credentials.
4. Update both web and native User Pool Clients:

   * `supportedIdentityProviders` includes `COGNITO` and `GOOGLE`.
   * `oAuth` config includes standard scopes: `openid`, `email`, `profile`.
5. Add `CfnOutput`s for:

   * Cognito domain (if set in this ticket or next).
   * Google IdP name (optional).
6. Re-run `cdk synth` and `cdk deploy AuthStack` with proper environment variables set.

**Testing**

* `npm run build:infra` and `cdk synth` work.
* `cdk deploy AuthStack` succeeds when Google client ID/secret are present.
* In AWS console:

  * Verify the User Pool has a Google IdP configured.
  * Verify User Pool Clients list Google as a supported IdP.

**Acceptance Criteria**

* Cognito User Pool has a configured Google IdP.
* Web and Native clients support Google sign-in via Cognito.
* Deployment of `AuthStack` succeeds with valid Google credentials.
* Changes are committed.

---

### Ticket 3.3: Configure Apple as Cognito Identity Provider (iOS Sign-in)

**Title**
Configure Apple as Cognito Identity Provider (iOS Sign-in)

**Features**

* Configure Apple as an IdP in Cognito User Pool.
* Attach Apple IdP to Native User Pool Client (and Web client if desired).
* Prepare for iOS sign-in via Cognito Hosted UI.

**Description**
This ticket adds Apple as an identity provider to Cognito so native iOS users can sign in using their Apple ID. Apple credentials (client ID, team ID, key ID, private key) will come from environment variables or secure configuration; here we assume environment variables. Hosted UI integration will be finalized on the frontend in a later ticket.

**Infrastructure**

* Update `AuthStack` to include:

  * `UserPoolIdentityProviderApple` attached to the User Pool.
* Update Native User Pool Client(s) to include Apple in `supportedIdentityProviders`.

**Steps (guidance for Codex)**

1. Assume environment variables:

   * `APPLE_CLIENT_ID`
   * `APPLE_TEAM_ID`
   * `APPLE_KEY_ID`
   * `APPLE_PRIVATE_KEY` (or path to it)
2. In `AuthStack`, import `UserPoolIdentityProviderApple`.
3. Define Apple IdP using the User Pool and the Apple parameters above.
4. Add Apple to `supportedIdentityProviders` for the Native User Pool Client (and optionally the Web client).
5. Re-run `cdk synth` and `cdk deploy AuthStack` with correct Apple environment variables set.

**Testing**

* `npm run build:infra` and `cdk synth` run successfully.
* `cdk deploy AuthStack` completes without error when Apple credentials are available.
* In AWS console:

  * Verify Apple IdP is present in the User Pool.
  * Verify the native client lists Apple as a supported provider.

**Acceptance Criteria**

* Cognito User Pool has an Apple IdP configured.
* Native User Pool Client supports Apple sign-in via Cognito.
* `AuthStack` deploys successfully with appropriate Apple environment variables.
* Changes are committed.

---

### Ticket 3.4: Configure Cognito User Pool Domain and Hosted UI

**Title**
Configure Cognito User Pool Domain and Hosted UI

**Features**

* Add a Cognito User Pool domain for the Hosted UI.
* Configure OAuth callback and logout URLs for web and native flows.
* Output Hosted UI base URL.

**Description**
This ticket makes the Cognito Hosted UI accessible via a user pool domain so that Google/Apple sign-in can be initiated from the frontend. It configures appropriate callback URLs for web and native clients (using placeholder URIs that match Expo’s behavior) and exposes the Hosted UI URL for later use.

**Infrastructure**

* Update `AuthStack`:

  * Add `UserPoolDomain` resource.
  * Set domain prefix (e.g., `scavenger-hunt-<random-suffix>`).
* Update User Pool Clients’ OAuth settings:

  * Callback URLs for web (e.g., `http://localhost:19006`) and for Expo native redirect schemes.
  * Logout URLs.

**Steps (guidance for Codex)**

1. In `AuthStack`, import `UserPoolDomain` from `aws-cdk-lib/aws-cognito`.
2. Create domain, e.g.:

   ```ts
   const domain = userPool.addDomain('CognitoDomain', {
     cognitoDomain: {
       domainPrefix: 'scavenger-hunt-dev-<unique>',
     },
   });
   ```
3. Update User Pool Clients to include:

   * `oAuth: { callbackUrls: [...], logoutUrls: [...] }`, configured to support:

     * Local web (e.g., `http://localhost:19006`).
     * Expo native redirect (e.g., `exp://127.0.0.1:19000/--/auth/callback` or similar).
   * Ensure there is a single source of truth for callback URLs (e.g., defined constants in `AuthStack`).
4. Add output:

   ```ts
   new cdk.CfnOutput(this, 'CognitoHostedUiBaseUrl', {
     value: domain.baseUrl(),
   });
   ```
5. `npm run build:infra`, `cdk synth`, and `cdk deploy AuthStack`.

**Testing**

* Confirm `cdk synth` shows the User Pool Domain resource.
* Confirm `cdk deploy AuthStack` completes successfully.
* In AWS console:

  * Verify User Pool has a domain configured.
  * Verify web and native clients show appropriate callback/logout URLs.

**Acceptance Criteria**

* Cognito User Pool domain exists and is associated with the User Pool.
* User Pool Clients are configured with valid callback/logout URLs for dev environment.
* `CognitoHostedUiBaseUrl` is output from `AuthStack`.
* All infra commands succeed; changes are committed.

---

### Ticket 3.5: Backend JWT Verification Middleware for Cognito Tokens

**Title**
Backend JWT Verification Middleware for Cognito Tokens

**Features**

* Implement Node.js/TypeScript middleware to verify Cognito JWT access/ID tokens.
* Fetch and cache Cognito JWKs (public keys) for signature verification.
* Extract `userId` and basic claims into request context.

**Description**
This ticket adds authentication at the backend API level. Codex will implement a reusable middleware that validates JWTs issued by the Cognito User Pool, using the pool ID and region from configuration. Verified requests will carry a `user` object (including `sub` as `userId`) into downstream handlers. Unauthenticated or invalid tokens will be rejected.

**Infrastructure**

* No new AWS resources.
* Backend reads configuration (User Pool ID, region, Cognito issuer URL) from environment variables or config file.

**Steps (guidance for Codex)**

1. In `packages/backend`, install necessary libraries for JWT validation, e.g.:

   * `jsonwebtoken`
   * Optionally, a JWK/JWT helper such as `jwks-rsa` or implement manual JWK caching.
2. Add configuration mechanism for auth:

   * Read `COGNITO_USER_POOL_ID` and `AWS_REGION` (or `COGNITO_REGION`) at runtime.
   * Compute issuer: `https://cognito-idp.<region>.amazonaws.com/<userPoolId>`.
   * JWK URL: `${issuer}/.well-known/jwks.json`.
3. Implement an `authMiddleware` (or equivalent for Lambda) that:

   * Reads `Authorization` header (`Bearer <token>`).
   * Validates the token using JWKs and `jsonwebtoken`.
   * Verifies issuer and audience (client IDs, if desired).
   * On success, attaches `{ userId: sub, email, ... }` to the request context.
   * On failure, returns a 401 error for Lambda API responses.
4. Implement unit tests that:

   * Use mocked JWKs and tokens to verify successful and failed cases.
   * Mock network calls for JWK retrieval.

**Testing**

* `npm test` in `backend` must pass including new tests.
* Ensure middleware compiles (`npm run build:backend`).
* Optionally, add a non-production-only flag to bypass auth for local dev if token is absent, and test that behavior separately.

**Acceptance Criteria**

* Backend includes a reusable JWT verification middleware for Cognito tokens.
* Middleware validates token signature and issuer and returns 401 on invalid/missing tokens.
* Verified requests receive a `user` object with at least `userId` (Cognito `sub`).
* Unit tests cover success and failure paths and pass.
* Changes are committed.

---

### Ticket 3.6: Minimal Users Table and Repository (Cognito-Linked)

**Title**
Minimal Users Table and Repository (Cognito-Linked)

**Features**

* Create a DynamoDB `Users` table in `DataStack` (if not already present).
* Implement a backend repository for reading/writing `User` records.
* Associate `User` records with Cognito `sub` as primary key.

**Description**
Although fuller domain modeling happens in Phase 4, this ticket introduces a minimal `Users` table so the backend can persist per-user information linked to Cognito identities. Future phases will extend this model; for now, store only basic fields such as `userId`, `displayName`, `email`, and timestamps.

**Infrastructure**

* Update (or create) `DataStack` in `packages/infra`:

  * Add DynamoDB `Users` table:

    * Primary key: `userId` (string).
    * Provisioned or on-demand capacity (on-demand recommended).
* Output `UsersTableName`.
* Grant backend Lambdas read/write access to this table.

**Steps (guidance for Codex)**

1. In `packages/infra/lib`, if `DataStack` does not exist yet, create it; otherwise extend it:

   * Instantiate `Users` DynamoDB table.
2. Ensure `bin/app.ts` instantiates `DataStack` with the same `env`.
3. Add `CfnOutput` for `UsersTableName`.
4. Attach IAM permissions:

   * The Lambda functions in `CoreStack` that will need Users table access must be allowed to read/write `Users`.
5. In `packages/backend`, add a configuration mechanism to read `USERS_TABLE_NAME` from environment variables.
6. Implement `UsersRepository`:

   * Methods: `getUserById(userId)`, `createOrUpdateUser(user)`.
   * Use AWS SDK v3 (preferred) or v2 for DynamoDB access.

**Testing**

* Infra:

  * `npm run build:infra` and `cdk synth` must succeed.
  * `cdk deploy DataStack` (or deploy all stacks) must succeed.
  * Confirm table exists in AWS console.
* Backend:

  * Unit tests for `UsersRepository` using a local DynamoDB (or mocking SDK calls).
  * `npm run build:backend` and `npm test` pass.

**Acceptance Criteria**

* `Users` DynamoDB table exists with `userId` as partition key.
* Backend contains a `UsersRepository` that can get and upsert user records.
* Lambda role(s) have necessary IAM permissions to access the `Users` table.
* Infra and backend builds/tests succeed.
* Changes are committed.

---

### Ticket 3.7: Implement /me Endpoint and First-Login User Creation

**Title**
Implement /me Endpoint and First-Login User Creation

**Features**

* Add a secured `/me` endpoint in backend API.
* On first authenticated call, create or update `User` record in DynamoDB.
* Return current user profile to the client.

**Description**
This ticket exposes a basic user API and ties Cognito identities to persisted user profiles. When an authenticated client calls `/me`, the backend verifies the JWT, looks up the user in DynamoDB, and creates or updates a record if necessary. The endpoint returns user profile data for use in the frontend auth context.

**Infrastructure**

* Uses existing API Gateway and Lambda backend integration from previous phases.
* No new AWS resources; only backend logic and possible environment variable wiring (e.g., `USERS_TABLE_NAME`).

**Steps (guidance for Codex)**

1. In backend Lambda handler code (or new Lambda for `/me` if using multiple functions), add a `GET /me` route:

   * Apply the JWT auth middleware from Ticket 3.5.
2. Logic for `/me`:

   * Extract `userId` (`sub`) and claims (e.g., `email`, `given_name`, `family_name`) from token.
   * Use `UsersRepository` to attempt `getUserById(userId)`.
   * If user does not exist:

     * Create new user record with `userId`, `email`, `displayName` (derived from claims if possible), `createdAt`, `updatedAt`.
   * If user exists:

     * Optionally update `email` or `displayName` if changed.
   * Return user profile JSON.
3. Wire `/me` path to API Gateway route in `CoreStack` if using a separate Lambda; otherwise ensure routing in existing backend API Lambda.
4. Add unit tests:

   * `/me` returns 401 if no/invalid token.
   * `/me` creates user on first call.
   * `/me` returns existing user on subsequent calls.

**Testing**

* `npm run build:backend` and `npm test` must pass.
* Deploy updated backend stack (via CDK if backend is Lambda-based):

  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack` (or appropriate stack).
* Manual test:

  * Use a valid Cognito ID token (obtained via Hosted UI or AWS CLI) in an `Authorization: Bearer <token>` header.
  * Call `GET <ApiBaseUrl>me` and confirm a user JSON object is returned and persists in DynamoDB.

**Acceptance Criteria**

* `/me` endpoint exists and is protected by JWT auth.
* First call with a new Cognito `sub` creates a user record in `Users` table.
* Subsequent calls return the same persisted user.
* 401 is returned for missing/invalid tokens.
* Unit tests and manual test succeed.
* Changes are committed.

---

### Ticket 3.8: Frontend Integration with Cognito Hosted UI (Web & Android via Google)

**Title**
Frontend Integration with Cognito Hosted UI (Web & Android via Google)

**Features**

* Implement frontend sign-in flow using Cognito Hosted UI for Google login (web + Android).
* Configure Expo app to open Hosted UI and handle redirect back.
* Store obtained tokens securely and call `/me`.

**Description**
This ticket connects the frontend to Cognito through the Hosted UI using Google as the identity provider for web and Android. Codex will use Expo’s auth utilities (e.g., `expo-auth-session`) or appropriate libraries to open the Hosted UI, handle the redirect URI, exchange authorization codes for tokens, and store those tokens for API calls.

**Infrastructure**

* Uses Cognito domain and User Pool Clients configured in `AuthStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/frontend`, decide on auth library (e.g., `expo-auth-session`).
2. Configure an Auth provider module with:

   * Cognito Hosted UI base URL (from `EXPO_PUBLIC_COGNITO_HOSTED_UI_URL` or similar).
   * Client ID for web/native (also via environment variables).
   * Redirect URI aligned with `AuthStack` config.
3. Implement sign-in flow:

   * Show a “Sign in with Google” button.
   * When pressed, open Hosted UI with `identity_provider=Google` and appropriate query parameters.
   * Handle redirect URI, extract authorization code, exchange for tokens (id/access/refresh) via Cognito OAuth endpoints.
4. After successful auth:

   * Store tokens in a secure store (for now, React state; later can use secure storage).
   * Call the backend `/me` endpoint with `Authorization: Bearer <access or id token>` to fetch user profile.
   * Store user profile in a global auth context.
5. Ensure web and Android flows work; if exact Android emulator testing is not possible, ensure config is ready and at least web is fully validated.

**Testing**

* Manual tests (web):

  * Run `npm run dev:frontend` with `EXPO_PUBLIC_COGNITO_HOSTED_UI_URL`, `EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB`, and API base URL set.
  * Click “Sign in with Google.”
  * Complete Google login and confirm redirect returns to app.
  * Confirm `/me` is called and user details appear in UI.
* Unit/integration tests:

  * Mock the auth library and assert that token and user profile are stored in the auth context after “fake” success.

**Acceptance Criteria**

* Web frontend can initiate Google sign-in through Cognito Hosted UI and obtain tokens.
* After sign-in, frontend calls `/me` and shows logged-in user info.
* Tokens are attached to backend API calls via the Authorization header.
* Code is structured to support Android flows using the same Hosted UI.
* Changes are committed.

---

### Ticket 3.9: Frontend Integration with Apple Sign-in (iOS) via Cognito

**Title**
Frontend Integration with Apple Sign-in (iOS) via Cognito

**Features**

* Implement iOS sign-in with Apple via Cognito Hosted UI.
* Ensure correct redirect handling in Expo on iOS.
* Reuse the same auth context and `/me` flow used for Google.

**Description**
This ticket extends the frontend auth implementation to support Apple sign-in on iOS devices. Using the same Hosted UI architecture, Codex will add an option for “Sign in with Apple” that uses the Apple IdP configured in Cognito.

**Infrastructure**

* Uses Cognito domain and Apple IdP configured in `AuthStack`.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In the authentication module, add a “Sign in with Apple” trigger that redirects to Hosted UI with `identity_provider=Apple`.
2. Ensure redirect URIs and client IDs match those configured in `AuthStack`.
3. Reuse token handling and `/me` fetching logic from Ticket 3.8.
4. Ensure platform detection:

   * On iOS, show both Google and Apple options.
   * On Android/Web, show Google option (Apple optional on web if configured).
5. Manual simulation:

   * If a real iOS device/emulator is not available, ensure URL construction and redirection logic are correct and tested as much as possible (for example, via unit tests on URL builder).

**Testing**

* Unit tests:

  * Verify that the Hosted UI URL for Apple sign-in is constructed correctly.
  * Verify redirect parsing and token exchange are identical to Google flow.
* Manual examination:

  * Confirm configuration matches Cognito Apple IdP settings and redirect URIs.

**Acceptance Criteria**

* Frontend exposes a “Sign in with Apple” option that targets Cognito Hosted UI with Apple IdP.
* Sign-in flow for Apple reuses `/me` and auth context logic.
* Configuration matches the Apple IdP setup in Cognito (client IDs, redirect URIs).
* Changes are committed.

---

### Ticket 3.10: Auth Context, Protected Routes, and Phase 3 Validation

**Title**
Auth Context, Protected Routes, and Phase 3 Validation

**Features**

* Create a global Auth context/provider in frontend.
* Protect main app routes/screens behind authentication.
* Add sign-out capability that clears tokens and user profile.
* Validate end-to-end auth and user management.

**Description**
This final ticket for Phase 3 wires the auth flows into the overall app structure. The app should have a clear separation between unauthenticated state (login screen) and authenticated state (main tabs). Codex will implement an Auth provider that stores tokens and user profile, wrap navigation with it, and ensure sign-out works. The whole Phase 3 pipeline (Cognito ↔ frontend ↔ backend ↔ Users table) will be validated.

**Infrastructure**

* Uses previously configured AuthStack, CoreStack, and DataStack.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/frontend`, create an `AuthContext` and `AuthProvider`:

   * Holds `user` (profile from `/me`), `tokens`, and `loading` state.
   * Exposes `signInWithGoogle`, `signInWithApple`, and `signOut`.
2. Wrap the root navigation container with `AuthProvider`.
3. Implement conditional navigation:

   * If `user` is `null` and not loading → show Auth/Login screen.
   * If `user` exists → show main app (Hunts/Play/Judge/Dashboard).
4. Sign-out:

   * Clear tokens and `user`.
   * Optionally call Cognito logout endpoint to clear Hosted UI session.
5. End-to-end validation:

   * From a clean state, go through sign-in → `/me` → persisted user → app visible.
   * Sign out and verify app returns to auth screen.

**Testing**

* Frontend tests:

  * Unit tests for `AuthContext` reducer/provider behavior.
  * Tests for a protected component that only renders if `user` exists.
* Manual tests (web):

  * Configure environment variables:

    * `EXPO_PUBLIC_COGNITO_HOSTED_UI_URL`
    * `EXPO_PUBLIC_COGNITO_CLIENT_ID_WEB`
    * `EXPO_PUBLIC_API_BASE_URL`
  * Run `npm run dev:frontend`.
  * Sign in with Google (and Apple where feasible), verify main app appears, and `/me` is called.
  * Sign out and confirm return to login.

**Acceptance Criteria**

* App has clear unauthenticated and authenticated states, with appropriate screens shown.
* Auth context correctly stores tokens and user profile, and attaches Authorization header to API calls.
* Sign-out clears state and returns user to login screen.
* End-to-end flow:

  * User signs in via Cognito Hosted UI (Google and/or Apple).
  * Backend verifies JWT and persists/returns user.
  * Users table contains a record for the signed-in user.
* `npm run lint`, `npm test`, infra builds, and relevant `cdk deploy` commands all succeed.
* All changes are committed, and repository is clean.

