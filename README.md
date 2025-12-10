# Scavenger Hunt

Scavenger Hunt is a TypeScript monorepo that will power a cross-platform scavenger hunt experience. The project contains:

- **Frontend**: Expo React Native app targeting web, iOS, and Android (`packages/frontend`).
- **Backend**: Node.js/Express service for local development with a `/health` endpoint (`packages/backend`).
- **Infra**: AWS CDK app scaffolded for future stacks (`packages/infra`).

## Requirements

- Node.js 18+ and npm
- (Optional) AWS credentials/profile for running CDK commands

## Getting Started

```bash
npm install
```

### Development servers

- **Backend**: `npm run dev:backend` (listens on `http://127.0.0.1:4000/health`)
- **Frontend (Expo dev server)**: `npm run dev:frontend`
  - For web-only you can run `npm run web --workspace frontend -- --port 19007`

### Quality checks

- Lint: `npm run lint`
- Format: `npm run format`
- Tests (Jest): `npm test`
- Deployed health API integration test: set `SCAVENGER_API_BASE_URL=<ApiBaseUrl from CDK deploy>` and rerun `npm test` to exercise the live `/health` endpoint.

### Builds

- Backend: `npm run build:backend`
- Infra: `npm run build:infra`
- Frontend (web export): `npm run build:frontend`
- CDK synth: `npm run cdk:synth` (requires AWS env/profile)

## Repository Layout

- `packages/frontend` — Expo app scaffold with basic screen and assets.
- `packages/backend` — Express app exposing `/health`.
- `packages/infra` — CDK app with placeholder `CoreStack`.
- `docs/architecture.md` — High-level Phase 1 architecture summary.

Additional docs and implementation will be added in later phases as features land.
