Below are 10 tickets for **Phase 9: Real-Time Updates & Notifications**.

Assumptions:

* Phases 1–8 are complete.
* Backend: Node.js/TypeScript on Lambda + API Gateway, DynamoDB, S3, EventBridge, SES.
* Frontend: React Native / Expo (iOS/Android/Web).
* CDK-based infra in `packages/infra`, backend in `packages/backend`, frontend in `packages/frontend`.

Phase 9 focuses on:

* Real-time in-app updates (WebSocket).
* Push/mobile notifications for key events.
* User notification preferences.
* Auto-refresh of scoreboard, submissions, and status based on events.

---

### Ticket 9.1: NotificationStack – WebSocket API, Connections Table, and Connect/Disconnect Lambdas

**Title**
NotificationStack – WebSocket API, Connections Table, and Connect/Disconnect Lambdas

**Features**

* New `NotificationStack` containing:

  * API Gateway WebSocket API.
  * `$connect`, `$disconnect`, and `$default` Lambdas.
  * `Connections` DynamoDB table to track active connections and user/hunt context.
* Environment variables and IAM wired into backend.

**Description**
This ticket introduces the real-time infrastructure. It creates a WebSocket API where clients can connect after authentication. A DynamoDB `Connections` table stores each active connection, the associated user, and optional hunt context to allow targeted fan-out of events.

**Infrastructure**

* New `NotificationStack` in `packages/infra/lib/notification-stack.ts`:

  * WebSocket API Gateway with routes:

    * `$connect`, `$disconnect`, `$default`.
  * Lambdas in `packages/backend/src/realtime` (e.g., `onConnect`, `onDisconnect`, `onDefault`).
  * DynamoDB table `Connections`:

    * PK: `connectionId` (string).
    * GSI on `userId` (and optionally `huntId` for targeting).
* In `bin/app.ts`:

  * Instantiate `NotificationStack` and pass references where needed (e.g., to `CoreStack` for event publishing).
* Lambda environment variables:

  * `CONNECTIONS_TABLE_NAME`.
  * `WEBSOCKET_API_CALLBACK_URL` (WebSocket management endpoint).

**Steps (guidance for Codex)**

1. Define `Connections` table in CDK with:

   * PK: `connectionId` (string).
   * GSI on `userId` (PK: `userId`).
2. Define WebSocket API in CDK:

   * Integrate `$connect`, `$disconnect`, `$default` with corresponding Lambdas.
   * Enable IAM auth or simple route key-based Lambda auth; actual user auth will happen in `$connect`.
3. Implement `onConnect` Lambda:

   * Parse `Authorization` header (JWT from Cognito) or query param (consistent with existing auth model).
   * Validate token using existing auth utility.
   * Extract `userId`.
   * Store item in `Connections` table:

     * `connectionId`, `userId`, `connectedAt`.
4. Implement `onDisconnect` Lambda:

   * Remove item from `Connections` table by `connectionId`.
5. Implement `onDefault` Lambda:

   * For now, log payload and return simple acknowledgement (no app-level messages yet).

**Testing**

* Infra:

  * `npm run build:infra`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk synth`
  * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy NotificationStack`
* Backend:

  * `npm run build:backend`
  * Unit tests for `onConnect` and `onDisconnect` with mocked DynamoDB and auth.
* Manual:

  * Connect to WebSocket via `wscat` (or equivalent) with a valid token.
  * Confirm connection is inserted into `Connections` table.
  * Disconnect and confirm entry is removed.

**Acceptance Criteria**

* WebSocket API and `Connections` table exist and are deployed.
* Connect/disconnect Lambdas create and remove connection records with correct `userId`.
* Basic WebSocket connectivity works in manual tests.
* All builds/tests and CDK deploy succeed; changes are committed.

---

### Ticket 9.2: Backend – Real-Time Event Model and NotificationPublisher Service

**Title**
Backend – Real-Time Event Model and NotificationPublisher Service

**Features**

* Define a typed internal event model for key gameplay events.
* Implement `NotificationPublisher` service that:

  * Resolves target connections (by user, team, hunt).
  * Sends WebSocket messages via the API Gateway management API.
* Centralize event publishing for reuse by other handlers.

**Description**
This ticket adds a reusable service for sending real-time notifications from the backend to connected clients. It defines event types and a common envelope format. It abstracts lookups in `Connections` table and WebSocket management calls.

**Infrastructure**

* Uses existing `Connections` table and WebSocket endpoint from Ticket 9.1.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In `packages/backend/src/realtime/events.ts`, define event types, for example:

   * `SubmissionCreated`, `SubmissionJudged`, `ScoreUpdated`, `HuntStatusChanged`, `FavoriteUpdated`.
   * Common envelope:

     ```ts
     interface RealtimeEventEnvelope<TPayload> {
       type: string;        // e.g., 'submission.created'
       timestamp: string;   // ISO
       payload: TPayload;
     }
     ```
2. In `packages/backend/src/realtime/NotificationPublisher.ts`:

   * Implement a class using AWS SDK `ApiGatewayManagementApi` with endpoint from `WEBSOCKET_API_CALLBACK_URL`.
   * Provide methods, for example:

     * `sendToUser(userId, eventEnvelope)`
     * `sendToHuntParticipants(huntId, eventEnvelope)`
     * `sendToTeam(huntId, teamId, eventEnvelope)`
   * Each method:

     * Queries `Connections` table using relevant key/GSI.
     * Iterates over connections and sends message with `postToConnection`.
     * Handles stale connections: if `GoneException` occurs, remove that `connectionId` from the table.
3. Inject `NotificationPublisher` into handlers via a small factory or DI pattern consistent with existing backend structure.
4. Add unit tests for `NotificationPublisher` using mocked DynamoDB and `ApiGatewayManagementApi`.

**Testing**

* `npm run build:backend`
* `npm test` for new unit tests.
* Manual:

  * Temporarily call `NotificationPublisher.sendToUser` from a simple test handler.
  * Connect with WebSocket client and confirm receipt of JSON event.

**Acceptance Criteria**

* Typed event model exists and is centrally defined.
* `NotificationPublisher` can target users, teams, or all participants in a hunt.
* Stale connections are cleaned up when write fails.
* Unit tests and build pass; changes are committed.

---

### Ticket 9.3: Backend – Emit Real-Time Events on Submissions, Judging, Scores, and Hunt Status

**Title**
Backend – Emit Real-Time Events on Submissions, Judging, Scores, and Hunt Status

**Features**

* Emit events for major state changes:

  * Submission created.
  * Submission judged (accepted/rejected, favorite).
  * Team scores updated.
  * Hunt status changed (active/closed).
* Use `NotificationPublisher` to notify relevant clients.

**Description**
This ticket wires the event model into existing business logic. When players create submissions or judges accept/reject them, participants receive real-time updates. This underpins auto-refresh of dashboards and in-app notifications.

**Infrastructure**

* Uses `NotificationPublisher` from Ticket 9.2 and existing domain logic.
* No new AWS resources.

**Steps (guidance for Codex)**

1. In submission creation handler (`POST /hunts/{huntId}/tasks/{taskId}/submissions`):

   * After successfully creating a submission record, build a `submission.created` event envelope containing:

     * `huntId`, `taskId`, `teamId`, `submissionId`, `submittedByUserId`, `status`, `submittedAt`.
   * Use `NotificationPublisher.sendToHuntParticipants(huntId, envelope)`.
2. In decision handler (`POST /hunts/{huntId}/submissions/{submissionId}/decision`):

   * After updating submission status and score:

     * Emit `submission.judged`:

       * `submissionId`, `huntId`, `taskId`, `teamId`, `status`, `awardedPoints`, `isFavorite`, `judgeComment`.
       * Target:

         * `sendToTeam` for the team whose submission it is.
     * Emit `score.updated` if team total points changed:

       * `huntId`, `teamId`, `newTotalPoints`.
       * Use `sendToHuntParticipants`.
3. In hunt status change logic (from Phase 5/8):

   * Whenever `status` is changed to `active` or `closed` by owner or auto-close:

     * Emit `hunt.statusChanged`:

       * `huntId`, `newStatus`, `changedAt`.
       * Use `sendToHuntParticipants`.
4. Ensure events do not break primary flows:

   * If `NotificationPublisher` fails (e.g., network), log error but do not fail business operation.
5. Add unit tests:

   * For each handler, confirm that when operation succeeds, publisher is invoked with correct envelope.
   * Confirm that publisher failures do not throw back to caller.

**Testing**

* `npm run build:backend` and `npm test`.
* Manual:

  * Connect two clients to the same hunt.
  * From one, submit a task; from the other, observe `submission.created` event.
  * Judge submission; other client should see `submission.judged` and `score.updated`.

**Acceptance Criteria**

* Submissions, judgments, score changes, and status changes emit appropriate real-time events.
* Primary operations continue to succeed even if event delivery fails.
* Tests and manual verification demonstrate correct event payloads.
* Changes are committed.

---

### Ticket 9.4: Backend – User Notification Preferences and Push Token Registry

**Title**
Backend – User Notification Preferences and Push Token Registry

**Features**

* `UserNotificationSettings` table for per-user preferences.
* Store device push tokens (for mobile) and Web platform flags.
* REST endpoints to read/update notification settings.

**Description**
This ticket adds persistence for user notification preferences (e.g., which events they want push/in-app notifications for) and stores device push tokens to support mobile push notifications in later tickets.

**Infrastructure**

* New DynamoDB table `UserNotificationSettings` in `DataStack`:

  * PK: `userId` (string).
  * Attributes:

    * `preferences` (JSON map), e.g.:

      * `onSubmissionJudged`, `onHuntClosed`, `onScoreChange`, etc.
    * `pushTokens` (array of objects: `{ token, platform, updatedAt }`).

**Steps (guidance for Codex)**

1. Infra:

   * Add `UserNotificationSettings` table in `DataStack`.
   * Export table name via `CfnOutput`.
   * In `CoreStack`, add environment variable `USER_NOTIFICATION_SETTINGS_TABLE_NAME` for relevant lambdas and grant read/write access.
2. Backend repository:

   * `UserNotificationSettingsRepository` with methods:

     * `getSettings(userId)`.
     * `upsertPreferences(userId, preferences)`.
     * `addOrUpdatePushToken(userId, token, platform)`.
     * `removePushToken(userId, token)`.
3. REST endpoints:

   * `GET /me/notification-settings`:

     * Auth required.
     * Returns settings for current user (with sensible defaults if none).
   * `PUT /me/notification-settings`:

     * Auth required.
     * Body: `{ preferences: { ... } }`.
   * `POST /me/push-tokens`:

     * Auth required.
     * Body: `{ token: string, platform: 'ios' | 'android' | 'web' }`.
     * Stores/updates token in settings.
   * `DELETE /me/push-tokens`:

     * Auth required.
     * Body: `{ token: string }` to remove a token.
4. Add unit tests for repository and endpoints.

**Testing**

* `npm run build:infra`, `cdk synth`, `cdk deploy DataStack CoreStack`.
* `npm run build:backend` and `npm test`.
* Manual:

  * Call `GET /me/notification-settings` as a new user; verify defaults.
  * Update preferences; verify persisted.
  * Add/remove push tokens; verify stored in table.

**Acceptance Criteria**

* `UserNotificationSettings` table and repository are in place.
* Users can view and update their notification preferences and push tokens.
* Defaults are reasonable when no settings exist.
* Builds/tests and CDK deploy succeed; changes are committed.

---

### Ticket 9.5: Frontend – WebSocket Client Integration and Realtime Event Handling

**Title**
Frontend – WebSocket Client Integration and Realtime Event Handling

**Features**

* WebSocket client integrated into frontend, connecting after authentication.
* Central event handler dispatching events to app state (e.g., React context/store).
* Automatic reconnect on transient failures.

**Description**
This ticket plugs the app into the real-time infrastructure. After sign-in, the client opens a WebSocket connection to the backend, authenticates, listens for events, and routes them through a central handler so individual screens (scoreboard, submissions, etc.) can react.

**Infrastructure**

* Uses WebSocket API endpoint from `NotificationStack` (exposed via environment variable, e.g., `EXPO_PUBLIC_WS_BASE_URL`).
* No new AWS resources.

**Steps (guidance for Codex)**

1. Configuration:

   * Add `EXPO_PUBLIC_WS_BASE_URL` (or similar) for WebSocket URL (e.g., `wss://.../prod`).
2. Implement `useRealtimeConnection` hook or `RealtimeProvider` component:

   * On mount (when user is authenticated):

     * Build WebSocket URL including auth token:

       * Either as `Authorization` header via custom protocol or as query string (consistent with backend).
     * Open WebSocket connection.
   * Handle lifecycle:

     * `onopen` → mark connected.
     * `onmessage` → parse JSON into `RealtimeEventEnvelope`.
     * Dispatch event via context or store (e.g., `RealtimeContext` or global event bus).
     * `onclose` / `onerror` → schedule reconnection with exponential backoff.
   * Clean up connection on unmount / logout.
3. Implement a simple in-app event bus:

   * Context or global store that maintains:

     * Latest scoreboard events.
     * Latest submission/judgment events.
   * Provide subscription hooks (e.g., `useRealtimeEvents`) for screens.
4. Ensure compatibility with web and native platforms.

**Testing**

* Unit tests:

  * Use mocked WebSocket object (or polyfill) to verify:

    * Connect logic is invoked with correct URL.
    * Messages are parsed and dispatched.
    * Reconnect is attempted after close/error.
* Manual:

  * Run app on emulator and web.
  * Connect as multiple users; verify that events emitted from backend (Ticket 9.3) appear in console logs or basic debug UI.

**Acceptance Criteria**

* Authenticated clients establish and maintain WebSocket connections.
* Real-time events are received, parsed, and dispatched to app state.
* Reconnection logic is robust to short network interruptions.
* Frontend builds/tests pass; changes are committed.

---

### Ticket 9.6: Frontend – In-App Notifications, Auto-Refreshing Scoreboard and Submissions

**Title**
Frontend – In-App Notifications, Auto-Refreshing Scoreboard and Submissions

**Features**

* In-app notification/toast component reacting to real-time events.
* Auto-refresh of:

  * Team scoreboard when `score.updated` events arrive.
  * Player submission status when `submission.judged` events arrive.
* Minimal global notifications center within the app.

**Description**
This ticket leverages real-time events on the frontend to update views without manual refresh. It also provides basic in-app notifications so users receive immediate feedback when important events occur.

**Infrastructure**

* Uses WebSocket client/event bus from Ticket 9.5.
* Uses existing REST endpoints (`scoreboard`, `stats`, team submissions) for data refresh.
* No new AWS resources.

**Steps (guidance for Codex)**

1. Implement `InAppNotificationsProvider` and a notification UI:

   * Store a small list of recent notifications (e.g., 10).
   * Provide a toast/banner that briefly appears when a new notification arrives.
   * Allow user to open a simple “Notifications” view from the home/dashboard.
2. Subscribe to real-time events:

   * For `submission.judged` events where `teamId` matches current user’s team:

     * Show notification: e.g., “Task X: Accepted/Rejected – +N points” with judge comment snippet.
     * Update local state for that submission if it is displayed; or trigger a focused refetch of `/teams/{teamId}/submissions`.
   * For `score.updated` events:

     * Refetch `/hunts/{huntId}/scoreboard`.
   * For `hunt.statusChanged` events:

     * Update the hunt’s status in local state and show a banner/notification.
3. Wire into:

   * `HuntDashboardScreen` for scoreboard auto-refresh.
   * `PlayerSubmissionsScreen` for submission status updates.
   * `HomeDashboardScreen` for high-level status change notifications.

**Testing**

* Unit tests:

  * Simulate incoming events and verify that:

    * Toasts appear with correct content.
    * Appropriate REST refetch calls occur (mocked).
* Manual:

  * Start two clients (judge and player).
  * Submit as player, judge as judge; confirm:

    * Player sees in-app notification on judgment.
    * Scoreboard updates without manual refresh.

**Acceptance Criteria**

* In-app notifications appear for key events and are stored in a small history.
* Scoreboard and submission views update automatically when relevant events occur.
* No excessive refetching (ensure basic throttling/debouncing as needed).
* Frontend builds/tests pass; changes are committed.

---

### Ticket 9.7: Backend – Mobile Push Notifications (SNS or Expo) for Key Events

**Title**
Backend – Mobile Push Notifications (SNS or Expo) for Key Events

**Features**

* Integrate with a push notification provider (Expo push or AWS SNS) to send mobile push notifications.
* Use stored push tokens from `UserNotificationSettings`.
* Send pushes for selected events (e.g., accepted/rejected submissions, hunt closed).

**Description**
This ticket adds server-side logic to send push notifications to mobile devices for important events, respecting user preferences. It complements the in-app real-time events with OS-level notifications when the app is backgrounded.

**Infrastructure**

* If using Expo:

  * No new AWS resources; use Expo Push API over HTTPS.
* If using SNS:

  * SNS platform application(s) for APNs/FCM may be required.
  * IAM permission for Lambda to call SNS APIs.
* For simplicity, assume **Expo Push** integration (since app is React Native / Expo).

**Steps (guidance for Codex)**

1. Configuration:

   * Add environment variable `EXPO_PUSH_API_URL` (default `https://exp.host/--/api/v2/push/send`).
   * Ensure mobile clients register Expo push tokens via `/me/push-tokens` endpoint (Ticket 9.4).
2. Implement `PushNotificationService` in backend:

   * Methods:

     * `sendToUser(userId, title, body, data?)`.
   * Logic:

     * Load tokens from `UserNotificationSettings`.
     * Filter by platform as needed.
     * Batch tokens into Expo request payloads.
     * POST to Expo push API with appropriate headers.
     * Handle error responses and log them; optionally prune invalid tokens.
3. Wire service into event points:

   * When a submission is judged and the team’s members have preferences enabled (`onSubmissionJudged`):

     * Send push to each member of that team.
   * When a hunt is closed and participants have `onHuntClosed` enabled:

     * Send push summarizing final status and inviting them to view recap.
4. Ensure preferences from `UserNotificationSettings.preferences` are respected to enable/disable pushes.

**Testing**

* Unit tests:

  * Mock HTTP client for Expo push API.
  * Verify that:

    * Correct tokens and payloads are sent.
    * Disabled preferences prevent pushes.
* Manual:

  * Configure a device/emulator with Expo push token registered.
  * Trigger judgment and hunt closure events and confirm push notifications are delivered.

**Acceptance Criteria**

* Backend can send push notifications to mobile devices via Expo Push API.
* Pushes respect user notification preferences.
* Errors from push provider are handled and logged without breaking core logic.
* Tests and manual verification succeed; changes are committed.

---

### Ticket 9.8: Frontend – Notification Settings UI and Push Token Registration Flow

**Title**
Frontend – Notification Settings UI and Push Token Registration Flow

**Features**

* Settings screen where users can configure notification preferences per event type.
* Prompt users on mobile to enable push notifications and register Expo push token.
* Sync settings to backend via `/me/notification-settings` and `/me/push-tokens`.

**Description**
This ticket provides users with control over their notifications. They can decide which events should trigger in-app and push notifications and enable/disable push at the device level.

**Infrastructure**

* Uses backend endpoints from Ticket 9.4:

  * `GET /me/notification-settings`
  * `PUT /me/notification-settings`
  * `POST /me/push-tokens` / `DELETE /me/push-tokens`
* Uses Expo Notifications library on mobile platforms.

**Steps (guidance for Codex)**

1. Implement `NotificationSettingsScreen`:

   * On mount, call `GET /me/notification-settings`.
   * Render toggles for preferences, for example:

     * “Push: When my submissions are judged”
     * “Push: When hunt closes”
     * “In-app: Score changes” (optional).
   * On change, send `PUT /me/notification-settings`.
2. Push registration:

   * On mobile platforms:

     * Request notification permissions via Expo Notifications.
     * On grant, obtain Expo push token.
     * Call `POST /me/push-tokens` with token and platform.
   * Provide a button “Enable Push Notifications” that triggers this flow.
   * Provide a way to disable push for this device:

     * Call `DELETE /me/push-tokens` with stored token and update local state.
3. Link `NotificationSettingsScreen` from profile or main settings menu.
4. Handle error states (permissions denied, network errors).

**Testing**

* Unit tests:

  * Mock notification settings endpoints and verify toggles update state and perform correct API calls.
* Manual:

  * On iOS and Android emulator or device:

    * Open settings, enable push notifications, accept system prompt, and confirm token is registered (via logs or backend table).
    * Change preferences and verify backend state.

**Acceptance Criteria**

* Users can view and edit notification preferences and enable/disable push notifications.
* Push tokens are registered and removed correctly per device.
* Web behaves gracefully (no push; in-app settings still available).
* Frontend builds/tests pass; changes are committed.

---

### Ticket 9.9: Integration Tests – Realtime Notifications and Push Flow

**Title**
Integration Tests – Realtime Notifications and Push Flow

**Features**

* Integration tests validating:

  * Event emission on submission/score changes.
  * WebSocket notification publishing (with mocked management API).
  * Push notification dispatch decisions based on preferences.

**Description**
This ticket adds integration coverage to ensure the real-time and push notification pipeline behaves correctly from the backend perspective. It checks that events generated by core workflows route into the `NotificationPublisher` and `PushNotificationService` with correct targeting and respect user settings.

**Infrastructure**

* Uses local DynamoDB and mocked WebSocket management API and Expo Push API.
* No additional AWS resources.

**Steps (guidance for Codex)**

1. Add integration test suite file, e.g. `packages/backend/src/__tests__/integration/phase9.notifications.integration.test.ts`.
2. Scenario:

   * Seed local DynamoDB with:

     * A hunt, team, team members, submissions, scores.
     * `Connections` entries for some users.
     * `UserNotificationSettings` entries with preferences and push tokens.
   * Mock:

     * `ApiGatewayManagementApi.postToConnection` to record messages instead of sending.
     * HTTP client for Expo Push API to record requests instead of network.
3. Steps:

   * Simulate submission creation by calling handler directly:

     * Assert a `submission.created` event is written via `NotificationPublisher` to relevant connections.
   * Simulate judgment that updates scores:

     * Assert `submission.judged` and `score.updated` messages are published.
     * Assert push notifications are prepared for team members with `onSubmissionJudged = true` and not for those with it disabled.
4. Ensure tests are independent and clean up between runs.

**Testing**

* `npm test` (or `npm run test:integration` if separated).
* Ensure integration tests run as part of CI workflow.

**Acceptance Criteria**

* Integration tests validate that backend emits events to WebSocket and resolves push targets correctly.
* Notification preferences are honored.
* Test suite is stable and deterministic; changes are committed.

---

### Ticket 9.10: Phase 9 End-to-End Verification and Documentation

**Title**
Phase 9 End-to-End Verification and Documentation

**Features**

* Validate full real-time and notification workflows across backend and frontend.
* Run all builds, tests, and deploy updated stacks.
* Update documentation for real-time events, in-app notifications, and push notifications.

**Description**
This ticket confirms that Phase 9 is complete and coherent from a user’s perspective. It ensures that players, owners, and judges see timely updates and receive notifications according to their preferences. Documentation is updated accordingly.

**Infrastructure**

* Uses deployed `AuthStack`, `DataStack`, `CoreStack`, `MediaStack`, `NotificationStack`.
* No new resources beyond those added in Phase 9.

**Steps (guidance for Codex)**

1. From root:

   * `npm run lint`
   * `npm test`
   * `npm run build:backend`
   * `npm run build:frontend`
   * `npm run build:infra`
2. Deploy infra:

   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy NotificationStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy DataStack`
   * `AWS_PROFILE=codex-sandbox AWS_REGION=us-east-1 npx cdk deploy CoreStack`
   * Deploy other stacks only if changes were made.
3. End-to-end manual scenario:

   * User A (Owner):

     * Creates and activates a hunt with tasks, teams, judge.
   * Users B and C (Players):

     * Join hunt, enable push notifications on their devices, configure preferences.
     * Submit media for tasks.
   * User D (Judge):

     * Uses judge swipe interface to accept/reject submissions.
   * Validate:

     * B and C see in-app notifications and real-time status updates when judgments occur.
     * Scoreboard updates live on dashboards.
     * When hunt closes (manual or auto), participants see status change in-app and (if opted in) receive push.
4. Documentation:

   * Add or update:

     * `docs/realtime-architecture.md` describing:

       * WebSocket API, `Connections` table, event model, NotificationPublisher.
     * `docs/notifications.md` describing:

       * In-app notifications, push integration, and user preferences.
   * Update `README.md` to summarize real-time and notification capabilities and link to detailed docs.

**Testing**

* All build and test commands must succeed.
* Manual E2E scenario behaves as expected without inconsistencies.

**Acceptance Criteria**

* Real-time updates and notifications work for submissions, score changes, and hunt status changes across roles.
* Push notifications are delivered according to user preferences on mobile.
* All builds, tests, and CDK deploys pass successfully.
* Documentation clearly explains Phase 9 features and architecture.
* Repository is clean with all changes committed.

