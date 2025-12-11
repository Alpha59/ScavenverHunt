# Architecture (Phase 1)

This repository is a TypeScript monorepo managed with npm workspaces. It is organized into three primary packages:

- `packages/frontend`: Expo React Native app (web, iOS, Android) currently scaffolded with a simple screen and Expo configuration.
- `packages/backend`: Node.js + Express service that exposes a `/health` endpoint for local development.
- `packages/infra`: AWS CDK (TypeScript) project with a placeholder `CoreStack` to be expanded in later phases.

CDK environment configuration
-----------------------------
- CDK stacks use a shared helper to resolve `{ account, region }`, preferring `CDK_DEFAULT_ACCOUNT/REGION`, then `AWS_ACCOUNT/AWS_REGION`, defaulting the region to `us-east-1` (codex-sandbox).
- Run CDK commands with `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npm run cdk:synth` (or `npm run cdk:list`) to target the sandbox environment.

Phase 2 additions
-----------------
- `CoreStack` now provisions:
  - `AssetsBucket` (versioned, public access blocked, retain policy) with output `AssetsBucketName`.
  - `HealthLambda` (Node.js 18) exposing a health payload; output `HealthLambdaName`.
  - API Gateway `/health` endpoint integrated to the Lambda; outputs `ApiBaseUrl` (and standard API endpoint).
- Use the `ApiBaseUrl` output to configure frontend and integration tests via `EXPO_PUBLIC_API_BASE_URL` and `SCAVENGER_API_BASE_URL`.

Phase 3 (start) additions
-------------------------
- `AuthStack` provisions a Cognito User Pool with Web and Native app clients. If `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` are provided at synth/deploy time, a Google IdP is configured and added to both clients (callback URLs default to localhost placeholders and can be adjusted via stack props).
- If Apple env vars are provided (`APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`), an Apple IdP is configured for the same user pool clients.
- AuthStack also creates a Cognito Hosted UI domain (prefix from `COGNITO_DOMAIN_PREFIX` context/env or a generated fallback) and outputs `CognitoHostedUiBaseUrl` for frontend configuration.

Shared tooling lives at the root:

- TypeScript with a shared `tsconfig.base.json` (strict mode).
- ESLint + Prettier for linting/formatting.
- Jest + ts-jest for tests across all packages.

As of Phase 1 the infrastructure stack is empty, the backend runs locally only, and the frontend is a starter Expo project ready for future screens and navigation.
