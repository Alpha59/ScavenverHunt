# API Contracts (Phase 4)

## Authentication
- All endpoints require `Authorization: Bearer <Cognito access|id token>`.
- Responses include CORS headers for browser access.

## Health
- `GET /health` → `{ status: 'ok', service: 'backend' }`

## Authenticated user
- `GET /me` → current user profile; creates a user record on first call.

## Hunts
- `POST /hunts`
  - Body: `{ name: string, description?: string, startTime?: string, endTime?: string, autoCloseAtEndTime?: boolean, minTeamSize: number, maxTeamSize: number, allowSolo: boolean }`
  - Response: `201` with created `Hunt`.
- `GET /hunts`
  - Lists hunts owned by the caller.
- `GET /hunts/{id}`
  - Returns hunt if caller is the owner; otherwise `403`.
- `PATCH /hunts/{id}`
  - Body: any subset of hunt fields (`name`, `description`, `status`, `startTime`, `endTime`, `autoCloseAtEndTime`, `minTeamSize`, `maxTeamSize`, `allowSolo`).
  - Owner-only; returns updated hunt.

All IDs and fields follow the domain definitions in `docs/domain-model.md`.
